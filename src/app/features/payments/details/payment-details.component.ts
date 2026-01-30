import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { PaymentService, Payment } from '../services/payment.service';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
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
    PaymentActionModalComponent,
    ButtonModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './payment-details.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaymentDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private paymentService = inject(PaymentService);
  private messageService = inject(MessageService);

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

    if (event.action === 'Flag') {
      this.paymentService.flagPayment(payment.id, event.reason || 'Flagged by admin', 'Admin Sarah');
      this.messageService.add({ severity: 'warn', summary: 'Transaction Flagged', detail: 'The transaction has been flagged for review.' });
    } else {
      let nextStatus: any = 'Successful';
      if (event.action === 'Fail') nextStatus = 'Failed';
      if (event.action === 'Reverse') nextStatus = 'Reversed';

      this.paymentService.updateStatus(payment.id, nextStatus, 'Admin Sarah', event.reason);
      this.messageService.add({ severity: 'success', summary: 'Status Updated', detail: `Payment status changed to ${nextStatus}` });
    }

    this.showActionModal.set(false);
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
