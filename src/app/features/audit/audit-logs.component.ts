import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { ApiService } from '../../core/services/api.service';
import { DataTableComponent } from '../../shared/components/data-table/data-table.component';
import {
  TableColumn,
  TableConfig,
  TableAction,
} from '../../shared/components/data-table/data-table.types';
import {
  AuditApiItem,
  AuditDisplayEntry,
  formatAuditTimestamp,
  mapAuditApiItem,
} from '../../core/models/audit.model';
import { AuditDetailDrawerComponent } from './audit-detail-drawer.component';

export type AuditLogEntry = AuditDisplayEntry;

interface AdminAuditResponse {
  items: AuditApiItem[];
  total: number;
  limit: number;
  offset: number;
}

interface AdminAuditWrappedResponse {
  data?: AdminAuditResponse | AuditApiItem[] | Record<string, unknown>;
  items?: AuditApiItem[];
  total?: number;
  limit?: number;
  offset?: number;
  result?: Record<string, unknown>;
  payload?: Record<string, unknown>;
}

interface FilterOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    SelectModule,
    DatePickerModule,
    DataTableComponent,
    AuditDetailDrawerComponent,
  ],
  templateUrl: './audit-logs.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditLogsComponent implements OnInit {
  private readonly api = inject(ApiService);
  actorFilter = signal<string>('all');
  actionTypeFilter = signal<string>('all');
  dateRange = signal<Date[] | null>(null);

  auditLogs = signal<AuditDisplayEntry[]>([]);
  tableLoading = signal(false);
  detailVisible = signal(false);
  selectedEntry = signal<AuditDisplayEntry | null>(null);

  actorOptions: FilterOption[] = [
    { label: 'All', value: 'all' },
    { label: 'Super Admin', value: 'Super Admin' },
    { label: 'Admin', value: 'Admin' },
    { label: 'User', value: 'User' },
    { label: 'System', value: 'System' },
  ];

  actionTypeOptions: FilterOption[] = [
    { label: 'All', value: 'all' },
    { label: 'Create', value: 'Create' },
    { label: 'Update', value: 'Update' },
    { label: 'Delete', value: 'Delete' },
    { label: 'Login', value: 'Login' },
  ];

  filteredLogs = computed(() => {
    let logs = this.auditLogs();
    const actor = this.normalizeFilterValue(this.actorFilter());
    const actionType = this.normalizeFilterValue(this.actionTypeFilter());
    const range = this.dateRange();

    if (actor !== 'all') {
      logs = logs.filter((l) => l.actorRoleLabel === actor);
    }
    if (actionType !== 'all') {
      logs = logs.filter(
        (l) => l.action === actionType || l.action.toLowerCase() === actionType.toLowerCase()
      );
    }
    if (range && range.length >= 2 && range[0] && range[1]) {
      const from = range[0].getTime();
      const to = range[1].getTime();
      logs = logs.filter((l) => {
        const t = new Date(l.timestamp).getTime();
        return t >= from && t <= to;
      });
    }
    return logs;
  });

  columns = signal<TableColumn<AuditDisplayEntry>[]>([
    {
      field: 'timestamp',
      header: 'Timestamp',
      width: '160px',
      sortable: true,
      formatter: (v: unknown) => formatAuditTimestamp(v as string),
    },
    { field: 'actorDisplayName', header: 'Actor', width: '180px', sortable: true },
    { field: 'targetUsername', header: 'Username', width: '140px', sortable: true },
    { field: 'action', header: 'Action', width: '140px', sortable: true },
    { field: 'entity', header: 'Entity', width: '120px', sortable: true },
    { field: 'referenceId', header: 'Reference ID', width: '140px', sortable: true },
    { field: 'ipAddress', header: 'IP Address', width: '140px', sortable: true },
    { field: 'description', header: 'Description', sortable: true },
  ]);

  tableHeaders = computed(() => [...this.columns().map((c) => c.header), 'Details']);

  tableConfig: TableConfig = {
    paginator: true,
    rows: 10,
    rowsPerPageOptions: [10, 25, 50],
    showCurrentPageReport: true,
    currentPageReportTemplate: 'Showing {first} to {last} of {totalRecords}',
    globalFilter: false,
    showGridlines: false,
    hoverable: true,
    size: 'normal',
  };

  actions = signal<TableAction<AuditDisplayEntry>[]>([
    {
      icon: 'pi pi-eye',
      tooltip: 'View Details',
      severity: 'secondary',
      command: (row) => this.openDetail(row),
    },
  ]);

  getCell(row: AuditDisplayEntry, field: string): unknown {
    return (row as unknown as Record<string, unknown>)[field];
  }

  ngOnInit(): void {
    this.loadAuditLogs();
  }

  openDetail(entry: AuditDisplayEntry): void {
    this.selectedEntry.set(entry);
    this.detailVisible.set(true);
  }

  onDetailClose(): void {
    this.detailVisible.set(false);
    this.selectedEntry.set(null);
  }

  private loadAuditLogs(): void {
    this.tableLoading.set(true);
    this.api.get<AdminAuditResponse | AdminAuditWrappedResponse | AuditApiItem[]>('admin/audit').subscribe({
      next: (response) => {
        const items = this.extractAuditItems(response);
        const mapped = items.map(mapAuditApiItem);
        this.auditLogs.set(mapped);
        this.actionTypeOptions = this.buildActionOptions(mapped);
        this.tableLoading.set(false);
      },
      error: () => {
        this.auditLogs.set([]);
        this.tableLoading.set(false);
      },
    });
  }

  private extractAuditItems(
    response: AdminAuditResponse | AdminAuditWrappedResponse | AuditApiItem[]
  ): AuditApiItem[] {
    const candidates: unknown[] = [
      response,
      this.asRecord(response)?.['data'],
      this.asRecord(response)?.['result'],
      this.asRecord(response)?.['payload'],
      this.asRecord(this.asRecord(response)?.['data'])?.['data'],
      this.asRecord(this.asRecord(response)?.['result'])?.['data'],
      this.asRecord(this.asRecord(response)?.['payload'])?.['data'],
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate as AuditApiItem[];
      }

      const record = this.asRecord(candidate);
      if (!record) {
        continue;
      }

      const list = record['items'] ?? record['records'] ?? record['logs'];
      if (Array.isArray(list)) {
        return list as AuditApiItem[];
      }
    }

    return [];
  }

  private normalizeFilterValue(value: unknown): string {
    if (typeof value !== 'string') {
      return 'all';
    }

    const normalized = value.trim();
    return normalized ? normalized : 'all';
  }

  private buildActionOptions(entries: AuditDisplayEntry[]): FilterOption[] {
    const uniqueActions = Array.from(new Set(entries.map((entry) => entry.action))).sort((a, b) =>
      a.localeCompare(b)
    );

    return [
      { label: 'All', value: 'all' },
      ...uniqueActions.map((action) => ({ label: action, value: action })),
    ];
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    return value as Record<string, unknown>;
  }
}
