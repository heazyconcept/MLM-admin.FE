import { Injectable, signal } from '@angular/core';
import { inject } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

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

interface AdminWithdrawalItem {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
  destination?: string;
  destinationType?: string;
  createdAt: string;
  processedAt?: string;
  rejectionReason?: string;
  metadata?: Record<string, unknown>;
}

interface AdminWithdrawalsResponse {
  items: AdminWithdrawalItem[];
  total: number;
  limit: number;
  offset: number;
}

@Injectable({
  providedIn: 'root'
})
export class WithdrawalService {
  private readonly api = inject(ApiService);

  private withdrawalsSignal = signal<WithdrawalRequest[]>([]);
  readonly withdrawals = this.withdrawalsSignal.asReadonly();

  private statusHistoryMap = new Map<string, StatusHistory[]>();

  loadFromApi(): Observable<WithdrawalRequest[]> {
    return this.api.get<AdminWithdrawalsResponse>('admin/withdrawals').pipe(
      map(response => {
        const mapped = (response.items ?? []).map(item => this.mapAdminWithdrawal(item));
        this.withdrawalsSignal.set(mapped);
        this.statusHistoryMap.clear();
        mapped.forEach(w => {
          this.statusHistoryMap.set(w.id, [{
            status: w.status,
            timestamp: w.requestDate,
            admin: 'System',
            reason: 'Initial request'
          }]);
        });
        return mapped;
      })
    );
  }

  getWithdrawalById(id: string | null): WithdrawalRequest | undefined {
    if (!id) return undefined;
    return this.withdrawalsSignal().find(w => w.id === id);
  }

  approveWithdrawal(id: string): Observable<void> {
    return this.api.post<void>(`admin/withdrawals/${id}/approve`, {});
  }

  rejectWithdrawal(id: string, reason: string): Observable<void> {
    return this.api.post<void>(`admin/withdrawals/${id}/reject`, { reason });
  }

  markPaid(id: string, payoutReference: string): Observable<void> {
    return this.api.post<void>(`admin/withdrawals/${id}/mark-paid`, { payoutReference });
  }

  getStatusHistory(id: string): StatusHistory[] {
    return this.statusHistoryMap.get(id) || [];
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

  private mapAdminWithdrawal(item: AdminWithdrawalItem): WithdrawalRequest {
    const statusMap: Record<AdminWithdrawalItem['status'], WithdrawalStatus> = {
      PENDING: 'Pending',
      APPROVED: 'Approved',
      REJECTED: 'Rejected',
      PAID: 'Paid'
    };

    const status = statusMap[item.status] ?? 'Pending';
    const fees = 0;

    return {
      id: item.id,
      userId: item.userId,
      userName: (item.metadata?.['userName'] as string) || item.userId,
      userEmail: (item.metadata?.['userEmail'] as string) || '',
      amount: item.amount,
      currency: (item.currency as Currency) ?? 'NGN',
      destination: item.destination ?? '',
      destinationType: (item.destinationType as any) ?? 'Bank Account',
      status,
      requestDate: new Date(item.createdAt),
      processedDate: item.processedAt ? new Date(item.processedAt) : undefined,
      rejectionReason: item.rejectionReason,
      fees,
      netPayout: item.amount - fees,
      notes: undefined,
      walletBalance: 0,
      walletType: 'Main Wallet'
    };
  }
}
