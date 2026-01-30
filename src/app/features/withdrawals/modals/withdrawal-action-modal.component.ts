import { Component, input, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { WithdrawalRequest } from '../services/withdrawal.service';

export type ActionType = 'Approve' | 'Reject' | 'MarkProcessing' | 'MarkPaid';

@Component({
  selector: 'app-withdrawal-action-modal',
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    TextareaModule
  ],
  templateUrl: './withdrawal-action-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WithdrawalActionModalComponent {
  visible = input<boolean>(false);
  withdrawal = input<WithdrawalRequest | null | undefined>(null);
  action = input<ActionType | null>(null);
  
  confirmed = output<{ action: ActionType, reason?: string }>();
  cancelled = output<void>();

  reason = signal<string>('');

  get title(): string {
    switch (this.action()) {
      case 'Approve': return 'Approve Withdrawal';
      case 'Reject': return 'Reject Withdrawal';
      case 'MarkProcessing': return 'Mark as Processing';
      case 'MarkPaid': return 'Confirm Payment';
      default: return 'Confirm Action';
    }
  }

  get icon(): string {
    switch (this.action()) {
      case 'Approve': return 'pi pi-check-circle';
      case 'Reject': return 'pi pi-times-circle';
      case 'MarkProcessing': return 'pi pi-sync';
      case 'MarkPaid': return 'pi pi-money-bill';
      default: return 'pi pi-info-circle';
    }
  }

  get colorClass(): string {
    switch (this.action()) {
      case 'Approve': return 'text-green-600 bg-green-50';
      case 'Reject': return 'text-red-600 bg-red-50';
      case 'MarkProcessing': return 'text-blue-600 bg-blue-50';
      case 'MarkPaid': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  }

  get isIrreversible(): boolean {
    return this.action() === 'Reject' || this.action() === 'MarkPaid';
  }

  get message(): string {
    const w = this.withdrawal();
    if (!w) return '';
    
    switch (this.action()) {
      case 'Approve': 
        return `Are you sure you want to approve the withdrawal of ${w.currency} ${w.amount.toLocaleString()} for ${w.userName}?`;
      case 'Reject': 
        return `You are about to reject the withdrawal request for ${w.userName}. This action requires a reason.`;
      case 'MarkProcessing': 
        return `Change status to Processing for request ${w.id}? This indicates the payout is being handled.`;
      case 'MarkPaid': 
        return `Confirm that the payment of ${w.currency} ${w.netPayout.toLocaleString()} has been successfully sent.`;
      default: 
        return 'Are you sure you want to proceed?';
    }
  }

  get confirmLabel(): string {
    switch (this.action()) {
      case 'Approve': return 'Yes, Approve';
      case 'Reject': return 'Reject Request';
      case 'MarkProcessing': return 'Start Processing';
      case 'MarkPaid': return 'Confirm Paid';
      default: return 'Confirm';
    }
  }

  get confirmSeverity(): 'success' | 'danger' | 'info' | 'warn' | 'secondary' {
    switch (this.action()) {
      case 'Reject': return 'danger';
      case 'MarkProcessing': return 'info';
      default: return 'success';
    }
  }

  onConfirm() {
    const action = this.action();
    if (action === 'Reject' && !this.reason().trim()) {
      return;
    }
    
    if (action) {
      this.confirmed.emit({ 
        action: action, 
        reason: action === 'Reject' ? this.reason() : undefined 
      });
      this.reason.set('');
    }
  }

  onCancel() {
    this.cancelled.emit();
    this.reason.set('');
  }
}
