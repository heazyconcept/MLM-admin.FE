import {
  Component,
  ChangeDetectionStrategy,
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
  ngnToUsd,
  packageMonthlyDisplay,
} from '../models/admin-legacy.models';

interface UpgradePreviewRow {
  from: LegacyPackageCode;
  to: LegacyPackageCode;
  payDiff: number;
  instantDiff: number;
}

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
export class LegacyPackagesComponent implements OnInit {
  private readonly legacyService = inject(AdminLegacyService);
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);

  packages = this.legacyService.packages;
  loading = this.legacyService.packagesLoading;
  error = this.legacyService.packagesError;
  fxRate = this.legacyService.fxRateNgnPerUsd;

  editingCode = signal<LegacyPackageCode | null>(null);
  savingCode = signal<LegacyPackageCode | null>(null);
  showConfirm = signal(false);
  pendingPayload = signal<Partial<AdminLegacyPackageUpdatePayload> | null>(null);
  pendingCode = signal<LegacyPackageCode | null>(null);
  monthlyFieldsChanged = signal(false);

  private formMap = signal<Record<string, FormGroup>>({});

  upgradePreviews = computed((): UpgradePreviewRow[] => {
    const pkgs = this.packages();
    const byCode = (c: LegacyPackageCode) => pkgs.find((p) => p.code === c);
    const pairs: [LegacyPackageCode, LegacyPackageCode][] = [
      ['VIP', 'EXECUTIVE'],
      ['EXECUTIVE', 'SUPREME'],
      ['VIP', 'SUPREME'],
    ];
    return pairs
      .map(([from, to]) => {
        const a = byCode(from);
        const b = byCode(to);
        if (!a || !b) return null;
        return {
          from,
          to,
          payDiff: Math.max(0, (b.purchaseAmount ?? 0) - (a.purchaseAmount ?? 0)),
          instantDiff: Math.max(
            0,
            (b.instantCommission ?? 0) - (a.instantCommission ?? 0)
          ),
        };
      })
      .filter((r): r is UpgradePreviewRow => r !== null);
  });

  missingBaseWarning = computed(() =>
    this.packages().some((p) => {
      const { base } = packageMonthlyDisplay(p);
      return !base || base <= 0;
    })
  );

  ngOnInit(): void {
    this.legacyService.loadPackages().subscribe({
      next: (pkgs) => this.ensureForms(pkgs),
    });
  }

  ensureForms(pkgs: AdminLegacyPackage[]): void {
    const map = { ...this.formMap() };
    for (const pkg of pkgs) {
      if (!map[pkg.code]) {
        map[pkg.code] = this.buildForm(pkg);
      } else {
        this.patchForm(map[pkg.code], pkg);
      }
    }
    this.formMap.set(map);
  }

  getForm(code: LegacyPackageCode): FormGroup | null {
    return this.formMap()[code] ?? null;
  }

  private buildForm(pkg: AdminLegacyPackage): FormGroup {
    const { base, increased } = packageMonthlyDisplay(pkg);
    return this.fb.group({
      purchaseAmount: [pkg.purchaseAmount ?? 0, [Validators.required, Validators.min(0)]],
      instantCommission: [
        pkg.instantCommission ?? 0,
        [Validators.required, Validators.min(0)],
      ],
      monthlyCommissionBase: [base, [Validators.required, Validators.min(0)]],
      monthlyCommissionIncreased: [
        increased,
        [Validators.required, Validators.min(0)],
      ],
      successlineBonusPercent: [
        pkg.successlineBonusPercent ?? 0,
        [Validators.required, Validators.min(0), Validators.max(100)],
      ],
      autoshipAmount: [pkg.autoshipAmount ?? 0, [Validators.required, Validators.min(0)]],
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
    const { base, increased } = packageMonthlyDisplay(pkg);
    form.reset({
      purchaseAmount: pkg.purchaseAmount ?? 0,
      instantCommission: pkg.instantCommission ?? 0,
      monthlyCommissionBase: base,
      monthlyCommissionIncreased: increased,
      successlineBonusPercent: pkg.successlineBonusPercent ?? 0,
      autoshipAmount: pkg.autoshipAmount ?? 0,
      cycleMonths: pkg.cycleMonths ?? 6,
      minDirectsToIncreaseMonthly: pkg.minDirectsToIncreaseMonthly ?? 3,
      isActive: pkg.isActive ?? true,
    });
  }

  usdPreview(amountNgn: number | null | undefined): number {
    return ngnToUsd(Number(amountNgn ?? 0), this.fxRate());
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
    return this.editingCode() === pkg.code;
  }

  isSaving(pkg: AdminLegacyPackage): boolean {
    return this.savingCode() === pkg.code;
  }

  startEdit(pkg: AdminLegacyPackage): void {
    const form = this.getForm(pkg.code);
    if (form) this.patchForm(form, pkg);
    this.editingCode.set(pkg.code);
  }

  cancelEdit(pkg: AdminLegacyPackage): void {
    const form = this.getForm(pkg.code);
    if (form) this.patchForm(form, pkg);
    this.editingCode.set(null);
  }

  requestSave(pkg: AdminLegacyPackage): void {
    const form = this.getForm(pkg.code);
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
      v.monthlyCommissionBase !== packageMonthlyDisplay(pkg).base ||
      v.monthlyCommissionIncreased !== packageMonthlyDisplay(pkg).increased ||
      v.autoshipAmount !== (pkg.autoshipAmount ?? 0);

    const assign = <K extends keyof AdminLegacyPackageUpdatePayload>(
      key: K,
      next: AdminLegacyPackageUpdatePayload[K],
      prev: AdminLegacyPackageUpdatePayload[K] | undefined | null
    ) => {
      if (next !== prev) {
        payload[key] = next;
      }
    };

    assign('purchaseAmount', v.purchaseAmount, pkg.purchaseAmount);
    assign('instantCommission', v.instantCommission, pkg.instantCommission);
    assign(
      'monthlyCommissionBase',
      v.monthlyCommissionBase,
      pkg.monthlyCommissionBase ?? packageMonthlyDisplay(pkg).base
    );
    assign(
      'monthlyCommissionIncreased',
      v.monthlyCommissionIncreased,
      pkg.monthlyCommissionIncreased ?? packageMonthlyDisplay(pkg).increased
    );
    assign(
      'successlineBonusPercent',
      v.successlineBonusPercent,
      pkg.successlineBonusPercent
    );
    assign('autoshipAmount', v.autoshipAmount, pkg.autoshipAmount);
    assign('cycleMonths', v.cycleMonths, pkg.cycleMonths);
    assign(
      'minDirectsToIncreaseMonthly',
      v.minDirectsToIncreaseMonthly,
      pkg.minDirectsToIncreaseMonthly
    );
    assign('isActive', v.isActive, pkg.isActive);

    if (Object.keys(payload).length === 0) {
      this.editingCode.set(null);
      this.messageService.add({
        severity: 'info',
        summary: 'No changes',
        detail: 'Nothing to update for this package.',
      });
      return;
    }

    this.pendingCode.set(pkg.code);
    this.pendingPayload.set(payload);
    this.monthlyFieldsChanged.set(monthlyChanged);
    this.showConfirm.set(true);
  }

  confirmMessage(): string {
    const base =
      'Members who already joined keep their current package until they upgrade (Phase 3). New joins use these figures.';
    if (this.monthlyFieldsChanged()) {
      return `${base} Waiting months keep the amount they already have. Only months not yet due use new figures.`;
    }
    return base;
  }

  onConfirmSave(_result: ConfirmationResult): void {
    const code = this.pendingCode();
    const payload = this.pendingPayload();
    if (!code || !payload || this.savingCode()) return;

    this.savingCode.set(code);
    this.legacyService.updatePackage(code, payload).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Updated',
          detail: `${this.packageLabel(code)} package configuration saved.`,
        });
        this.savingCode.set(null);
        this.editingCode.set(null);
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

  displayBase(pkg: AdminLegacyPackage): number {
    return packageMonthlyDisplay(pkg).base;
  }

  displayIncreased(pkg: AdminLegacyPackage): number {
    return packageMonthlyDisplay(pkg).increased;
  }
}
