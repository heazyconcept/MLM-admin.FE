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
import { TablePageEvent } from 'primeng/table';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import {
  MerchantPackageUpgradeRecord,
  MerchantPackageUpgradeService,
} from '../services/merchant-package-upgrade.service';

@Component({
  selector: 'app-merchant-package-upgrades-list',
  imports: [CommonModule, RouterModule, FormsModule, DataTableComponent],
  templateUrl: './merchant-package-upgrades-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MerchantPackageUpgradesListComponent implements OnInit {
  private upgradeService = inject(MerchantPackageUpgradeService);

  records = this.upgradeService.records;
  totalRecords = this.upgradeService.total;
  tableLoading = this.upgradeService.loading;
  loadError = this.upgradeService.loadingError;

  searchVal = signal('');

  tableFirst = signal(0);
  rowsPerPage = signal(20);

  tableHeaders = signal([
    'Merchant',
    'Package',
    'Event',
    'Source',
    'Amount',
    'Occurred',
    'Actions',
  ]);

  ngOnInit(): void {
    this.loadRecords();
  }

  loadRecords(): void {
    this.upgradeService
      .loadFromApi({
        search: this.searchVal().trim() || undefined,
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

  formatType = (type?: string | null) => this.upgradeService.formatTypeLabel(type);
  getTypeColor = (type?: string | null) => this.upgradeService.getTypeColor(type);
  formatEventType = (eventType?: string | null) =>
    this.upgradeService.formatEventTypeLabel(eventType);
  formatSource = (source?: string | null) => this.upgradeService.formatSourceLabel(source);

  getSourceBadgeClass(source?: string | null): string {
    switch (source) {
      case 'GATEWAY':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'WALLET':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'ADMIN':
        return 'bg-violet-50 text-violet-700 border-violet-100';
      case 'REFUND':
        return 'bg-amber-50 text-amber-800 border-amber-100';
      case 'SYSTEM':
        return 'bg-slate-50 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-500 border-slate-200';
    }
  }

  getEventBadgeClass(eventType?: string | null): string {
    switch (eventType) {
      case 'INITIAL_FEE':
        return 'bg-sky-50 text-sky-700 border-sky-100';
      case 'CATEGORY_UPGRADE':
        return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      default:
        return 'bg-slate-50 text-slate-500 border-slate-200';
    }
  }

  getMerchantDisplay(row: MerchantPackageUpgradeRecord): string {
    return row.businessName || row.fullName || row.username;
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
