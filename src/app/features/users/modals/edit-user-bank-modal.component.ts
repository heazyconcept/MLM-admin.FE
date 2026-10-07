import {
  Component,
  input,
  output,
  model,
  ChangeDetectionStrategy,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import {
  UpdateUserBankPayload,
  UserBankDetails,
} from '../services/users.service';

@Component({
  selector: 'app-edit-user-bank-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
  ],
  templateUrl: './edit-user-bank-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditUserBankModalComponent {
  private readonly fb = new FormBuilder();

  visible = model(false);
  userName = input('');
  initialBank = input<UserBankDetails | null>(null);
  loading = input(false);

  confirmed = output<UpdateUserBankPayload>();
  cancelled = output<void>();

  readonly accountTypeOptions = [
    { label: 'Savings', value: 'SAVINGS' as const },
    { label: 'Current', value: 'CURRENT' as const },
  ];

  readonly form = this.fb.nonNullable.group({
    bankName: ['', [Validators.required, Validators.maxLength(200)]],
    accountNumber: [
      '',
      [Validators.required, Validators.pattern(/^\d{10,20}$/)],
    ],
    accountName: ['', [Validators.required, Validators.maxLength(200)]],
    accountType: ['SAVINGS' as 'SAVINGS' | 'CURRENT', [Validators.required]],
    reason: ['', [Validators.maxLength(500)]],
  });

  constructor() {
    effect(() => {
      if (this.visible()) {
        this.patchFromInitial(this.initialBank());
      } else {
        this.resetForm();
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid || this.loading()) return;
    const value = this.form.getRawValue();
    const payload: UpdateUserBankPayload = {
      bankName: value.bankName.trim(),
      accountNumber: value.accountNumber.trim(),
      accountName: value.accountName.trim(),
      accountType: value.accountType,
    };
    const reason = value.reason.trim();
    if (reason) {
      payload.reason = reason;
    }
    this.confirmed.emit(payload);
  }

  onCancel(): void {
    this.cancelled.emit();
    this.visible.set(false);
  }

  private patchFromInitial(bank: UserBankDetails | null): void {
    this.form.reset({
      bankName: bank?.bankName ?? '',
      accountNumber: bank?.accountNumber ?? '',
      accountName: bank?.accountName ?? '',
      accountType: bank?.accountType ?? 'SAVINGS',
      reason: '',
    });
  }

  private resetForm(): void {
    this.form.reset({
      bankName: '',
      accountNumber: '',
      accountName: '',
      accountType: 'SAVINGS',
      reason: '',
    });
  }
}
