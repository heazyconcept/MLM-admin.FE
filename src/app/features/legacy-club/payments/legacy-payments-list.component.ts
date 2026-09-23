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
import { RouterModule } from '@angular/router';
import { TablePageEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import {
  ConfirmationModalComponent,
  ConfirmationResult,
} from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { ManualPaymentRejectModalComponent } from '../../payments/modals/manual-payment-reject-modal.component';
import { RejectableSubmission } from '../../payments/models/rejectable-submission.model';
import { AdminLegacyService } from '../services/admin-legacy.service';
import {
  AdminLegacyPayment,
  LegacyPaymentStatus,
  legacyPaymentAmountNgn,
  legacyPaymentUsername,
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
    ConfirmationModalComponent,
    ManualPaymentRejectModalComponent,
  ],
  providers: [MessageService],
  templateUrl: './legacy-payments-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegacyPaymentsListComponent implements OnInit {
  private readonly legacyService = inject(AdminLegacyService);
  private readonly messageService = inject(MessageService);

  payments = this.legacyService.payments;
  total = this.legacyService.paymentsTotal;
  loading = this.legacyService.paymentsLoading;
  error = this.legacyService.paymentsError;

  searchVal = signal('');
  statusFilter = signal<LegacyPaymentStatus | ''>('PENDING');
  tableFirst = signal(0);
  pageRows = signal(20);
  actionPaymentId = signal<string | null>(null);
  showApproveConfirm = signal(false);
  showRejectModal = signal(false);
  pendingAction = signal<AdminLegacyPayment | null>(null);

  statusOptions: { label: string; value: LegacyPaymentStatus | '' }[] = [
    { label: 'Pending', value: 'PENDING' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Rejected', value: 'REJECTED' },
    { label: 'All statuses', value: '' },
  ];

  pendingCount = computed(
    () => this.payments().filter((p) => p.status === 'PENDING').length
  );

  rejectSubmission = computed((): RejectableSubmission | null => {
    const p = this.pendingAction();
    if (!p) return null;
    return {
      id: p.id,
      depositorName: p.depositorName ?? legacyPaymentUsername(p) ?? '—',
      amount: legacyPaymentAmountNgn(p),
      currency: 'NGN',
    };
  });

  approveMessage = computed(() => {
    const row = this.pendingAction();
    if (!row) return 'Approve this Legacy payment?';
    return `Approve ${this.formatMoney(this.paymentAmount(row))} for @${this.paymentUsername(row)}?`;
  });

  tableHeaders = [
    'User',
    'Purpose',
    'Package',
    'Amount',
    'Depositor',
    'Evidence',
    'Status',
    'Submitted',
    'Actions',
  ];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.legacyService
      .loadPayments({
        offset: this.tableFirst(),
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

  isRowBusy(row: AdminLegacyPayment): boolean {
    return this.actionPaymentId() === row.id;
  }

  requestApprove(row: AdminLegacyPayment, event: Event): void {
    event.stopPropagation();
    this.pendingAction.set(row);
    this.showApproveConfirm.set(true);
  }

  onConfirmApprove(_result: ConfirmationResult): void {
    const row = this.pendingAction();
    if (!row || this.actionPaymentId()) return;

    this.actionPaymentId.set(row.id);
    this.legacyService.approvePayment(row.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Payment approved',
          detail: `@${legacyPaymentUsername(row) ?? 'Member'} Legacy payment approved.`,
        });
        this.actionPaymentId.set(null);
        this.pendingAction.set(null);
        this.showApproveConfirm.set(false);
        this.load();
      },
      error: (err) => {
        const detail =
          err?.error?.message ?? err?.message ?? 'Could not approve payment.';
        this.messageService.add({
          severity: 'error',
          summary: 'Approval failed',
          detail: typeof detail === 'string' ? detail : 'Approval failed.',
        });
        this.actionPaymentId.set(null);
        this.showApproveConfirm.set(false);
      },
    });
  }

  onCancelApprove(): void {
    if (this.actionPaymentId()) return;
    this.showApproveConfirm.set(false);
    this.pendingAction.set(null);
  }

  requestReject(row: AdminLegacyPayment, event: Event): void {
    event.stopPropagation();
    this.pendingAction.set(row);
    this.showRejectModal.set(true);
  }

  handleRejectConfirmed(reason: string): void {
    const row = this.pendingAction();
    if (!row) return;

    this.actionPaymentId.set(row.id);
    this.showRejectModal.set(false);

    this.legacyService.rejectPayment(row.id, reason).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Payment rejected',
          detail: 'The member can submit a new payment.',
        });
        this.actionPaymentId.set(null);
        this.pendingAction.set(null);
        this.load();
      },
      error: (err) => {
        const detail =
          err?.error?.message ?? err?.message ?? 'Could not reject payment.';
        this.messageService.add({
          severity: 'error',
          summary: 'Rejection failed',
          detail: typeof detail === 'string' ? detail : 'Rejection failed.',
        });
        this.actionPaymentId.set(null);
      },
    });
  }

  handleRejectCancelled(): void {
    this.showRejectModal.set(false);
    if (!this.actionPaymentId()) {
      this.pendingAction.set(null);
    }
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

  formatMoney(amount: number): string {
    return `₦${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }

  paymentAmount(row: AdminLegacyPayment): number {
    return legacyPaymentAmountNgn(row);
  }

  paymentUsername(row: AdminLegacyPayment): string {
    return legacyPaymentUsername(row) ?? '—';
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
