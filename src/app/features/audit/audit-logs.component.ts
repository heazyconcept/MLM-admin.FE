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
import { AuditDetailDrawerComponent } from './audit-detail-drawer.component';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: 'Admin' | 'System' | 'User';
  username?: string;
  ip?: string;
  action: string;
  entity: string;
  referenceId: string;
  description: string;
  beforeSnapshot?: Record<string, unknown>;
  afterSnapshot?: Record<string, unknown>;
  relatedEntities?: string[];
}

interface AdminAuditItem {
  id: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

interface AdminAuditResponse {
  items: AdminAuditItem[];
  total: number;
  limit: number;
  offset: number;
}

interface AdminAuditWrappedResponse {
  data?: AdminAuditResponse | AdminAuditItem[] | Record<string, unknown>;
  items?: AdminAuditItem[];
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

  auditLogs = signal<AuditLogEntry[]>([]);
  tableLoading = signal(false);
  detailVisible = signal(false);
  selectedEntry = signal<AuditLogEntry | null>(null);

  actorOptions: FilterOption[] = [
    { label: 'All', value: 'all' },
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
      logs = logs.filter((l) => l.actor === actor);
    }
    if (actionType !== 'all') {
      logs = logs.filter((l) => l.action === actionType || l.action.toLowerCase() === actionType.toLowerCase());
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

  columns = signal<TableColumn<AuditLogEntry>[]>([
    {
      field: 'timestamp',
      header: 'Timestamp',
      width: '160px',
      sortable: true,
      formatter: (v: unknown) =>
        v
          ? new Date(v as string).toLocaleString('en-US', {
              dateStyle: 'short',
              timeStyle: 'short',
            })
          : '—',
    },
    { field: 'actor', header: 'Actor', width: '100px', sortable: true },
    { field: 'username', header: 'Username', width: '140px', sortable: true },
    { field: 'action', header: 'Action', width: '100px', sortable: true },
    { field: 'entity', header: 'Entity', width: '120px', sortable: true },
    { field: 'referenceId', header: 'Reference ID', width: '140px', sortable: true },
    { field: 'ip', header: 'IP Address', width: '140px', sortable: true },
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

  actions = signal<TableAction<AuditLogEntry>[]>([
    {
      icon: 'pi pi-eye',
      tooltip: 'View Details',
      severity: 'secondary',
      command: (row) => this.openDetail(row),
    },
  ]);

  getCell(row: AuditLogEntry, field: string): unknown {
    return (row as unknown as Record<string, unknown>)[field];
  }

  ngOnInit(): void {
    this.loadAuditLogs();
  }

  openDetail(entry: AuditLogEntry): void {
    this.selectedEntry.set(entry);
    this.detailVisible.set(true);
  }

  onDetailClose(): void {
    this.detailVisible.set(false);
    this.selectedEntry.set(null);
  }

  private loadAuditLogs(): void {
    this.tableLoading.set(true);
    this.api.get<AdminAuditResponse | AdminAuditWrappedResponse | AdminAuditItem[]>('admin/audit').subscribe({
      next: (response) => {
        const items = this.extractAuditItems(response);
        const mapped: AuditLogEntry[] = items.map((e) => {
          const metadata = e.metadata ?? {};
          const actorType = (metadata['actorType'] as string | undefined) ?? 'USER';
          const username =
            (metadata['username'] as string | undefined) ??
            (metadata['email'] as string | undefined) ??
            undefined;
          const ip = (metadata['ip'] as string | undefined) ?? undefined;
          const eventTimestamp =
            (metadata['timestamp'] as string | undefined) ?? e.createdAt;

          const descriptionParts: string[] = [];
          descriptionParts.push(this.formatAction(e.action));
          if (username) {
            descriptionParts.push(`by ${username}`);
          }

          return {
            id: e.id,
            timestamp: eventTimestamp,
            actor:
              actorType === 'SYSTEM'
                ? 'System'
                : actorType === 'ADMIN'
                  ? 'Admin'
                  : 'User',
            username,
            ip,
            action: this.formatAction(e.action),
            entity: e.entityType,
            referenceId: e.entityId,
            description: descriptionParts.join(' '),
            beforeSnapshot: undefined,
            afterSnapshot: metadata,
            relatedEntities: [e.entityId, e.actorId].filter(Boolean),
          };
        });
        this.auditLogs.set(mapped);
        this.actionTypeOptions = this.buildActionOptions(mapped);
        this.tableLoading.set(false);
      },
      error: () => {
        this.auditLogs.set([]);
        this.tableLoading.set(false);
      }
    });
  }

  private extractAuditItems(
    response: AdminAuditResponse | AdminAuditWrappedResponse | AdminAuditItem[]
  ): AdminAuditItem[] {
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
        return candidate as AdminAuditItem[];
      }

      const record = this.asRecord(candidate);
      if (!record) {
        continue;
      }

      const list = record['items'] ?? record['records'] ?? record['logs'];
      if (Array.isArray(list)) {
        return list as AdminAuditItem[];
      }
    }

    return [];
  }

  private formatAction(action: string): string {
    return action
      .toLowerCase()
      .split('_')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private normalizeFilterValue(value: unknown): string {
    if (typeof value !== 'string') {
      return 'all';
    }

    const normalized = value.trim();
    return normalized ? normalized : 'all';
  }

  private buildActionOptions(entries: AuditLogEntry[]): FilterOption[] {
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
