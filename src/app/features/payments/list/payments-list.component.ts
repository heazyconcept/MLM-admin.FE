import { Component, inject, computed, signal, ChangeDetectionStrategy, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { PaymentService, Payment, PaymentStatus, PaymentPurpose } from '../services/payment.service';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { TableColumn, TableConfig, TableAction } from '../../../shared/components/data-table/data-table.types';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AdminFundingModalComponent, AdminFundingPayload } from '../modals/admin-funding-modal.component';

@Component({
  selector: 'app-payments-list',
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    DataTableComponent,

    StatusBadgeComponent,
    ButtonModule,
    ToastModule,
    AdminFundingModalComponent
  ],
  templateUrl: './payments-list.component.html',
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaymentsListComponent implements OnInit {
  private paymentService = inject(PaymentService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private messageService = inject(MessageService);

  @ViewChild('purpose', { static: true }) purposeTemplate!: TemplateRef<unknown>;
  @ViewChild('status', { static: true }) statusTemplate!: TemplateRef<unknown>;

  payments = this.paymentService.payments;
  tableLoading = signal(false);
  fundingModalVisible = signal(false);
  
  selectedStatusControl = new FormControl('all');
  selectedMethodControl = new FormControl('all');
  searchQuery = signal<string>('');

  statusOptions = [
    { label: 'All Statuses', value: 'all' },
    { label: 'Pending', value: 'Pending' },
    { label: 'Successful', value: 'Successful' },
    { label: 'Failed', value: 'Failed' },
    { label: 'Reversed', value: 'Reversed' }
  ];

  methodOptions = [
    { label: 'All Methods', value: 'all' },
    { label: 'Stripe', value: 'Stripe' },
    { label: 'Bank Transfer', value: 'Bank Transfer' },
    { label: 'USDT (TRC20)', value: 'USDT (TRC20)' },
    { label: 'PayPal', value: 'PayPal' },
    { label: 'Flutterwave', value: 'Flutterwave' }
  ];

  fromDateControl = new FormControl<string | null>(null);
  toDateControl = new FormControl<string | null>(null);

  filteredPayments = computed(() => {
    let requests = this.payments();
    const selectedStatus = this.selectedStatusControl.value || 'all';
    const selectedMethod = this.selectedMethodControl.value || 'all';
    
     if (selectedStatus !== 'all') {
      requests = requests.filter(r => r.status === selectedStatus);
    }

    if (selectedMethod !== 'all') {
      requests = requests.filter(r => r.method === selectedMethod);
    }
    
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
    const all = this.payments();
    const successful = all.filter(p => p.status === 'Successful').length;
    const pending = all.filter(p => p.status === 'Pending').length;
    const totalVolume = all.reduce((sum, p) => sum + p.amount, 0);

    return {
      successRate: all.length > 0 ? Math.round((successful / all.length) * 100) : 0,
      totalPending: pending,
      totalVolume: totalVolume
    };
  });

  columns = signal<TableColumn<Payment>[]>([]);

  tableHeaders = computed(() => this.columns().map(c => c.header));
  
  tableConfig = signal<TableConfig>({
    paginator: true,
    rows: 10,
    globalFilter: false,
    showGridlines: false,
    hoverable: true,
    size: 'normal'
  });

  actions = signal<TableAction<Payment>[]>([
    {
      icon: 'pi pi-eye',
      tooltip: 'View Details',
      command: (payment) => this.viewDetails(payment)
    }
  ]);

  ngOnInit() {
    // Check for query params
    this.route.queryParams.subscribe(params => {
      if (params['status']) {
        this.selectedStatusControl.setValue(params['status']);
      }
      this.fetchPayments();
    });

    this.columns.set([
      {
        field: 'id',
        header: 'Payment ID',
        width: '120px',
        sortable: true
      },
      {
        field: 'userName',
        header: 'User',
        sortable: true
      },
      {
        field: 'purpose',
        header: 'Purpose',
        width: '130px',
        sortable: true,
        template: this.purposeTemplate
      },
      {
        field: 'amount',
        header: 'Amount',
        width: '140px',
        sortable: true,
        align: 'right',
        formatter: (value: unknown, row: Payment) => `${row.displayCurrency || row.currency || 'USD'} ${Number(value).toLocaleString()}`
      },
      {
        field: 'method',
        header: 'Method',
        width: '150px'
      },
      {
        field: 'status',
        header: 'Status',
        width: '120px',
        align: 'center',
        template: this.statusTemplate
      },
      {
        field: 'createdAt',
        header: 'Date',
        width: '140px',
        sortable: true,
        formatter: (value: unknown) => new Date(value as string | number | Date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      }
    ]);

    this.selectedStatusControl.valueChanges.subscribe(() => {
      this.fetchPayments();
    });

    this.fromDateControl.valueChanges.subscribe(() => {
      this.fetchPayments();
    });

    this.toDateControl.valueChanges.subscribe(() => {
      this.fetchPayments();
    });
  }

  private fetchPayments(): void {
    const selectedStatus = this.selectedStatusControl.value as PaymentStatus | 'all' | null;
    const status = selectedStatus && selectedStatus !== 'all' ? (selectedStatus as PaymentStatus) : undefined;

    const fromDateStr = this.fromDateControl.value;
    const toDateStr = this.toDateControl.value;
    const fromDate = fromDateStr ? new Date(fromDateStr) : undefined;
    const toDate = toDateStr ? new Date(toDateStr) : undefined;

    this.tableLoading.set(true);
    this.paymentService.loadFromApi({ status, fromDate, toDate, limit: 50, offset: 0 }).subscribe({
      next: () => this.tableLoading.set(false),
      error: () => this.tableLoading.set(false)
    });
  }

  openFundingModal(): void {
    this.fundingModalVisible.set(true);
  }

  handleFundingConfirmed(payload: AdminFundingPayload): void {
    this.paymentService.adminFundUser(payload).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Funding Successful',
          detail: `Funded user ${payload.userId} with ${payload.currency} ${payload.amount}`
        });
        this.fundingModalVisible.set(false);
        this.fetchPayments();
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Funding Failed',
          detail: 'Unable to complete admin funding. Please try again.'
        });
      }
    });
  }

  handleFundingCancelled(): void {
    this.fundingModalVisible.set(false);
  }

  viewDetails(payment: Payment) {
    this.router.navigate(['/admin/payments', payment.id]);
  }

  onSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
  }

  onExport() {
    console.log('Export payments');
  }

  getPurposeClass(purpose: PaymentPurpose): string {
    switch (purpose) {
      case 'Registration': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'Funding': return 'bg-green-50 text-green-700 border-green-100';
      case 'Upgrade': return 'bg-purple-50 text-purple-700 border-purple-100';
      default: return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  }
}
