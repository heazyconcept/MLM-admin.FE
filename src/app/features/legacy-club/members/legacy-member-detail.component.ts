import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PermissionService } from '../../../core/services/permission.service';
import { AdminOrdersService } from '../../orders/services/admin-orders.service';
import { Order, ShopChannel } from '../../../core/models/order.model';
import { CHANNEL_FILTER_OPTIONS } from '../../../core/constants/order.constants';
import {
  marketplaceBadgeClass,
  marketplacePaidFromLabel,
  marketplaceSourceLabel,
} from '../../../core/utils/order-marketplace.util';
import {
  EarningsService,
  UserEarningsActivityItem,
  formatUserEarningsActivityAmount,
  getUserEarningsActivityDetail,
  getUserEarningsActivityKind,
  userEarningsActivityTrackId,
} from '../../earnings/services/earnings.service';
import { getEarningTypeLabel } from '../../../core/constants/earning-type-labels';
import { InfoBannerComponent } from '../../../shared/components/info-banner/info-banner.component';
import {
  ConfirmationModalComponent,
  ConfirmationResult,
} from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { LegacyWaiveJoinModalComponent } from '../modals/legacy-waive-join-modal.component';
import {
  LegacyUpgradeConfirmPayload,
  LegacyUpgradeModalComponent,
} from '../modals/legacy-upgrade-modal.component';
import { AdminLegacyService } from '../services/admin-legacy.service';
import {
  AdminLegacyEvent,
  AdminLegacyPeriod,
  AdminLegacyPriorPending,
  higherLegacyPackages,
  legacyPackageLabel,
  legacyMemberCashoutBalance,
  legacyMemberVoucherBalance,
  resolveMemberLegacyPackage,
} from '../models/admin-legacy.models';

