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
  actor: 'Admin' | 'System';
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
    const actor = this.actorFilter();
    const actionType = this.actionTypeFilter();
    const range = this.dateRange();

    if (actor !== 'all') {
      logs = logs.filter((l) => l.actor === actor);
    }
    if (actionType !== 'all') {
      logs = logs.filter((l) => l.action === actionType);
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
        new Date(v as string).toLocaleString('en-US', {
          dateStyle: 'short',
          timeStyle: 'short',
        }),
    },
    { field: 'actor', header: 'Actor', width: '100px', sortable: true },
    { field: 'action', header: 'Action', width: '100px', sortable: true },
    { field: 'entity', header: 'Entity', width: '120px', sortable: true },
    { field: 'referenceId', header: 'Reference ID', width: '140px', sortable: true },
    { field: 'description', header: 'Description', sortable: true },
  ]);

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
    this.api.get<AdminAuditResponse>('admin/audit').subscribe({
      next: (response) => {
        const mapped: AuditLogEntry[] = (response.items ?? []).map((e) => {
          const metadata = e.metadata ?? {};
          const actorType = (metadata['actorType'] as string | undefined) ?? 'ADMIN';
          const username = (metadata['username'] as string | undefined) ?? undefined;

          const descriptionParts: string[] = [];
          descriptionParts.push(e.action);
          if (username) {
            descriptionParts.push(`by ${username}`);
          }

          return {
            id: e.id,
            timestamp: e.createdAt,
            actor: actorType === 'SYSTEM' ? 'System' : 'Admin',
            action: e.action,
            entity: e.entityType,
            referenceId: e.entityId,
            description: descriptionParts.join(' '),
            beforeSnapshot: undefined,
            afterSnapshot: metadata,
            relatedEntities: [e.entityId, e.actorId].filter(Boolean),
          };
        });
        this.auditLogs.set(mapped);
        this.tableLoading.set(false);
      },
      error: () => {
        this.auditLogs.set([]);
        this.tableLoading.set(false);
      }
    });
  }
}
