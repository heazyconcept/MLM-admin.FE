import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TablePageEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { AdminLegacyService } from '../services/admin-legacy.service';
import {
  AdminLegacyPayment,
  LegacyPaymentStatus,
} from '../models/admin-legacy.models';

@Component({
  selector: 'app-legacy-payments-list',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    ToastModule,
    DataTableComponent,
  ],
  providers: [MessageService],
  templateUrl: './legacy-payments-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegacyPaymentsListComponent implements OnInit {
  private readonly legacyService = inject(AdminLegacyService);
  private readonly router = inject(Router);

  payments = this.legacyService.payments;
  total = this.legacyService.paymentsTotal;
  loading = this.legacyService.paymentsLoading;
  error = this.legacyService.paymentsError;

  searchVal = signal('');
  statusFilter = signal<LegacyPaymentStatus | ''>('PENDING');
  tableFirst = signal(0);
  pageRows = signal(20);

  statusOptions: { label: string; value: LegacyPaymentStatus | '' }[] = [
    { label: 'Pending', value: 'PENDING' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Rejected', value: 'REJECTED' },
    { label: 'All statuses', value: '' },
  ];

  pendingCount = computed(
    () => this.payments().filter((p) => p.status === 'PENDING').length
  );

  tableHeaders = [
    'User',
    'Purpose',
    'Package',
    'Amount',
    'Depositor',
    'Status',
    'Submitted',
  ];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const page = Math.floor(this.tableFirst() / this.pageRows()) + 1;
    this.legacyService
      .loadPayments({
        page,
        limit: this.pageRows(),
        search: this.searchVal(),
        status: this.statusFilter(),
      })
      .subscribe();
  }

  onSearch(): void {
    this.tableFirst.set(0);
    this.load();
  }

  onFilterChange(): void {
    this.tableFirst.set(0);
    this.load();
  }

  onPageChange(event: TablePageEvent): void {
    this.tableFirst.set(event.first ?? 0);
    this.pageRows.set(event.rows ?? 20);
    this.load();
  }

  openDetail(row: AdminLegacyPayment): void {
    void this.router.navigate(['/admin/legacy/payments', row.id]);
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatMoney(
    value: number | null | undefined,
    currency: string | undefined = 'NGN'
  ): string {
    if (value == null) return '—';
    const prefix = currency === 'USD' ? '$' : '₦';
    return `${prefix}${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }

  packageLabel(code: string | undefined): string {
    if (!code) return '—';
    const labels: Record<string, string> = {
      VIP: 'VIP',
      EXECUTIVE: 'Executive',
      SUPREME: 'Supreme',
    };
    return labels[code] ?? code;
  }

  purposeLabel(purpose: string | undefined): string {
    if (!purpose) return '—';
    const labels: Record<string, string> = {
      JOIN: 'Join',
      UPGRADE: 'Upgrade',
      REACTIVATE: 'Reactivate',
    };
    return labels[purpose] ?? purpose;
  }

  statusClass(status: string | undefined): string {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-100 text-amber-800';
      case 'APPROVED':
        return 'bg-emerald-100 text-emerald-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  }

  statusLabel(status: string | undefined): string {
    if (!status) return '—';
    return status.charAt(0) + status.slice(1).toLowerCase();
  }

  retry(): void {
    this.load();
  }
}
