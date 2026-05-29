import { Component, input, output, model, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { CreditVolumePayload } from '../services/users.service';

@Component({
  selector: 'app-credit-volume-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    InputNumberModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
  ],
  templateUrl: './credit-volume-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreditVolumeModalComponent {
  visible = model(false);
  userName = input('');

  confirmed = output<CreditVolumePayload>();
  cancelled = output<void>();

  amount: number | null = null;
  volumeType: 'CPV' | 'PERSONAL_PV' = 'CPV';
  reason = '';
  externalReference = '';
  submitting = false;

  volumeTypeOptions = [
    { label: 'CPV (may trigger milestones)', value: 'CPV' },
    { label: 'Personal PV (no milestone effects)', value: 'PERSONAL_PV' },
  ];

  onConfirm(): void {
    if (!this.amount || this.amount <= 0) return;
    if (this.reason.trim().length < 10) return;
    const payload: CreditVolumePayload = {
      amount: this.amount,
      volumeType: this.volumeType,
      reason: this.reason.trim(),
    };
    if (this.externalReference.trim()) {
      payload.externalReference = this.externalReference.trim();
    }
    this.confirmed.emit(payload);
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  resetForm(): void {
    this.amount = null;
    this.volumeType = 'CPV';
    this.reason = '';
    this.externalReference = '';
    this.submitting = false;
  }
}
