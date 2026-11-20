import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TablePageEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { AdminCaucusService } from '../services/admin-caucus.service';
import type {
  AdminCaucusHistoryReportQuery,
  CaucusHistoryReportSort,
  CaucusMembershipStatus,
} from '../models/admin-caucus.models';
import {
  CAUCUS_MONTH_STATUS_LABEL,
  caucusMonthTitle,
  caucusSelectableMonthKeys,
  formatCaucusNgn,
} from '../utils/caucus-format.util';

@Component({
  selector: 'app-caucus-history-report',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    DataTableComponent,
  ],
  templateUrl: './caucus-history-report.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CaucusHistoryReportComponent implements OnInit {
  private readonly caucusService = inject(AdminCaucusService);
  private readonly router = inject(Router);

  items = this.caucusService.historyItems;
  total = this.caucusService.historyTotal;
  loading = this.caucusService.historyLoading;
  error = this.caucusService.historyError;
  meta = this.caucusService.historyMeta;

  /** Empty = server default (last closed Lagos month). */
  monthKey = signal('');
  searchVal = signal('');
  membershipStatus = signal<CaucusMembershipStatus | ''>('');
  sort = signal<CaucusHistoryReportSort>('username');
  tableFirst = signal(0);
  pageRows = signal(20);

  monthOptions = computed(() =>
    caucusSelectableMonthKeys().map((key) => ({
      label: caucusMonthTitle(key),
      value: key,
    })),
  );

  titleMonth = computed(() => {
    const key = this.meta()?.monthKey ?? this.monthKey();
    return key ? caucusMonthTitle(key) : '—';
  });

  tableHeaders = computed(() => [
    'Member',
    'Status',
    'Direct refs',
    'Performance',
    'Paid (NGN)',
    'Month status',
    'Misses',
  ]);

  statusOptions = [
    { label: 'All members', value: '' as const },
    { label: 'Active', value: 'ACTIVE' as const },
    { label: 'Deactivated', value: 'DEACTIVATED' as const },
  ];

  sortOptions = [
    { label: 'Username', value: 'username' as const },
    { label: 'Direct referrals', value: 'directCount' as const },
    { label: 'Paid amount', value: 'paidAmountNgn' as const },
    { label: 'Consecutive misses', value: 'consecutiveMisses' as const },
  ];

  ngOnInit(): void {
    this.reload();
  }

  formatMoney = formatCaucusNgn;

  monthStatusLabel(status: string): string {
    return CAUCUS_MONTH_STATUS_LABEL[status] ?? status;
  }

  displayFullName(name: string | null | undefined): string {
    return name?.trim() ? name : '—';
  }

  performanceLine(row: { floorMet: boolean; targetMet: boolean; directCount: number }): string {
    const floor = this.meta()?.constants.floor ?? 10;
    const target = this.meta()?.constants.target ?? 30;
    if (row.targetMet) {
      return `Target (${target}+)`;
    }
    if (row.floorMet) {
      return `Floor (${floor}+)`;
    }
    return `Below ${floor}`;
  }

  applyFilters(): void {
    this.tableFirst.set(0);
    this.reload();
  }

  onPageChange(event: TablePageEvent): void {
    this.tableFirst.set(event.first ?? 0);
    this.pageRows.set(event.rows ?? 20);
    this.reload();
  }

  retry(): void {
    this.reload();
  }

  openMember(row: { userId: string }): void {
    void this.router.navigate(['/admin/caucus/members', row.userId]);
  }

  private reload(): void {
    const page = Math.floor(this.tableFirst() / this.pageRows()) + 1;
    const query = this.buildQuery(page, this.pageRows());
    this.caucusService.loadHistoryReport(query).subscribe({
      next: (data) => {
        if (data?.monthKey && !this.monthKey()) {
          this.monthKey.set(data.monthKey);
        }
      },
    });
  }

  private buildQuery(page: number, limit: number): AdminCaucusHistoryReportQuery {
    const query: AdminCaucusHistoryReportQuery = {
      page,
      limit,
      sort: this.sort(),
    };
    const month = this.monthKey().trim();
    if (month) {
      query.monthKey = month;
    }
    const search = this.searchVal().trim();
    if (search) {
      query.search = search;
    }
    const status = this.membershipStatus();
    if (status) {
      query.membershipStatus = status;
    }
    return query;
  }
}