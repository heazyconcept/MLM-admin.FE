import { Injectable, signal, inject } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

export interface CommissionRule {
  id?: string;
  level: number;
  percentage: number;
  currency: string;
  isActive?: boolean;
  createdAt?: string;
}

export interface LevelCommission {
  level: number;
  percentages: Record<string, number>;
}

/** GET /admin/commission-rules response */
export interface CommissionRulesResponse {
  rules?: CommissionRule[];
  pdpaRates?: Record<string, number>;
  cdpaRates?: Record<string, number>;
  levelCommissions?: LevelCommission[];
}

export interface CommissionRulesUpdatePayload {
  rules: Array<Pick<CommissionRule, 'level' | 'percentage' | 'currency'>>;
}

export interface CpvRule {
  id: string;
  threshold: number;
  rewardType: string;
  rewardAmount: number;
  materialDescription: string | null;
  isActive: boolean;
  createdAt: string;
  name?: string;
  reward?: string;
}

export interface CpvRulesResponse {
  rules?: CpvRule[];
}

export interface CpvRuleUpdateInput {
  threshold: number;
  rewardType: string;
  rewardAmount: number;
  materialDescription: string | null;
}

export interface EarningsActivity {
  id: string;
  user: string;
  type: string;
  amount: number;
  timestamp: Date;
  status: 'Pending' | 'Processed' | 'Failed';
}

/** GET /admin/earnings/overview */
export interface EarningsOverviewSummary {
  totalEarnings: number;
  totalCpv: number;
  earningCount: number;
  cpvCount: number;
}

export interface EarningsChartBucket {
  date: string;
  earnings: number;
  cpv: number;
}

export interface EarningsOverviewResponse {
  summary: EarningsOverviewSummary;
  byType: Record<string, number>;
  cpvBySource: Record<string, number>;
  chartBuckets: EarningsChartBucket[];
}

/** GET /admin/earnings/activity/global item (ledger + CPV union) */
export interface EarningsGlobalActivityItem {
  id?: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  amount?: number;
  currency?: string;
  type?: string;
  status?: string;
  createdAt?: string;
  source?: string;
  [key: string]: unknown;
}

export interface EarningsGlobalActivityResponse {
  items: EarningsGlobalActivityItem[];
}

/** GET /admin/earnings/metrics */
export interface EarningsMetricsResponse {
  transactionsPerMinute: number;
  averageProcessingTimeMs: number;
  alerts: string[];
}

/**
 * GET /admin/earnings/activity — union of ledger rows, PV rows, etc.
 * Prefer displayAmount + displayCurrency for user-facing money when present.
 */
export interface UserEarningsActivityItem {
  id?: string;
  type: string;
  createdAt: string;
  userId?: string;
  amount?: number;
  displayAmount?: number;
  displayCurrency?: string;
  currency?: string;
  walletType?: string;
  direction?: string;
  source?: string;
  sourceId?: string;
  reference?: string;
  metadata?: Record<string, unknown>;
}

export interface UserEarningsActivityResponse {
  items: UserEarningsActivityItem[];
  total?: number;
  limit?: number;
  offset?: number;
}

/** Stable track id for *ngFor (not shown in UI). */
export function userEarningsActivityTrackId(
  index: number,
  row: UserEarningsActivityItem
): string {
  if (row.id) return String(row.id);
  if (row.reference) return String(row.reference);
  if (row.sourceId) return String(row.sourceId);
  return `ea-${index}-${row.createdAt ?? ''}`;
}

export function formatUserEarningsActivityAmount(item: UserEarningsActivityItem): string {
  const displayAmount = item.displayAmount;
  const displayCurrency = item.displayCurrency;
  if (
    displayAmount !== undefined &&
    displayAmount !== null &&
    displayCurrency &&
    String(displayCurrency).trim() !== ''
  ) {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: String(displayCurrency).toUpperCase(),
        maximumFractionDigits: 2,
      }).format(Number(displayAmount));
    } catch {
      return `${displayAmount} ${displayCurrency}`;
    }
  }

  const rawType = String(item.type ?? '').toLowerCase();
  const amt = Number(item.amount ?? 0);

  if (rawType === 'pv') {
    return `${amt} PV`;
  }

  const cur = (item.currency as string) || 'USD';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: cur,
      maximumFractionDigits: 2,
    }).format(amt);
  } catch {
    return `${amt} ${cur}`;
  }
}

export function getUserEarningsActivityKind(item: UserEarningsActivityItem): string {
  const t = String(item.type ?? '').toLowerCase();
  if (t === 'ledger') return 'Ledger';
  if (t === 'pv') return 'PV';
  return item.type || '—';
}

export function getUserEarningsActivityDetail(item: UserEarningsActivityItem): string {
  const t = String(item.type ?? '').toLowerCase();
  if (t === 'ledger') {
    const parts = [item.direction, item.walletType, item.source].filter(
      (p) => p !== undefined && p !== null && String(p).trim() !== ''
    );
    return parts.length ? parts.map(String).join(' · ') : '—';
  }
  if (t === 'pv') {
    const meta = item.metadata as { package?: string; amount?: number } | undefined;
    const pkg = meta?.package ? ` · ${meta.package}` : '';
    const base = item.source ?? '—';
    return `${base}${pkg}`;
  }
  return item.source ? String(item.source) : '—';
}

@Injectable({
  providedIn: 'root'
})
export class EarningsService {
  private readonly api = inject(ApiService);

  commissionRules = signal<CommissionRule[]>([]);
  pdpaRates = signal<Record<string, number>>({});
  cdpaRates = signal<Record<string, number>>({});
  levelCommissions = signal<LevelCommission[]>([]);
  cpvRules = signal<CpvRule[]>([]);
  commissionLoading = signal<boolean>(false);
  cpvLoading = signal<boolean>(false);
  commissionError = signal<string | null>(null);
  cpvError = signal<string | null>(null);

