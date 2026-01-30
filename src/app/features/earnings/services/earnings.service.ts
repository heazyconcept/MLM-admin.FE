import { Injectable, signal, inject } from '@angular/core';

export interface BonusRule {
  id: string;
  name: string;
  type: 'percentage' | 'flat';
  value: number;
  description: string;
  applicablePackages: string[];
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
  // Mock Data
  bonuses = signal<BonusRule[]>([
    {
      id: 'B001',
      name: 'Direct Referral Bonus',
      type: 'percentage',
      value: 10,
      description: 'Earn 10% on every direct referral sign-up.',
      applicablePackages: ['Silver', 'Gold', 'Platinum', 'Ruby', 'Diamond']
    },
    {
      id: 'B002',
      name: 'Matching Bonus',
      type: 'percentage',
      value: 5,
      description: 'Earn 5% from direct downline earnings.',
      applicablePackages: ['Platinum', 'Ruby', 'Diamond']
    },
    {
      id: 'B003',
      name: 'Leadership Bonus',
      type: 'flat',
      value: 500,
      description: 'Flat bonus for achieving Diamond rank.',
      applicablePackages: ['Diamond']
    }
  ]);

  ranks = signal<RankStage[]>([
    {
      id: 'R001',
      name: 'Starter',
      level: 1,
      requirements: { personalSales: 0, teamSales: 0, directReferrals: 0 },
      benefits: { bonus: 0, capLimit: 1000 }
    },
    {
      id: 'R002',
      name: 'Manager',
      level: 2,
      requirements: { personalSales: 500, teamSales: 5000, directReferrals: 3 },
      benefits: { bonus: 100, capLimit: 5000 }
    },
    {
      id: 'R003',
      name: 'Director',
      level: 3,
      requirements: { personalSales: 2000, teamSales: 25000, directReferrals: 5 },
      benefits: { bonus: 1000, capLimit: 20000 }
    }
  ]);

  cpvRules = signal<CpvRule[]>([
    { id: 'C001', package: 'Silver', registrationCpv: 50, productCpvMultiplier: 0.8 },
    { id: 'C002', package: 'Gold', registrationCpv: 100, productCpvMultiplier: 0.9 },
    { id: 'C003', package: 'Platinum', registrationCpv: 200, productCpvMultiplier: 1.0 },
    { id: 'C004', package: 'Ruby', registrationCpv: 500, productCpvMultiplier: 1.1 },
    { id: 'C005', package: 'Diamond', registrationCpv: 1000, productCpvMultiplier: 1.2 }
  ]);

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

  updateBonus(updatedBonus: BonusRule) {
    this.bonuses.update(bonuses =>
      bonuses.map(b => b.id === updatedBonus.id ? updatedBonus : b)
    );
  }

  updateRank(updatedRank: RankStage) {
    this.ranks.update(ranks =>
      ranks.map(r => r.id === updatedRank.id ? updatedRank : r)
    );
  }
}
