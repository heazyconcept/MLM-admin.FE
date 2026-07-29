import {
  Component,
  inject,
  computed,
  signal,
  ChangeDetectionStrategy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { ButtonModule } from 'primeng/button';
import { TablePageEvent } from 'primeng/table';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import {
  PackageUpgradeHistoryService,
  PackageUpgradeRecord,
  PackageTier,
  UpgradeSource,
} from '../services/package-upgrade-history.service';

@Component({
  selector: 'app-package-upgrades-list',
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    DatePickerModule,
    ButtonModule,
    DataTableComponent,
  ],
  templateUrl: './package-upgrades-list.component.html',
  styleUrls: ['./package-upgrades-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PackageUpgradesListComponent implements OnInit {
  private upgradeHistoryService = inject(PackageUpgradeHistoryService);

  records = this.upgradeHistoryService.records;
  totalRecords = this.upgradeHistoryService.total;
  tableLoading = this.upgradeHistoryService.loading;
  loadError = this.upgradeHistoryService.loadingError;
  thisMonthCount = this.upgradeHistoryService.thisMonthCount;

  searchVal = signal('');
  previousPackageFilter = signal<PackageTier | ''>('');
  currentPackageFilter = signal<PackageTier | ''>('');
  stageFilter = signal<number | ''>('');
  sourceFilter = signal<UpgradeSource | ''>('');
  merchantsOnly = signal(false);
  dateRange = signal<Date[] | null>(null);

  tableFirst = signal(0);
  rowsPerPage = signal(20);

  packageOptions: { label: string; value: PackageTier | '' }[] = [
    { label: 'All packages', value: '' },
    { label: 'Nickel', value: 'NICKEL' },
    { label: 'Silver', value: 'SILVER' },
    { label: 'Gold', value: 'GOLD' },
    { label: 'Platinum', value: 'PLATINUM' },
    { label: 'Ruby', value: 'RUBY' },
    { label: 'Diamond', value: 'DIAMOND' },
  ];

  stageOptions = [
    { label: 'All stages', value: '' as const },
    { label: 'Stage 1', value: 1 },
    { label: 'Stage 2', value: 2 },
    { label: 'Stage 3', value: 3 },
    { label: 'Stage 4', value: 4 },
    { label: 'Stage 5', value: 5 },
    { label: 'Stage 6', value: 6 },
  ];

  sourceOptions: { label: string; value: UpgradeSource | '' }[] = [
    { label: 'All sources', value: '' },
    { label: 'Admin', value: 'ADMIN' },
    { label: 'Gateway', value: 'GATEWAY' },
    { label: 'System', value: 'SYSTEM' },
    { label: 'Manual deposit', value: 'MANUAL_DEPOSIT' },
  ];

  tableHeaders = signal([
    'User',
    'Previous package',
    'Current package',
    'Stage',
    'Source',
    'Amount',
    'Funding',
    'Upgraded',
    'Actions',
  ]);

  stats = computed(() => ({
    total: this.totalRecords(),
    thisMonth: this.thisMonthCount(),
    topPath: this.upgradeHistoryService.getMostCommonPath(this.records()),
  }));

  currentMonthLabel = computed(() =>
    new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  );

  ngOnInit(): void {
    this.loadRecords();
    this.upgradeHistoryService.loadThisMonthCount().subscribe();
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

    const stage = this.stageFilter();
    this.upgradeHistoryService
      .loadFromApi({
        search: this.searchVal().trim() || undefined,
        previousPackage: this.previousPackageFilter() || undefined,
        currentPackage: this.currentPackageFilter() || undefined,
        stage: stage === '' ? undefined : stage,
        source: this.sourceFilter() || undefined,
        isMerchant: this.merchantsOnly() ? true : undefined,
        dateFrom,
        dateTo,
        limit: this.rowsPerPage(),
        offset: this.tableFirst(),
      })
      .subscribe({
        next: () => this.upgradeHistoryService.loadThisMonthCount().subscribe(),
      });
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

  formatPackage = (pkg: string) => this.upgradeHistoryService.formatPackageLabel(pkg);
  getPackageColor = (pkg: string) => this.upgradeHistoryService.getPackageColor(pkg);
  formatSource = (source?: string | null) => this.upgradeHistoryService.formatSourceLabel(source);

  getSourceBadgeClass(source?: string | null): string {
    switch (source) {
      case 'ADMIN':
        return 'bg-violet-50 text-violet-700 border-violet-100';
      case 'GATEWAY':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'MANUAL_DEPOSIT':
        return 'bg-amber-50 text-amber-800 border-amber-100';
      case 'SYSTEM':
        return 'bg-slate-50 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-500 border-slate-200';
    }
  }

  getUserDisplay(row: PackageUpgradeRecord): string {
    return row.fullName || row.username;
  }

  getStageDisplay(row: PackageUpgradeRecord): string {
    if (row.stage == null) return row.rankName ?? '—';
    const rank = row.rankName ? ` · ${row.rankName}` : '';
    return `Stage ${row.stage}${rank}`;
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
