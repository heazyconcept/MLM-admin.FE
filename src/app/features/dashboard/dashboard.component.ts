import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { StatCardComponent } from './components/stat-card/stat-card.component';
import { OverviewChartComponent } from './components/overview-chart/overview-chart.component';
import { PackageChartComponent, PackageData } from './components/package-chart/package-chart.component';
import { PendingActionsComponent, PendingAction } from './components/pending-actions/pending-actions.component';
import { WalletSummaryData } from './components/wallet-summary/wallet-summary.component';
import {
  AdminDashboardSummary,
  DashboardService,
  RevenueTrendPoint
} from './dashboard.service';
import {
  EarningsService,
  UserEarningsActivityItem,
  formatUserEarningsActivityAmount,
  userEarningsActivityTrackId
} from '../earnings/services/earnings.service';
import { getEarningTypeLabel } from '../../core/constants/earning-type-labels';
import { UsersService } from '../users/services/users.service';

interface StatCardVM {
  title: string;
  value: string;
  subtitle?: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  change: number | null;
  changeLabel: string;
  routerLink?: string[];
}

const PKG_COLORS: Record<string, string> = {
  SILVER: '#94a3b8',
  NICKEL: '#94a3b8',
  GOLD: '#F9A825',
  PLATINUM: '#64748b',
  RUBY: '#ef4444',
  DIAMOND: '#3b82f6'
};

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    RouterModule,
    ButtonModule,
    StatCardComponent,
    OverviewChartComponent,
    PackageChartComponent,
    PendingActionsComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly earningsService = inject(EarningsService);
  private readonly usersService = inject(UsersService);

  userName = 'Admin';
  currentDate = new Date();

  loading = signal(false);
  loadError = signal<string | null>(null);

  systemStats = signal<StatCardVM[]>([]);
  financialStats = signal<StatCardVM[]>([]);
  userMetrics = signal<StatCardVM[]>([]);

  private readonly systemStatsSkeleton: StatCardVM[] = [
    { title: 'Total users', value: '', icon: 'pi pi-users', iconBg: 'bg-mlm-green-100', iconColor: 'text-mlm-primary', change: null, changeLabel: '' },
    { title: 'Merchants', value: '', icon: 'pi pi-shop', iconBg: 'bg-mlm-blue-100', iconColor: 'text-mlm-blue-600', change: null, changeLabel: '' },
    { title: 'Open admin tasks', value: '', icon: 'pi pi-inbox', iconBg: 'bg-mlm-warning/10', iconColor: 'text-mlm-warning', change: null, changeLabel: '' }
  ];

  private readonly financialStatsSkeleton: StatCardVM[] = [
    { title: 'Revenue (30 days)', value: '', subtitle: 'SUCCESS payments by day', icon: 'pi pi-chart-line', iconBg: 'bg-mlm-primary/10', iconColor: 'text-mlm-primary', change: null, changeLabel: '' },
    { title: 'Pending withdrawals', value: '', icon: 'pi pi-wallet', iconBg: 'bg-mlm-warning/10', iconColor: 'text-mlm-warning', change: null, changeLabel: '' }
  ];

  private readonly userMetricsSkeleton: StatCardVM[] = [
    { title: 'Pending withdrawals', value: '', icon: 'pi pi-wallet', iconBg: 'bg-mlm-warning/10', iconColor: 'text-mlm-warning', change: null, changeLabel: '' },
    { title: 'Initiated payments', value: '', icon: 'pi pi-credit-card', iconBg: 'bg-mlm-blue-100', iconColor: 'text-mlm-blue-600', change: null, changeLabel: '' },
    { title: 'Pending identity', value: '', icon: 'pi pi-id-card', iconBg: 'bg-mlm-primary/10', iconColor: 'text-mlm-primary', change: null, changeLabel: '' },
    { title: 'Total users', value: '', icon: 'pi pi-users', iconBg: 'bg-mlm-success/10', iconColor: 'text-mlm-success', change: null, changeLabel: '' }
  ];

  walletSummary = signal<WalletSummaryData[]>([]);
  walletTotalBalance = signal('—');

  revenueTrend = signal<RevenueTrendPoint[]>([]);
  revenueTotalFormatted = signal('—');

  packageData = signal<PackageData[]>([]);
  pendingActions = signal<PendingAction[]>([]);

  showSystemOverviewSkeleton = computed(() => this.loading() || this.systemStats().length === 0);
  showFinancialSkeleton = computed(() => this.loading() || this.financialStats().length === 0);
  showOperationsSkeleton = computed(() => this.loading() || this.userMetrics().length === 0);
  showQueuesSkeleton = computed(() => this.loading() || this.pendingActions().length === 0);

  systemStatsToShow = computed(() => this.systemStats().length > 0 ? this.systemStats() : this.systemStatsSkeleton);
  financialStatsToShow = computed(() => this.financialStats().length > 0 ? this.financialStats() : this.financialStatsSkeleton);
  userMetricsToShow = computed(() => this.userMetrics().length > 0 ? this.userMetrics() : this.userMetricsSkeleton);

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.loadError.set(null);
    forkJoin({
      summary: this.dashboardService.getSummary(),
      // Align Total users with User Management (GET /admin/users total)
      usersTotal: this.usersService.getUsers({ limit: 1, offset: 0 }).pipe(
        catchError(() => of(null))
      ),
    }).subscribe(({ summary, usersTotal }) => {
      this.loading.set(false);
      if (!summary) {
        this.loadError.set('Failed to load dashboard summary. Please try again.');
        this.applyEmptyState();
        return;
      }
      const authoritativeUserCount =
        typeof usersTotal?.total === 'number' ? usersTotal.total : summary.userCount;
      this.applySummary(summary, authoritativeUserCount);
    });
    this.loadActivity();
  }

  activity = signal<UserEarningsActivityItem[]>([]);
  activityLoading = signal(false);

  private loadActivity(): void {
    this.activityLoading.set(true);
    this.earningsService.getGlobalActivityRaw({ limit: 10, offset: 0 }).subscribe({
      next: (res) => {
        this.activity.set(res?.items ?? []);
        this.activityLoading.set(false);
      },
      error: () => {
        this.activity.set([]);
        this.activityLoading.set(false);
      }
    });
  }

  private applyEmptyState(): void {
    this.systemStats.set([]);
    this.financialStats.set([]);
    this.userMetrics.set([]);
    this.walletSummary.set([]);
    this.walletTotalBalance.set('—');
    this.revenueTrend.set([]);
    this.revenueTotalFormatted.set('—');
    this.packageData.set([]);
    this.pendingActions.set([]);
  }

  private applySummary(s: AdminDashboardSummary, userCount = s.userCount): void {
    const openTasks =
      (s.pendingWithdrawalsCount ?? 0) +
      (s.initiatedPaymentsCount ?? 0) +
      (s.pendingIdentityCount ?? 0) +
      (s.pendingManualRegistrationPaymentsCount ?? 0) +
      (s.pendingManualDepositsCount ?? 0);

    this.systemStats.set([
      {
        title: 'Total users',
        value: this.fmtInt(userCount),
        icon: 'pi pi-users',
        iconBg: 'bg-mlm-green-100',
        iconColor: 'text-mlm-primary',
        change: null,
        changeLabel: ''
      },
      {
        title: 'Merchants',
        value: this.fmtInt(s.merchantCount),
        icon: 'pi pi-shop',
        iconBg: 'bg-mlm-blue-100',
        iconColor: 'text-mlm-blue-600',
        change: null,
        changeLabel: ''
      },
      {
        title: 'Open admin tasks',
        subtitle: 'Withdrawals + payments + identity',
        value: this.fmtInt(openTasks),
        icon: 'pi pi-inbox',
        iconBg: 'bg-mlm-warning/10',
        iconColor: 'text-mlm-warning',
        change: null,
        changeLabel: ''
      }
    ]);

    const trend = Array.isArray(s.revenueTrend) ? s.revenueTrend : [];
    const revenueSum = trend.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

    this.revenueTrend.set(trend);
    this.revenueTotalFormatted.set(this.fmtAmount(revenueSum));

    this.financialStats.set([
      {
        title: 'Revenue (30 days)',
        value: this.revenueTotalFormatted(),
        subtitle: 'SUCCESS payments by day',
        icon: 'pi pi-chart-line',
        iconBg: 'bg-mlm-primary/10',
        iconColor: 'text-mlm-primary',
        change: null,
        changeLabel: ''
      },
      {
        title: 'Pending withdrawals',
        value: this.fmtInt(s.pendingWithdrawalsCount ?? 0),
        icon: 'pi pi-wallet',
        iconBg: 'bg-mlm-warning/10',
        iconColor: 'text-mlm-warning',
        change: null,
        changeLabel: ''
      }
    ]);

    this.userMetrics.set([
      {
        title: 'Pending withdrawals',
        value: this.fmtInt(s.pendingWithdrawalsCount ?? 0),
        icon: 'pi pi-wallet',
        iconBg: 'bg-mlm-warning/10',
        iconColor: 'text-mlm-warning',
        change: null,
        changeLabel: '',
        routerLink: ['/admin/withdrawals/pending']
      },
      {
        title: 'Initiated payments',
        value: this.fmtInt(s.initiatedPaymentsCount ?? 0),
        icon: 'pi pi-credit-card',
        iconBg: 'bg-mlm-blue-100',
        iconColor: 'text-mlm-blue-600',
        change: null,
        changeLabel: '',
        routerLink: ['/admin/payments']
      },
      {
        title: 'Pending identity',
        value: this.fmtInt(s.pendingIdentityCount ?? 0),
        icon: 'pi pi-id-card',
        iconBg: 'bg-mlm-primary/10',
        iconColor: 'text-mlm-primary',
        change: null,
        changeLabel: ''
      },
      {
        title: 'Total users',
        value: this.fmtInt(userCount),
        subtitle: 'Registered accounts',
        icon: 'pi pi-users',
        iconBg: 'bg-mlm-success/10',
        iconColor: 'text-mlm-success',
        change: null,
        changeLabel: '',
        routerLink: ['/admin/users']
      }
    ]);

    this.walletSummary.set(this.mapWallets(s.wallets ?? {}));
    const wSum = Object.values(s.wallets ?? {}).reduce(
      (a, v) => a + (Number(v) || 0),
      0
    );
    this.walletTotalBalance.set(this.fmtAmount(wSum));

    this.packageData.set(this.mapPackageDistribution(s.packageDistribution ?? {}));
    this.pendingActions.set(this.mapPendingActions(s));
  }

  private mapWallets(w: Record<string, number>): WalletSummaryData[] {
    const meta: Record<
      string,
      Pick<WalletSummaryData, 'label' | 'type' | 'icon' | 'color'>
    > = {
      CASH: {
        label: 'Cash Wallet',
        type: 'Withdrawable',
        icon: 'pi pi-wallet',
        color: '#49A321'
      },
      PRODUCT_VOUCHER: {
        label: 'Product Voucher',
        type: 'Non-Withdrawable',
        icon: 'pi pi-ticket',
        color: '#3b82f6'
      },
      AUTOSHIP: {
        label: 'Autoship Wallet',
        type: 'Non-Withdrawable',
        icon: 'pi pi-refresh',
        color: '#F9A825'
      }
    };

    return Object.entries(w).map(([key, raw]) => {
      const u = key.toUpperCase();
      const m = meta[u] ?? {
        label: key.replace(/_/g, ' '),
        type: 'Wallet',
        icon: 'pi pi-wallet',
        color: '#64748b'
      };
      return {
        ...m,
        balance: this.fmtAmount(Number(raw) || 0)
      };
    });
  }

  private mapPackageDistribution(dist: Record<string, number>): PackageData[] {
    const entries = Object.entries(dist).filter(([, c]) => Number(c) > 0);
    if (!entries.length) return [];
    const total = entries.reduce((sum, [, n]) => sum + Number(n), 0);
    return entries
      .map(([key, count]) => {
        const c = Number(count) || 0;
        const name = this.formatPackageKey(key);
        return {
          name,
          count: c,
          percentage: total > 0 ? Math.round((c / total) * 1000) / 10 : 0,
          color: PKG_COLORS[key.toUpperCase()] ?? '#64748b'
        };
      })
      .sort((a, b) => b.count - a.count);
  }

  private formatPackageKey(key: string): string {
    return key
      .split(/[_\s]+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  private mapPendingActions(s: AdminDashboardSummary): PendingAction[] {
    return [
      {
        type: 'withdrawals',
        label: 'Pending withdrawals',
        count: s.pendingWithdrawalsCount ?? 0,
        icon: 'pi pi-wallet',
        iconBg: 'bg-mlm-warning/10',
        iconColor: 'text-mlm-warning',
        urgency: 'high'
      },
      {
        type: 'payments',
        label: 'Initiated payments',
        count: s.initiatedPaymentsCount ?? 0,
        icon: 'pi pi-credit-card',
        iconBg: 'bg-mlm-blue-100',
        iconColor: 'text-mlm-blue-600',
        urgency: 'medium'
      },
      {
        type: 'manual-payments',
        label: 'Manual registration payments',
        count: s.pendingManualRegistrationPaymentsCount ?? 0,
        icon: 'pi pi-file-edit',
        iconBg: 'bg-mlm-primary/10',
        iconColor: 'text-mlm-primary',
        urgency: 'high'
      },
      {
        type: 'manual-deposits',
        label: 'Manual wallet deposits',
        count: s.pendingManualDepositsCount ?? 0,
        icon: 'pi pi-wallet',
        iconBg: 'bg-mlm-primary/10',
        iconColor: 'text-mlm-primary',
        urgency: 'high'
      },
      {
        type: 'compliance',
        label: 'Pending identity / KYC',
        count: s.pendingIdentityCount ?? 0,
        icon: 'pi pi-id-card',
        iconBg: 'bg-mlm-warning/10',
        iconColor: 'text-mlm-warning',
        urgency: 'medium'
      }
    ];
  }

  private fmtInt(n: number): string {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(
      Number(n) || 0
    );
  }

  private fmtAmount(n: number): string {
    return new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(Number(n) || 0);
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  // ── Activity Table helpers ──
  expandedRowIds = signal<Set<string>>(new Set());
  formatActivityAmount = formatUserEarningsActivityAmount;
  activityTrack = userEarningsActivityTrackId;

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

  getSourceLabel(row: UserEarningsActivityItem): string {
    if (row.earningType) {
      return getEarningTypeLabel(row.earningType);
    }
    if (row.source) {
      return getEarningTypeLabel(row.source);
    }
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

  getMetaValue(row: UserEarningsActivityItem, key: string): any {
    const meta = row.metadata as Record<string, unknown> | undefined;
    return meta?.[key] ?? null;
  }

  formatPurpose(purpose: string): string {
    if (!purpose) return '—';
    return purpose
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  getUserLabel(row: UserEarningsActivityItem): string {
    const raw = row as any;
    return raw.userName || raw.userEmail || (row.userId ? row.userId.slice(0, 10) + '…' : '—');
  }
}
