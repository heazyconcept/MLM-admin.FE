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
  selector: 'app-thresholds-limits',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputNumberModule,
    ConfigInputComponent,
    ConfirmationModalComponent,
  ],
  templateUrl: './thresholds-limits.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThresholdsLimitsComponent {
  private fb = inject(FormBuilder);
  protected config = inject(SystemConfigService);

  confirmVisible = signal(false);
  initialValues = signal<{ min: number; max: number; daily: number; rank: number }>({ min: 0, max: 0, daily: 0, rank: 0 });

  form = this.fb.group({
    minWithdrawal: [50, [Validators.required, Validators.min(0)]],
    maxWithdrawal: [10000, [Validators.required, Validators.min(0)]],
    dailyTransactionLimit: [50000, [Validators.required, Validators.min(0)]],
    rankProgressionThreshold: [1000, [Validators.required, Validators.min(0)]],
  });

  minControl = this.form.get('minWithdrawal') as FormControl<number>;
  maxControl = this.form.get('maxWithdrawal') as FormControl<number>;
  dailyControl = this.form.get('dailyTransactionLimit') as FormControl<number>;
  rankControl = this.form.get('rankProgressionThreshold') as FormControl<number>;

  lastModified = computed(() => {
    const cfg = this.config.thresholds();
    return cfg.lastModified ? new Date(cfg.lastModified).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : null;
  });
  lastModifiedBy = computed(() => this.config.thresholds().lastModifiedBy ?? null);

  isDirty = computed(() => {
    const v = this.form.value;
    const init = this.initialValues();
    return (
      (v.minWithdrawal ?? 0) !== init.min ||
      (v.maxWithdrawal ?? 0) !== init.max ||
      (v.dailyTransactionLimit ?? 0) !== init.daily ||
      (v.rankProgressionThreshold ?? 0) !== init.rank
    );
  });

  constructor() {
    effect(() => {
      const t = this.config.thresholds();
      this.initialValues.set({
        min: t.minWithdrawal,
        max: t.maxWithdrawal,
        daily: t.dailyTransactionLimit,
        rank: t.rankProgressionThreshold,
      });
      this.form.patchValue(
        {
          minWithdrawal: t.minWithdrawal,
          maxWithdrawal: t.maxWithdrawal,
          dailyTransactionLimit: t.dailyTransactionLimit,
          rankProgressionThreshold: t.rankProgressionThreshold,
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
    this.config.setThresholds({
      minWithdrawal: v.minWithdrawal ?? 50,
      maxWithdrawal: v.maxWithdrawal ?? 10000,
      dailyTransactionLimit: v.dailyTransactionLimit ?? 50000,
      rankProgressionThreshold: v.rankProgressionThreshold ?? 1000,
      lastModified: new Date().toISOString(),
      lastModifiedBy: 'Admin',
    });
    this.initialValues.set({
      min: v.minWithdrawal ?? 50,
      max: v.maxWithdrawal ?? 10000,
      daily: v.dailyTransactionLimit ?? 50000,
      rank: v.rankProgressionThreshold ?? 1000,
    });
    this.confirmVisible.set(false);
  }

  onCancelConfirm(): void {
    this.confirmVisible.set(false);
  }
}
