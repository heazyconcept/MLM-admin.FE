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
import type {
  AdminLegacySponsorReferralJoinItem,
  AdminLegacySponsorReferralsQuery,
} from '../models/admin-legacy.models';
import { legacyPackageLabel } from '../models/admin-legacy.models';
import { formatLagosDateTime } from '../utils/lagos-date.util';

type JoinsCacheEntry = {
  items: AdminLegacySponsorReferralJoinItem[];
  loading: boolean;
  error: string | null;
};

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
  private expandedSponsorIds = signal<ReadonlySet<string>>(new Set());
  private joinsCache = signal<Map<string, JoinsCacheEntry>>(new Map());

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

  tableHeaders = ['', 'Sponsor', 'Legacy joins'];
  detailHeaders = ['Username', 'Legacy category', 'Date activated'];

  onSearch(): void {
    if (!this.canSearch()) {
      return;
    }
    this.tableFirst.set(0);
    this.hasSearched.set(true);
    this.clearJoinExpansion();
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
    this.clearJoinExpansion();
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

  openJoinedMember(userId: string): void {
    void this.router.navigate(['/admin/legacy/members', userId]);
  }

  displayFullName(name: string | null | undefined): string {
    return name?.trim() ? name : '—';
  }

  packageLabel = legacyPackageLabel;
  formatActivatedAt = (iso: string) => formatLagosDateTime(iso);

  isExpanded(sponsorUserId: string): boolean {
    return this.expandedSponsorIds().has(sponsorUserId);
  }

  joinCacheKey(sponsorUserId: string): string {
    const query = this.activeQuery();
    if (!query) {
      return sponsorUserId;
    }
    return `${sponsorUserId}:${query.from}:${query.to}`;
  }

  joinsState(sponsorUserId: string): JoinsCacheEntry | null {
    return this.joinsCache().get(this.joinCacheKey(sponsorUserId)) ?? null;
  }

  toggleExpand(sponsorUserId: string): void {
    const next = new Set(this.expandedSponsorIds());
    if (next.has(sponsorUserId)) {
      next.delete(sponsorUserId);
      this.expandedSponsorIds.set(next);
      return;
    }
    next.add(sponsorUserId);
    this.expandedSponsorIds.set(next);
    const key = this.joinCacheKey(sponsorUserId);
    const cached = this.joinsCache().get(key);
    if (cached && !cached.loading && cached.error == null) {
      return;
    }
    this.fetchJoins(sponsorUserId);
  }

  retryJoins(sponsorUserId: string): void {
    this.fetchJoins(sponsorUserId);
  }

  private fetchJoins(sponsorUserId: string): void {
    const query = this.activeQuery();
    if (!query) {
      return;
    }
    const key = this.joinCacheKey(sponsorUserId);
    this.patchJoinCache(key, { items: [], loading: true, error: null });
    this.legacyService
      .loadSponsorReferralJoins(sponsorUserId, { from: query.from, to: query.to })
      .subscribe({
        next: (res) => {
          if (!res) {
            this.patchJoinCache(key, {
              items: [],
              loading: false,
              error: 'Could not load joins.',
            });
            return;
          }
          this.patchJoinCache(key, {
            items: res.items,
            loading: false,
            error: null,
          });
        },
        error: (err: Error) => {
          this.patchJoinCache(key, {
            items: [],
            loading: false,
            error: err.message || 'Could not load joins.',
          });
        },
      });
  }

  private patchJoinCache(key: string, entry: JoinsCacheEntry): void {
    const map = new Map(this.joinsCache());
    map.set(key, entry);
    this.joinsCache.set(map);
  }

  private clearJoinExpansion(): void {
    this.expandedSponsorIds.set(new Set());
    this.joinsCache.set(new Map());
  }
}