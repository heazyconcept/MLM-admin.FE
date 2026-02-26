import { Injectable, signal, inject } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';

export interface BonusRule {
  id: string;
  name: string;
  type: 'percentage' | 'flat';
  value: number;
  description: string;
  applicablePackages: string[];
}

/** GET /admin/commission-rules response */
export interface CommissionRulesResponse {
  rules?: unknown[];
  pdpaRates?: Record<string, number>;
  cdpaRates?: Record<string, number>;
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
  package: string;
  registrationCpv: number;
  productCpvMultiplier: number; // e.g., 1.0 = 100%, 0.5 = 50%
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

  bonuses = signal<BonusRule[]>([]);
  ranks = signal<RankStage[]>([]);
  cpvRules = signal<CpvRule[]>([]);

  recentActivity = signal<EarningsActivity[]>([
    { id: 'TX-1001', user: 'Sarah Okonkwo', type: 'Direct Referral', amount: 50, timestamp: new Date(Date.now() - 1000 * 60 * 5), status: 'Processed' },
    { id: 'TX-1002', user: 'John Doe', type: 'Matching Bonus', amount: 12.5, timestamp: new Date(Date.now() - 1000 * 60 * 30), status: 'Pending' },
    { id: 'TX-1003', user: 'Michael Eze', type: 'Binary Pair', amount: 30, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), status: 'Processed' }
  ]);

  getSystemOverview() {
    return {
      totalPaidOut: 1250000,
      pendingPayouts: 45000,
      activeRules: this.bonuses().length,
      lastUpdate: new Date()
    };
  }

  loadCommissionRules(): Observable<BonusRule[]> {
    return this.api.get<CommissionRulesResponse>('admin/commission-rules').pipe(
      map((res) => this.mapCommissionRulesToBonuses(res)),
      tap((bonuses) => this.bonuses.set(bonuses))
    );
  }

  saveCommissionRules(): Observable<BonusRule[]> {
    const current = this.bonuses();

    const payload: CommissionRulesResponse = {
      pdpaRates: {},
      cdpaRates: {}
    };

    for (const rule of current) {
      if (rule.id.startsWith('pdpa-')) {
        const pkg = rule.id.substring('pdpa-'.length);
        if (pkg) {
          payload.pdpaRates![pkg] = rule.value / 100; // UI stores percentage (e.g. 5 => 0.05)
        }
      } else if (rule.id.startsWith('cdpa-')) {
        const pkg = rule.id.substring('cdpa-'.length);
        if (pkg) {
          payload.cdpaRates![pkg] = rule.value;
        }
      }
    }

    return this.api.put<CommissionRulesResponse>('admin/commission-rules', payload).pipe(
      map((res) => this.mapCommissionRulesToBonuses(res)),
      tap((bonuses) => this.bonuses.set(bonuses))
    );
  }

  private mapCommissionRulesToBonuses(res: CommissionRulesResponse): BonusRule[] {
    const list: BonusRule[] = [];
    const packages = ['NICKEL', 'SILVER', 'GOLD', 'PLATINUM', 'RUBY', 'DIAMOND'];

    if (res.pdpaRates && typeof res.pdpaRates === 'object') {
      for (const pkg of packages) {
        const rate = res.pdpaRates[pkg];
        if (rate != null) {
          list.push({
            id: `pdpa-${pkg}`,
            name: `PDPA (${pkg})`,
            type: 'percentage',
            value: typeof rate === 'number' ? rate * 100 : 0,
            description: `Personal direct purchase allowance - ${pkg}`,
            applicablePackages: [pkg],
          });
        }
      }
    }

    if (res.cdpaRates && typeof res.cdpaRates === 'object') {
      for (const pkg of packages) {
        const rate = res.cdpaRates[pkg];
        if (rate != null) {
          list.push({
            id: `cdpa-${pkg}`,
            name: `CDPA (${pkg})`,
            type: 'percentage',
            value: typeof rate === 'number' ? rate : 0,
            description: `Commission on direct purchase allowance - ${pkg}`,
            applicablePackages: [pkg],
          });
        }
      }
    }

    if (res.rules && Array.isArray(res.rules)) {
      (res.rules as any[]).forEach((r: any, i: number) => {
        list.push({
          id: r.id ?? `rule-${i}`,
          name: r.name ?? r.rank ?? r.tier ?? `Rule ${i + 1}`,
          type: (r.type === 'flat' ? 'flat' : 'percentage') as 'percentage' | 'flat',
          value: Number(r.value ?? r.rate ?? r.percentage ?? 0),
          description: r.description ?? '',
          applicablePackages: Array.isArray(r.applicablePackages) ? r.applicablePackages : (r.package ? [r.package] : []),
        });
      });
    }

    return list;
  }

  updateBonus(updated: BonusRule): void {
    const current = this.bonuses();
    this.bonuses.set(
      current.map((b) => (b.id === updated.id ? { ...b, value: updated.value } : b))
    );
  }

  saveCpvRules(): Observable<CpvRule[]> {
    const payload = this.cpvRules();
    return this.api.put<CpvRule[]>('admin/cpv-rules', payload).pipe(
      tap((rules) => this.cpvRules.set(rules))
    );
  }

  saveRankingRules(): Observable<RankStage[]> {
    const payload = this.ranks();
    return this.api.put<RankStage[]>('admin/ranking-rules', payload).pipe(
      tap((ranks) => this.ranks.set(ranks))
    );
  }

  loadCpvRules(): Observable<CpvRule[]> {
    return this.api.get<CpvRule[]>('admin/cpv-rules').pipe(rules => {
      (rules as any).subscribe((data: CpvRule[]) => this.cpvRules.set(data));
      return rules as unknown as Observable<CpvRule[]>;
    });
  }

  loadRankingRules(): Observable<RankStage[]> {
    return this.api.get<RankStage[]>('admin/ranking-rules').pipe(rules => {
      (rules as any).subscribe((data: RankStage[]) => this.ranks.set(data));
      return rules as unknown as Observable<RankStage[]>;
    });
  }
}
