import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  effect,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormControl, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { ConfigInputComponent } from '../../../shared/components/config-input/config-input.component';
import { ConfirmationModalComponent, ConfirmationResult } from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { RankingRule, SystemConfigService } from '../services/system-config.service';

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
export class FinancialRulesComponent implements OnInit {
  private fb = inject(FormBuilder);
  protected config = inject(SystemConfigService);

  confirmVisible = signal(false);
  saveLoading = signal(false);
  saveError = signal<string | null>(null);
  initialCash = signal(0);
  initialVoucher = signal(0);
  initialFee = signal(0);
  editingRuleIndex = signal<number | null>(null);
  rankingRulesDraft = signal<RankingRule[]>([]);
  initialRankingSnapshot = signal('[]');

  form = this.fb.group({
    withdrawalCashPercent: [70, [Validators.required, Validators.min(0), Validators.max(100)]],
    withdrawalVoucherPercent: [30, [Validators.required, Validators.min(0), Validators.max(100)]],
    feePercent: [2.5, [Validators.required, Validators.min(0), Validators.max(100)]],
  });

  rankingForm = this.fb.group({
    stage: [1, [Validators.required, Validators.min(1)]],
    rankName: ['', [Validators.required, Validators.maxLength(60)]],
    requiredLevel: [1, [Validators.required, Validators.min(1)]],
    bonusAmount: [0, [Validators.required, Validators.min(0)]],
  });

  cashControl = this.form.get('withdrawalCashPercent') as FormControl<number>;
  voucherControl = this.form.get('withdrawalVoucherPercent') as FormControl<number>;
  feeControl = this.form.get('feePercent') as FormControl<number>;
  stageControl = this.rankingForm.get('stage') as FormControl<number>;
  rankNameControl = this.rankingForm.get('rankName') as FormControl<string>;
  requiredLevelControl = this.rankingForm.get('requiredLevel') as FormControl<number>;
  bonusAmountControl = this.rankingForm.get('bonusAmount') as FormControl<number>;

  lastModified = computed(() => {
    const cfg = this.config.financial();
    return cfg.lastModified ? new Date(cfg.lastModified).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : null;
  });
  lastModifiedBy = computed(() => this.config.financial().lastModifiedBy ?? null);

  isFinancialDirty = computed(() => {
    const c = this.form.get('withdrawalCashPercent')?.value ?? 0;
    const v = this.form.get('withdrawalVoucherPercent')?.value ?? 0;
    const f = this.form.get('feePercent')?.value ?? 0;
    return c !== this.initialCash() || v !== this.initialVoucher() || f !== this.initialFee();
  });

  rankingRules = computed(() => this.rankingRulesDraft());
  rankingLoading = computed(() => this.config.rankingLoading());
  rankingApiError = computed(() => this.config.rankingError());

  rankingDirty = computed(
    () => this.serializeRules(this.rankingRulesDraft()) !== this.initialRankingSnapshot()
  );

  isDirty = computed(() => this.isFinancialDirty() || this.rankingDirty());

  saveDisabled = computed(
    () => !this.isDirty() || this.form.invalid || this.saveLoading() || this.rankingLoading()
  );

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

  ngOnInit(): void {
    this.config.loadRankingRules().subscribe((rules) => {
      this.setRankingRulesState(rules);
    });
  }

  onSaveClick(): void {
    this.saveError.set(null);
    this.confirmVisible.set(true);
  }

  onConfirm(result: ConfirmationResult): void {
    if (!result.confirmed) {
      this.confirmVisible.set(false);
      return;
    }

    this.saveLoading.set(true);

    if (!this.rankingDirty()) {
      this.applyFinancialChanges();
      this.saveLoading.set(false);
      this.confirmVisible.set(false);
      return;
    }

    this.config.saveRankingRules(this.rankingRulesDraft()).subscribe({
      next: (rules) => {
        this.setRankingRulesState(rules);
        this.applyFinancialChanges();
        this.saveLoading.set(false);
        this.confirmVisible.set(false);
      },
      error: () => {
        this.saveError.set(this.config.rankingError() ?? 'Failed to save ranking rules.');
        this.applyFinancialChanges();
        this.saveLoading.set(false);
        this.confirmVisible.set(false);
      },
    });
  }

  onCancelConfirm(): void {
    this.confirmVisible.set(false);
  }

  onStartAddRule(): void {
    this.editingRuleIndex.set(null);
    this.rankingForm.reset({
      stage: this.nextStageValue(),
      rankName: '',
      requiredLevel: 1,
      bonusAmount: 0,
    });
  }

  onEditRule(index: number): void {
    const rule = this.rankingRulesDraft()[index];
    if (!rule) {
      return;
    }

    this.editingRuleIndex.set(index);
    this.rankingForm.reset({
      stage: rule.stage,
      rankName: rule.rankName,
      requiredLevel: rule.requiredLevel,
      bonusAmount: rule.bonusAmount,
    });
  }

  onDeleteRule(index: number): void {
    const updated = [...this.rankingRulesDraft()];
    updated.splice(index, 1);
    this.rankingRulesDraft.set(this.sortRules(updated));

    if (this.editingRuleIndex() === index) {
      this.onStartAddRule();
    }
  }

  onApplyRule(): void {
    this.rankingForm.markAllAsTouched();
    if (this.rankingForm.invalid) {
      return;
    }

    const nextRule: RankingRule = {
      stage: Number(this.rankingForm.value.stage ?? 1),
      rankName: String(this.rankingForm.value.rankName ?? '').trim(),
      requiredLevel: Number(this.rankingForm.value.requiredLevel ?? 1),
      bonusAmount: Number(this.rankingForm.value.bonusAmount ?? 0),
      isActive: true,
    };

    if (this.isDuplicateStage(nextRule.stage, this.editingRuleIndex())) {
      this.saveError.set('Each rule stage must be unique.');
      return;
    }

    this.saveError.set(null);

    const updated = [...this.rankingRulesDraft()];
    const editIndex = this.editingRuleIndex();

    if (editIndex === null) {
      updated.push(nextRule);
    } else {
      updated[editIndex] = {
        ...updated[editIndex],
        ...nextRule,
      };
    }

    this.rankingRulesDraft.set(this.sortRules(updated));
    this.onStartAddRule();
  }

  trackByRank(index: number, rule: RankingRule): string {
    return rule.id ?? `${rule.stage}-${rule.rankName}-${index}`;
  }

  private setRankingRulesState(rules: RankingRule[]): void {
    const sortedRules = this.sortRules(rules);
    this.rankingRulesDraft.set(sortedRules);
    this.initialRankingSnapshot.set(this.serializeRules(sortedRules));
    this.onStartAddRule();
  }

  private sortRules(rules: RankingRule[]): RankingRule[] {
    return [...rules].sort((a, b) => a.stage - b.stage);
  }

  private serializeRules(rules: RankingRule[]): string {
    return JSON.stringify(
      this.sortRules(rules).map((rule) => ({
        stage: Number(rule.stage),
        rankName: String(rule.rankName ?? '').trim(),
        requiredLevel: Number(rule.requiredLevel),
        bonusAmount: Number(rule.bonusAmount),
      }))
    );
  }

  private isDuplicateStage(stage: number, ignoreIndex: number | null): boolean {
    return this.rankingRulesDraft().some((rule, index) => rule.stage === stage && index !== ignoreIndex);
  }

  private nextStageValue(): number {
    const stages = this.rankingRulesDraft().map((rule) => rule.stage);
    if (!stages.length) {
      return 1;
    }
    return Math.max(...stages) + 1;
  }

  private applyFinancialChanges(): void {
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
  }
}