@Component({
  selector: 'app-legacy-member-detail',
  imports: [
    CommonModule,
    RouterModule,
    ButtonModule,
    ToastModule,
    InfoBannerComponent,
    ConfirmationModalComponent,
    LegacyWaiveJoinModalComponent,
    LegacyUpgradeModalComponent,
    FormsModule,
    ReactiveFormsModule,
    SelectModule,
    DatePickerModule,
  ],
  providers: [MessageService],
  templateUrl: './legacy-member-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegacyMemberDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly legacyService = inject(AdminLegacyService);
  private readonly ordersService = inject(AdminOrdersService);
  private readonly earningsService = inject(EarningsService);
  private readonly messageService = inject(MessageService);
  protected readonly permission = inject(PermissionService);

  readonly detailTabs = [
    { key: 'basic', label: 'Account Info' },
    { key: 'network', label: 'Network Details' },
    { key: 'orders', label: 'Orders' },
    { key: 'activity', label: 'Activity Log' },
    { key: 'earnings', label: 'Earnings Activity' },
  ] as const;

  activeTab = signal<(typeof this.detailTabs)[number]['key']>('basic');

  detail = this.legacyService.memberDetail;
  loading = this.legacyService.detailLoading;
  error = this.legacyService.detailError;

  canViewWallets = computed(() =>
    this.permission.hasPermission('legacy.view_wallets')
  );

  userId = '';
  showCancelModal = signal(false);
  showWaiveModal = signal(false);
  showUpgradeModal = signal(false);
  cancelling = signal(false);
  waiving = signal(false);
  upgrading = signal(false);

  packages = this.legacyService.packages;

  memberOrders = signal<Order[]>([]);
  memberOrdersLoading = signal(false);
  memberOrdersError = signal<string | null>(null);
  memberOrdersTotal = signal(0);
  memberOrdersChannelControl = new FormControl<string>('LEGACY');
  channelFilterOptions = CHANNEL_FILTER_OPTIONS;

  eaItems = signal<UserEarningsActivityItem[]>([]);
  eaLoading = signal(false);
  eaError = signal<string | null>(null);
  eaServerTotal = signal<number | null>(null);
  eaHasMore = signal(false);
  eaLimit = 50;
  eaOffset = signal(0);
  eaDateRange = signal<Date[] | null>(null);
  expandedRowIds = signal<Set<string>>(new Set());

  formatActivityAmount = formatUserEarningsActivityAmount;
  activityKind = getUserEarningsActivityKind;
  activityDetail = getUserEarningsActivityDetail;
  activityTrack = userEarningsActivityTrackId;

  isPendingJoin = computed(() => this.detail()?.status === 'PENDING_JOIN');
  isActive = computed(() => this.detail()?.status === 'ACTIVE');

  canCancelJoin = computed(
    () =>
      this.isPendingJoin() &&
      (this.permission.hasPermission('legacy.cancel_pending_join') ||
        this.permission.hasPermission('legacy.view_members')),
  );

  canWaiveJoin = computed(
    () =>
      this.isPendingJoin() &&
      (this.permission.hasPermission('legacy.waive_join') ||
        this.permission.hasPermission('legacy.enroll_seed')),
  );

  memberLegacyPackage = computed(() => resolveMemberLegacyPackage(this.detail()));

  canUpgradeMember = computed(
    () =>
      this.isActive() &&
      this.canPerformUpgrade() &&
      this.upgradePackageOptions().length > 0,
  );

  canPerformUpgrade = computed(() =>
    this.permission.hasAnyPermission(
      'legacy.upgrade_member',
      'legacy.enroll_seed',
      'legacy.configure_packages',
    ),
  );

  upgradePackageOptions = computed(() => {
    const current = this.memberLegacyPackage();
    if (!current) return [];

    const higher = higherLegacyPackages(current);
    const loaded = this.packages();
    if (loaded.length === 0) {
      return higher.map((pkg) => ({
        label: legacyPackageLabel(pkg),
        value: pkg,
      }));
    }

    const active = new Set(
      loaded.filter((pkg) => pkg.isActive).map((pkg) => pkg.package),
    );
    return higher
      .filter((pkg) => active.has(pkg))
      .map((pkg) => ({
        label: legacyPackageLabel(pkg),
        value: pkg,
      }));
  });

  ngOnInit(): void {
    this.userId = this.route.snapshot.paramMap.get('userId') ?? '';
    this.legacyService.loadPackages().subscribe();
    if (this.userId) {
      this.legacyService.loadMemberDetail(this.userId).subscribe();
    }
  }

  retry(): void {
    if (this.userId) {
      this.legacyService.loadMemberDetail(this.userId).subscribe();
    }
  }

  packageLabel(code: string | undefined | null): string {
    return legacyPackageLabel(code);
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatMoney(value: number | null | undefined, currency = 'NGN'): string {
    if (value == null) return '—';
    const prefix = currency === 'USD' ? '$' : '₦';
    return `${prefix}${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }

  cashoutBalance(): number | null {
    return legacyMemberCashoutBalance(this.detail());
  }

  voucherBalance(): number | null {
    return legacyMemberVoucherBalance(this.detail());
  }

  statusClass(status: string | undefined): string {
    switch (status) {
      case 'DROPPED':
        return 'bg-emerald-100 text-emerald-800';
      case 'PENDING':
        return 'bg-amber-100 text-amber-800';
      case 'SCHEDULED':
        return 'bg-slate-100 text-slate-600';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  }

  rateTierClass(tier: string | undefined): string {
    return tier === 'INCREASED'
      ? 'bg-violet-100 text-violet-800'
      : 'bg-sky-100 text-sky-800';
  }

  eventKindClass(kind: string): string {
    const map: Record<string, string> = {
      JOIN: 'bg-emerald-100 text-emerald-800',
      SEED: 'bg-amber-100 text-amber-800',
      UPGRADE: 'bg-sky-100 text-sky-800',
      REACTIVATE: 'bg-violet-100 text-violet-800',
      JOIN_CANCELLED: 'bg-red-100 text-red-800',
      JOIN_WAIVED: 'bg-violet-100 text-violet-800',
    };
    return map[kind] ?? 'bg-slate-100 text-slate-600';
  }

  membershipStatusClass(status: string | undefined): string {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-100 text-emerald-800';
      case 'PENDING_JOIN':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  }

  membershipStatusLabel(status: string | undefined): string {
    if (!status) return 'Unknown';
    if (status === 'PENDING_JOIN') return 'Pending join';
    return status;
  }

  openCancelModal(): void {
    this.showCancelModal.set(true);
  }

  closeCancelModal(): void {
    if (!this.cancelling()) {
      this.showCancelModal.set(false);
    }
  }

  confirmCancelJoin(result: ConfirmationResult): void {
    if (!result.confirmed || !result.reason?.trim() || !this.userId) return;

    this.cancelling.set(true);
    this.legacyService.cancelPendingJoin(this.userId, { reason: result.reason.trim() }).subscribe({
      next: (res) => {
        this.cancelling.set(false);
        this.showCancelModal.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Registration cancelled',
          detail: `@${res.username ?? this.detail()?.username ?? 'member'} can start Legacy join again.`,
        });
        this.legacyService.loadMemberDetail(this.userId).subscribe();
      },
      error: (err: unknown) => {
        this.cancelling.set(false);
        const http = err as { error?: { message?: string | string[] } };
        const msg = http?.error?.message;
        this.messageService.add({
          severity: 'error',
          summary: 'Cancel failed',
          detail: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Could not cancel registration.',
        });
      },
    });
  }

  openWaiveModal(): void {
    this.showWaiveModal.set(true);
  }

  onWaiveCancelled(): void {
    if (!this.waiving()) {
      this.showWaiveModal.set(false);
    }
  }

  openUpgradeModal(): void {
    this.showUpgradeModal.set(true);
  }

  onUpgradeCancelled(): void {
    if (!this.upgrading()) {
      this.showUpgradeModal.set(false);
    }
  }

  onUpgradeConfirmed(payload: LegacyUpgradeConfirmPayload): void {
    if (!this.userId) return;

    this.upgrading.set(true);
    this.legacyService.upgradeMember(this.userId, payload).subscribe({
      next: (res) => {
        this.upgrading.set(false);
        this.showUpgradeModal.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Package upgraded',
          detail: `@${res.username ?? this.detail()?.username ?? 'member'} upgraded to ${this.packageLabel(res.toPackage)}.`,
        });
        this.legacyService.loadMemberDetail(this.userId).subscribe();
      },
      error: (err: unknown) => {
        this.upgrading.set(false);
        const http = err as { error?: { message?: string | string[] } };
        const msg = http?.error?.message;
        this.messageService.add({
          severity: 'error',
          summary: 'Upgrade failed',
          detail: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Could not upgrade package.',
        });
      },
    });
  }

  onWaiveConfirmed(reason: string): void {
    if (!this.userId) return;

    this.waiving.set(true);
    this.legacyService.waivePendingJoin(this.userId, { reason }).subscribe({
      next: (res) => {
        this.waiving.set(false);
        this.showWaiveModal.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Legacy activated',
          detail: `@${res.username ?? this.detail()?.username ?? 'member'} is now an ACTIVE Legacy member.`,
        });
        this.legacyService.loadMemberDetail(this.userId).subscribe();
      },
      error: (err: unknown) => {
        this.waiving.set(false);
        const http = err as { error?: { message?: string | string[] } };
        const msg = http?.error?.message;
        this.messageService.add({
          severity: 'error',
          summary: 'Activation failed',
          detail: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Could not waive and activate.',
        });
      },
    });
  }

  periods(): AdminLegacyPeriod[] {
    return this.detail()?.periods ?? [];
  }

  priorPending(): AdminLegacyPriorPending[] {
    return this.detail()?.priorPending ?? [];
  }

  events(): AdminLegacyEvent[] {
    return this.detail()?.events ?? [];
  }

  successlines() {
    return this.detail()?.successlines ?? [];
  }

  /** Prefer API cycleWeeks; default 24 when periods look weekly. */
  cycleWeeksTotal(): number {
    const m = this.detail();
    if (!m) return 24;
    if (m.cycleWeeks != null && m.cycleWeeks > 0) return m.cycleWeeks;
    const periods = m.periods ?? [];
    if (periods.length > 6) return 24;
    return m.cycleMonths != null && m.cycleMonths > 0 ? m.cycleMonths * 4 : 24;
  }

  weekProgressLabel(): string {
    const m = this.detail();
    if (!m) return '';
    const issued = m.issuedCount ?? 0;
    return `week ${issued} of ${this.cycleWeeksTotal()}`;
  }

  onTabClick(key: (typeof this.detailTabs)[number]['key']): void {
    if (key === 'orders') {
      this.onOrdersTabClick();
      return;
    }
    if (key === 'earnings') {
      this.onEarningsTabClick();
      return;
    }
    this.activeTab.set(key);
  }

  onOrdersTabClick(): void {
    this.activeTab.set('orders');
    this.loadMemberOrders();
  }

  loadMemberOrders(): void {
    if (!this.userId) return;

    this.memberOrdersLoading.set(true);
    this.memberOrdersError.set(null);

    const channel = this.memberOrdersChannelControl.value;
    this.ordersService
      .loadOrders({
        userId: this.userId,
        channel: channel === 'NETWORK' || channel === 'LEGACY' ? (channel as ShopChannel) : undefined,
        limit: 50,
        offset: 0,
      })
      .subscribe({
        next: ({ orders, total }) => {
          this.memberOrdersLoading.set(false);
          this.memberOrders.set(orders);
          this.memberOrdersTotal.set(total);
        },
        error: () => {
          this.memberOrdersLoading.set(false);
          this.memberOrdersError.set('Failed to load orders.');
          this.memberOrders.set([]);
          this.memberOrdersTotal.set(0);
        },
      });
  }

  onMemberOrdersChannelChange(): void {
    this.loadMemberOrders();
  }

  viewMemberOrder(order: Order): void {
    void this.router.navigate(['/admin/orders', order.id]);
  }

  getOrderSourceLabel(order: Order): string {
    return marketplaceSourceLabel(order);
  }

  getOrderPaidFromLabel(order: Order): string {
    return marketplacePaidFromLabel(order);
  }

  getOrderSourceBadgeClass(order: Order): string {
    return marketplaceBadgeClass(order.channel);
  }

  getOrderStatusLabel(status: Order['status']): string {
    return this.ordersService.getStatusLabel(status);
  }

  onEarningsTabClick(): void {
    this.activeTab.set('earnings');
    this.loadEarningsActivity(true);
  }

  loadEarningsActivity(resetOffset: boolean): void {
    if (!this.userId) return;
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
        userId: this.userId,
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
          if (resetOffset) this.eaItems.set(batch);
          else this.eaItems.update((prev) => [...prev, ...batch]);

          const loaded = this.eaItems().length;
          const total = res.total;
          if (total != null) {
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
    this.eaOffset.update((offset) => offset + this.eaLimit);
    this.loadEarningsActivity(false);
  }

  toggleExpandedRow(row: UserEarningsActivityItem): void {
    const key = row.id || row.reference || row.sourceId || '';
    if (!key) return;
    this.expandedRowIds.update((set) => {
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
    return purpose
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  formatRate(row: UserEarningsActivityItem): string {
    const pct = this.getMetaValue(row, 'ratePct');
    if (pct != null) return `${pct}%`;
    const rate = this.getMetaValue(row, 'rate');
    if (rate != null) {
      const num = typeof rate === 'number' ? rate * 100 : parseFloat(`${rate}`) * 100;
      return Number.isNaN(num) ? '—' : `${Math.round(num)}%`;
    }
    return '—';
  }
}
