import { Injectable, signal, computed } from '@angular/core';

export type WithdrawalStatus = 'Pending' | 'Approved' | 'Rejected' | 'Processing' | 'Paid';
export type Currency = 'USD' | 'NGN';

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  currency: Currency;
  destination: string;
  destinationType: 'Bank Account' | 'Crypto Wallet' | 'Mobile Money';
  status: WithdrawalStatus;
  requestDate: Date;
  processedDate?: Date;
  rejectionReason?: string;
  fees: number;
  netPayout: number;
  notes?: string;
  walletBalance: number;
  walletType: string;
}

export interface StatusHistory {
  status: WithdrawalStatus;
  timestamp: Date;
  admin: string;
  reason?: string;
}

@Injectable({
  providedIn: 'root'
})
export class WithdrawalService {
  private withdrawalsSignal = signal<WithdrawalRequest[]>(this.generateMockData());
  private statusHistoryMap = new Map<string, StatusHistory[]>();

  withdrawals = this.withdrawalsSignal.asReadonly();

  constructor() {
    // Initialize status history for each withdrawal
    this.withdrawalsSignal().forEach(w => {
      this.statusHistoryMap.set(w.id, [{
        status: w.status,
        timestamp: w.requestDate,
        admin: 'System',
        reason: 'Initial request'
      }]);
    });
  }

  getWithdrawalById(id: string | null): WithdrawalRequest | undefined {
    if (!id) return undefined;
    return this.withdrawalsSignal().find(w => w.id === id);
  }

  approveWithdrawal(id: string): void {
    this.updateWithdrawalStatus(id, 'Approved', 'Admin User');
  }

  rejectWithdrawal(id: string, reason: string): void {
    const withdrawals = this.withdrawalsSignal();
    const index = withdrawals.findIndex(w => w.id === id);
    
    if (index !== -1) {
      const updated = [...withdrawals];
      updated[index] = {
        ...updated[index],
        status: 'Rejected',
        rejectionReason: reason,
        processedDate: new Date()
      };
      this.withdrawalsSignal.set(updated);
      
      this.addStatusHistory(id, 'Rejected', 'Admin User', reason);
    }
  }

  updateStatus(id: string, status: WithdrawalStatus): void {
    this.updateWithdrawalStatus(id, status, 'Admin User');
  }

  getStatusHistory(id: string): StatusHistory[] {
    return this.statusHistoryMap.get(id) || [];
  }

  private updateWithdrawalStatus(id: string, status: WithdrawalStatus, admin: string): void {
    const withdrawals = this.withdrawalsSignal();
    const index = withdrawals.findIndex(w => w.id === id);
    
    if (index !== -1) {
      const updated = [...withdrawals];
      updated[index] = {
        ...updated[index],
        status,
        processedDate: new Date()
      };
      this.withdrawalsSignal.set(updated);
      
      this.addStatusHistory(id, status, admin);
    }
  }

  private addStatusHistory(id: string, status: WithdrawalStatus, admin: string, reason?: string): void {
    const history = this.statusHistoryMap.get(id) || [];
    history.push({
      status,
      timestamp: new Date(),
      admin,
      reason
    });
    this.statusHistoryMap.set(id, history);
  }

  private generateMockData(): WithdrawalRequest[] {
    const users = [
      { id: 'U001', name: 'John Doe', email: 'john.doe@example.com' },
      { id: 'U002', name: 'Jane Smith', email: 'jane.smith@example.com' },
      { id: 'U003', name: 'Michael Johnson', email: 'michael.j@example.com' },
      { id: 'U004', name: 'Sarah Williams', email: 'sarah.w@example.com' },
      { id: 'U005', name: 'David Brown', email: 'david.brown@example.com' },
      { id: 'U006', name: 'Emily Davis', email: 'emily.d@example.com' },
      { id: 'U007', name: 'James Wilson', email: 'james.wilson@example.com' },
      { id: 'U008', name: 'Lisa Anderson', email: 'lisa.a@example.com' }
    ];

    const destinations = [
      { type: 'Bank Account' as const, value: 'GTBank - 0123456789' },
      { type: 'Bank Account' as const, value: 'Access Bank - 9876543210' },
      { type: 'Crypto Wallet' as const, value: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb' },
      { type: 'Mobile Money' as const, value: '+234 801 234 5678' },
      { type: 'Bank Account' as const, value: 'First Bank - 1122334455' },
      { type: 'Crypto Wallet' as const, value: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh' }
    ];

    const statuses: WithdrawalStatus[] = ['Pending', 'Approved', 'Rejected', 'Processing', 'Paid'];
    
    const withdrawals: WithdrawalRequest[] = [];
    
    for (let i = 1; i <= 20; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      const dest = destinations[Math.floor(Math.random() * destinations.length)];
      const currency: Currency = Math.random() > 0.5 ? 'USD' : 'NGN';
      const amount = currency === 'USD' 
        ? Math.floor(Math.random() * 5000) + 100
        : Math.floor(Math.random() * 2000000) + 50000;
      const fees = Math.floor(amount * 0.02); // 2% fee
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      
      const daysAgo = Math.floor(Math.random() * 30);
      const requestDate = new Date();
      requestDate.setDate(requestDate.getDate() - daysAgo);

      withdrawals.push({
        id: `WD${String(i).padStart(6, '0')}`,
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        amount,
        currency,
        destination: dest.value,
        destinationType: dest.type,
        status,
        requestDate,
        processedDate: status !== 'Pending' ? new Date(requestDate.getTime() + 86400000) : undefined,
        rejectionReason: status === 'Rejected' ? 'Insufficient documentation provided' : undefined,
        fees,
        netPayout: amount - fees,
        notes: i % 3 === 0 ? 'Urgent withdrawal request' : undefined,
        walletBalance: amount * 2,
        walletType: 'Main Wallet'
      });
    }

    return withdrawals.sort((a, b) => b.requestDate.getTime() - a.requestDate.getTime());
  }
}
