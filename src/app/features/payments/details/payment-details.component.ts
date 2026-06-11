import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { PaymentService } from '../services/payment.service';
import { PermissionService } from '../../../core/services/permission.service';
import { Feature, Action } from '../../../core/models/admin-permission.model';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { InfoBannerComponent } from '../../../shared/components/info-banner/info-banner.component';
import { PaymentActionModalComponent, PaymentActionType } from '../modals/payment-action-modal.component';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-payment-details',
  imports: [
    CommonModule,
    RouterModule,
    StatusBadgeComponent,
    InfoBannerComponent,
    PaymentActionModalComponent,
    ButtonModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './payment-details.component.html',
  styleUrls: ['./payment-details.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaymentDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private paymentService = inject(PaymentService);
  private messageService = inject(MessageService);
  protected permission = inject(PermissionService);

  canPerformPaymentActions = computed(
    () => this.permission.canEdit(Feature.Payments) && this.permission.canPerform(Action.MarkPaymentSuccessful)
  );
  isViewOnly = computed(() => !this.permission.canEdit(Feature.Payments));

  paymentId = signal<string | null>(null);
  
  // Modal State
  showActionModal = signal<boolean>(false);
  pendingAction = signal<PaymentActionType | null>(null);
  payment = computed(() => {
    const id = this.paymentId();
    return this.paymentService.getPaymentById(id);
  });

  statusHistory = computed(() => {
    const p = this.payment();
    return p ? [...p.statusHistory].reverse() : [];
  });

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.paymentId.set(params['id']);
      // Ensure payments are loaded if user lands directly on details
      if (!this.paymentService.getPaymentById(params['id'])) {
        this.paymentService.loadFromApi().subscribe();
      }
    });
  }

  get canConfirmSuccessful(): boolean {
    return this.payment()?.status === 'Pending';
  }

  get canFail(): boolean {
    return this.payment()?.status === 'Pending';
  }

  get canReverse(): boolean {
    return this.payment()?.status === 'Successful';
  }

  get canFlag(): boolean {
    return this.payment()?.status !== 'Reversed';
  }

  onMarkSuccessful() {
    this.pendingAction.set('ConfirmSuccess');
    this.showActionModal.set(true);
  }

  onMarkFailed() {
    this.pendingAction.set('Fail');
    this.showActionModal.set(true);
  }

  onReverse() {
    this.pendingAction.set('Reverse');
    this.showActionModal.set(true);
  }

  onFlag() {
    this.pendingAction.set('Flag');
    this.showActionModal.set(true);
  }

  handleActionConfirmed(event: { action: PaymentActionType, reason?: string }) {
    const payment = this.payment();
    if (!payment) return;

    const reason = (event.reason || '').trim() || 'No reason provided';
    const onSuccess = () => {
      this.paymentService.loadFromApi().subscribe();
      this.showActionModal.set(false);
      this.pendingAction.set(null);
    };
    const onError = (err: { error?: { message?: string }; message?: string }) => {
      const detail = err?.error?.message ?? err?.message ?? 'Request failed';
      this.messageService.add({ severity: 'error', summary: 'Action Failed', detail });
      this.showActionModal.set(false);
      this.pendingAction.set(null);
    };

    if (event.action === 'Flag') {
      this.paymentService.flagPayment(payment.id, reason).subscribe({
        next: () => {
          this.messageService.add({ severity: 'warn', summary: 'Transaction Flagged', detail: 'The transaction has been flagged for review.' });
          onSuccess();
        },
        error: onError
      });
    } else if (event.action === 'ConfirmSuccess') {
      this.paymentService.verifyPayment(payment.id).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Payment Verified', detail: 'Payment marked as successful via API.' });
          onSuccess();
        },
        error: onError
      });
    } else if (event.action === 'Fail') {
      this.paymentService.failPayment(payment.id, reason).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Payment Failed', detail: 'Payment has been marked as failed.' });
          onSuccess();
        },
        error: onError
      });
    } else if (event.action === 'Reverse') {
      this.paymentService.reversePayment(payment.id, reason).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Payment Reversed', detail: 'Payment has been reversed and wallet credited.' });
          onSuccess();
        },
        error: onError
      });
    } else {
      this.showActionModal.set(false);
      this.pendingAction.set(null);
    }
  }

  handleActionCancelled() {
    this.showActionModal.set(false);
    this.pendingAction.set(null);
  }
  getPurposeClass(purpose: string): string {
    switch (purpose) {
      case 'Registration': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'Funding': return 'bg-green-50 text-green-700 border-green-100';
      case 'Upgrade': return 'bg-purple-50 text-purple-700 border-purple-100';
      default: return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  }
}
