import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { DataTableComponent } from '../../shared/components/data-table/data-table.component';
import { TableColumn } from '../../shared/components/data-table/data-table.types';
import {
  ReportsService,
  AdminFeeReportRow,
  AutoshipSummaryRow,
  AutoshipDetailRow,
} from './reports.service';

export type ReportCategoryId = 'admin_fees' | 'autoship';

export interface ReportCategory {
  id: ReportCategoryId;
  label: string;
}

@Component({
  selector: 'app-reports-overview',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    DatePickerModule,
    InputTextModule,
    TooltipModule,
    DataTableComponent,
  ],
  templateUrl: './reports-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsOverviewComponent {
  private reportsApi = inject(ReportsService);

  readonly categories: ReportCategory[] = [
    { id: 'admin_fees', label: 'Admin fees' },
    { id: 'autoship', label: 'Autoship' },
  ];

  selectedCategory = signal<ReportCategoryId | null>(null);
  /** Date range for admin fees (from–to) */
  dateRange = signal<Date[] | null>(null);
  /** Date range for autoship; converted to monthFrom/monthTo (YYYY-MM) for the API */
  autoshipDateRange = signal<Date[] | null>(null);

  loading = signal(false);
  loadError = signal<string | null>(null);
  generated = signal(false);

  adminFeesRows = signal<AdminFeeReportRow[]>([]);
  autoshipSummary = signal<AutoshipSummaryRow[]>([]);
  autoshipRows = signal<AutoshipDetailRow[]>([]);
  autoshipOffset = signal(0);
  autoshipLimit = 50;

  reportSearchQuery = signal('');

  adminFeesFiltered = computed(() => {
    const data = this.adminFeesRows();
    return this.filterRows(data);
  });

  autoshipSummaryFiltered = computed(() => {
    const data = this.autoshipSummary();
    return this.filterRows(data);
  });

  autoshipRowsFiltered = computed(() => {
    const data = this.autoshipRows();
    return this.filterRows(data);
  });

  private filterRows<T extends object>(data: T[]): T[] {
    const query = this.reportSearchQuery().toLowerCase().trim();
    if (!query) return data;
    return data.filter((row) =>
      JSON.stringify(row).toLowerCase().includes(query)
    );
  }

  selectedCategoryLabel = computed(() => {
    const id = this.selectedCategory();
    return id ? this.categories.find((c) => c.id === id)?.label ?? '' : '';
  });

  dateRangeLabel = computed(() => {
    const range = this.dateRange();
    if (!range || range.length < 2 || !range[0] || !range[1]) return '—';
    return `${range[0].toLocaleDateString('en-US')} – ${range[1].toLocaleDateString('en-US')}`;
  });

  autoshipRangeLabel = computed(() => {
    const range = this.autoshipDateRange();
    if (!range || range.length < 2 || !range[0] || !range[1]) return '—';
    return `${range[0].toLocaleDateString('en-US')} – ${range[1].toLocaleDateString('en-US')}`;
  });

  adminFeeColumns = signal<TableColumn<AdminFeeReportRow>[]>([
    { field: 'type', header: 'Type', sortable: true },
    {
      field: 'total',
      header: 'Total',
      sortable: true,
      align: 'right',
      formatter: (v: unknown) =>
        new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(
          Number(v)
        ),
    },
    { field: 'count', header: 'Count', sortable: true, align: 'right' },
  ]);

  autoshipSummaryColumns = signal<TableColumn<AutoshipSummaryRow>[]>([
    { field: 'monthIdentifier', header: 'Month', sortable: true },
    { field: 'userCount', header: 'Users', sortable: true, align: 'right' },
    {
      field: 'totalAmountUsd',
      header: 'Total USD',
      sortable: true,
      align: 'right',
      formatter: (v: unknown) =>
        new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(
          Number(v)
        ),
    },
  ]);

  autoshipDetailColumns = signal<TableColumn<AutoshipDetailRow>[]>([
    { field: 'userId', header: 'User ID', sortable: true },
    { field: 'monthIdentifier', header: 'Month', sortable: true },
    {
      field: 'amountUsd',
      header: 'Amount USD',
      sortable: true,
      align: 'right',
      formatter: (v: unknown) =>
        new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(
          Number(v)
        ),
    },
    {
      field: 'processedAt',
      header: 'Processed',
      sortable: true,
      formatter: (v: unknown) =>
        v
          ? new Date(String(v)).toLocaleString()
          : '—',
    },
  ]);

  adminFeeHeaders = computed(() => this.adminFeeColumns().map((c) => c.header));
  autoshipSummaryHeaders = computed(() =>
    this.autoshipSummaryColumns().map((c) => c.header)
  );
  autoshipDetailHeaders = computed(() =>
    this.autoshipDetailColumns().map((c) => c.header)
  );

  selectCategory(cat: ReportCategory): void {
    this.selectedCategory.set(cat.id);
    this.generated.set(false);
    this.loadError.set(null);
    this.reportSearchQuery.set('');
  }

  generateReport(): void {
    const cat = this.selectedCategory();
    if (!cat) return;
    this.loadError.set(null);

    if (cat === 'admin_fees') {
      this.loading.set(true);
      const range = this.dateRange();
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
      this.reportsApi.getAdminFees({ from, to }).subscribe({
        next: (res) => {
          this.loading.set(false);
          if (res === null) {
            this.loadError.set('Failed to load admin fees report.');
            this.adminFeesRows.set([]);
            this.generated.set(false);
            return;
          }
          this.adminFeesRows.set(res);
          this.generated.set(true);
        },
        error: () => {
          this.loading.set(false);
          this.loadError.set('Failed to load admin fees report.');
          this.generated.set(false);
        },
      });
      return;
    }

    if (cat === 'autoship') {
      this.autoshipOffset.set(0);
      this.loadAutoshipPage(true);
      return;
    }
  }

  private loadAutoshipPage(replace: boolean): void {
    const { monthFrom, monthTo } = this.autoshipRangeToMonthParams();
    this.loading.set(true);
    this.loadError.set(null);
    this.reportsApi
      .getAutoship({
        monthFrom,
        monthTo,
        limit: this.autoshipLimit,
        offset: this.autoshipOffset(),
      })
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          if (res === null) {
            this.loadError.set('Failed to load autoship report.');
            this.autoshipSummary.set([]);
            this.autoshipRows.set([]);
            this.generated.set(false);
            return;
          }
          this.autoshipSummary.set(res.summary ?? []);
          if (replace) {
            this.autoshipRows.set(res.rows ?? []);
          } else {
            this.autoshipRows.update((prev) => [...prev, ...(res.rows ?? [])]);
          }
          this.generated.set(true);
        },
        error: () => {
          this.loading.set(false);
          this.loadError.set('Failed to load autoship report.');
          this.generated.set(false);
        },
      });
  }

  loadMoreAutoship(): void {
    this.autoshipOffset.update((o) => o + this.autoshipLimit);
    this.loadAutoshipPage(false);
  }

  onReportSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.reportSearchQuery.set(value);
  }

  /** First/last calendar month touched by the selected date range → YYYY-MM for autoship API */
  private autoshipRangeToMonthParams(): {
    monthFrom: string | undefined;
    monthTo: string | undefined;
  } {
    const range = this.autoshipDateRange();
    if (!range || range.length < 2 || !range[0] || !range[1]) {
      return { monthFrom: undefined, monthTo: undefined };
    }
    const start = new Date(range[0]);
    const end = new Date(range[1]);
    if (start > end) {
      return {
        monthFrom: this.dateToMonthKey(end),
        monthTo: this.dateToMonthKey(start),
      };
    }
    return {
      monthFrom: this.dateToMonthKey(start),
      monthTo: this.dateToMonthKey(end),
    };
  }

  private dateToMonthKey(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }
}
