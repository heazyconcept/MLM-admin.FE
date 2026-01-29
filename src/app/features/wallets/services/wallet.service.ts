import { Injectable, signal, computed } from '@angular/core';

export interface Wallet {
  id: string;
  userId: string;
  userName: string;
  type: 'Main' | 'Trading' | 'Bonus';
  balance: number;
  currency: 'USD' | 'NGN';
  status: 'Active' | 'Locked' | 'Frozen';
  lastUpdated: Date;
}

export interface LedgerEntry {
  id: string;
  walletId: string;
  type: 'Credit' | 'Debit';
  amount: number;
  reason: string;
  timestamp: Date;
  reference?: string;
}

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  
  // Mock State
  private walletsState = signal<Wallet[]>([
    { id: 'w_001', userId: 'u_101', userName: 'Pelumi Adebayo', type: 'Main', balance: 5420.50, currency: 'USD', status: 'Active', lastUpdated: new Date() },
    { id: 'w_002', userId: 'u_102', userName: 'Chinedu Okeke', type: 'Trading', balance: 12500.00, currency: 'USD', status: 'Active', lastUpdated: new Date() },
    { id: 'w_003', userId: 'u_103', userName: 'Fatima Yusuf', type: 'Bonus', balance: 850.00, currency: 'NGN', status: 'Frozen', lastUpdated: new Date() },
    { id: 'w_004', userId: 'u_104', userName: 'David Mark', type: 'Main', balance: 0.00, currency: 'USD', status: 'Locked', lastUpdated: new Date() },
    { id: 'w_005', userId: 'u_105', userName: 'Sarah Johnson', type: 'Main', balance: 3200.75, currency: 'USD', status: 'Active', lastUpdated: new Date() },
  ]);

  private ledgerState = signal<LedgerEntry[]>([
    { id: 'l_001', walletId: 'w_001', type: 'Credit', amount: 500, reason: 'Referral Bonus', timestamp: new Date(Date.now() - 86400000) }, // 1 day ago
    { id: 'l_002', walletId: 'w_002', type: 'Debit', amount: 100, reason: 'Monthly Sub', timestamp: new Date(Date.now() - 172800000) }, // 2 days ago
  ]);

  // Selectors
  wallets = computed(() => this.walletsState());
  ledger = computed(() => this.ledgerState());

  getOverview() {
    return computed(() => {
      const all = this.walletsState();
      return {
        totalBalanceUSD: all.filter(w => w.currency === 'USD').reduce((acc, w) => acc + w.balance, 0),
        totalBalanceNGN: all.filter(w => w.currency === 'NGN').reduce((acc, w) => acc + w.balance, 0),
        lockedCount: all.filter(w => w.status === 'Locked').length,
        frozenCount: all.filter(w => w.status === 'Frozen').length,
      };
    });
  }

  getWallet(id: string) {
    return computed(() => this.walletsState().find(w => w.id === id));
  }

  getWalletLedger(walletId: string) {
    return computed(() => this.ledgerState().filter(l => l.walletId === walletId).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
  }

  // Actions
  lockWallet(id: string) {
    this.updateWalletStatus(id, 'Locked');
  }

  unlockWallet(id: string) {
    this.updateWalletStatus(id, 'Active');
  }

  freezeWallet(id: string) {
    this.updateWalletStatus(id, 'Frozen');
  }

  unfreezeWallet(id: string) {
    this.updateWalletStatus(id, 'Active');
  }

  private updateWalletStatus(id: string, status: 'Active' | 'Locked' | 'Frozen') {
    this.walletsState.update(current => 
      current.map(w => w.id === id ? { ...w, status, lastUpdated: new Date() } : w)
    );
  }

  adjustFunds(walletId: string, type: 'Credit' | 'Debit', amount: number, reason: string) {
    // 1. Create Ledger Entry
    const newEntry: LedgerEntry = {
      id: `l_${Date.now()}`,
      walletId,
      type,
      amount,
      reason,
      timestamp: new Date()
    };
    
    this.ledgerState.update(current => [newEntry, ...current]);

    // 2. Update Balance
    this.walletsState.update(current => 
      current.map(w => {
        if (w.id === walletId) {
          const newBalance = type === 'Credit' ? w.balance + amount : w.balance - amount;
          return { ...w, balance: newBalance, lastUpdated: new Date() };
        }
        return w;
      })
    );
  }
}
