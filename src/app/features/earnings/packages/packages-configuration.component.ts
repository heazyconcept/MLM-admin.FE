import { Component, inject, signal, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
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
  priceControls: Record<string, FormControl<number | null>> = {};

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

  getPriceControl(pkg: AdminPackageConfig): FormControl<number | null> {
    const id = this.getPackageId(pkg);
    if (!this.priceControls[id]) {
      this.priceControls[id] = new FormControl<number | null>(pkg.priceNGN ?? null);
    }
    return this.priceControls[id];
  }

  isEditing(pkg: AdminPackageConfig): boolean {
    return this.editingId() === this.getPackageId(pkg);
  }

  isSaving(pkg: AdminPackageConfig): boolean {
    return this.savingId() === this.getPackageId(pkg);
  }

  startEdit(pkg: AdminPackageConfig): void {
    this.getPriceControl(pkg).setValue(pkg.priceNGN ?? null);
    this.editingId.set(this.getPackageId(pkg));
  }

  cancelEdit(pkg: AdminPackageConfig): void {
    this.editingId.set(null);
    this.getPriceControl(pkg).reset(pkg.priceNGN ?? null);
  }

  saveEdit(pkg: AdminPackageConfig): void {
    const id = this.getPackageId(pkg);
    const newPrice = this.priceControls[id]?.value;
    if (newPrice === null || newPrice === undefined) {
      return;
    }
    this.savingId.set(id);
    const payload: AdminPackageUpdatePayload = {
      priceNGN: newPrice,
      priceUSD: pkg.priceUSD,
      earningsPercentage: pkg.earningsPercentage,
      cashoutPercentage: pkg.cashoutPercentage,
      registrationPV: pkg.registrationPV,
      registrationCPV: pkg.registrationCPV
    };
    this.packagesService.updatePackage(id, payload).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Updated',
          detail: `${pkg.package} price updated successfully.`
        });
        this.editingId.set(null);
        this.savingId.set(null);
      },
      error: (err) => {
        console.error('Failed to update package', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Save failed',
          detail: 'Could not update package. Please check the values and try again.'
        });
        this.savingId.set(null);
      }
    });
  }

  retry(): void {
    this.packagesService.loadPackages().subscribe();
  }
}