  loadCommissionRules(): Observable<CommissionRulesResponse> {
    this.commissionLoading.set(true);
    this.commissionError.set(null);

    return this.api.get<CommissionRulesResponse>('admin/commission-rules').pipe(
      tap((res) => {
        this.commissionRules.set(res?.rules ?? []);
        this.pdpaRates.set(res?.pdpaRates ?? {});
        this.cdpaRates.set(res?.cdpaRates ?? {});
        this.levelCommissions.set(res?.levelCommissions ?? []);
        this.commissionLoading.set(false);
      }),
      catchError((err) => {
        this.commissionLoading.set(false);
        this.commissionError.set(err?.error?.message ?? err?.message ?? 'Failed to load commission rules');
        this.commissionRules.set([]);
        this.pdpaRates.set({});
        this.cdpaRates.set({});
        this.levelCommissions.set([]);
        return of({ rules: [], pdpaRates: {}, cdpaRates: {}, levelCommissions: [] });
      })
    );
  }

  setCommissionRules(rules: CommissionRule[]): void {
    this.commissionRules.set(rules);
  }

  saveCommissionRules(rules: CommissionRulesUpdatePayload['rules']): Observable<CommissionRulesResponse> {
    this.commissionLoading.set(true);
    this.commissionError.set(null);

    const payload: CommissionRulesUpdatePayload = {
      rules: rules.map((rule) => ({
        level: Number(rule.level),
        percentage: Number(rule.percentage),
        currency: (rule.currency || 'USD').toUpperCase()
      }))
    };

    return this.api.put<CommissionRulesResponse>('admin/commission-rules', payload).pipe(
      tap((res) => {
        this.commissionRules.set(res?.rules ?? []);
        this.pdpaRates.set(res?.pdpaRates ?? {});
        this.cdpaRates.set(res?.cdpaRates ?? {});
        this.levelCommissions.set(res?.levelCommissions ?? []);
        this.commissionLoading.set(false);
      }),
      catchError((err) => {
        this.commissionLoading.set(false);
        this.commissionError.set(err?.error?.message ?? err?.message ?? 'Failed to save commission rules');
        return throwError(() => err);
      })
    );
  }

  saveCpvRules(rules: CpvRuleUpdateInput[]): Observable<CpvRule[]> {
    this.cpvLoading.set(true);
    this.cpvError.set(null);

    return this.api.put<CpvRulesResponse>('admin/cpv-rules', { rules }).pipe(
      map((res) => res?.rules ?? []),
      tap((updatedRules) => {
        this.cpvRules.set(updatedRules);
        this.cpvLoading.set(false);
      }),
      catchError((err) => {
        this.cpvLoading.set(false);
        this.cpvError.set(err?.error?.message ?? err?.message ?? 'Failed to save CPV rules');
        return throwError(() => err);
      })
    );
  }

  loadCpvRules(): Observable<CpvRule[]> {
    this.cpvLoading.set(true);
    this.cpvError.set(null);

    return this.api.get<CpvRulesResponse>('admin/cpv-rules').pipe(
      map((res) => res?.rules ?? []),
      tap((rules) => {
        this.cpvRules.set(rules);
        this.cpvLoading.set(false);
      }),
      catchError((err) => {
        this.cpvLoading.set(false);
        this.cpvError.set(err?.error?.message ?? err?.message ?? 'Failed to load CPV rules');
        this.cpvRules.set([]);
        return of([]);
      })
    );
  }

  getEarningsOverview(params?: { from?: string; to?: string }): Observable<EarningsOverviewResponse | null> {
    return this.api.get<EarningsOverviewResponse>('admin/earnings/overview', params).pipe(
      catchError(() => of(null))
    );
  }

  getGlobalActivity(params?: {
    limit?: number;
    offset?: number;
    from?: string;
    to?: string;
  }): Observable<EarningsActivity[]> {
    return this.api.get<EarningsGlobalActivityResponse>('admin/earnings/activity/global', params).pipe(
      map((res) => (res?.items ?? []).map((item, i) => this.mapGlobalItemToActivity(item, i))),
      catchError(() => of([]))
    );
  }

  getEarningsMetrics(): Observable<EarningsMetricsResponse> {
    return this.api.get<EarningsMetricsResponse>('admin/earnings/metrics').pipe(
      catchError(() =>
        of({ transactionsPerMinute: 0, averageProcessingTimeMs: 0, alerts: [] })
      )
    );
  }

  /**
   * GET /admin/earnings/activity — requires userId.
   */
  getUserEarningsActivity(params: {
    userId: string;
    limit?: number;
    offset?: number;
    from?: string;
    to?: string;
  }): Observable<UserEarningsActivityResponse | null> {
    return this.api.get<UserEarningsActivityResponse>('admin/earnings/activity', params).pipe(
      catchError(() => of(null))
    );
  }

  private mapGlobalItemToActivity(item: EarningsGlobalActivityItem, index: number): EarningsActivity {
    const id = String(item.id ?? `activity-${index}`);
    const user = String(item.userName || item.userEmail || item.userId || 'Unknown');
    const type = String(item.type || item.source || 'Activity');
    const amount = Number(item.amount ?? 0);
    const timestamp = item.createdAt ? new Date(item.createdAt) : new Date();
    const raw = String(item.status ?? 'Processed').toUpperCase();
    let status: EarningsActivity['status'] = 'Processed';
    if (raw.includes('PEND')) status = 'Pending';
    else if (raw.includes('FAIL')) status = 'Failed';
    return { id, user, type, amount, timestamp, status };
  }
}
