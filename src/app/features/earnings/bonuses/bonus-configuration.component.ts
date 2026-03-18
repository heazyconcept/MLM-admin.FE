import { Component, computed, inject, signal, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ConfirmationModalComponent, ConfirmationResult } from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { EarningsService, CommissionRule } from '../services/earnings.service';
import { PermissionService } from '../../../core/services/permission.service';
import { Action, Feature } from '../../../core/models/admin-permission.model';

interface EditableCommissionRule {
  level: number;
  percentage: number;
  currency: string;
}

@Component({
  selector: 'app-bonus-configuration',
  imports: [CommonModule, FormsModule, ButtonModule, InputNumberModule, ToastModule, ConfirmationModalComponent],
  providers: [MessageService],
  templateUrl: './bonus-configuration.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BonusConfigurationComponent implements OnInit {
  private readonly earningsService = inject(EarningsService);
  private readonly messageService = inject(MessageService);
  private readonly permission = inject(PermissionService);

  commissionRules = this.earningsService.commissionRules;
  pdpaRates = this.earningsService.pdpaRates;
  cdpaRates = this.earningsService.cdpaRates;
  levelCommissions = this.earningsService.levelCommissions;
  loading = this.earningsService.commissionLoading;
  error = this.earningsService.commissionError;

  editableRules = signal<EditableCommissionRule[]>([]);
  editMode = signal<boolean>(false);
  showConfirmModal = signal<boolean>(false);
  saving = signal<boolean>(false);

  canEdit = computed(
    () => this.permission.canEdit(Feature.Earnings) && this.permission.canPerform(Action.UpdateEarningsConfig)
  );

  hasInvalidRules = computed(() => this.editableRules().some((rule) => !this.isValidRule(rule)));

  ngOnInit(): void {
    this.earningsService.loadCommissionRules().subscribe({
      next: () => this.syncEditableRules()
    });
  }

  packageKeys(): string[] {
    const keys = new Set<string>();
    Object.keys(this.pdpaRates()).forEach((key) => keys.add(key));
    Object.keys(this.cdpaRates()).forEach((key) => keys.add(key));
    this.levelCommissions().forEach((row) => {
      Object.keys(row.percentages ?? {}).forEach((key) => keys.add(key));
    });
    return Array.from(keys);
  }

  syncEditableRules(): void {
    const mapped = this.commissionRules().map((rule) => ({
      level: Number(rule.level ?? 1),
      percentage: Number(rule.percentage ?? 0),
      currency: (rule.currency || 'USD').toUpperCase()
    }));

    this.editableRules.set(
      mapped.length > 0 ? mapped : [{ level: 1, percentage: 0, currency: 'USD' }]
    );
  }

  addRule(): void {
    if (!this.canEdit() || !this.editMode()) {
      return;
    }
    this.editableRules.update((rules) => [...rules, { level: 1, percentage: 0, currency: 'USD' }]);
  }

  removeRule(index: number): void {
    if (!this.canEdit() || !this.editMode()) {
      return;
    }
    this.editableRules.update((rules) => {
      if (rules.length <= 1) {
        return rules;
      }
      return rules.filter((_, idx) => idx !== index);
    });
  }

  updateRuleField(index: number, field: keyof EditableCommissionRule, value: number | string): void {
    if (!this.editMode()) {
      return;
    }

    this.editableRules.update((rules) =>
      rules.map((rule, idx) => (idx === index ? { ...rule, [field]: value } : rule))
    );
  }

  startEditMode(): void {
    if (!this.canEdit()) {
      return;
    }
    this.syncEditableRules();
    this.editMode.set(true);
  }

  isValidRule(rule: EditableCommissionRule): boolean {
    return Number(rule.level) >= 1
      && Number(rule.percentage) >= 0
      && Number(rule.percentage) <= 100
      && !!rule.currency?.trim();
  }

  saveAll(): void {
    if (!this.canEdit() || !this.editMode()) {
      return;
    }

    if (this.hasInvalidRules()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Each rule needs level >= 1, percentage between 0 and 100, and a currency.'
      });
      return;
    }

    this.showConfirmModal.set(true);
  }

  handleSaveConfirm(result: ConfirmationResult): void {
    if (!result.confirmed) {
      this.showConfirmModal.set(false);
      return;
    }

    this.saving.set(true);
    const payload: Array<Pick<CommissionRule, 'level' | 'percentage' | 'currency'>> = this.editableRules().map((rule) => ({
      level: Number(rule.level),
      percentage: Number(rule.percentage),
      currency: (rule.currency || 'USD').toUpperCase()
    }));

    this.earningsService.saveCommissionRules(payload).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Updated',
          detail: 'Commission rules updated successfully.'
        });
        this.syncEditableRules();
        this.editMode.set(false);
        this.saving.set(false);
        this.showConfirmModal.set(false);
      },
      error: (err) => {
        const message = err?.error?.message ?? err?.message ?? 'Could not update commission rules.';
        this.messageService.add({
          severity: 'error',
          summary: 'Save failed',
          detail: message
        });
        this.saving.set(false);
      }
    });
  }

  cancelChanges(): void {
    this.syncEditableRules();
    this.editMode.set(false);
  }
}
