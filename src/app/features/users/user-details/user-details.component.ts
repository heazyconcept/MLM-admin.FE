import { Component, OnInit, inject, signal, ChangeDetectionStrategy, computed, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { PermissionService } from '../../../core/services/permission.service';
import { Feature } from '../../../core/models/admin-permission.model';
import { InfoBannerComponent } from '../../../shared/components/info-banner/info-banner.component';
import { ConfirmationModalComponent, ConfirmationResult } from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { UsersService, User, UserWallet, AdminFundWalletType, ActivateRegistrationPayload, CreditVolumePayload, UpdateUserStatusPayload } from '../services/users.service';
import { WalletService } from '../../wallets/services/wallet.service';
import {
  EarningsService,
  UserEarningsActivityItem,
  formatUserEarningsActivityAmount,
  getUserEarningsActivityDetail,
  getUserEarningsActivityKind,
  userEarningsActivityTrackId,
} from '../../earnings/services/earnings.service';
import { getEarningTypeLabel } from '../../../core/constants/earning-type-labels';
import { FundsAdjustmentModalComponent } from '../../wallets/modals/funds-adjustment-modal.component';
import { ActivateRegistrationModalComponent } from '../modals/activate-registration-modal.component';
import { UpgradePackageModalComponent } from '../modals/upgrade-package-modal.component';
import { CreditVolumeModalComponent } from '../modals/credit-volume-modal.component';

@Component({
  selector: 'app-user-details',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ButtonModule,
    DatePickerModule,
    ToastModule,
    DialogModule,
    TooltipModule,
    InfoBannerComponent,
    ConfirmationModalComponent,
    FundsAdjustmentModalComponent,
    ActivateRegistrationModalComponent,
    UpgradePackageModalComponent,
    CreditVolumeModalComponent,
    StatusBadgeComponent,
  ],
  providers: [MessageService],
  templateUrl: './user-details.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private usersService = inject(UsersService);
  private walletService = inject(WalletService);
  private earningsService = inject(EarningsService);
  private messageService = inject(MessageService);
  protected permission = inject(PermissionService);

  hasUserActions = computed(() =>
    this.permission.hasAnyPermission(
      'users.activate_registration',
      'users.upgrade_package',
      'wallets.adjust_funds',
      'users.credit_volume',
      'users.lock_wallet',
      'users.suspend',
      'users.reset_password',
      'users.impersonate',
      'users.wallet_adjust'
    )
  );
  canSuspendUser = computed(() => this.permission.hasPermission('users.suspend'));
  canResetPassword = computed(() => this.permission.hasPermission('users.reset_password'));
  isViewOnly = computed(
    () => this.permission.hasAccess(Feature.Users) && !this.hasUserActions()
  );

  user = signal<User | null>(null);
  activeTab = signal('basic');
  actionLoading = signal(false);

  /** Modal visibility signals */
  addFundsModalVisible = signal(false);
  removeFundsModalVisible = signal(false);
  selectedFundWalletType = signal<AdminFundWalletType | undefined>(undefined);
  activateModalVisible = signal(false);
  upgradeModalVisible = signal(false);
  volumeModalVisible = signal(false);

  /** Confirmation modal state */
  confirmAction = signal('');
  confirmTitle = signal('');
  confirmMessage = signal('');
  confirmIcon = signal('');
  confirmIconClass = signal('');
  confirmLabel = signal('');
  confirmClass = signal('');
  confirmShowReason = signal(false);
  confirmReasonRequired = signal(false);
  confirmVisible = signal(false);

  /** Earnings activity state */
  eaItems = signal<UserEarningsActivityItem[]>([]);
  eaLoading = signal(false);
  eaError = signal<string | null>(null);
  eaServerTotal = signal<number | null>(null);
  eaHasMore = signal(false);
  eaLimit = 50;
  eaOffset = signal(0);
  eaDateRange = signal<Date[] | null>(null);

  walletActionLoading = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadUser(id);
    } else {
      this.router.navigate(['/admin/users']);
    }
  }

  loadUser(id: string): void {
    this.usersService.getUserById(id).subscribe({
      next: (foundUser) => {
        this.user.set(foundUser);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'User not found'
        });
        setTimeout(() => this.router.navigate(['/admin/users']), 2000);
      }
    });
  }

  private reloadUser(): void {
    const u = this.user();
    if (u) this.loadUser(u.id);
  }

  /** ────────── Status toggle (Active / Suspended) ────────── */

  toggleActiveStatus(): void {
    const u = this.user();
    if (!u || !this.canSuspendUser()) return;
    if (u.isActive) {
      this.showConfirm('suspend', {
        title: 'Suspend User',
        message: `Prevent ${u.fullName} from logging in? Their account will be suspended.`,
        icon: 'pi pi-ban',
        iconClass: 'text-mlm-error',
        confirmLabel: 'Suspend',
        confirmClass: 'p-button-danger',
        showReason: false,
        reasonRequired: false,
      });
    } else {
      this.showConfirm('reactivate', {
        title: 'Reactivate User',
        message: `Allow ${u.fullName} to log in again?`,
        icon: 'pi pi-check-circle',
        iconClass: 'text-mlm-success',
        confirmLabel: 'Reactivate',
        confirmClass: 'p-button-success',
        showReason: false,
        reasonRequired: false,
      });
    }
  }

  /** ────────── Confirmation modal ────────── */

  private showConfirm(
    action: string,
    opts: {
      title: string;
      message: string;
      icon: string;
      iconClass: string;
      confirmLabel: string;
      confirmClass: string;
      showReason: boolean;
      reasonRequired: boolean;
    },
  ): void {
    this.confirmAction.set(action);
    this.confirmTitle.set(opts.title);
    this.confirmMessage.set(opts.message);
    this.confirmIcon.set(opts.icon);
    this.confirmIconClass.set(opts.iconClass);
    this.confirmLabel.set(opts.confirmLabel);
    this.confirmClass.set(opts.confirmClass);
    this.confirmShowReason.set(opts.showReason);
    this.confirmReasonRequired.set(opts.reasonRequired);
    this.confirmVisible.set(true);
  }

  onConfirmResult(result: ConfirmationResult): void {
    const u = this.user();
    if (!u || !result.confirmed) return;

    const action = this.confirmAction();

    switch (action) {
      case 'suspend': {
        const payload: UpdateUserStatusPayload = { isActive: false };
        this.usersService.updateUserStatus(u.id, payload).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'User suspended' });
            this.reloadUser();
          },
          error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to suspend user' }),
        });
        break;
      }
      case 'reactivate': {
        const payload: UpdateUserStatusPayload = { isActive: true };
        this.usersService.updateUserStatus(u.id, payload).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'User reactivated' });
            this.reloadUser();
          },
          error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to reactivate user' }),
        });
        break;
      }
      case 'resetPassword': {
        this.actionLoading.set(true);
        this.usersService.resetUserPassword(u.id).subscribe({
          next: (message) => {
            this.messageService.add({ severity: 'success', summary: 'Success', detail: message || 'Password reset link sent' });
            this.actionLoading.set(false);
          },
          error: (error) => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: error?.error?.message || 'Failed to reset password' });
            this.actionLoading.set(false);
          },
        });
        return;
      }
    }
    this.confirmVisible.set(false);
  }

  onConfirmCancel(): void {
    this.actionLoading.set(false);
    this.confirmVisible.set(false);
  }

  /** ────────── Reset password confirm ────────── */

  openResetPasswordConfirm(): void {
    const u = this.user();
    if (!u) return;
    this.showConfirm('resetPassword', {
      title: 'Reset Password',
      message: `Are you sure you want to reset ${u.fullName}'s password? A temporary password will be sent to their email.`,
      icon: 'pi pi-key',
      iconClass: 'text-mlm-blue-600',
      confirmLabel: 'Reset Password',
      confirmClass: 'p-button-primary',
      showReason: false,
      reasonRequired: false,
    });
  }

  /** ────────── Lock / Unlock CASH wallet ────────── */

  toggleCashLock(): void {
    const u = this.user();
    if (!u || !this.hasUserActions()) return;
    const cash = u.wallets.cash;
    if (!cash) return;
    if (cash.status === 'ACTIVE') {
      this.showConfirm('lockCash', {
        title: 'Lock CASH wallet',
        message: `Locking blocks cashouts and internal transfers from the CASH wallet for ${u.fullName}.`,
        icon: 'pi pi-lock',
        iconClass: 'text-mlm-error',
        confirmLabel: 'Lock wallet',
        confirmClass: 'p-button-danger',
        showReason: false,
        reasonRequired: false,
      });
    } else {
      this.showConfirm('unlockCash', {
        title: 'Unlock CASH wallet',
        message: `Restore CASH wallet access for ${u.fullName}.`,
        icon: 'pi pi-lock-open',
        iconClass: 'text-mlm-success',
        confirmLabel: 'Unlock wallet',
        confirmClass: 'p-button-success',
        showReason: false,
        reasonRequired: false,
      });
    }
  }

  private handleLockCashAction(confirmResult: ConfirmationResult): void {
    const u = this.user();
    if (!u || !confirmResult.confirmed) return;
    const action = this.confirmAction();
    if (action === 'lockCash') {
      this.usersService.lockCASHWallet(u.id).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Locked', detail: 'CASH wallet locked.' });
          this.reloadUser();
        },
        error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to lock wallet' }),
      });
    } else {
      this.usersService.unlockCASHWallet(u.id).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Unlocked', detail: 'CASH wallet unlocked.' });
          this.reloadUser();
        },
        error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to unlock wallet' }),
      });
    }
  }

  /** ────────── Modal handlers ────────── */

  /** Add funds (credit via wallet adjust endpoint) */
  openAddFundsModal(walletType?: AdminFundWalletType): void {
    this.selectedFundWalletType.set(walletType);
    this.addFundsModalVisible.set(true);
  }

  /** Remove funds (debit via wallet adjust endpoint) */
  openRemoveFundsModal(walletType?: AdminFundWalletType): void {
    this.selectedFundWalletType.set(walletType);
    this.removeFundsModalVisible.set(true);
  }

  onAdjustFundsComplete(): void {
    this.addFundsModalVisible.set(false);
    this.removeFundsModalVisible.set(false);
    this.selectedFundWalletType.set(undefined);
    this.reloadUser();
  }

  /** Activate registration */
  openActivateModal(): void {
    this.activateModalVisible.set(true);
  }

  onActivateConfirmed(payload: ActivateRegistrationPayload): void {
    const u = this.user();
    if (!u) return;
    this.usersService.activateRegistration(u.id, payload).subscribe({
      next: () => {
        this.activateModalVisible.set(false);
        this.messageService.add({ severity: 'success', summary: 'Activated', detail: 'Registration activated.' });
        this.reloadUser();
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'Activation failed.' });
      },
    });
  }

  onActivateCancelled(): void {
    this.activateModalVisible.set(false);
  }

  /** Upgrade package */
  openUpgradeModal(): void {
    this.upgradeModalVisible.set(true);
  }

  onUpgradeComplete(): void {
    this.reloadUser();
  }

  /** Credit volume */
  openVolumeModal(): void {
    this.volumeModalVisible.set(true);
  }

  onVolumeConfirmed(payload: CreditVolumePayload): void {
    const u = this.user();
    if (!u) return;
    this.usersService.creditVolume(u.id, payload).subscribe({
      next: (res) => {
        this.volumeModalVisible.set(false);
        this.messageService.add({ severity: 'success', summary: 'Volume credited', detail: res.message });
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'Volume credit failed.' });
      },
    });
  }

  onVolumeCancelled(): void {
    this.volumeModalVisible.set(false);
  }

  /** ────────── Existing helpers (kept for compatibility) ────────── */

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  formatDateTime(date: Date): string {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  formatCurrency(amount: number, currency?: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'NGN',
      minimumFractionDigits: 2,
    }).format(amount);
  }

  getPackageColor(pkg: string): string {
    const colors: Record<string, string> = {
      'Silver': '#94a3b8', 'Gold': '#F9A825', 'Platinum': '#64748b',
      'Ruby': '#ef4444', 'Diamond': '#3b82f6'
    };
    return colors[pkg] || '#94a3b8';
  }

  /** ────────── Earnings activity tab ────────── */

  onEarningsTabClick(): void {
    this.activeTab.set('earnings');
    this.loadEarningsActivity(true);
  }

  loadEarningsActivity(resetOffset: boolean): void {
    const u = this.user();
    if (!u?.id) return;
    if (resetOffset) this.eaOffset.set(0);
    this.eaLoading.set(true);
    this.eaError.set(null);
    const range = this.eaDateRange();
    let from: string | undefined;
    let to: string | undefined;
    if (range && range.length >= 2 && range[0] && range[1]) {
      const start = new Date(range[0]);
      start.setHours(0, 0, 0, 0);
      const end = new Date(range[1]);
      end.setHours(23, 59, 59, 999);
      from = start.toISOString();
      to = end.toISOString();
    }
    this.earningsService
      .getUserEarningsActivity({
        userId: u.id,
        limit: this.eaLimit,
        offset: this.eaOffset(),
        from, to,
      })
      .subscribe({
        next: (res) => {
          this.eaLoading.set(false);
          if (res === null) {
            this.eaError.set('Failed to load earnings activity.');
            this.eaItems.set([]);
            this.eaServerTotal.set(null);
            this.eaHasMore.set(false);
            return;
          }
          const batch = res.items ?? [];
          if (resetOffset) this.eaItems.set(batch);
          else this.eaItems.update((prev) => [...prev, ...batch]);
          const loaded = this.eaItems().length;
          const total = res.total;
          if (total != null && total !== undefined) {
            this.eaServerTotal.set(total);
            this.eaHasMore.set(loaded < total);
          } else {
            this.eaServerTotal.set(null);
            this.eaHasMore.set(batch.length >= this.eaLimit);
          }
        },
        error: () => {
          this.eaLoading.set(false);
          this.eaError.set('Failed to load earnings activity.');
          this.eaItems.set([]);
        },
      });
  }

  loadMoreEarningsActivity(): void {
    this.eaOffset.update((o) => o + this.eaLimit);
    this.loadEarningsActivity(false);
  }

  formatActivityAmount = formatUserEarningsActivityAmount;
  activityKind = getUserEarningsActivityKind;
  activityDetail = getUserEarningsActivityDetail;
  activityTrack = userEarningsActivityTrackId;

  expandedRowIds = signal<Set<string>>(new Set());

  toggleExpandedRow(row: UserEarningsActivityItem): void {
    const key = row.id || row.reference || row.sourceId || '';
    if (!key) return;
    this.expandedRowIds.update(set => {
      const next = new Set(set);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  isRowExpanded(row: UserEarningsActivityItem): boolean {
    const key = row.id || row.reference || row.sourceId || '';
    return this.expandedRowIds().has(key);
  }

  getSourceLabel(row: UserEarningsActivityItem): string {
    if (row.earningType) return getEarningTypeLabel(row.earningType);
    if (row.source) return getEarningTypeLabel(row.source);
    return '—';
  }

  getSourceSublabel(row: UserEarningsActivityItem): string {
    const meta = row.metadata as Record<string, unknown> | undefined;
    const metaSource = meta?.['source'] as string | undefined;
    const pkg = meta?.['package'] as string | undefined;
    const parts: string[] = [];
    if (metaSource) parts.push(metaSource);
    if (pkg) parts.push(pkg);
    return parts.join(' · ');
  }

  getMetaValue(row: UserEarningsActivityItem, key: string): unknown {
    const meta = row.metadata as Record<string, unknown> | undefined;
    return meta?.[key] ?? null;
  }

  formatPurpose(purpose: unknown): string {
    if (typeof purpose !== 'string' || !purpose) return '—';
    return purpose.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }

  formatRate(row: UserEarningsActivityItem): string {
    const pct = this.getMetaValue(row, 'ratePct');
    if (pct != null) return pct + '%';
    const rate = this.getMetaValue(row, 'rate');
    if (rate != null) {
      const num = typeof rate === 'number' ? rate * 100 : parseFloat('' + rate) * 100;
      return Number.isNaN(num) ? '—' : Math.round(num) + '%';
    }
    return '—';
  }

  /** ────────── Wallet helpers ────────── */

  hasWallet(key: string): boolean {
    const u = this.user();
    if (!u) return false;
    const wallets = u.wallets as Record<string, unknown>;
    return key in wallets;
  }

  getWallet(key: string): UserWallet | undefined {
    const wallets = this.user()?.wallets as Record<string, UserWallet | undefined> | undefined;
    return wallets?.[key];
  }

  walletLabel(key: string): string {
    switch (key) {
      case 'cash': return 'CASH';
      case 'registration': return 'Registration';
      case 'voucher': return 'Voucher';
      case 'autoship': return 'Autoship';
      default: return key.toUpperCase();
    }
  }

  walletIcon(key: string): string {
    switch (key) {
      case 'cash': return 'pi pi-wallet';
      case 'registration': return 'pi pi-id-card';
      case 'voucher': return 'pi pi-ticket';
      case 'autoship': return 'pi pi-sync';
      default: return 'pi pi-credit-card';
    }
  }
}
