import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import {
  ConfirmationModalComponent,
  ConfirmationResult,
} from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { InfoBannerComponent } from '../../../shared/components/info-banner/info-banner.component';
import { AdminLegacyService } from '../services/admin-legacy.service';
import { LegacyPackageCode } from '../models/admin-legacy.models';

@Component({
  selector: 'app-legacy-seed-enroll',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    InputTextModule,
    SelectModule,
    CheckboxModule,
    ToastModule,
    ConfirmationModalComponent,
    InfoBannerComponent,
  ],
  providers: [MessageService],
  templateUrl: './legacy-seed-enroll.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegacySeedEnrollComponent {
  private readonly fb = inject(FormBuilder);
  private readonly legacyService = inject(AdminLegacyService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);

  showConfirm = signal(false);
  submitting = signal(false);
  formError = signal<string | null>(null);

  packageOptions: { label: string; value: LegacyPackageCode }[] = [
    { label: 'VIP', value: 'VIP' },
    { label: 'Executive', value: 'EXECUTIVE' },
    { label: 'Supreme', value: 'SUPREME' },
  ];

  form = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(2)]],
    package: this.fb.nonNullable.control<LegacyPackageCode>('VIP', [
      Validators.required,
    ]),
    sponsorUsername: [''],
    waiveProductPurchase: [true],
  });

  openConfirm(): void {
    this.formError.set(null);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.formError.set('Enter a valid target username and package.');
      return;
    }
    this.showConfirm.set(true);
  }

  onConfirm(_result: ConfirmationResult): void {
    if (this.submitting()) return;
    this.submitting.set(true);
    this.formError.set(null);

    const raw = this.form.getRawValue();
    const sponsor = raw.sponsorUsername.trim();

    this.legacyService
      .enroll({
        username: raw.username.trim(),
        package: raw.package,
        ...(sponsor ? { sponsorUsername: sponsor } : {}),
        waivePurchase: raw.waiveProductPurchase,
      })
      .subscribe({
        next: (res) => {
          this.submitting.set(false);
          this.showConfirm.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Seed enrolled',
            detail: `@${raw.username.trim()} is now an ACTIVE Legacy member.`,
          });
          const userId = res?.userId;
          if (userId) {
            void this.router.navigate(['/admin/legacy/members', userId]);
          } else {
            void this.router.navigate(['/admin/legacy/members']);
          }
        },
        error: (err) => {
          this.submitting.set(false);
          this.showConfirm.set(false);
          const code =
            err?.error?.code ?? err?.error?.error ?? '';
          const message =
            (typeof err?.error?.message === 'string'
              ? err.error.message
              : Array.isArray(err?.error?.message)
                ? err.error.message[0]
                : undefined) ??
            err?.message ??
            'Seed enroll failed.';
          const detail = code ? `${code}: ${message}` : message;
          this.formError.set(detail);
          this.messageService.add({
            severity: 'error',
            summary: 'Seed enroll failed',
            detail,
          });
        },
      });
  }

  onCancelConfirm(): void {
    if (this.submitting()) return;
    this.showConfirm.set(false);
  }

  isInvalid(controlName: string): boolean {
    const c = this.form.get(controlName);
    return !!c && c.invalid && (c.touched || c.dirty);
  }
}
