import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import {
  ConfirmationModalComponent,
  ConfirmationResult,
} from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { ManualPaymentRejectModalComponent } from '../../payments/modals/manual-payment-reject-modal.component';
import { RejectableSubmission } from '../../payments/models/rejectable-submission.model';
import { AdminLegacyService } from '../services/admin-legacy.service';

@Component({
  selector: 'app-legacy-payment-detail',
  imports: [
    CommonModule,
    RouterModule,
    ButtonModule,
    ToastModule,
    ConfirmationModalComponent,
    ManualPaymentRejectModalComponent,
  ],
  providers: [MessageService],
  templateUrl: './legacy-payment-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegacyPaymentDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly legacyService = inject(AdminLegacyService);
  private readonly messageService = inject(MessageService);

  payment = this.legacyService.paymentDetail;
  loading = this.legacyService.paymentDetailLoading;
  error = this.legacyService.paymentDetailError;

  showApproveConfirm = signal(false);
  showRejectModal = signal(false);
  actionLoading = signal(false);

  paymentId = '';

  isPending = computed(() => this.payment()?.status === 'PENDING');

  rejectSubmission = computed((): RejectableSubmission | null => {
    const p = this.payment();
    if (!p) return null;
    return {
      id: p.id,
      depositorName: p.depositorName ?? '—',
      amount: p.amount,
      currency: p.currency,
    };
  });

  ngOnInit(): void {
    this.paymentId = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.paymentId) {
      this.legacyService.getPayment(this.paymentId).subscribe();
    }
  }

  retry(): void {
    if (this.paymentId) {
      this.legacyService.getPayment(this.paymentId).subscribe();
    }
  }

  requestApprove(): void {
    this.showApproveConfirm.set(true);
  }

  onConfirmApprove(_result: ConfirmationResult): void {
    const p = this.payment();
    if (!p || this.actionLoading()) return;

    this.actionLoading.set(true);
    this.legacyService.approvePayment(p.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Payment approved',
          detail: 'Legacy membership payment has been approved.',
        });
        this.actionLoading.set(false);
        this.showApproveConfirm.set(false);
        this.legacyService.getPayment(p.id).subscribe();
      },
      error: (err) => {
        const detail =
          err?.error?.message ?? err?.message ?? 'Could not approve payment.';
        this.messageService.add({
          severity: 'error',
          summary: 'Approval failed',
          detail: typeof detail === 'string' ? detail : 'Approval failed.',
        });
        this.actionLoading.set(false);
        this.showApproveConfirm.set(false);
      },
    });
  }

  onCancelApprove(): void {
    if (this.actionLoading()) return;
    this.showApproveConfirm.set(false);
  }

  onRejectClick(): void {
    this.showRejectModal.set(true);
  }

  handleRejectConfirmed(reason: string): void {
    const p = this.payment();
    if (!p) return;

    this.actionLoading.set(true);
    this.showRejectModal.set(false);

    this.legacyService.rejectPayment(p.id, reason).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Payment rejected',
          detail: 'The member can submit a new payment.',
        });
        this.actionLoading.set(false);
        this.legacyService.getPayment(p.id).subscribe();
      },
      error: (err) => {
        const detail =
          err?.error?.message ?? err?.message ?? 'Could not reject payment.';
        this.messageService.add({
          severity: 'error',
          summary: 'Rejection failed',
          detail: typeof detail === 'string' ? detail : 'Rejection failed.',
        });
        this.actionLoading.set(false);
      },
    });
  }

  handleRejectCancelled(): void {
    this.showRejectModal.set(false);
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

  formatMoney(value: number | null | undefined, currency = 'NGN'): string {
    if (value == null) return '—';
    const prefix = currency === 'USD' ? '$' : '₦';
    return `${prefix}${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }

  packageLabel(code: string | undefined | null): string {
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
}
