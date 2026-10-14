import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TablePageEvent } from 'primeng/table';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import {
  AdminWalletTransferRow,
  ReportsService,
  WalletTypeFilter,
} from '../../reports/reports.service';

interface WalletTypeOption {
  label: string;
  value: WalletTypeFilter;
}

@Component({
  selector: 'app-member-transfers-report',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ButtonModule,
    DatePickerModule,
    InputTextModule,
    SelectModule,
    DataTableComponent,
  ],
  templateUrl: './member-transfers-report.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemberTransfersReportComponent implements OnInit {
  private reportsApi = inject(ReportsService);

  dateRange = signal<Date[] | null>(null);
  searchQuery = signal('');
  fromWalletTypeFilter = signal<WalletTypeFilter>('');
  toWalletTypeFilter = signal<WalletTypeFilter>('');

  rows = signal<AdminWalletTransferRow[]>([]);
  totalRecords = signal(0);
  tableFirst = signal(0);
  pageSize = signal(50);

  loading = signal(false);
  loadError = signal<string | null>(null);

  readonly walletTypeOptions: WalletTypeOption[] = [
    { label: 'All wallet types', value: '' },
    { label: 'Cash', value: 'CASH' },
    { label: 'Registration', value: 'REGISTRATION' },
    { label: 'Voucher', value: 'VOUCHER' },
    { label: 'Autoship', value: 'AUTOSHIP' },
  ];

  ngOnInit(): void {
    this.loadReport();
  }

  applyFilters(): void {
    this.tableFirst.set(0);
    this.loadReport();
  }

  clearFilters(): void {
    this.dateRange.set(null);
    this.searchQuery.set('');
    this.fromWalletTypeFilter.set('');
    this.toWalletTypeFilter.set('');
    this.tableFirst.set(0);
    this.loadReport();
  }

  onPageChange(event: TablePageEvent): void {
    this.tableFirst.set(event.first ?? 0);
    this.pageSize.set(event.rows ?? 50);
    this.loadReport();
  }

  walletTypeLabel(type: string): string {
    const map: Record<string, string> = {
      CASH: 'Cash',
      REGISTRATION: 'Registration',
      VOUCHER: 'Voucher',
      AUTOSHIP: 'Autoship',
    };
    return map[type] ?? type;
  }

  formatAmount(row: AdminWalletTransferRow): string {
    const currency = row.displayCurrency === 'USD' ? '$' : '₦';
    return `${currency}${row.displayAmount.toLocaleString()}`;
  }

  copyTransferId(id: string): void {
    void navigator.clipboard?.writeText(id);
  }

  private loadReport(): void {
    this.loading.set(true);
    this.loadError.set(null);

    const range = this.dateRange();
    const params: Record<string, string | number> = {
      limit: this.pageSize(),
      offset: this.tableFirst(),
    };

    if (range && range.length >= 2 && range[0] && range[1]) {
      params['from'] = range[0].toISOString();
      params['to'] = range[1].toISOString();
    }

    const search = this.searchQuery().trim();
    if (search) {
      params['search'] = search;
    }

    const fromWalletType = this.fromWalletTypeFilter();
    if (fromWalletType) {
      params['fromWalletType'] = fromWalletType;
    }

    const toWalletType = this.toWalletTypeFilter();
    if (toWalletType) {
      params['toWalletType'] = toWalletType;
    }

    this.reportsApi.getWalletMemberTransfers(params).subscribe({
      next: (response) => {
        this.rows.set(response?.items ?? []);
        this.totalRecords.set(response?.total ?? 0);
        this.loading.set(false);
      },
      error: (err) => {
        this.rows.set([]);
        this.totalRecords.set(0);
        this.loadError.set(err?.error?.message ?? 'Failed to load member transfers report');
        this.loading.set(false);
      },
    });
  }
}
