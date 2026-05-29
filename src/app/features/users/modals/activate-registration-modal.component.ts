import { Component, input, output, model, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { ActivateRegistrationPayload } from '../services/users.service';

@Component({
  selector: 'app-activate-registration-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    TextareaModule,
    SelectModule,
  ],
  templateUrl: './activate-registration-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivateRegistrationModalComponent {
  visible = model(false);
  userName = input('');

  confirmed = output<ActivateRegistrationPayload>();
  cancelled = output<void>();

  mode: 'DEBIT_REGISTRATION_WALLET' | 'WAIVE_PAYMENT' = 'DEBIT_REGISTRATION_WALLET';
  reason = '';
  submitting = false;

  modeOptions = [
    { label: 'Debit registration wallet', value: 'DEBIT_REGISTRATION_WALLET' },
    { label: 'Waive payment (complimentary)', value: 'WAIVE_PAYMENT' },
  ];

  onConfirm(): void {
    if (this.reason.trim().length < 10) return;
    this.confirmed.emit({ mode: this.mode, reason: this.reason.trim() });
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  resetForm(): void {
    this.mode = 'DEBIT_REGISTRATION_WALLET';
    this.reason = '';
    this.submitting = false;
  }
}
