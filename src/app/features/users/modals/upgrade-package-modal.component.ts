import {
  Component,
  input,
  output,
  inject,
  signal,
  effect,
  untracked,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { MessageService } from 'primeng/api';
import { UserPackage, UsersService } from '../services/users.service';

const PACKAGE_ORDER: UserPackage[] = ['Nickel', 'Silver', 'Gold', 'Platinum', 'Ruby', 'Diamond'];

@Component({
  selector: 'app-upgrade-package-modal',
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    SelectModule,
    ToggleSwitchModule,
  ],
  templateUrl: './upgrade-package-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpgradePackageModalComponent {
  private readonly usersService = inject(UsersService);
  private readonly messageService = inject(MessageService);

  visible = input(false);
  userId = input('');
  userName = input('');
  currentPackage = input<UserPackage>('Nickel');

  visibleChange = output<boolean>();
  upgraded = output<void>();

  targetPackage: string | null = null;
  waivePayment = true;
  submitting = signal(false);

  constructor() {
    let wasVisible = false;
    effect(() => {
      const isVisible = this.visible();
      if (isVisible && !wasVisible) {
        untracked(() => this.resetForm());
      }
      wasVisible = isVisible;
    });
  }

  get availablePackages(): { label: string; value: string }[] {
    const current = this.currentPackage();
    const idx = PACKAGE_ORDER.indexOf(current);
    if (idx === -1) return [];
    return PACKAGE_ORDER.slice(idx + 1).map((p) => ({ label: p, value: p.toUpperCase() }));
  }

  onConfirm(): void {
    const userId = this.userId();
    if (!this.targetPackage || !userId || this.submitting()) return;

    this.submitting.set(true);
    this.usersService
      .upgradePackage(userId, {
        targetPackage: this.targetPackage,
        waivePayment: this.waivePayment,
      })
      .subscribe({
        next: (res) => {
          this.submitting.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Package upgraded',
            detail: res.message || `User upgraded to ${this.targetPackage}.`,
          });
          this.upgraded.emit();
          this.close();
        },
        error: (err: { error?: { message?: string } }) => {
          this.submitting.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Upgrade failed',
            detail: err?.error?.message || 'Could not upgrade package. Please try again.',
          });
        },
      });
  }

  onCancel(): void {
    this.close();
  }

  onDialogHide(): void {
    if (this.visible()) {
      this.visibleChange.emit(false);
    }
    this.resetForm();
  }

  private close(): void {
    this.visibleChange.emit(false);
    this.resetForm();
  }

  private resetForm(): void {
    this.targetPackage = null;
    this.waivePayment = true;
    this.submitting.set(false);
  }
}
