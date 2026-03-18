import { Component, computed, inject, signal, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { FormsModule } from '@angular/forms';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { EarningsService, CpvRule, CpvRuleUpdateInput } from '../services/earnings.service';
import { PermissionService } from '../../../core/services/permission.service';
import { Action, Feature } from '../../../core/models/admin-permission.model';

interface EditableCpvRule {
  threshold: number;
  rewardType: string;
  rewardAmount: number;
  materialDescription: string | null;
}

@Component({
  selector: 'app-cpv-configuration',
  imports: [CommonModule, FormsModule, ButtonModule, InputNumberModule, ToastModule],
  providers: [MessageService],
  templateUrl: './cpv-configuration.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CpvConfigurationComponent implements OnInit {
  private readonly earningsService = inject(EarningsService);
  private readonly messageService = inject(MessageService);
  private readonly permission = inject(PermissionService);

  rules = this.earningsService.cpvRules;
  loading = this.earningsService.cpvLoading;
  error = this.earningsService.cpvError;

  editableRules = signal<EditableCpvRule[]>([]);
  editMode = signal<boolean>(false);
  saving = signal<boolean>(false);

  rewardTypeOptions = ['CASH', 'PRODUCT', 'VOUCHER', 'BONUS'];

  canEdit = computed(
    () => this.permission.canEdit(Feature.Earnings) && this.permission.canPerform(Action.UpdateEarningsConfig)
  );
  hasInvalidRules = computed(() => this.editableRules().some((rule) => !this.isValidRule(rule)));

  ngOnInit(): void {
    this.earningsService.loadCpvRules().subscribe({
      next: () => this.syncEditableRules()
    });
  }

  syncEditableRules(): void {
    const mapped = this.rules().map((rule) => ({
      threshold: Number(rule.threshold ?? 0),
      rewardType: (rule.rewardType || 'CASH').toUpperCase(),
      rewardAmount: Number(rule.rewardAmount ?? 0),
      materialDescription: rule.materialDescription ?? null
    }));

    this.editableRules.set(
      mapped.length > 0
        ? mapped
        : [{ threshold: 0, rewardType: 'CASH', rewardAmount: 0, materialDescription: null }]
    );
  }

  addRule(): void {
    if (!this.canEdit() || !this.editMode()) {
      return;
    }
    this.editableRules.update((rules) => [
      ...rules,
      { threshold: 0, rewardType: 'CASH', rewardAmount: 0, materialDescription: null }
    ]);
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

  updateRuleField(index: number, field: keyof EditableCpvRule, value: number | string | null): void {
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

  isValidRule(rule: EditableCpvRule): boolean {
    return Number(rule.threshold) > 0
      && !!rule.rewardType?.trim()
      && Number(rule.rewardAmount) > 0;
  }

  saveAll(): void {
    if (!this.canEdit() || !this.editMode()) {
      return;
    }

    if (this.hasInvalidRules()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Each row requires threshold > 0, reward type, and reward amount > 0.'
      });
      return;
    }

    const shouldProceed = window.confirm('This will replace existing CPV rules. Continue?');
    if (!shouldProceed) {
      return;
    }

    this.saving.set(true);

    const payload: CpvRuleUpdateInput[] = this.editableRules().map((rule) => ({
      threshold: Number(rule.threshold),
      rewardType: (rule.rewardType || 'CASH').toUpperCase(),
      rewardAmount: Number(rule.rewardAmount),
      materialDescription: rule.materialDescription?.trim() ? rule.materialDescription.trim() : null
    }));

    this.earningsService.saveCpvRules(payload).subscribe({
      next: (updatedRules: CpvRule[]) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Updated',
          detail: 'CPV rules updated successfully.'
        });
        this.rules.set(updatedRules);
        this.syncEditableRules();
        this.editMode.set(false);
        this.saving.set(false);
      },
      error: (err) => {
        const message = err?.error?.message ?? err?.message ?? 'Could not update CPV rules.';
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
