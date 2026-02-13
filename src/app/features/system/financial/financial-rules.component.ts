import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormControl, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { ConfigInputComponent } from '../../../shared/components/config-input/config-input.component';
import { ConfirmationModalComponent, ConfirmationResult } from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { SystemConfigService } from '../services/system-config.service';

@Component({
  selector: 'app-financial-rules',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputNumberModule,
    ConfigInputComponent,
    ConfirmationModalComponent,
  ],
  templateUrl: './financial-rules.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinancialRulesComponent {
  private fb = inject(FormBuilder);
  protected config = inject(SystemConfigService);

  confirmVisible = signal(false);
  initialCash = signal(0);
  initialVoucher = signal(0);
  initialFee = signal(0);

  form = this.fb.group({
    withdrawalCashPercent: [70, [Validators.required, Validators.min(0), Validators.max(100)]],
    withdrawalVoucherPercent: [30, [Validators.required, Validators.min(0), Validators.max(100)]],
    feePercent: [2.5, [Validators.required, Validators.min(0), Validators.max(100)]],
  });

  cashControl = this.form.get('withdrawalCashPercent') as FormControl<number>;
  voucherControl = this.form.get('withdrawalVoucherPercent') as FormControl<number>;
  feeControl = this.form.get('feePercent') as FormControl<number>;

  lastModified = computed(() => {
    const cfg = this.config.financial();
    return cfg.lastModified ? new Date(cfg.lastModified).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : null;
  });
  lastModifiedBy = computed(() => this.config.financial().lastModifiedBy ?? null);

  isDirty = computed(() => {
    const c = this.form.get('withdrawalCashPercent')?.value ?? 0;
    const v = this.form.get('withdrawalVoucherPercent')?.value ?? 0;
    const f = this.form.get('feePercent')?.value ?? 0;
    return c !== this.initialCash() || v !== this.initialVoucher() || f !== this.initialFee();
  });

  constructor() {
    effect(() => {
      const f = this.config.financial();
      this.initialCash.set(f.withdrawalCashPercent);
      this.initialVoucher.set(f.withdrawalVoucherPercent);
      this.initialFee.set(f.feePercent);
      this.form.patchValue(
        {
          withdrawalCashPercent: f.withdrawalCashPercent,
          withdrawalVoucherPercent: f.withdrawalVoucherPercent,
          feePercent: f.feePercent,
        },
        { emitEvent: false }
      );
    });
  }

  onSaveClick(): void {
    this.confirmVisible.set(true);
  }

  onConfirm(result: ConfirmationResult): void {
    if (!result.confirmed) {
      this.confirmVisible.set(false);
      return;
    }
    const v = this.form.value;
    this.config.setFinancial({
      withdrawalCashPercent: v.withdrawalCashPercent ?? 70,
      withdrawalVoucherPercent: v.withdrawalVoucherPercent ?? 30,
      feePercent: v.feePercent ?? 2.5,
      lastModified: new Date().toISOString(),
      lastModifiedBy: 'Admin',
    });
    this.initialCash.set(v.withdrawalCashPercent ?? 70);
    this.initialVoucher.set(v.withdrawalVoucherPercent ?? 30);
    this.initialFee.set(v.feePercent ?? 2.5);
    this.confirmVisible.set(false);
  }

  onCancelConfirm(): void {
    this.confirmVisible.set(false);
  }
}
