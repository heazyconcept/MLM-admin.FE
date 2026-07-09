import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';

export type UpgradeSource = 'ADMIN' | 'GATEWAY' | 'SYSTEM';

export type PackageTier =
  | 'NICKEL'
  | 'SILVER'
  | 'GOLD'
  | 'PLATINUM'
  | 'RUBY'
  | 'DIAMOND';

export interface PackageUpgradeRecord {
  id: string;
  userId: string;
  username: string;
  email: string;
  fullName?: string;
  previousPackage: string;
  currentPackage: string;
  stage: number;
  rankName?: string;
  upgradedAt: string;
  source?: UpgradeSource;
  performedBy?: string | null;
  paymentId?: string | null;
  paymentReference?: string | null;
}

export interface PackageUpgradeFilters {
  search?: string;
  previousPackage?: PackageTier | '';
  currentPackage?: PackageTier | '';
  stage?: number;
  source?: UpgradeSource;
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}

interface PackageUpgradesListResponse {
  items?: PackageUpgradeRecord[];
  total?: number;
  limit?: number;
  offset?: number;
}

@Injectable({
  providedIn: 'root',
})
export class PackageUpgradeHistoryService {
  private readonly api = inject(ApiService);

  private readonly recordsState = signal<PackageUpgradeRecord[]>([]);
  private readonly totalState = signal(0);
  private readonly thisMonthCountState = signal(0);
  private readonly loadingState = signal(false);
  private readonly loadingErrorState = signal<string | null>(null);

  readonly records = this.recordsState.asReadonly();
  readonly total = this.totalState.asReadonly();
  readonly thisMonthCount = this.thisMonthCountState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly loadingError = this.loadingErrorState.asReadonly();

  loadFromApi(filters?: PackageUpgradeFilters): Observable<{ items: PackageUpgradeRecord[]; total: number }> {
    this.loadingState.set(true);
    this.loadingErrorState.set(null);

    const params = this.buildParams(filters);

    return this.api
      .get<PackageUpgradesListResponse | PackageUpgradeRecord[]>(
        'admin/users/package-upgrades',
        params
      )
      .pipe(
        map((response) => this.normalizeListResponse(response)),
        tap(({ items, total }) => {
          this.recordsState.set(items);
          this.totalState.set(total);
          this.loadingState.set(false);
        }),
        catchError((err) => {
          this.loadingState.set(false);
          this.loadingErrorState.set(
            err?.error?.message ?? err?.message ?? 'Failed to load package upgrades'
          );
          this.recordsState.set([]);
          this.totalState.set(0);
          return of({ items: [] as PackageUpgradeRecord[], total: 0 });
        })
      );
  }

  loadThisMonthCount(): Observable<number> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    return this.api
      .get<PackageUpgradesListResponse>('admin/users/package-upgrades', {
        dateFrom: monthStart,
        limit: 1,
        offset: 0,
      })
      .pipe(
        map((response) => {
          const total = this.normalizeListResponse(response).total;
          this.thisMonthCountState.set(total);
          return total;
        }),
        catchError(() => {
          this.thisMonthCountState.set(0);
          return of(0);
        })
      );
  }

  getById(id: string): Observable<PackageUpgradeRecord> {
    return this.api.get<PackageUpgradeRecord>(`admin/users/package-upgrades/${id}`);
  }

  formatPackageLabel(pkg: string): string {
    if (!pkg) return '—';
    return pkg.charAt(0).toUpperCase() + pkg.slice(1).toLowerCase();
  }

  getPackageColor(pkg: string): string {
    const normalized = this.formatPackageLabel(pkg);
    const colors: Record<string, string> = {
      Nickel: '#64748b',
      Silver: '#94a3b8',
      Gold: '#F9A825',
      Platinum: '#475569',
      Ruby: '#ef4444',
      Diamond: '#3b82f6',
    };
    return colors[normalized] ?? '#94a3b8';
  }

  getMostCommonPath(records: PackageUpgradeRecord[]): string {
    if (!records.length) return '—';
    const counts = new Map<string, number>();
    for (const r of records) {
      const key = `${this.formatPackageLabel(r.previousPackage)} → ${this.formatPackageLabel(r.currentPackage)}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    let best = '';
    let bestCount = 0;
    for (const [path, count] of counts) {
      if (count > bestCount) {
        best = path;
        bestCount = count;
      }
    }
    return best || '—';
  }

  private buildParams(filters?: PackageUpgradeFilters): Record<string, string | number> {
    const params: Record<string, string | number> = {};

    if (filters?.search) params['search'] = filters.search;
    if (filters?.previousPackage) params['previousPackage'] = filters.previousPackage;
    if (filters?.currentPackage) params['currentPackage'] = filters.currentPackage;
    if (filters?.stage != null && filters.stage > 0) params['stage'] = filters.stage;
    if (filters?.source) params['source'] = filters.source;
    if (filters?.dateFrom) params['dateFrom'] = filters.dateFrom;
    if (filters?.dateTo) params['dateTo'] = filters.dateTo;
    if (filters?.userId) params['userId'] = filters.userId;
    if (filters?.limit != null) params['limit'] = filters.limit;
    if (filters?.offset != null) params['offset'] = filters.offset;

    return params;
  }

  private normalizeListResponse(
    response: PackageUpgradesListResponse | PackageUpgradeRecord[]
  ): { items: PackageUpgradeRecord[]; total: number } {
    if (Array.isArray(response)) {
      return { items: response.map((r) => this.normalizeRecord(r)), total: response.length };
    }

    const items = (response.items ?? []).map((r) => this.normalizeRecord(r));
    const total = typeof response.total === 'number' ? response.total : items.length;
    return { items, total };
  }

  private normalizeRecord(record: PackageUpgradeRecord): PackageUpgradeRecord {
    const raw = record as PackageUpgradeRecord & {
      fromPackage?: string;
      toPackage?: string;
    };

    return {
      ...record,
      previousPackage: raw.previousPackage ?? raw.fromPackage ?? '',
      currentPackage: raw.currentPackage ?? raw.toPackage ?? '',
    };
  }
}
