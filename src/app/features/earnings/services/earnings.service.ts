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

export interface RankStage {
  id: string;
  name: string;
  level: number;
  requirements: {
    personalSales: number;
    teamSales: number;
    directReferrals: number;
  };
  benefits: {
    bonus: number;
    capLimit: number;
  };
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

@Injectable({
  providedIn: 'root'
})
export class EarningsService {
  private readonly api = inject(ApiService);

  commissionRules = signal<CommissionRule[]>([]);
  pdpaRates = signal<Record<string, number>>({});
  cdpaRates = signal<Record<string, number>>({});
  levelCommissions = signal<LevelCommission[]>([]);
  ranks = signal<RankStage[]>([]);
  cpvRules = signal<CpvRule[]>([]);
  commissionLoading = signal<boolean>(false);
  cpvLoading = signal<boolean>(false);
  commissionError = signal<string | null>(null);
  cpvError = signal<string | null>(null);

  recentActivity = signal<EarningsActivity[]>([
    { id: 'TX-1001', user: 'Sarah Okonkwo', type: 'Direct Referral', amount: 50, timestamp: new Date(Date.now() - 1000 * 60 * 5), status: 'Processed' },
    { id: 'TX-1002', user: 'John Doe', type: 'Matching Bonus', amount: 12.5, timestamp: new Date(Date.now() - 1000 * 60 * 30), status: 'Pending' },
    { id: 'TX-1003', user: 'Michael Eze', type: 'Binary Pair', amount: 30, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), status: 'Processed' }
  ]);

  getSystemOverview() {
    return {
      totalPaidOut: 1250000,
      pendingPayouts: 45000,
      activeRules: this.commissionRules().length,
      lastUpdate: new Date()
    };
  }

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

  saveRankingRules(): Observable<RankStage[]> {
    const payload = this.ranks();
    return this.api.put<RankStage[]>('admin/ranking-rules', payload).pipe(
      tap((ranks) => this.ranks.set(ranks))
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

  loadRankingRules(): Observable<RankStage[]> {
    return this.api.get<RankStage[]>('admin/ranking-rules').pipe(
      tap((data) => this.ranks.set(data))
    );
  }
}
