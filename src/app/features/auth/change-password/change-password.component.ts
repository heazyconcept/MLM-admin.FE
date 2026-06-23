import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { AuthService } from '../../../core/services/auth.service';
import { ModalService } from '../../../core/services/modal.service';
import {
  passwordMatchValidator,
  passwordStrengthValidator,
} from '../../../../../shared/validators/password.validator';

@Component({
  selector: 'app-change-password',
  imports: [CommonModule, ReactiveFormsModule, InputTextModule],
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangePasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly modalService = inject(ModalService);

  readonly isLoading = signal(false);
  readonly showCurrentPassword = signal(false);
  readonly showNewPassword = signal(false);
  readonly showConfirmPassword = signal(false);

  readonly form: FormGroup = this.fb.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, passwordStrengthValidator()]],
    confirmPassword: ['', [Validators.required, passwordMatchValidator('newPassword')]],
  });

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    const { currentPassword, newPassword } = this.form.value;

    this.authService.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.modalService.open(
          'success',
          'Password Updated',
          'Your password has been changed. You can now access the admin panel.'
        );
        setTimeout(() => {
          this.router.navigate(['/admin/dashboard']);
        }, 1200);
      },
      error: (err) => {
        this.isLoading.set(false);
        const message = this.extractErrorMessage(err);
        this.modalService.open('error', 'Password Change Failed', message);
      },
    });
  }

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  toggleVisibility(field: 'current' | 'new' | 'confirm'): void {
    switch (field) {
      case 'current':
        this.showCurrentPassword.update((value) => !value);
        break;
      case 'new':
        this.showNewPassword.update((value) => !value);
        break;
      case 'confirm':
        this.showConfirmPassword.update((value) => !value);
        break;
    }
  }

  private extractErrorMessage(error: unknown): string {
    if (
      typeof error === 'object' &&
      error !== null &&
      'error' in error &&
      typeof (error as { error: unknown }).error === 'object' &&
      (error as { error: { message?: unknown } }).error !== null
    ) {
      const message = (error as { error: { message?: unknown } }).error.message;
      if (Array.isArray(message)) {
        return message.join(', ');
      }
      if (typeof message === 'string') {
        return message;
      }
    }

    return 'Unable to change password. Please check your current password and try again.';
  }
}
