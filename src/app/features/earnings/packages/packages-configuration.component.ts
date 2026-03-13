import { Component, inject, signal, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AdminPackagesService, AdminPackageConfig, AdminPackageUpdatePayload } from '../services/admin-packages.service';

@Component({
  selector: 'app-packages-configuration',
  imports: [CommonModule, ReactiveFormsModule, ButtonModule, InputNumberModule, ToastModule],
  providers: [MessageService],
  templateUrl: './packages-configuration.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PackagesConfigurationComponent implements OnInit {
  private readonly packagesService = inject(AdminPackagesService);
  private readonly messageService = inject(MessageService);

  packages = this.packagesService.packages;
  loading = this.packagesService.loading;
  error = this.packagesService.error;

  editingId = signal<string | null>(null);
  savingId = signal<string | null>(null);
  ngnPriceControls: Record<string, FormControl<number | null>> = {};
  usdPriceControls: Record<string, FormControl<number | null>> = {};

  ngOnInit(): void {
    this.packagesService.loadPackages().subscribe();
  }

  getPackageId(pkg: AdminPackageConfig): string {
    return pkg.package.toString();
  }

  getPackageClass(pkgName: string): string {
    const classes: Record<string, string> = {
      NICKEL: 'bg-gray-100 text-gray-700 border border-gray-200',
      SILVER: 'bg-slate-100 text-slate-600 border border-slate-200',
      GOLD: 'bg-amber-100 text-amber-700 border border-amber-200',
      PLATINUM: 'bg-zinc-100 text-zinc-700 border border-zinc-200',
      RUBY: 'bg-rose-100 text-rose-700 border border-rose-200',
      DIAMOND: 'bg-sky-100 text-sky-700 border border-sky-200'
    };
    return classes[pkgName?.toUpperCase()] ?? 'bg-gray-100 text-gray-800 border border-gray-200';
  }

  getPriceNgnControl(pkg: AdminPackageConfig): FormControl<number | null> {
    const id = this.getPackageId(pkg);
    if (!this.ngnPriceControls[id]) {
      this.ngnPriceControls[id] = new FormControl<number | null>(pkg.priceNGN ?? null, {
        validators: [Validators.required, Validators.min(0.01)]
      });
    }
    return this.ngnPriceControls[id];
  }

  getPriceUsdControl(pkg: AdminPackageConfig): FormControl<number | null> {
    const id = this.getPackageId(pkg);
    if (!this.usdPriceControls[id]) {
      this.usdPriceControls[id] = new FormControl<number | null>(pkg.priceUSD ?? null, {
        validators: [Validators.required, Validators.min(0.01)]
      });
    }
    return this.usdPriceControls[id];
  }

  isPriceInvalid(control: FormControl<number | null>): boolean {
    return control.invalid && (control.touched || control.dirty);
  }

  isEditing(pkg: AdminPackageConfig): boolean {
    return this.editingId() === this.getPackageId(pkg);
  }

  isSaving(pkg: AdminPackageConfig): boolean {
    return this.savingId() === this.getPackageId(pkg);
  }

  startEdit(pkg: AdminPackageConfig): void {
    this.getPriceNgnControl(pkg).setValue(pkg.priceNGN ?? null);
    this.getPriceUsdControl(pkg).setValue(pkg.priceUSD ?? null);
    this.editingId.set(this.getPackageId(pkg));
  }

  cancelEdit(pkg: AdminPackageConfig): void {
    this.editingId.set(null);
    this.getPriceNgnControl(pkg).reset(pkg.priceNGN ?? null);
    this.getPriceUsdControl(pkg).reset(pkg.priceUSD ?? null);
  }

  saveEdit(pkg: AdminPackageConfig): void {
    const id = this.getPackageId(pkg);
    const ngnControl = this.getPriceNgnControl(pkg);
    const usdControl = this.getPriceUsdControl(pkg);

    ngnControl.markAsTouched();
    usdControl.markAsTouched();

    if (ngnControl.invalid || usdControl.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Enter valid NGN and USD prices greater than 0.'
      });
      return;
    }

    const payload: Partial<AdminPackageUpdatePayload> = {};
    const updatedFields: string[] = [];

    if (ngnControl.value !== pkg.priceNGN) {
      payload.priceNGN = ngnControl.value as number;
      updatedFields.push('NGN');
    }

    if (usdControl.value !== pkg.priceUSD) {
      payload.priceUSD = usdControl.value as number;
      updatedFields.push('USD');
    }

    if (Object.keys(payload).length === 0) {
      this.editingId.set(null);
      this.messageService.add({
        severity: 'info',
        summary: 'No changes',
        detail: 'Nothing to update for this package.'
      });
      return;
    }

    this.savingId.set(id);
    this.packagesService.updatePackage(id, payload).subscribe({
      next: () => {
        const updatedSummary = updatedFields.length === 2
          ? 'NGN and USD prices'
          : `${updatedFields[0]} price`;

        this.messageService.add({
          severity: 'success',
          summary: 'Updated',
          detail: `${pkg.package} ${updatedSummary} updated successfully.`
        });
        this.editingId.set(null);
        this.savingId.set(null);
      },
      error: (err) => {
        const message = err?.error?.message ?? err?.message ?? 'Could not update package. Please check the values and try again.';
        this.messageService.add({
          severity: 'error',
          summary: 'Save failed',
          detail: message
        });
        this.savingId.set(null);
      }
    });
  }

  retry(): void {
    this.packagesService.loadPackages().subscribe();
  }
}
