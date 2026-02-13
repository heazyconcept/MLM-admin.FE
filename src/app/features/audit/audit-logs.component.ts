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
  actorFilter = signal<string>('all');
  actionTypeFilter = signal<string>('all');
  dateRange = signal<Date[] | null>(null);

  auditLogs = signal<AuditLogEntry[]>([]);
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
    this.auditLogs.set(this.getMockAuditLogs());
  }

  openDetail(entry: AuditLogEntry): void {
    this.selectedEntry.set(entry);
    this.detailVisible.set(true);
  }

  onDetailClose(): void {
    this.detailVisible.set(false);
    this.selectedEntry.set(null);
  }

  private getMockAuditLogs(): AuditLogEntry[] {
    const now = Date.now();
    const entries: AuditLogEntry[] = [
      {
        id: 'audit-1',
        timestamp: new Date(now - 3600000).toISOString(),
        actor: 'Admin',
        action: 'Update',
        entity: 'User',
        referenceId: 'USR-1001',
        description: 'Updated user profile status',
        beforeSnapshot: { status: 'pending' },
        afterSnapshot: { status: 'active' },
        relatedEntities: ['USR-1001', 'ROLE-2'],
      },
      {
        id: 'audit-2',
        timestamp: new Date(now - 7200000).toISOString(),
        actor: 'System',
        action: 'Create',
        entity: 'Withdrawal',
        referenceId: 'WDR-2002',
        description: 'Withdrawal request created',
        afterSnapshot: { amount: 500, currency: 'USD' },
        relatedEntities: ['WDR-2002', 'WAL-301'],
      },
      {
        id: 'audit-3',
        timestamp: new Date(now - 86400000).toISOString(),
        actor: 'Admin',
        action: 'Login',
        entity: 'Session',
        referenceId: 'SES-3003',
        description: 'Admin login from dashboard',
        relatedEntities: ['SES-3003'],
      },
      {
        id: 'audit-4',
        timestamp: new Date(now - 172800000).toISOString(),
        actor: 'System',
        action: 'Delete',
        entity: 'Cache',
        referenceId: 'CACHE-404',
        description: 'Expired cache entry removed',
        beforeSnapshot: { key: 'session:abc', ttl: 3600 },
        relatedEntities: [],
      },
      {
        id: 'audit-5',
        timestamp: new Date(now - 259200000).toISOString(),
        actor: 'Admin',
        action: 'Update',
        entity: 'Order',
        referenceId: 'ORD-5005',
        description: 'Order status changed to shipped',
        beforeSnapshot: { status: 'processing' },
        afterSnapshot: { status: 'shipped' },
        relatedEntities: ['ORD-5005', 'LOG-601'],
      },
    ];
    return entries;
  }
}
