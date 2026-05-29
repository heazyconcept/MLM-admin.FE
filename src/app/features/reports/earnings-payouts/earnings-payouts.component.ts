import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { ChartModule } from 'primeng/chart';
import { TablePageEvent } from 'primeng/table';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import {
  EarningsPayoutCategory,
  EarningsPayoutUnit,
  EarningsSummaryResponse,
  EarningsTransactionRow,
  ReportsService,
} from '../reports.service';

interface CategoryOption {
  label: string;
  value: EarningsPayoutCategory | '';
}

interface UnitOption {
  label: string;
  value: EarningsPayoutUnit | '';
}

@Component({
  selector: 'app-earnings-payouts',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    DatePickerModule,
    SelectModule,
    ChartModule,
    DataTableComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './earnings-payouts.component.html',
  styleUrls: ['./earnings-payouts.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EarningsPayoutsComponent implements OnInit {
  private reportsApi = inject(ReportsService);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  dateRange = signal<Date[] | null>(null);
  categoryFilter = signal<EarningsPayoutCategory | ''>('');
  unitFilter = signal<EarningsPayoutUnit | ''>('');
  isCategoryRoute = signal(false);

  summary = signal<EarningsSummaryResponse | null>(null);
  transactions = signal<EarningsTransactionRow[]>([]);

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
    { label: 'Activation', value: 'ACTIVATION' },
    { label: 'Upgrade', value: 'UPGRADE' },
    { label: 'Product purchase', value: 'PRODUCT_PURCHASE' },
    { label: 'PDPA', value: 'PDPA' },
    { label: 'CDPA', value: 'CDPA' },
    { label: 'Bonuses', value: 'BONUSES' },
    { label: 'Admin adjustment', value: 'ADMIN_ADJUSTMENT' },
  ];

  unitOptions: UnitOption[] = [
    { label: 'All units', value: '' },
    { label: 'Cash only', value: 'CASH' },
    { label: 'CPV only', value: 'CPV' },
  ];

  summaryCards = computed(() => {
    const data = this.summary();
    return [
      {
        label: 'Total cash paid',
        value: data?.totalCashPaid ?? 0,
        hint: `Cash commissions in ${data?.currency || 'NGN'}`,
        isCurrency: true,
      },
      {
        label: 'Total CPV paid',
        value: data?.totalCpvPaid ?? 0,
        hint: 'Total CPV points credited',
        isCurrency: false,
      },
      {
        label: 'Cash payouts',
        value: data?.cashPayoutCount ?? 0,
        hint: 'Cash transactions count',
        isCurrency: false,
      },
      {
        label: 'CPV payouts',
        value: data?.cpvPayoutCount ?? 0,
        hint: 'CPV transactions count',
        isCurrency: false,
      },
    ];
  });

  categoryChips = computed(() => {
    const data = this.summary();
    if (!data?.byCategory) return [];
    const entries = Object.entries(data.byCategory) as [
      EarningsPayoutCategory,
      { cashPaid: number; cpvPaid: number; transactionCount: number }
    ][];
    return entries.map(([key, value]) => ({
      key,
      cashPaid: value.cashPaid,
      cpvPaid: value.cpvPaid,
      transactionCount: value.transactionCount,
    }));
  });

  ngOnInit(): void {
    this.initChartOptions();
    this.bindRouteCategory();
    this.reloadAll();
  }

  private bindRouteCategory(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const slug = params.get('category');
      const mapped = slug ? this.mapCategorySlug(slug) : '';
      this.isCategoryRoute.set(Boolean(slug));
      this.categoryFilter.set(mapped ?? '');
      this.tableFirst.set(0);
      this.reloadAll();
    });
  }

  reloadAll(): void {
    this.loadError.set(null);
    if (this.isCategoryRoute()) {
      this.loadingSummary.set(false);
      this.summary.set(null);
      this.applyTrendChart(null);
    } else {
      this.loadSummary();
    }
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
    this.unitFilter.set('');
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
    this.reportsApi.getEarningsSummary({ from, to }).subscribe({
      next: (res) => {
        this.loadingSummary.set(false);
        if (!res) {
          this.loadError.set('Failed to load earnings summary.');
          this.summary.set(null);
          this.applyTrendChart(null);
          return;
        }
        this.summary.set(res);
        this.applyTrendChart(res);
      },
      error: () => {
        this.loadingSummary.set(false);
        this.loadError.set('Failed to load earnings summary.');
        this.summary.set(null);
        this.applyTrendChart(null);
      },
    });
  }

  private loadTransactions(): void {
    this.loadingTransactions.set(true);
    const { from, to } = this.buildDateParams();
    const category = this.categoryFilter() || undefined;
    const unit = this.unitFilter() || undefined;
    this.reportsApi
      .getEarningsTransactions({
        from,
        to,
        category,
        unit,
        limit: this.rows(),
        offset: this.tableFirst(),
      })
      .subscribe({
        next: (res) => {
          this.loadingTransactions.set(false);
          if (!res) {
            this.loadError.set('Failed to load earnings transactions.');
            this.transactions.set([]);
            this.totalRecords.set(0);
            return;
          }
          this.transactions.set(res.items ?? []);
          this.totalRecords.set(res.total ?? 0);
        },
        error: () => {
          this.loadingTransactions.set(false);
          this.loadError.set('Failed to load earnings transactions.');
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

  private applyTrendChart(res: EarningsSummaryResponse | null): void {
    const documentStyle = getComputedStyle(document.documentElement);
    const primary = documentStyle.getPropertyValue('--mlm-primary') || '#16a34a';

    if (!res?.trend?.length) {
      this.trendData = {
        labels: ['—'],
        datasets: [
          {
            label: 'Cash',
            data: [0],
            borderColor: primary,
            backgroundColor: 'rgba(22, 163, 74, 0.2)',
            tension: 0.3,
          },
          {
            label: 'CPV',
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
          label: 'Cash',
          data: res.trend.map((b) => Number(b.cashPaid) || 0),
          borderColor: primary,
          backgroundColor: 'rgba(22, 163, 74, 0.2)',
          tension: 0.3,
        },
        {
          label: 'CPV',
          data: res.trend.map((b) => Number(b.cpvPaid) || 0),
          borderColor: '#0ea5e9',
          backgroundColor: 'rgba(14, 165, 233, 0.2)',
          tension: 0.3,
        },
      ],
    };
  }

  formatCash(value: number | null | undefined): string {
    const currency = this.summary()?.currency || 'NGN';
    const amount = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(Number(value ?? 0));
    if (currency === 'NGN') {
      return `₦${amount}`;
    }
    return `${amount} ${currency}`;
  }

  formatCategory(value: string): string {
    return value.replace(/_/g, ' ');
  }

  formatUnit(value: EarningsPayoutUnit): string {
    return value === 'CPV' ? 'CPV' : 'Cash';
  }

  formatStatusLabel(value: string | null | undefined): string {
    if (!value) return '';
    const cleaned = value.replace(/_/g, ' ').toLowerCase();
    return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
  }

  formatAmount(row: EarningsTransactionRow): string {
    const amount = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(row.amount ?? 0);
    if (row.unit === 'CASH') {
      const currency = row.currency || this.summary()?.currency || 'NGN';
      if (currency === 'NGN') {
        return `₦${amount}`;
      }
      return currency ? `${amount} ${currency}` : amount;
    }
    return amount;
  }

  private formatBucketLabel(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  private mapCategorySlug(slug: string): EarningsPayoutCategory | '' {
    const normalized = slug.toLowerCase();
    const map: Record<string, EarningsPayoutCategory> = {
      activation: 'ACTIVATION',
      upgrade: 'UPGRADE',
      'product-purchase': 'PRODUCT_PURCHASE',
      pdpa: 'PDPA',
      cdpa: 'CDPA',
      bonuses: 'BONUSES',
      'admin-adjustment': 'ADMIN_ADJUSTMENT',
    };
    return map[normalized] ?? '';
  }
}
