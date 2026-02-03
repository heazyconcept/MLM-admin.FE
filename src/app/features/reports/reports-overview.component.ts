import {
  Component,
  ChangeDetectionStrategy,
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
import {
  TableColumn,
  TableConfig,
} from '../../shared/components/data-table/data-table.types';

export type ReportCategoryId =
  | 'users'
  | 'earnings'
  | 'wallets'
  | 'withdrawals'
  | 'orders'
  | 'merchants';

export interface ReportCategory {
  id: ReportCategoryId;
  label: string;
  icon: string;
}

export interface ReportRow {
  id: string;
  name: string;
  value: string | number;
  date: string;
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
  readonly categories: ReportCategory[] = [
    { id: 'users', label: 'User Reports', icon: 'pi pi-users' },
    { id: 'earnings', label: 'Earnings Reports', icon: 'pi pi-dollar' },
    { id: 'wallets', label: 'Wallet Reports', icon: 'pi pi-wallet' },
    { id: 'withdrawals', label: 'Withdrawal Reports', icon: 'pi pi-money-bill' },
    {
      id: 'orders',
      label: 'Order & Logistics Reports',
      icon: 'pi pi-box',
    },
    { id: 'merchants', label: 'Merchant Reports', icon: 'pi pi-store' },
  ];

  selectedCategory = signal<ReportCategoryId | null>(null);
  dateRange = signal<Date[] | null>(null);
  generated = signal(false);
  reportSearchQuery = signal('');

  reports = signal<ReportRow[]>([]);

  filteredReports = computed(() => {
    const data = this.reports();
    const query = this.reportSearchQuery().toLowerCase().trim();
    if (!query) return data;
    return data.filter(
      (r) =>
        r.id.toLowerCase().includes(query) ||
        r.name.toLowerCase().includes(query) ||
        String(r.value).toLowerCase().includes(query)
    );
  });

  selectedCategoryLabel = computed(() => {
    const id = this.selectedCategory();
    return id
      ? this.categories.find((c) => c.id === id)?.label ?? ''
      : '';
  });

  dateRangeLabel = computed(() => {
    const range = this.dateRange();
    if (!range || range.length < 2 || !range[0] || !range[1])
      return '—';
    return `${range[0].toLocaleDateString('en-US')} – ${range[1].toLocaleDateString('en-US')}`;
  });

  reportColumns = signal<TableColumn<ReportRow>[]>([
    { field: 'id', header: 'ID', width: '100px', sortable: true },
    { field: 'name', header: 'Name', sortable: true },
    { field: 'value', header: 'Value', width: '120px', sortable: true, align: 'right' },
    {
      field: 'date',
      header: 'Date',
      width: '140px',
      sortable: true,
      formatter: (v: unknown) =>
        new Date(v as string).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
    },
  ]);

  tableConfig: TableConfig = {
    paginator: true,
    rows: 10,
    rowsPerPageOptions: [10, 25, 50],
    showCurrentPageReport: true,
    currentPageReportTemplate: 'Showing {first} to {last} of {totalRecords}',
    globalFilter: false,
    showGridlines: false,
    hoverable: true,
    size: 'normal',
  };

  selectCategory(cat: ReportCategory): void {
    this.selectedCategory.set(cat.id);
  }

  generateReport(): void {
    if (!this.selectedCategory()) return;
    this.reports.set(this.getMockReportData());
    this.generated.set(true);
  }

  onReportSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.reportSearchQuery.set(value);
  }

  private getMockReportData(): ReportRow[] {
    const category = this.selectedCategory() ?? 'users';
    const prefix = category.toUpperCase().slice(0, 2);
    return Array.from({ length: 12 }, (_, i) => ({
      id: `${prefix}-${1000 + i}`,
      name: `Sample ${category} record ${i + 1}`,
      value: Math.round(1000 + Math.random() * 5000),
      date: new Date(Date.now() - i * 86400000).toISOString().slice(0, 10),
    }));
  }
}
