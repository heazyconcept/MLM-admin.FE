import { Injectable, signal } from '@angular/core';
import { inject } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';

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
  payoutReference?: string;
  walletBalance: number;
  walletType: string;
}

export interface WithdrawalListQuery {
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
  userId?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
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
  payoutReference?: string;
  metadata?: Record<string, unknown>;
}

@Injectable({
  providedIn: 'root'
})
export class WithdrawalService {
  private readonly api = inject(ApiService);
  private static readonly DEFAULT_LIMIT = 20;

  private withdrawalsSignal = signal<WithdrawalRequest[]>([]);
  readonly withdrawals = this.withdrawalsSignal.asReadonly();
  private totalSignal = signal(0);
  readonly total = this.totalSignal.asReadonly();
  private limitSignal = signal(WithdrawalService.DEFAULT_LIMIT);
  readonly limit = this.limitSignal.asReadonly();
  private offsetSignal = signal(0);
  readonly offset = this.offsetSignal.asReadonly();

  private statusHistoryMap = new Map<string, StatusHistory[]>();

  loadFromApi(query: WithdrawalListQuery = {}): Observable<WithdrawalRequest[]> {
    const limit = query.limit ?? this.limitSignal();
    const offset = query.offset ?? 0;

    return this.api.get<AdminWithdrawalItem[]>('admin/withdrawals', {
      status: query.status,
      userId: query.userId,
      fromDate: query.fromDate,
      toDate: query.toDate,
      limit,
      offset
    }).pipe(
      map(items => {
        const mapped = (items ?? []).map(item => this.mapAdminWithdrawal(item));
        this.withdrawalsSignal.set(mapped);
        this.limitSignal.set(limit);
        this.offsetSignal.set(offset);

        // The endpoint returns an array; estimate total for paginator.
        // If the page is full, assume at least one more page exists; otherwise
        // the current offset + count is the true total.
        const estimatedTotal = items.length === limit
          ? offset + items.length + limit
          : offset + items.length;
        this.totalSignal.set(estimatedTotal);

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

  approveWithdrawal(id: string): Observable<WithdrawalRequest> {
    return this.api.post<AdminWithdrawalItem>(`admin/withdrawals/${id}/approve`, {}).pipe(
      tap(item => {
        if (item?.id) {
          this.replaceOrMergeWithdrawal(this.mapAdminWithdrawal(item));
        } else {
          this.patchWithdrawalStatus(id, 'Approved', undefined, undefined);
        }
      }),
      map(item => this.mapAdminWithdrawal(item))
    );
  }

  rejectWithdrawal(id: string, reason: string): Observable<WithdrawalRequest> {
    return this.api.post<AdminWithdrawalItem>(`admin/withdrawals/${id}/reject`, { reason }).pipe(
      tap(item => {
        if (item?.id) {
          this.replaceOrMergeWithdrawal(this.mapAdminWithdrawal(item));
        } else {
          this.patchWithdrawalStatus(id, 'Rejected', reason, undefined);
        }
      }),
      map(item => this.mapAdminWithdrawal(item))
    );
  }

  markPaid(id: string, payoutReference?: string): Observable<WithdrawalRequest> {
    return this.api.post<AdminWithdrawalItem>(`admin/withdrawals/${id}/mark-paid`, { payoutReference }).pipe(
      tap(item => {
        if (item?.id) {
          this.replaceOrMergeWithdrawal(this.mapAdminWithdrawal(item));
        } else {
          this.patchWithdrawalStatus(id, 'Paid', undefined, payoutReference);
        }
      }),
      map(item => this.mapAdminWithdrawal(item))
    );
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

  private replaceOrMergeWithdrawal(next: WithdrawalRequest): void {
    const current = this.withdrawalsSignal();
    const index = current.findIndex(w => w.id === next.id);
    if (index === -1) {
      return;
    }

    const updated = [...current];
    updated[index] = {
      ...updated[index],
      ...next,
      requestDate: next.requestDate || updated[index].requestDate
    };
    this.withdrawalsSignal.set(updated);

    const reason = next.status === 'Rejected' ? next.rejectionReason : undefined;
    this.addStatusHistory(next.id, next.status, 'Admin', reason);
  }

  private patchWithdrawalStatus(
    id: string,
    status: WithdrawalStatus,
    reason?: string,
    payoutReference?: string
  ): void {
    const current = this.withdrawalsSignal();
    const index = current.findIndex(w => w.id === id);
    if (index === -1) {
      return;
    }

    const updated = [...current];
    updated[index] = {
      ...updated[index],
      status,
      processedDate: new Date(),
      rejectionReason: status === 'Rejected' ? reason : updated[index].rejectionReason,
      payoutReference: status === 'Paid' ? payoutReference : updated[index].payoutReference
    };
    this.withdrawalsSignal.set(updated);
    this.addStatusHistory(id, status, 'Admin', reason);
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
      payoutReference: item.payoutReference,
      fees,
      netPayout: item.amount - fees,
      notes: undefined,
      walletBalance: 0,
      walletType: 'Main Wallet'
    };
  }
}
