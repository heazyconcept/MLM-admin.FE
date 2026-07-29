import {
  Component,
  inject,
  signal,
  ChangeDetectionStrategy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { TablePageEvent } from 'primeng/table';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import {
  RegistrationActivationRecord,
  RegistrationActivationService,
  RegistrationActivationSource,
} from './registration-activation.service';

@Component({
  selector: 'app-registration-activations-list',
  imports: [CommonModule, RouterModule, FormsModule, DatePickerModule, DataTableComponent],
  templateUrl: './registration-activations-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistrationActivationsListComponent implements OnInit {
  private activationService = inject(RegistrationActivationService);

  records = this.activationService.records;
  totalRecords = this.activationService.total;
  tableLoading = this.activationService.loading;
  loadError = this.activationService.loadingError;

  searchVal = signal('');
  sourceFilter = signal<RegistrationActivationSource | ''>('');
  dateRange = signal<Date[] | null>(null);

  tableFirst = signal(0);
  rowsPerPage = signal(20);

  sourceOptions: { label: string; value: RegistrationActivationSource | '' }[] = [
    { label: 'All sources', value: '' },
    { label: 'Gateway', value: 'GATEWAY' },
    { label: 'Manual registration', value: 'MANUAL_REGISTRATION_PAYMENT' },
    { label: 'Admin debit', value: 'ADMIN_DEBIT_WALLET' },
    { label: 'Admin waive', value: 'ADMIN_WAIVE' },
  ];

  tableHeaders = signal([
    'User',
    'Package',
    'Amount',
    'Source',
    'Funding',
    'Activated',
    'Actions',
  ]);

  ngOnInit(): void {
    this.loadRecords();
  }

  loadRecords(): void {
    const range = this.dateRange();
    let dateFrom: string | undefined;
    let dateTo: string | undefined;
    if (range?.[0]) {
      dateFrom = range[0].toISOString();
    }
    if (range?.[1]) {
      dateTo = range[1].toISOString();
    }

    this.activationService
      .loadFromApi({
        search: this.searchVal().trim() || undefined,
        source: this.sourceFilter() || undefined,
        dateFrom,
        dateTo,
        limit: this.rowsPerPage(),
        offset: this.tableFirst(),
      })
      .subscribe();
  }

  onSearch(): void {
    this.tableFirst.set(0);
    this.loadRecords();
  }

  onPageChange(event: TablePageEvent): void {
    this.tableFirst.set(event.first ?? 0);
    this.rowsPerPage.set(event.rows ?? 20);
    this.loadRecords();
  }

  formatPackage = (pkg: string) => this.activationService.formatPackageLabel(pkg);
  getPackageColor = (pkg: string) => this.activationService.getPackageColor(pkg);
  formatSource = (source?: string | null) => this.activationService.formatSourceLabel(source);

  getSourceBadgeClass(source?: string | null): string {
    switch (source) {
      case 'GATEWAY':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'MANUAL_REGISTRATION_PAYMENT':
        return 'bg-amber-50 text-amber-800 border-amber-100';
      case 'ADMIN_DEBIT_WALLET':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'ADMIN_WAIVE':
        return 'bg-violet-50 text-violet-700 border-violet-100';
      default:
        return 'bg-slate-50 text-slate-500 border-slate-200';
    }
  }

  getUserDisplay(row: RegistrationActivationRecord): string {
    return row.fullName || row.username;
  }

  truncateFunding(summary?: string | null, max = 48): string {
    if (!summary) return '—';
    return summary.length > max ? `${summary.slice(0, max)}…` : summary;
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
