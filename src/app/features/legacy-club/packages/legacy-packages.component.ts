import {
  Component,
  ChangeDetectionStrategy,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subscription } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import {
  ConfirmationModalComponent,
  ConfirmationResult,
} from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { InfoBannerComponent } from '../../../shared/components/info-banner/info-banner.component';
import { AdminLegacyService } from '../services/admin-legacy.service';
import {
  AdminLegacyPackage,
  AdminLegacyPackageUpdatePayload,
  LegacyPackageCode,
  WeeklyCommissionPreview,
  ngnToUsdPreview,
  weeklyCommissionPreview,
} from '../models/admin-legacy.models';

@Component({
  selector: 'app-legacy-packages',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputNumberModule,
    ToggleSwitchModule,
    ToastModule,
    ConfirmationModalComponent,
    InfoBannerComponent,
  ],
  providers: [MessageService],
  templateUrl: './legacy-packages.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegacyPackagesComponent implements OnInit, OnDestroy {
  private readonly legacyService = inject(AdminLegacyService);
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);

  packages = this.legacyService.packages;
  upgradeDifferences = this.legacyService.upgradeDifferences;
  loading = this.legacyService.packagesLoading;
  error = this.legacyService.packagesError;

  editingCode = signal<LegacyPackageCode | null>(null);
  savingCode = signal<LegacyPackageCode | null>(null);
  showConfirm = signal(false);
  pendingPayload = signal<Partial<AdminLegacyPackageUpdatePayload> | null>(null);
  pendingCode = signal<LegacyPackageCode | null>(null);
  monthlyFieldsChanged = signal(false);
  /** Bumps when edit form values change so weekly preview stays live. */
  private formTick = signal(0);
  private editSub: Subscription | null = null;

  readonly previewRates: { key: 'base' | 'increased'; label: string }[] = [
    { key: 'base', label: 'Base rate' },
    { key: 'increased', label: 'Increased rate' },
  ];

  private formMap = signal<Record<string, FormGroup>>({});

  missingBaseWarning = computed(() =>
    this.packages().some((p) => !p.monthlyCommissionBaseNgn || p.monthlyCommissionBaseNgn <= 0)
  );

  ngOnInit(): void {
    this.legacyService.loadPackages().subscribe({
      next: (pkgs) => this.ensureForms(pkgs),
    });
  }

  ngOnDestroy(): void {
    this.editSub?.unsubscribe();
  }

  ensureForms(pkgs: AdminLegacyPackage[]): void {
    const map = { ...this.formMap() };
    for (const pkg of pkgs) {
      if (!map[pkg.package]) {
        map[pkg.package] = this.buildForm(pkg);
      } else {
        this.patchForm(map[pkg.package], pkg);
      }
    }
    this.formMap.set(map);
  }

  getForm(code: LegacyPackageCode): FormGroup | null {
    return this.formMap()[code] ?? null;
  }

  private buildForm(pkg: AdminLegacyPackage): FormGroup {
    return this.fb.group({
      purchaseAmountNgn: [
        pkg.purchaseAmountNgn ?? 0,
        [Validators.required, Validators.min(0)],
      ],
      instantCommissionNgn: [
        pkg.instantCommissionNgn ?? 0,
        [Validators.required, Validators.min(0)],
      ],
      monthlyCommissionBaseNgn: [
        pkg.monthlyCommissionBaseNgn ?? 0,
        [Validators.required, Validators.min(0)],
      ],
      monthlyCommissionIncreasedNgn: [
        pkg.monthlyCommissionIncreasedNgn ?? 0,
        [Validators.required, Validators.min(0)],
      ],
      successlineBonusPercent: [
        pkg.successlineBonusPercent ?? 0,
        [Validators.required, Validators.min(0), Validators.max(100)],
      ],
      autoshipAmountNgn: [
        pkg.autoshipAmountNgn ?? 0,
        [Validators.required, Validators.min(0)],
      ],
      cycleMonths: [
        pkg.cycleMonths ?? 6,
        [Validators.required, Validators.min(1), Validators.max(24)],
      ],
      minDirectsToIncreaseMonthly: [
        pkg.minDirectsToIncreaseMonthly ?? 3,
        [Validators.required, Validators.min(0)],
      ],
      isActive: [pkg.isActive ?? true],
    });
  }

  private patchForm(form: FormGroup, pkg: AdminLegacyPackage): void {
    form.reset({
      purchaseAmountNgn: pkg.purchaseAmountNgn ?? 0,
      instantCommissionNgn: pkg.instantCommissionNgn ?? 0,
      monthlyCommissionBaseNgn: pkg.monthlyCommissionBaseNgn ?? 0,
      monthlyCommissionIncreasedNgn: pkg.monthlyCommissionIncreasedNgn ?? 0,
      successlineBonusPercent: pkg.successlineBonusPercent ?? 0,
      autoshipAmountNgn: pkg.autoshipAmountNgn ?? 0,
      cycleMonths: pkg.cycleMonths ?? 6,
      minDirectsToIncreaseMonthly: pkg.minDirectsToIncreaseMonthly ?? 3,
      isActive: pkg.isActive ?? true,
    });
  }

  packageLabel(code: string): string {
    const labels: Record<string, string> = {
      VIP: 'VIP',
      EXECUTIVE: 'Executive',
      SUPREME: 'Supreme',
    };
    return labels[code] ?? code;
  }

  packageBadgeClass(code: string): string {
    const classes: Record<string, string> = {
      VIP: 'bg-amber-100 text-amber-800 border-amber-200',
      EXECUTIVE: 'bg-sky-100 text-sky-800 border-sky-200',
      SUPREME: 'bg-violet-100 text-violet-800 border-violet-200',
    };
    return classes[code] ?? 'bg-slate-100 text-slate-700 border-slate-200';
  }

  isEditing(pkg: AdminLegacyPackage): boolean {
    return this.editingCode() === pkg.package;
  }

  isSaving(pkg: AdminLegacyPackage): boolean {
    return this.savingCode() === pkg.package;
  }

  startEdit(pkg: AdminLegacyPackage): void {
    const form = this.getForm(pkg.package);
    if (form) this.patchForm(form, pkg);
    this.editingCode.set(pkg.package);
    this.editSub?.unsubscribe();
    this.editSub =
      form?.valueChanges.subscribe(() => {
        this.formTick.update((n) => n + 1);
      }) ?? null;
  }

  cancelEdit(pkg: AdminLegacyPackage): void {
    const form = this.getForm(pkg.package);
    if (form) this.patchForm(form, pkg);
    this.editingCode.set(null);
    this.editSub?.unsubscribe();
    this.editSub = null;
  }

  requestSave(pkg: AdminLegacyPackage): void {
    const form = this.getForm(pkg.package);
    if (!form) return;
    form.markAllAsTouched();
    if (form.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Fix invalid fields before saving.',
      });
      return;
    }

    const v = form.getRawValue();
    const payload: Partial<AdminLegacyPackageUpdatePayload> = {};
    const monthlyChanged =
      v.monthlyCommissionBaseNgn !== pkg.monthlyCommissionBaseNgn ||
      v.monthlyCommissionIncreasedNgn !== pkg.monthlyCommissionIncreasedNgn ||
      v.autoshipAmountNgn !== pkg.autoshipAmountNgn;

    const assign = <K extends keyof AdminLegacyPackageUpdatePayload>(
      key: K,
      next: AdminLegacyPackageUpdatePayload[K],
      prev: AdminLegacyPackageUpdatePayload[K] | undefined | null
    ) => {
      if (next !== prev) {
        payload[key] = next;
      }
    };

    assign('purchaseAmountNgn', v.purchaseAmountNgn, pkg.purchaseAmountNgn);
    assign('instantCommissionNgn', v.instantCommissionNgn, pkg.instantCommissionNgn);
    assign(
      'monthlyCommissionBaseNgn',
      v.monthlyCommissionBaseNgn,
      pkg.monthlyCommissionBaseNgn
    );
    assign(
      'monthlyCommissionIncreasedNgn',
      v.monthlyCommissionIncreasedNgn,
      pkg.monthlyCommissionIncreasedNgn
    );
    assign('successlineBonusPercent', v.successlineBonusPercent, pkg.successlineBonusPercent);
    assign('autoshipAmountNgn', v.autoshipAmountNgn, pkg.autoshipAmountNgn);
    assign('cycleMonths', v.cycleMonths, pkg.cycleMonths);
    assign(
      'minDirectsToIncreaseMonthly',
      v.minDirectsToIncreaseMonthly,
      pkg.minDirectsToIncreaseMonthly
    );
    assign('isActive', v.isActive, pkg.isActive);

    if (Object.keys(payload).length === 0) {
      this.editingCode.set(null);
      this.editSub?.unsubscribe();
      this.editSub = null;
      this.messageService.add({
        severity: 'info',
        summary: 'No changes',
        detail: 'Nothing to update for this package.',
      });
      return;
    }

    this.pendingCode.set(pkg.package);
    this.pendingPayload.set(payload);
    this.monthlyFieldsChanged.set(monthlyChanged);
    this.showConfirm.set(true);
  }

  confirmMessage(): string {
    const base =
      'Members who already joined keep their current package until they upgrade (Phase 3). New joins use these figures.';
    if (this.monthlyFieldsChanged()) {
      return `${base} Waiting weeks keep the amount they already have. Only weeks not yet due use new figures.`;
    }
    return base;
  }

  /**
   * Read-only weekly split from monthly editors (or saved package when not editing).
   */
  weeklyPreview(
    pkg: AdminLegacyPackage,
    rate: 'base' | 'increased'
  ): WeeklyCommissionPreview {
    this.formTick();
    const form = this.getForm(pkg.package);
    const editing = this.isEditing(pkg) && form;
    const monthly =
      rate === 'base'
        ? editing
          ? Number(form!.getRawValue().monthlyCommissionBaseNgn ?? 0)
          : pkg.monthlyCommissionBaseNgn
        : editing
          ? Number(form!.getRawValue().monthlyCommissionIncreasedNgn ?? 0)
          : pkg.monthlyCommissionIncreasedNgn;
    const autoship = editing
      ? Number(form!.getRawValue().autoshipAmountNgn ?? 0)
      : pkg.autoshipAmountNgn;
    return weeklyCommissionPreview(monthly, autoship);
  }

  formatNgnUsd(amountNgn: number): string {
    const usd = ngnToUsdPreview(amountNgn);
    return `₦${amountNgn.toLocaleString(undefined, { maximumFractionDigits: 2 })} · $${usd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }

  onConfirmSave(_result: ConfirmationResult): void {
    const code = this.pendingCode();
    const payload = this.pendingPayload();
    if (!code || !payload || this.savingCode()) return;

    this.savingCode.set(code);
    this.legacyService.updatePackage(code, payload).subscribe({
      next: () => {
        this.ensureForms(this.packages());
        this.messageService.add({
          severity: 'success',
          summary: 'Updated',
          detail: `${this.packageLabel(code)} package configuration saved.`,
        });
        this.savingCode.set(null);
        this.editingCode.set(null);
        this.editSub?.unsubscribe();
        this.editSub = null;
        this.showConfirm.set(false);
        this.pendingCode.set(null);
        this.pendingPayload.set(null);
      },
      error: (err) => {
        const message =
          err?.error?.message ?? err?.message ?? 'Could not save package.';
        this.messageService.add({
          severity: 'error',
          summary: 'Save failed',
          detail: typeof message === 'string' ? message : 'Save failed.',
        });
        this.savingCode.set(null);
        this.showConfirm.set(false);
      },
    });
  }

  onCancelConfirm(): void {
    if (this.savingCode()) return;
    this.showConfirm.set(false);
    this.pendingCode.set(null);
    this.pendingPayload.set(null);
  }

  retry(): void {
    this.legacyService.loadPackages().subscribe({
      next: (pkgs) => this.ensureForms(pkgs),
    });
  }
}
