import { Component, OnInit, inject, signal, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PermissionService } from '../../../core/services/permission.service';
import { Feature, Action } from '../../../core/models/admin-permission.model';
import { InfoBannerComponent } from '../../../shared/components/info-banner/info-banner.component';
import { ConfirmationModalComponent, ConfirmationResult } from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { UsersService, User } from '../services/users.service';
import {
  EarningsService,
  UserEarningsActivityItem,
  formatUserEarningsActivityAmount,
  getUserEarningsActivityDetail,
  getUserEarningsActivityKind,
  userEarningsActivityTrackId,
} from '../../earnings/services/earnings.service';
import { getEarningTypeLabel } from '../../../core/constants/earning-type-labels';

interface ActionConfig {
  visible: boolean;
  title: string;
  message: string;
  icon: string;
  iconClass: string;
  confirmLabel: string;
  confirmClass: string;
  showReasonField: boolean;
  reasonRequired: boolean;
  action: string;
}

@Component({
  selector: 'app-user-details',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ButtonModule,
    DatePickerModule,
    ToastModule,
    InfoBannerComponent,
    ConfirmationModalComponent
  ],
  providers: [MessageService],
  templateUrl: './user-details.component.html',
  styleUrls: ['./user-details.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private usersService = inject(UsersService);
  private earningsService = inject(EarningsService);
  private messageService = inject(MessageService);
  protected permission = inject(PermissionService);

  canSuspendUser = computed(
    () => this.permission.canEdit(Feature.Users) && this.permission.canPerform(Action.SuspendUser)
  );
  canResetPassword = computed(
    () => this.permission.canEdit(Feature.Users) && this.permission.canPerform(Action.ResetUserPassword)
  );
  isViewOnly = computed(() => !this.permission.canEdit(Feature.Users));

  user = signal<User | null>(null);
  activeTab = signal('basic');
  actionLoading = signal(false);

  /** GET /admin/earnings/activity */
  eaItems = signal<UserEarningsActivityItem[]>([]);
  eaLoading = signal(false);
  eaError = signal<string | null>(null);
  /** Set when API returns total; otherwise null (pagination by page size). */
  eaServerTotal = signal<number | null>(null);
  /** When API omits total, use page-size heuristic for "Load more". */
  eaHasMore = signal(false);
  eaLimit = 50;
  eaOffset = signal(0);
  eaDateRange = signal<Date[] | null>(null);
  
  actionConfig = signal<ActionConfig>({
    visible: false,
    title: '',
    message: '',
    icon: '',
    iconClass: '',
    confirmLabel: '',
    confirmClass: '',
    showReasonField: false,
    reasonRequired: false,
    action: ''
  });

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

  onAction(action: string): void {
    const user = this.user();
    if (!user) return;

    const configs: Record<string, Partial<ActionConfig>> = {
      suspend: {
        title: 'Suspend User',
        message: `Are you sure you want to suspend ${user.fullName}'s account?`,
        icon: 'pi pi-ban',
        iconClass: 'text-mlm-error',
        confirmLabel: 'Suspend',
        confirmClass: 'p-button-danger',
        showReasonField: true,
        reasonRequired: true
      },
      reactivate: {
        title: 'Reactivate User',
        message: `Are you sure you want to reactivate ${user.fullName}'s account?`,
        icon: 'pi pi-check-circle',
        iconClass: 'text-mlm-success',
        confirmLabel: 'Reactivate',
        confirmClass: 'p-button-success',
        showReasonField: false,
        reasonRequired: false
      },
      flag: {
        title: 'Flag Account',
        message: `Are you sure you want to flag ${user.fullName}'s account for review?`,
        icon: 'pi pi-flag',
        iconClass: 'text-mlm-warning',
        confirmLabel: 'Flag Account',
        confirmClass: 'p-button-warning',
        showReasonField: true,
        reasonRequired: true
      },
      unflag: {
        title: 'Remove Flag',
        message: `Are you sure you want to remove the flag from ${user.fullName}'s account?`,
        icon: 'pi pi-flag-fill',
        iconClass: 'text-mlm-secondary',
        confirmLabel: 'Remove Flag',
        confirmClass: 'p-button-primary',
        showReasonField: false,
        reasonRequired: false
      },
      resetPassword: {
        title: 'Reset Password',
        message: `Are you sure you want to reset ${user.fullName}'s password? A temporary password will be sent to their email.`,
        icon: 'pi pi-key',
        iconClass: 'text-mlm-blue-600',
        confirmLabel: 'Reset Password',
        confirmClass: 'p-button-primary',
        showReasonField: false,
        reasonRequired: false
      }
    };

    const config = configs[action];
    if (config) {
      this.actionConfig.set({
        visible: true,
        action,
        title: config.title || '',
        message: config.message || '',
        icon: config.icon || '',
        iconClass: config.iconClass || '',
        confirmLabel: config.confirmLabel || '',
        confirmClass: config.confirmClass || '',
        showReasonField: !!config.showReasonField,
        reasonRequired: !!config.reasonRequired
      });
    }
  }

  onActionConfirm(result: ConfirmationResult): void {
    const user = this.user();
    if (!user || !result.confirmed) return;

    const action = this.actionConfig().action;

    switch (action) {
      case 'suspend':
        this.usersService.updateUserStatus(user.id, 'Suspended', result.reason || '').subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'User suspended' });
            this.loadUser(user.id);
          },
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to suspend user' });
          }
        });
        break;
      case 'reactivate':
        this.usersService.updateUserStatus(user.id, 'Active', '').subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'User reactivated' });
            this.loadUser(user.id);
          },
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to reactivate user' });
          }
        });
        break;
      case 'flag':
        this.usersService.updateUserStatus(user.id, 'Flagged', result.reason || '').subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Account flagged' });
            this.loadUser(user.id);
          },
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to flag account' });
          }
        });
        break;
      case 'unflag':
        this.usersService.updateUserStatus(user.id, 'Active', '').subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Flag removed' });
            this.loadUser(user.id);
          },
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to remove flag' });
          }
        });
        break;
      case 'resetPassword':
        this.actionLoading.set(true);
        this.usersService.resetUserPassword(user.id).subscribe({
          next: (message) => {
            this.messageService.add({ severity: 'success', summary: 'Success', detail: message || 'Password reset link sent' });
            this.actionConfig.update(prev => ({ ...prev, visible: false }));
            this.actionLoading.set(false);
          },
          error: (error) => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: error?.error?.message || 'Failed to reset password' });
            this.actionLoading.set(false);
          }
        });
        return;
    }

    this.actionConfig.update(prev => ({ ...prev, visible: false }));
  }

  onActionCancel(): void {
    this.actionLoading.set(false);
    this.actionConfig.update(prev => ({ ...prev, visible: false }));
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatDateTime(date: Date): string {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  getPackageColor(pkg: string): string {
    const colors: Record<string, string> = {
      'Silver': '#94a3b8',
      'Gold': '#F9A825',
      'Platinum': '#64748b',
      'Ruby': '#ef4444',
      'Diamond': '#3b82f6'
    };
    return colors[pkg] || '#94a3b8';
  }

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
        from,
        to,
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
          if (resetOffset) {
            this.eaItems.set(batch);
          } else {
            this.eaItems.update((prev) => [...prev, ...batch]);
          }
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

  /** Track which rows are expanded to show metadata. */
  expandedRowIds = signal<Set<string>>(new Set());

  toggleExpandedRow(row: UserEarningsActivityItem): void {
    const key = row.id || row.reference || row.sourceId || '';
    if (!key) return;
    this.expandedRowIds.update(set => {
      const next = new Set(set);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  isRowExpanded(row: UserEarningsActivityItem): boolean {
    const key = row.id || row.reference || row.sourceId || '';
    return this.expandedRowIds().has(key);
  }

  /**
   * Human-readable source label from earningType or source.
   * Uses the earning-type-labels map for friendly names.
   */
  getSourceLabel(row: UserEarningsActivityItem): string {
    if (row.earningType) {
      return getEarningTypeLabel(row.earningType);
    }
    if (row.source) {
      return getEarningTypeLabel(row.source);
    }
    return '—';
  }

  /**
   * Optional sublabel showing extra context (e.g. package name, metadata source).
   */
  getSourceSublabel(row: UserEarningsActivityItem): string {
    const meta = row.metadata as Record<string, unknown> | undefined;
    const metaSource = meta?.['source'] as string | undefined;
    const pkg = meta?.['package'] as string | undefined;
    const parts: string[] = [];
    if (metaSource) parts.push(metaSource);
    if (pkg) parts.push(pkg);
    return parts.join(' · ');
  }

  /**
   * Safely access a value from the row's metadata object.
   */
  getMetaValue(row: UserEarningsActivityItem, key: string): any {
    const meta = row.metadata as Record<string, unknown> | undefined;
    return meta?.[key] ?? null;
  }

  /**
   * Format SCREAMING_SNAKE_CASE purpose strings to readable text.
   */
  formatPurpose(purpose: string): string {
    if (!purpose) return '—';
    return purpose
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }
}
