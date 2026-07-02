import {
  Component,
  inject,
  computed,
  signal,
  ChangeDetectionStrategy,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import {
  ManualPaymentService,
  ManualRegistrationPayment,
  ManualPaymentStatus
} from '../services/manual-payment.service';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-manual-payments-list',
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    DataTableComponent,
    StatusBadgeComponent,
    ButtonModule,
    ToastModule
  ],
  templateUrl: './manual-payments-list.component.html',
  styleUrls: ['./manual-payments-list.component.css'],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ManualPaymentsListComponent implements OnInit {
  private manualPaymentService = inject(ManualPaymentService);
  private router = inject(Router);

  payments = this.manualPaymentService.payments;
  tableLoading = signal(false);

  selectedStatusControl = new FormControl('PENDING');
  searchVal = signal<string>('');
  searchQuery = signal<string>('');

  statusOptions = [
    { label: 'All Statuses', value: 'all' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Rejected', value: 'REJECTED' }
  ];

  filteredPayments = computed(() => this.payments());

  stats = computed(() => {
    const all = this.payments();
    const pending = all.filter(p => p.status === 'PENDING').length;
    const approved = all.filter(p => p.status === 'APPROVED').length;
    const rejected = all.filter(p => p.status === 'REJECTED').length;

    return { pending, approved, rejected, total: all.length };
  });

  tableHeaders = signal([
    'Submission ID',
    'User',
    'Package',
    'Amount',
    'Depositor',
    'Status',
    'Submitted'
  ]);

  ngOnInit(): void {
    this.fetchPayments();

    this.selectedStatusControl.valueChanges.subscribe(() => {
      this.fetchPayments();
    });
  }

  private fetchPayments(): void {
    const selectedStatus = this.selectedStatusControl.value as ManualPaymentStatus | 'all' | null;
    const status = selectedStatus && selectedStatus !== 'all'
      ? (selectedStatus as ManualPaymentStatus)
      : undefined;
    const search = this.searchQuery();

    this.tableLoading.set(true);
    this.manualPaymentService.loadFromApi({
      status,
      search: search || undefined,
      limit: 50,
      offset: 0
    }).subscribe({
      next: () => this.tableLoading.set(false),
      error: () => this.tableLoading.set(false)
    });
  }

  viewDetails(payment: ManualRegistrationPayment): void {
    this.router.navigate(['/admin/payments/manual', payment.id]);
  }

  onSearch(): void {
    this.searchQuery.set(this.searchVal().trim());
    this.fetchPayments();
  }

  getStatusDisplay(status: ManualPaymentStatus): string {
    const map: Record<ManualPaymentStatus, string> = {
      PENDING: 'Pending',
      APPROVED: 'Approved',
      REJECTED: 'Rejected'
    };
    return map[status] ?? status;
  }

  formatPackage(packageId: string): string {
    if (!packageId) return '—';
    return packageId
      .split(/[_\s]+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }
}
