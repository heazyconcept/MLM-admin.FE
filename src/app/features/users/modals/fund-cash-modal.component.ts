import { Component, input, output, model, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { FundCASHWalletPayload } from '../services/users.service';

@Component({
  selector: 'app-fund-cash-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    TextareaModule,
  ],
  templateUrl: './fund-cash-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FundCashModalComponent {
  visible = model(false);
  userId = input('');
  userName = input('');

  confirmed = output<FundCASHWalletPayload>();
  cancelled = output<void>();

  amount: number | null = null;
  currency = 'NGN';
  reason = '';
  submitting = false;

  currencyOptions = [
    { label: 'NGN', value: 'NGN' },
    { label: 'USD', value: 'USD' },
  ];

  onConfirm(): void {
    if (!this.amount || this.amount <= 0) return;
    if (this.reason.trim().length < 10) return;
    this.confirmed.emit({
      userId: this.userId(),
      amount: this.amount,
      currency: this.currency,
      reason: this.reason.trim(),
    });
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  resetForm(): void {
    this.amount = null;
    this.currency = 'NGN';
    this.reason = '';
    this.submitting = false;
  }
}
