import { Injectable, signal, computed, inject } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export type PaymentStatus = 'Pending' | 'Successful' | 'Failed' | 'Reversed';
export type PaymentPurpose = 'Registration' | 'Funding' | 'Upgrade';

export interface PaymentStatusHistory {
  status: PaymentStatus;
  timestamp: Date;
  admin: string;
  reason?: string;
}

export interface Payment {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  purpose: PaymentPurpose;
  amount: number;
  currency: string;
  method: string;
  status: PaymentStatus;
  createdAt: string;
  date: Date;
  notes?: string;
  proofUrl?: string; // For manual payments
  statusHistory: PaymentStatusHistory[];
}

interface AdminPaymentItem {
  id: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  amount: number;
  currency: string;
  status: string;
  type?: string;
  provider?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

interface AdminPaymentsResponse {
  items: AdminPaymentItem[];
  total: number;
  limit: number;
  offset: number;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private readonly api = inject(ApiService);

  private paymentsSignal = signal<Payment[]>([]);

  readonly payments = computed(() => this.paymentsSignal());

  loadFromApi(options?: { status?: PaymentStatus; userId?: string; fromDate?: Date; toDate?: Date; limit?: number; offset?: number }): Observable<Payment[]> {
    const params: Record<string, unknown> = {};

    if (options?.status && options.status !== 'Reversed') {
      const statusMap: Record<PaymentStatus, string> = {
        Pending: 'INITIATED',
        Successful: 'SUCCESS',
        Failed: 'FAILED',
        Reversed: ''
      };
      const apiStatus = statusMap[options.status];
      if (apiStatus) {
        params['status'] = apiStatus;
      }
    }

    if (options?.userId) {
      params['userId'] = options.userId;
    }

    if (options?.fromDate) {
      params['fromDate'] = options.fromDate.toISOString();
    }

    if (options?.toDate) {
      params['toDate'] = options.toDate.toISOString();
    }

    if (options?.limit !== undefined) {
      params['limit'] = options.limit;
    }

    if (options?.offset !== undefined) {
      params['offset'] = options.offset;
    }

    return this.api.get<AdminPaymentsResponse | AdminPaymentItem[]>('admin/payments', params).pipe(
      map(response => {
        const items = Array.isArray(response) ? response : response.items ?? [];
        const mapped = items.map(p => this.mapAdminPayment(p));
        this.paymentsSignal.set(mapped);
        return mapped;
      })
    );
  }

  getPaymentById(id: string | null) {
    if (!id) return null;
    return this.payments().find(p => p.id === id);
  }

  verifyPayment(id: string): Observable<void> {
    return this.api.post<void>(`admin/payments/${id}/verify`, {});
  }

  adminFundUser(body: { userId: string; amount: number; currency: string; provider: string; reference?: string; notes?: string }): Observable<void> {
    return this.api.post<void>('admin/payments/fund', body);
  }

  updateStatus(id: string, status: PaymentStatus, admin: string, reason?: string) {
    this.paymentsSignal.update(payments => {
      return payments.map(p => {
        if (p.id === id) {
          const historyEntry: PaymentStatusHistory = {
            status,
            timestamp: new Date(),
            admin,
            reason
          };
          return {
            ...p,
            status,
            statusHistory: [...p.statusHistory, historyEntry]
          };
        }
        return p;
      });
    });
  }

  flagPayment(id: string, reason: string, admin: string) {
    // In this mock, we just add it to history as a "Flagged" event but keep status
    // or maybe we add a 'Flagged' property to Payment interface
    this.paymentsSignal.update(payments => {
      return payments.map(p => {
        if (p.id === id) {
          return {
            ...p,
            notes: p.notes ? `${p.notes} | FLAG: ${reason}` : `FLAG: ${reason}`,
            statusHistory: [...p.statusHistory, {
              status: p.status, // keep current status
              timestamp: new Date(),
              admin,
              reason: `FLAGGED: ${reason}`
            }]
          };
        }
        return p;
      });
    });
  }

  private mapAdminPayment(item: AdminPaymentItem): Payment {
    const statusMap: Record<string, PaymentStatus> = {
      INITIATED: 'Pending',
      SUCCESS: 'Successful',
      FAILED: 'Failed'
    };

    const purposeMap: Record<string, PaymentPurpose> = {
      REGISTRATION: 'Registration',
      UPGRADE: 'Upgrade',
      WALLET_FUNDING: 'Funding',
      ADMIN_FUNDING: 'Funding'
    };

    const status = statusMap[item.status] ?? 'Pending';
    const typeKey = (item.type || '').toUpperCase();
    const purpose = purposeMap[typeKey] ?? 'Funding';

    const userName = item.userName
      || (item.userEmail ? item.userEmail.split('@')[0] : '')
      || item.userId
      || 'User';

    return {
      id: item.id,
      userId: item.userId || '',
      userName,
      userEmail: item.userEmail || '',
      purpose,
      amount: item.amount,
      currency: item.currency,
      method: item.provider || 'Unknown',
      status,
      createdAt: item.createdAt,
      date: new Date(item.createdAt),
      notes: undefined,
      proofUrl: undefined,
      statusHistory: [
        {
          status,
          timestamp: new Date(item.createdAt),
          admin: 'System'
        }
      ]
    };
  }
}
