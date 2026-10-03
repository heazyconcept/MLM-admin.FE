import {
  Component,
  input,
  output,
  model,
  inject,
  signal,
  effect,
  untracked,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import {
  AdminLegacyUpgradeQuote,
  LegacyPackageCode,
  legacyPackageLabel,
} from '../models/admin-legacy.models';
import { AdminLegacyService } from '../services/admin-legacy.service';

export interface LegacyUpgradeConfirmPayload {
  package: LegacyPackageCode;
  debitCustomer: boolean;
  reason: string;
  requestKey: string;
}

@Component({
  selector: 'app-legacy-upgrade-modal',
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    SelectModule,
    TextareaModule,
    ToggleSwitchModule,
  ],
  templateUrl: './legacy-upgrade-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegacyUpgradeModalComponent {
  private readonly legacyService = inject(AdminLegacyService);

  visible = model(false);
  userId = input('');
  userName = input('');
  currentPackage = input<LegacyPackageCode>('VIP');
  packageOptions = input<{ label: string; value: LegacyPackageCode }[]>([]);
  submitting = input(false);

  confirmed = output<LegacyUpgradeConfirmPayload>();
  cancelled = output<void>();

  selectedPackage: LegacyPackageCode | null = null;
  debitCustomer = true;
  reason = '';
  quote = signal<AdminLegacyUpgradeQuote | null>(null);
  quoteLoading = signal(false);
  quoteError = signal<string | null>(null);
  private requestKey: string | null = null;

  constructor() {
    let wasVisible = false;
    effect(() => {
      const isVisible = this.visible();
      if (isVisible && !wasVisible) {
        untracked(() => this.resetForm());
      }
      wasVisible = isVisible;
    });
  }

  onPackageChange(target: LegacyPackageCode | null): void {
    this.selectedPackage = target;
    this.quote.set(null);
    this.quoteError.set(null);

    const userId = this.userId();
    if (!target || !userId) return;
    this.loadQuote(userId, target);
  }

  packageLabel(code: LegacyPackageCode | string | null | undefined): string {
    return legacyPackageLabel(code);
  }

  formatMoney(value: number | null | undefined, currency = 'NGN'): string {
    if (value == null) return '—';
    const prefix = currency === 'USD' ? '$' : '₦';
    return `${prefix}${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }

  onDebitCustomerChange(value: boolean): void {
    const q = this.quote();
    if (value && q && !q.canDebit) return;
    this.debitCustomer = value;
  }

  canEnableDebitToggle(): boolean {
    const q = this.quote();
    return !q || q.canDebit;
  }

  canSubmit(): boolean {
    return (
      !!this.selectedPackage &&
      this.reason.trim().length >= 10 &&
      !this.quoteLoading() &&
      !!this.quote() &&
      (!this.debitCustomer || this.quote()?.canDebit === true)
    );
  }

  onConfirm(): void {
    if (!this.canSubmit() || !this.selectedPackage || this.submitting()) return;

    if (!this.requestKey) {
      this.requestKey = crypto.randomUUID();
    }

    this.confirmed.emit({
      package: this.selectedPackage,
      debitCustomer: this.debitCustomer,
      reason: this.reason.trim(),
      requestKey: this.requestKey,
    });
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  resetForm(): void {
    this.selectedPackage = null;
    this.debitCustomer = true;
    this.reason = '';
    this.quote.set(null);
    this.quoteError.set(null);
    this.quoteLoading.set(false);
    this.requestKey = null;
  }

  private loadQuote(userId: string, targetPackage: LegacyPackageCode): void {
    this.quoteLoading.set(true);
    this.quoteError.set(null);
    this.quote.set(null);

    this.legacyService.getUpgradeQuote(userId, targetPackage).subscribe({
      next: (data) => {
        this.quote.set(data);
        this.quoteLoading.set(false);
        if (this.debitCustomer && !data.canDebit) {
          this.debitCustomer = false;
        }
      },
      error: (err: unknown) => {
        this.quoteLoading.set(false);
        const http = err as { error?: { message?: string | string[] } };
        const msg = http?.error?.message;
        this.quoteError.set(
          Array.isArray(msg) ? msg.join(', ') : msg ?? 'Could not load upgrade quote.',
        );
      },
    });
  }
}
