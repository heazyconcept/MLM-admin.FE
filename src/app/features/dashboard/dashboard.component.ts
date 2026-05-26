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
    this.dashboardService.getSummary().subscribe((s) => {
      this.loading.set(false);
      if (!s) {
        this.loadError.set('Failed to load dashboard summary. Please try again.');
        this.applyEmptyState();
        return;
      }
      this.applySummary(s);
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

  private applySummary(s: AdminDashboardSummary): void {
    const openTasks =
      (s.pendingWithdrawalsCount ?? 0) +
      (s.initiatedPaymentsCount ?? 0) +
      (s.pendingIdentityCount ?? 0);

    this.systemStats.set([
      {
        title: 'Total users',
        value: this.fmtInt(s.userCount),
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
        value: this.fmtInt(s.userCount),
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
}
