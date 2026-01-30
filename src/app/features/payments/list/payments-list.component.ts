import { Component, inject, computed, signal, ChangeDetectionStrategy, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PaymentService, Payment, PaymentStatus, PaymentPurpose } from '../services/payment.service';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { DataTableTemplateDirective } from '../../../shared/components/data-table/data-table-template.directive';
import { TableColumn, TableConfig, TableAction } from '../../../shared/components/data-table/data-table.types';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-payments-list',
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    DataTableComponent,
    DataTableTemplateDirective,
    StatusBadgeComponent,
    ButtonModule
  ],
  templateUrl: './payments-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaymentsListComponent implements OnInit {
  private paymentService = inject(PaymentService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  @ViewChild('purpose', { static: true }) purposeTemplate!: TemplateRef<unknown>;
  @ViewChild('status', { static: true }) statusTemplate!: TemplateRef<unknown>;

  payments = this.paymentService.payments;
  
  selectedStatus = signal<string>('all');
  selectedMethod = signal<string>('all');
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

  filteredPayments = computed(() => {
    let requests = this.payments();
    
    if (this.selectedStatus() !== 'all') {
      requests = requests.filter(r => r.status === this.selectedStatus());
    }

    if (this.selectedMethod() !== 'all') {
      requests = requests.filter(r => r.method === this.selectedMethod());
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
        this.selectedStatus.set(params['status']);
      }
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
        formatter: (value, row) => `${row.currency} ${value.toLocaleString()}`
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
        field: 'date',
        header: 'Date',
        width: '140px',
        sortable: true,
        formatter: (value) => new Date(value).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      }
    ]);
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
