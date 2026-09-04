import { Component, input, output, model, ChangeDetectionStrategy, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import {
  passwordMatchValidator,
  passwordStrengthValidator,
} from '../../../../../shared/validators/password.validator';

@Component({
  selector: 'app-set-user-password-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DialogModule, ButtonModule],
  templateUrl: './set-user-password-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetUserPasswordModalComponent {
  private readonly fb = new FormBuilder();

  visible = model(false);
  userName = input('');
  loading = input(false);

  confirmed = output<string>();
  cancelled = output<void>();

  showNewPassword = signal(false);
  showConfirmPassword = signal(false);

  readonly form = this.fb.nonNullable.group({
    newPassword: [
      '',
      [
        Validators.required,
        passwordStrengthValidator({
          minLength: 8,
          requireUppercase: false,
          requireLowercase: false,
          requireNumbers: false,
          requireSpecialChars: false,
        }),
      ],
    ],
    confirmPassword: ['', [Validators.required, passwordMatchValidator('newPassword')]],
  });

  constructor() {
    effect(() => {
      if (!this.visible()) {
        this.resetForm();
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid || this.loading()) return;
    this.confirmed.emit(this.form.controls.newPassword.value);
  }

  onCancel(): void {
    this.cancelled.emit();
    this.visible.set(false);
  }

  private resetForm(): void {
    this.form.reset({ newPassword: '', confirmPassword: '' });
    this.showNewPassword.set(false);
    this.showConfirmPassword.set(false);
  }
}
