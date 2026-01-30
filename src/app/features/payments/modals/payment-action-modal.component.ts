import { Component, input, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { CheckboxModule } from 'primeng/checkbox';
import { Payment } from '../services/payment.service';

export type PaymentActionType = 'ConfirmSuccess' | 'Fail' | 'Flag' | 'Reverse';

@Component({
  selector: 'app-payment-action-modal',
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    TextareaModule,
    CheckboxModule
  ],
  templateUrl: './payment-action-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaymentActionModalComponent {
  visible = input<boolean>(false);
  payment = input<Payment | null | undefined>(null);
  action = input<PaymentActionType | null>(null);
  
  confirmed = output<{ action: PaymentActionType, reason?: string }>();
  cancelled = output<void>();

  reason = signal<string>('');
  confirmedCheck = signal<boolean>(false);
  fileSelected = signal<boolean>(false);

  get title(): string {
    switch (this.action()) {
      case 'ConfirmSuccess': return 'Confirm Payment Success';
      case 'Fail': return 'Mark as Failed';
      case 'Flag': return 'Flag Transaction';
      case 'Reverse': return 'Reverse Payment';
      default: return 'Confirm Action';
    }
  }

  get isManualConfirmation(): boolean {
    return this.action() === 'ConfirmSuccess' && this.payment()?.method === 'Bank Transfer';
  }

  get isIrreversible(): boolean {
    return this.action() === 'ConfirmSuccess' || this.action() === 'Reverse';
  }

  get confirmDisabled(): boolean {
    if (this.action() === 'Fail' || this.action() === 'Reverse') {
      return !this.reason().trim();
    }
    if (this.action() === 'Flag') {
      return !this.reason().trim();
    }
    if (this.isManualConfirmation) {
      return !this.confirmedCheck() || !this.fileSelected();
    }
    return false;
  }

  onFileSelect(event: Event) {
    const element = event.target as HTMLInputElement;
    if (element.files && element.files.length > 0) {
      this.fileSelected.set(true);
    }
  }

  onConfirm() {
    if (this.confirmDisabled) return;
    
    this.confirmed.emit({ 
      action: this.action()!, 
      reason: this.reason() || undefined 
    });
    this.reset();
  }

  onCancel() {
    this.cancelled.emit();
    this.reset();
  }

  private reset() {
    this.reason.set('');
    this.confirmedCheck.set(false);
    this.fileSelected.set(false);
  }
}
