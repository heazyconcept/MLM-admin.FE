import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';

export interface AdminFundingPayload {
  userId: string;
  amount: number;
  currency: string;
  provider: string;
  reference?: string;
  notes?: string;
}

@Component({
  selector: 'app-admin-funding-modal',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    TextareaModule
  ],
  templateUrl: './admin-funding-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminFundingModalComponent {
  visible = input<boolean>(false);

  confirmed = output<AdminFundingPayload>();
  cancelled = output<void>();

  form: FormGroup;

  currencyOptions = [
    { label: 'NGN', value: 'NGN' },
    { label: 'USD', value: 'USD' }
  ];

  providerOptions = [
    { label: 'Paystack', value: 'PAYSTACK' },
    { label: 'Flutterwave', value: 'FLUTTERWAVE' },
    { label: 'USDT', value: 'USDT' },
    { label: 'Admin', value: 'ADMIN' },
    { label: 'Direct Account', value: 'DIRECT_ACCOUNT' }
  ];

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      userId: ['', [Validators.required]],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      currency: ['NGN', [Validators.required]],
      provider: ['ADMIN', [Validators.required]],
      reference: [''],
      notes: ['']
    });
  }

  get isValid(): boolean {
    return this.form.valid;
  }

  onConfirm(): void {
    if (!this.form.valid) {
      this.form.markAllAsTouched();
      return;
    }
    this.confirmed.emit(this.form.value as AdminFundingPayload);
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}

