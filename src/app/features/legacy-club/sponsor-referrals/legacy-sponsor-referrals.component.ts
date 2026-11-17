import {
  Component,
  ChangeDetectionStrategy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TablePageEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { AdminLegacyService } from '../services/admin-legacy.service';
import type { AdminLegacySponsorReferralsQuery } from '../models/admin-legacy.models';

@Component({
  selector: 'app-legacy-sponsor-referrals',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ButtonModule,
    InputNumberModule,
    DataTableComponent,
  ],
  templateUrl: './legacy-sponsor-referrals.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegacySponsorReferralsComponent {
  private readonly legacyService = inject(AdminLegacyService);
  private readonly router = inject(Router);
  items = this.legacyService.sponsorReferrals;
  total = this.legacyService.sponsorReferralsTotal;
  loading = this.legacyService.sponsorReferralsLoading;
  error = this.legacyService.sponsorReferralsError;

  minCount = signal(1);
  fromYmd = signal('');
  toYmd = signal('');
  tableFirst = signal(0);
  pageRows = signal(20);
  hasSearched = signal(false);

  private activeQuery = signal<AdminLegacySponsorReferralsQuery | null>(null);

  canSearch = computed(() => {
    const min = this.minCount();
    return (
      Number.isFinite(min) &&
      min >= 1 &&
      /^\d{4}-\d{2}-\d{2}$/.test(this.fromYmd().trim()) &&
      /^\d{4}-\d{2}-\d{2}$/.test(this.toYmd().trim())
    );
  });

  showEmpty = computed(
    () =>
      this.hasSearched() &&
      !this.loading() &&
      !this.error() &&
      this.items().length === 0,
  );

  tableHeaders = ['Sponsor', 'Legacy joins'];

  onSearch(): void {
    if (!this.canSearch()) {
      return;
    }
    this.tableFirst.set(0);
    this.hasSearched.set(true);
    const query: AdminLegacySponsorReferralsQuery = {
      minCount: Math.floor(this.minCount()),
      from: this.fromYmd().trim(),
      to: this.toYmd().trim(),
      page: 1,
      limit: this.pageRows(),
    };
    this.activeQuery.set(query);
    this.legacyService.loadSponsorReferrals(query).subscribe();
  }

  onPageChange(event: TablePageEvent): void {
    const first = event.first ?? 0;
    const rows = event.rows ?? this.pageRows();
    this.tableFirst.set(first);
    this.pageRows.set(rows);
    const base = this.activeQuery();
    if (!base) return;
    const page = Math.floor(first / rows) + 1;
    const query: AdminLegacySponsorReferralsQuery = {
      ...base,
      page,
      limit: rows,
    };
    this.activeQuery.set(query);
    this.legacyService.loadSponsorReferrals(query).subscribe();
  }

  retry(): void {
    const query = this.activeQuery();
    if (query) {
      this.legacyService.loadSponsorReferrals(query).subscribe();
      return;
    }
    this.onSearch();
  }

  openMember(row: { userId: string }): void {
    void this.router.navigate(['/admin/legacy/members', row.userId]);
  }

  displayFullName(name: string | null): string {
    return name?.trim() ? name : '—';
  }
}