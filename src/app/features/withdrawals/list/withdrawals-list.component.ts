import { Component, inject, computed, signal, ChangeDetectionStrategy, OnInit, ViewChild, TemplateRef, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { WithdrawalService, WithdrawalRequest, WithdrawalStatus } from '../services/withdrawal.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { TableColumn, TableConfig, TableAction } from '../../../shared/components/data-table/data-table.types';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { TablePageEvent } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { WithdrawalActionModalComponent, ActionType } from '../modals/withdrawal-action-modal.component';

interface StatusOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-withdrawals-list',
  imports: [
    CommonModule,
    RouterModule,
    DataTableComponent,
    StatusBadgeComponent,
    SelectModule,
    ButtonModule,
    InputTextModule,
    ReactiveFormsModule,
    ToastModule,
    WithdrawalActionModalComponent
  ],
  providers: [MessageService],
  templateUrl: './withdrawals-list.component.html',
  styleUrls: ['./withdrawals-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WithdrawalsListComponent implements OnInit {
  private withdrawalService = inject(WithdrawalService);
  private messageService = inject(MessageService);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  @ViewChild('status', { static: true }) statusTemplate!: TemplateRef<unknown>;

  withdrawals = this.withdrawalService.withdrawals;
  tableLoading = signal(false);
  totalRecords = this.withdrawalService.total;
  rowsPerPage = signal(10);
  firstRecord = signal(0);
  
  selectedStatusControl = new FormControl('all');
  searchQuery = signal<string>('');

  statusOptions: StatusOption[] = [
    { label: 'All Statuses', value: 'all' },
    { label: 'Pending', value: 'Pending' },
    { label: 'Approved', value: 'Approved' },
    { label: 'Processing', value: 'Processing' },
    { label: 'Rejected', value: 'Rejected' },
    { label: 'Paid', value: 'Paid' }
  ];

  actionModalVisible = signal(false);
  actionModalWithdrawal = signal<WithdrawalRequest | null>(null);
  actionModalType = signal<ActionType | null>(null);

  filteredWithdrawals = computed(() => {
    let requests = this.withdrawalService.withdrawals();

    const query = this.searchQuery().toLowerCase();
    if (query) {
      requests = requests.filter(r => 
        r.userName.toLowerCase().includes(query) ||
        r.id.toLowerCase().includes(query) ||
        r.userEmail.toLowerCase().includes(query)
      );
    }
    
    return requests;
  });

  stats = computed(() => {
    const all = this.withdrawalService.withdrawals();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return {
      totalPending: all.filter(w => w.status === 'Pending').length,
      approvedToday: all.filter(w => {
        if (w.status !== 'Approved' || !w.processedDate) return false;
        const processedDate = new Date(w.processedDate);
        processedDate.setHours(0, 0, 0, 0);
        return processedDate.getTime() === today.getTime();
      }).length,
      totalAmount: all.reduce((sum, w) => sum + w.amount, 0)
    };
  });

  columns = signal<TableColumn<WithdrawalRequest>[]>([]);

  tableHeaders = computed(() => this.columns().map(c => c.header));
  
  tableConfig = signal<TableConfig>({
    paginator: true,
    rows: 10,
    globalFilter: false,
    showGridlines: false,
    hoverable: true,
    size: 'normal'
  });

  actions = signal<TableAction<WithdrawalRequest>[]>([
    {
      icon: 'pi pi-eye',
      tooltip: 'View Details',
      severity: 'secondary',
      command: (withdrawal) => this.viewDetails(withdrawal)
    }
  ]);

  ngOnInit() {
    // Check if we should filter by default (from route data)
    const defaultFilter = this.route.snapshot.data['defaultFilter'];
    if (defaultFilter) {
      this.selectedStatusControl.setValue(defaultFilter);
    }

    this.selectedStatusControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.firstRecord.set(0);
        this.fetchWithdrawals(0, this.rowsPerPage());
      });

    this.columns.set([
      {
        field: 'id',
        header: 'Request ID',
        width: '120px',
        sortable: true
      },
      {
        field: 'userName',
        header: 'User',
        sortable: true
      },
      {
        field: 'amount',
        header: 'Amount',
        width: '150px',
        sortable: true,
        align: 'right',
        formatter: (value: unknown, row: WithdrawalRequest) => `${row.currency} ${Number(value).toLocaleString()}`
      },
      {   
        field: 'destination',
        header: 'Destination',
        width: '200px',
        formatter: (value: unknown) => {
          const s = String(value ?? '');
          return s.length > 30 ? s.substring(0, 30) + '...' : s;
        }
      },
      {
        field: 'status',
        header: 'Status',
        width: '120px',
        align: 'center',
        template: this.statusTemplate
      },
      {
        field: 'requestDate',
        header: 'Request Date',
        width: '140px',
        sortable: true,
        formatter: (value: unknown) => new Date(value as string | number | Date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      },
      {
        field: '_actions',
        header: 'Actions',
        width: '220px',
        align: 'center'
      }
    ]);

    this.fetchWithdrawals(0, this.rowsPerPage());
  }

  private router = inject(Router);

  viewDetails(withdrawal: WithdrawalRequest) {
    this.router.navigate(['/admin/withdrawals', withdrawal.id]);
  }

  onSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
  }

  onPageChange(event: TablePageEvent): void {
    const first = event.first ?? 0;
    const rows = event.rows ?? this.rowsPerPage();
    this.firstRecord.set(first);
    this.rowsPerPage.set(rows);
    this.fetchWithdrawals(first, rows);
  }

  onExport() {
    console.log('Export withdrawals');
  }

  getStatusSeverity(status: WithdrawalStatus): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 'Paid': return 'success';
      case 'Approved': return 'info';
      case 'Pending': return 'warn';
      case 'Rejected': return 'danger';
      case 'Processing': return 'secondary';
      default: return 'info';
    }
  }

  private fetchWithdrawals(offset: number, limit: number): void {
    this.tableLoading.set(true);
    this.withdrawalService.loadFromApi({
      status: this.toApiStatus(this.selectedStatusControl.value),
      limit,
      offset
    }).subscribe({
      next: () => this.tableLoading.set(false),
      error: () => this.tableLoading.set(false)
    });
  }

  private toApiStatus(status: string | null): 'PENDING' | 'APPROVED' | 'PROCESSING' | 'REJECTED' | 'PAID' | undefined {
    switch (status) {
      case 'Pending': return 'PENDING';
      case 'Approved': return 'APPROVED';
      case 'Processing': return 'PROCESSING';
      case 'Rejected': return 'REJECTED';
      case 'Paid': return 'PAID';
      default: return undefined;
    }
  }

  isPending(row: WithdrawalRequest): boolean {
    return row.status === 'Pending';
  }

  isApproved(row: WithdrawalRequest): boolean {
    return row.status === 'Approved';
  }

  isProcessing(row: WithdrawalRequest): boolean {
    return row.status === 'Processing';
  }

  isFinal(row: WithdrawalRequest): boolean {
    return row.status === 'Paid' || row.status === 'Rejected';
  }

  openActionModal(withdrawal: WithdrawalRequest, action: ActionType): void {
    this.actionModalWithdrawal.set(withdrawal);
    this.actionModalType.set(action);
    this.actionModalVisible.set(true);
  }

  onActionConfirmed(event: { action: ActionType; reason?: string; payoutReference?: string }): void {
    const w = this.actionModalWithdrawal();
    if (!w) return;

    const id = w.id;
    const obs = (() => {
      switch (event.action) {
        case 'Approve': return this.withdrawalService.approveWithdrawal(id);
        case 'MarkProcessing': return this.withdrawalService.markProcessing(id);
        case 'Reject': return this.withdrawalService.rejectWithdrawal(id, event.reason ?? '');
        case 'MarkPaid': return this.withdrawalService.markPaid(id, event.payoutReference);
        default: return null;
      }
    })();

    if (obs) {
      obs.subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Success', detail: `Withdrawal ${event.action} completed` });
          this.actionModalVisible.set(false);
          this.actionModalWithdrawal.set(null);
          this.actionModalType.set(null);
        },
        error: (err) => {
          const detail = err?.error?.message ?? err?.message ?? 'Operation failed';
          this.messageService.add({ severity: 'error', summary: 'Error', detail });
        }
      });
    }
  }

  onActionCancelled(): void {
    this.actionModalVisible.set(false);
    this.actionModalWithdrawal.set(null);
    this.actionModalType.set(null);
  }

  onApprove(row: WithdrawalRequest): void {
    this.openActionModal(row, 'Approve');
  }

  onMarkProcessing(row: WithdrawalRequest): void {
    this.openActionModal(row, 'MarkProcessing');
  }

  onReject(row: WithdrawalRequest): void {
    this.openActionModal(row, 'Reject');
  }

  onMarkPaid(row: WithdrawalRequest): void {
    this.openActionModal(row, 'MarkPaid');
  }
}
