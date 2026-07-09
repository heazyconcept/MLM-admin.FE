import { Component, input, output, model, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { UpgradePackagePayload, UserPackage } from '../services/users.service';

const PACKAGE_ORDER: UserPackage[] = ['Nickel', 'Silver', 'Gold', 'Platinum', 'Ruby', 'Diamond'];

@Component({
  selector: 'app-upgrade-package-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    TextareaModule,
    SelectModule,
    ToggleSwitchModule,
  ],
  templateUrl: './upgrade-package-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpgradePackageModalComponent {
  visible = model(false);
  userName = input('');
  currentPackage = input<UserPackage>('Nickel');

  confirmed = output<UpgradePackagePayload>();
  cancelled = output<void>();

  targetPackage: string | null = null;
  reason = '';
  waivePayment = true;
  submitting = false;

  get availablePackages(): { label: string; value: string }[] {
    const current = this.currentPackage();
    const idx = PACKAGE_ORDER.indexOf(current);
    if (idx === -1) return [];
    return PACKAGE_ORDER.slice(idx + 1).map((p) => ({ label: p, value: p.toUpperCase() }));
  }

  onConfirm(): void {
    if (!this.targetPackage) return;
    this.confirmed.emit({
      targetPackage: this.targetPackage,
      reason: this.reason.trim() || 'Admin upgrade',
      waivePayment: this.waivePayment,
    });
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  resetForm(): void {
    this.targetPackage = null;
    this.reason = '';
    this.waivePayment = true;
    this.submitting = false;
  }
}
