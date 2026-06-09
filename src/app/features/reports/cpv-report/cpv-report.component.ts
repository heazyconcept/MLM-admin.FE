import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TablePageEvent } from 'primeng/table';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { getEarningTypeLabel } from '../../../core/constants/earning-type-labels';
import {
  CpvSummaryResponse,
  CpvUserRow,
  ReportsService,
} from '../reports.service';

@Component({
  selector: 'app-cpv-report',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    DatePickerModule,
    InputTextModule,
    InputNumberModule,
    DataTableComponent,
  ],
  templateUrl: './cpv-report.component.html',
  styleUrls: ['./cpv-report.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CpvReportComponent implements OnInit {
  private reportsApi = inject(ReportsService);
  private router = inject(Router);

  dateRange = signal<Date[] | null>(null);
  usernameInput = signal('');
  cpvNumberInput = signal<number | null>(null);

  appliedDateRange = signal<Date[] | null>(null);
  appliedUsername = signal('');
  appliedCpvNumber = signal<number | null>(null);

  summary = signal<CpvSummaryResponse | null>(null);
  users = signal<CpvUserRow[]>([]);

  loadingSummary = signal(false);
  loadingUsers = signal(false);
  loadError = signal<string | null>(null);

  usersTotalRecords = signal(0);
  usersTableFirst = signal(0);
  usersRows = signal(50);

  summaryCards = computed(() => {
    const data = this.summary();
    return [
      {
        label: 'Total CPV generated',
        value: data?.totalCpvGenerated ?? 0,
        hint: 'CPV credited in selected period',
      },
      {
        label: 'Transactions',
        value: data?.transactionCount ?? 0,
        hint: 'CPV ledger rows in period',
      },
    ];
  });

  sourceChips = computed(() => {
    const data = this.summary();
    if (!data?.byCpvSource) return [];
    return Object.entries(data.byCpvSource).map(([key, amount]) => ({
      key,
      label: getEarningTypeLabel(key),
      amount,
    }));
  });

  ngOnInit(): void {
    this.search();
  }

  search(): void {
    this.loadError.set(null);
    this.appliedDateRange.set(this.dateRange());
    this.appliedUsername.set(this.usernameInput().trim());
    this.appliedCpvNumber.set(this.cpvNumberInput());
    this.usersTableFirst.set(0);
    this.reloadAll();
  }

  clearFilters(): void {
    this.dateRange.set(null);
    this.usernameInput.set('');
    this.cpvNumberInput.set(null);
    this.search();
  }

  reloadAll(): void {
    this.loadError.set(null);
    this.loadSummary();
    this.loadUsers();
  }

  viewUserLedger(user: CpvUserRow): void {
    const { from, to } = this.buildDateParams(this.appliedDateRange());
    const queryParams: Record<string, string> = { username: user.username };
    if (from) queryParams['from'] = from;
    if (to) queryParams['to'] = to;
    this.router.navigate(['/admin/reports/earnings/cpv/ledger'], { queryParams });
  }

  viewAllLedger(): void {
    const { from, to } = this.buildDateParams(this.appliedDateRange());
    const queryParams: Record<string, string> = {};
    if (from) queryParams['from'] = from;
    if (to) queryParams['to'] = to;
    this.router.navigate(['/admin/reports/earnings/cpv/ledger'], {
      queryParams: Object.keys(queryParams).length ? queryParams : undefined,
    });
  }

  onUsersPageChange(event: TablePageEvent): void {
    this.usersTableFirst.set(event.first);
    this.usersRows.set(event.rows);
    this.loadUsers();
  }

  formatCpvSource(source: string | null | undefined): string {
    return getEarningTypeLabel(source ?? '');
  }

  formatCpv(value: number | null | undefined): string {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(Number(value ?? 0));
  }

  private loadSummary(): void {
    this.loadingSummary.set(true);
    const params = this.buildSummaryParams();
    this.reportsApi.getCpvSummary(params).subscribe({
      next: (res) => {
        this.loadingSummary.set(false);
        if (!res) {
          this.loadError.set('Failed to load CPV summary. The report API may not be available yet.');
          this.summary.set(null);
          return;
        }
        this.summary.set(res);
      },
      error: () => {
        this.loadingSummary.set(false);
        this.loadError.set('Failed to load CPV summary.');
        this.summary.set(null);
      },
    });
  }

  private loadUsers(): void {
    this.loadingUsers.set(true);
    const params = {
      ...this.buildSummaryParams(),
      limit: this.usersRows(),
      offset: this.usersTableFirst(),
    };
    this.reportsApi.getCpvUsers(params).subscribe({
      next: (res) => {
        this.loadingUsers.set(false);
        if (!res) {
          this.loadError.set('Failed to load CPV user rollup. The report API may not be available yet.');
          this.users.set([]);
          this.usersTotalRecords.set(0);
          return;
        }
        this.users.set(res.items ?? []);
        this.usersTotalRecords.set(res.total ?? 0);
      },
      error: () => {
        this.loadingUsers.set(false);
        this.loadError.set('Failed to load CPV user rollup.');
        this.users.set([]);
        this.usersTotalRecords.set(0);
      },
    });
  }

  private buildSummaryParams(): { from?: string; to?: string; username?: string; minTotalCpv?: number } {
    const { from, to } = this.buildDateParams(this.appliedDateRange());
    const username = this.appliedUsername() || undefined;
    const cpvNumber = this.appliedCpvNumber();
    const params: { from?: string; to?: string; username?: string; minTotalCpv?: number } = {
      from,
      to,
      username,
    };
    if (cpvNumber != null) {
      params.minTotalCpv = cpvNumber;
    }
    return params;
  }

  private buildDateParams(range: Date[] | null): { from?: string; to?: string } {
    if (!range || range.length < 2 || !range[0] || !range[1]) return {};
    const start = new Date(range[0]);
    start.setHours(0, 0, 0, 0);
    const end = new Date(range[1]);
    end.setHours(23, 59, 59, 999);
    return { from: start.toISOString(), to: end.toISOString() };
  }
}
