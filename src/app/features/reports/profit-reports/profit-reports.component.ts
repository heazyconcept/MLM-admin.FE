import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { ChartModule } from 'primeng/chart';
import { TooltipModule } from 'primeng/tooltip';
import { TablePageEvent } from 'primeng/table';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import {
  ProfitCategory,
  ProfitSummaryResponse,
  ProfitTransactionRow,
  PROFIT_MARGIN_LABELS,
  ReportsService,
} from '../reports.service';

const CATEGORY_DISPLAY_ORDER: ProfitCategory[] = [
  'REGISTRATION',
  'UPGRADE',
  'PRODUCT_PURCHASE',
  'AUTOSHIP',
  'ADMIN_FEE',
];

const CATEGORY_LABELS: Record<ProfitCategory, string> = {
  REGISTRATION: 'Registration',
  UPGRADE: 'Upgrade',
  PRODUCT_PURCHASE: 'Product purchase',
  AUTOSHIP: 'Autoship',
  ADMIN_FEE: 'Admin fee',
};

interface CategoryOption {
  label: string;
  value: ProfitCategory | '';
}

@Component({
  selector: 'app-profit-reports',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    DatePickerModule,
    SelectModule,
    ChartModule,
    TooltipModule,
    DataTableComponent,
  ],
  templateUrl: './profit-reports.component.html',
  styleUrls: ['./profit-reports.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfitReportsComponent implements OnInit {
  private reportsApi = inject(ReportsService);

  dateRange = signal<Date[] | null>(null);
  categoryFilter = signal<ProfitCategory | ''>('');

  summary = signal<ProfitSummaryResponse | null>(null);
  transactions = signal<ProfitTransactionRow[]>([]);

  loadingSummary = signal(false);
  loadingTransactions = signal(false);
  loadError = signal<string | null>(null);

  totalRecords = signal(0);
  tableFirst = signal(0);
  rows = signal(50);

  trendData: unknown = { labels: [], datasets: [] };
  trendOptions: unknown = {};

  categoryOptions: CategoryOption[] = [
    { label: 'All categories', value: '' },
    { label: 'Registration', value: 'REGISTRATION' },
    { label: 'Upgrade', value: 'UPGRADE' },
    { label: 'Product purchase', value: 'PRODUCT_PURCHASE' },
    { label: 'Autoship', value: 'AUTOSHIP' },
    { label: 'Admin fee', value: 'ADMIN_FEE' },
  ];

  summaryCards = computed(() => {
    const data = this.summary();
    return [
      {
        label: 'Total revenue',
        value: data?.totalRevenue ?? data?.totalRevenueUsd ?? 0,
        hint: 'Gross inflows',
      },
      {
        label: 'Total profit',
        value: data?.totalProfit ?? data?.totalProfitUsd ?? 0,
        hint: 'Sum of category profits (fixed margins)',
      },
      {
        label: 'Admin fees',
        value: data?.totalAdminFees ?? data?.totalAdminFeesUsd ?? 0,
        hint: 'Informational — registration + autoship fee totals',
      },
      {
        label: 'Autoship charges',
        value: data?.totalAutoshipCharges ?? data?.totalAutoshipChargesUsd ?? 0,
        hint: 'Informational — net autoship debits only',
      },
    ];
  });

  categoryChips = computed(() => {
    const data = this.summary();
    if (!data?.byCategory) return [];

    return CATEGORY_DISPLAY_ORDER.filter((key) => data.byCategory[key]).map((key) => {
      const value = data.byCategory[key];
      return {
        key,
        label: CATEGORY_LABELS[key],
        marginLabel: PROFIT_MARGIN_LABELS[key],
        revenue: value.revenue ?? value.revenueUsd ?? 0,
        profit: value.profit ?? value.profitUsd ?? 0,
        transactionCount: value.transactionCount,
      };
    });
  });

  ngOnInit(): void {
    this.initChartOptions();
    this.reloadAll();
  }

  reloadAll(): void {
    this.loadError.set(null);
    this.loadSummary();
    this.tableFirst.set(0);
    this.loadTransactions();
  }

  applyFilters(): void {
    this.tableFirst.set(0);
    this.reloadAll();
  }

  clearFilters(): void {
    this.dateRange.set(null);
    this.categoryFilter.set('');
    this.applyFilters();
  }

  onPageChange(event: TablePageEvent): void {
    this.tableFirst.set(event.first);
    this.rows.set(event.rows);
    this.loadTransactions();
  }

  private loadSummary(): void {
    this.loadingSummary.set(true);
    const { from, to } = this.buildDateParams();
    this.reportsApi.getProfitSummary({ from, to }).subscribe({
      next: (res) => {
        this.loadingSummary.set(false);
        if (!res) {
          this.loadError.set('Failed to load profit summary.');
          this.summary.set(null);
          this.applyTrendChart(null);
          return;
        }
        this.summary.set(res);
        this.applyTrendChart(res);
      },
      error: () => {
        this.loadingSummary.set(false);
        this.loadError.set('Failed to load profit summary.');
        this.summary.set(null);
        this.applyTrendChart(null);
      },
    });
  }

  private loadTransactions(): void {
    this.loadingTransactions.set(true);
    const { from, to } = this.buildDateParams();
    const category = this.categoryFilter() || undefined;
    this.reportsApi
      .getProfitTransactions({
        from,
        to,
        category,
        limit: this.rows(),
        offset: this.tableFirst(),
      })
      .subscribe({
        next: (res) => {
          this.loadingTransactions.set(false);
          if (!res) {
            this.loadError.set('Failed to load profit transactions.');
            this.transactions.set([]);
            this.totalRecords.set(0);
            return;
          }
          this.transactions.set(res.items ?? []);
          this.totalRecords.set(res.total ?? 0);
        },
        error: () => {
          this.loadingTransactions.set(false);
          this.loadError.set('Failed to load profit transactions.');
          this.transactions.set([]);
          this.totalRecords.set(0);
        },
      });
  }

  private buildDateParams(): { from?: string; to?: string } {
    const range = this.dateRange();
    if (!range || range.length < 2 || !range[0] || !range[1]) return {};
    const start = new Date(range[0]);
    start.setHours(0, 0, 0, 0);
    const end = new Date(range[1]);
    end.setHours(23, 59, 59, 999);
    return { from: start.toISOString(), to: end.toISOString() };
  }

  private initChartOptions(): void {
    const documentStyle = getComputedStyle(document.documentElement);
    const textColor = documentStyle.getPropertyValue('--text-color');
    const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary');
    const surfaceBorder = documentStyle.getPropertyValue('--surface-border');

    this.trendOptions = {
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: textColor } },
      },
      scales: {
        x: {
          ticks: { color: textColorSecondary, font: { weight: 500 } },
          grid: { color: surfaceBorder, drawBorder: false },
        },
        y: {
          ticks: { color: textColorSecondary },
          grid: { color: surfaceBorder, drawBorder: false },
        },
      },
    };
  }

  private applyTrendChart(res: ProfitSummaryResponse | null): void {
    const documentStyle = getComputedStyle(document.documentElement);
    const primary = documentStyle.getPropertyValue('--mlm-primary') || '#16a34a';

    if (!res?.trend?.length) {
      this.trendData = {
        labels: ['—'],
        datasets: [
          {
            label: 'Revenue',
            data: [0],
            borderColor: primary,
            backgroundColor: 'rgba(22, 163, 74, 0.2)',
            tension: 0.3,
          },
          {
            label: 'Profit',
            data: [0],
            borderColor: '#0ea5e9',
            backgroundColor: 'rgba(14, 165, 233, 0.2)',
            tension: 0.3,
          },
        ],
      };
      return;
    }

    this.trendData = {
      labels: res.trend.map((b) => this.formatBucketLabel(b.date)),
      datasets: [
        {
          label: 'Revenue',
          data: res.trend.map((b) => Number(b.revenue ?? b.revenueUsd) || 0),
          borderColor: primary,
          backgroundColor: 'rgba(22, 163, 74, 0.2)',
          tension: 0.3,
        },
        {
          label: 'Profit',
          data: res.trend.map((b) => Number(b.profit ?? b.profitUsd) || 0),
          borderColor: '#0ea5e9',
          backgroundColor: 'rgba(14, 165, 233, 0.2)',
          tension: 0.3,
        },
      ],
    };
  }

  private formatBucketLabel(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  formatCurrency(value: number | null | undefined, currency?: string): string {
    const cur = currency || this.summary()?.currency || 'NGN';
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: String(cur).toUpperCase(),
        maximumFractionDigits: 2,
      }).format(Number(value ?? 0));
    } catch (e) {
      return `${Number(value ?? 0).toFixed(2)} ${String(cur)}`;
    }
  }

  formatRowAmount(row: ProfitTransactionRow): string {
    if (row.displayAmount !== undefined && row.displayCurrency) {
      return `${Number(row.displayAmount).toFixed(2)} ${row.displayCurrency}`;
    }
    // prefer amount fields returned by backend, fall back to USD amount
    const cur = this.summary()?.currency || 'NGN';
    const amt = row.amount ?? row.amountUsd ?? 0;
    return this.formatCurrency(amt, cur);
  }

  formatRowProfit(row: ProfitTransactionRow): string {
    const cur = this.summary()?.currency || 'NGN';
    const p = row.profit ?? row.profitUsd ?? 0;
    return this.formatCurrency(p, cur);
  }

  formatCategory(value: ProfitCategory | string): string {
    if (value in CATEGORY_LABELS) {
      return CATEGORY_LABELS[value as ProfitCategory];
    }
    return value.replace(/_/g, ' ');
  }

  formatUserPrimary(row: ProfitTransactionRow): string {
    return row.userName || row.userEmail || row.userId || 'System / admin fee';
  }

  formatUserSecondary(row: ProfitTransactionRow): string {
    if (row.userName && row.userEmail) {
      return row.userEmail;
    }
    if (row.userId && (row.userName || row.userEmail)) {
      return row.userId;
    }
    return '';
  }
}
