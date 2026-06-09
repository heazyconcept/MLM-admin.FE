import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { TablePageEvent } from 'primeng/table';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { getEarningTypeLabel } from '../../../core/constants/earning-type-labels';
import { CpvTransactionRow, ReportsService } from '../reports.service';

@Component({
  selector: 'app-cpv-ledger',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule, DataTableComponent],
  templateUrl: './cpv-ledger.component.html',
  styleUrls: ['./cpv-ledger.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CpvLedgerComponent implements OnInit {
  private reportsApi = inject(ReportsService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  username = signal('');
  from = signal<string | undefined>(undefined);
  to = signal<string | undefined>(undefined);

  transactions = signal<CpvTransactionRow[]>([]);
  loading = signal(false);
  loadError = signal<string | null>(null);

  totalRecords = signal(0);
  tableFirst = signal(0);
  rows = signal(50);

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.username.set(params.get('username') ?? '');
      this.from.set(params.get('from') ?? undefined);
      this.to.set(params.get('to') ?? undefined);
      this.tableFirst.set(0);
      this.loadTransactions();
    });
  }

  reload(): void {
    this.loadError.set(null);
    this.loadTransactions();
  }

  onPageChange(event: TablePageEvent): void {
    this.tableFirst.set(event.first);
    this.rows.set(event.rows);
    this.loadTransactions();
  }

  backToReport(): void {
    const queryParams: Record<string, string> = {};
    const from = this.from();
    const to = this.to();
    if (from) queryParams['from'] = from;
    if (to) queryParams['to'] = to;
    this.router.navigate(['/admin/reports/earnings/cpv'], {
      queryParams: Object.keys(queryParams).length ? queryParams : undefined,
    });
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

  formatTriggeredBy(row: CpvTransactionRow): string {
    if (row.sourceUsername) {
      return `@${row.sourceUsername}`;
    }
    return '—';
  }

  private loadTransactions(): void {
    this.loading.set(true);
    const username = this.username().trim() || undefined;
    this.reportsApi
      .getCpvTransactions({
        from: this.from(),
        to: this.to(),
        username,
        limit: this.rows(),
        offset: this.tableFirst(),
      })
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          if (!res) {
            this.loadError.set('Failed to load CPV transactions. The report API may not be available yet.');
            this.transactions.set([]);
            this.totalRecords.set(0);
            return;
          }
          this.transactions.set(res.items ?? []);
          this.totalRecords.set(res.total ?? 0);
        },
        error: () => {
          this.loading.set(false);
          this.loadError.set('Failed to load CPV transactions.');
          this.transactions.set([]);
          this.totalRecords.set(0);
        },
      });
  }
}
