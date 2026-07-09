import { Injectable, signal, computed, inject } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export type ManualDepositStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type ManualDepositWalletType = 'REGISTRATION' | 'VOUCHER';

export interface ManualWalletDeposit {
  id: string;
  userId: string;
  walletType: ManualDepositWalletType;
  amount: number;
  currency: string;
  depositorName: string;
  evidenceUrl: string;
  status: ManualDepositStatus;
  rejectionReason: string | null;
  paymentId: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  user?: {
    id: string;
    username: string;
    email: string;
    registrationPackage: string;
    registrationCurrency: string;
    isRegistrationPaid: boolean;
  };
  reviewer?: {
    id: string;
    username: string;
  } | null;
  payment?: {
    id: string;
    reference: string;
    status: string;
  } | null;
}

interface ManualDepositsResponse {
  items: ManualWalletDeposit[];
  total: number;
  limit: number;
  offset: number;
}

export interface ManualDepositListOptions {
  status?: ManualDepositStatus;
  userId?: string;
  walletType?: ManualDepositWalletType;
  search?: string;
  limit?: number;
  offset?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ManualDepositService {
  private readonly api = inject(ApiService);

  private depositsSignal = signal<ManualWalletDeposit[]>([]);
  private totalSignal = signal(0);

  readonly deposits = computed(() => this.depositsSignal());
  readonly total = computed(() => this.totalSignal());

  loadFromApi(options?: ManualDepositListOptions): Observable<ManualWalletDeposit[]> {
    const params: Record<string, unknown> = {};

    if (options?.status) {
      params['status'] = options.status;
    }

    if (options?.userId) {
      params['userId'] = options.userId;
    }

    if (options?.walletType) {
      params['walletType'] = options.walletType;
    }

    if (options?.search) {
      params['search'] = options.search;
    }

    if (options?.limit !== undefined) {
      params['limit'] = options.limit;
    }

    if (options?.offset !== undefined) {
      params['offset'] = options.offset;
    }

    return this.api.get<ManualDepositsResponse | ManualWalletDeposit[]>(
      'admin/manual-deposits',
      params
    ).pipe(
      map(response => {
        const raw = response as { items?: ManualWalletDeposit[]; total?: number };
        const items = Array.isArray(response) ? response : raw.items ?? [];
        const total = Array.isArray(response) ? response.length : raw.total ?? 0;
        this.depositsSignal.set(items);
        this.totalSignal.set(total);
        return items;
      })
    );
  }

  getById(id: string): Observable<ManualWalletDeposit> {
    return this.api.get<ManualWalletDeposit>(`admin/manual-deposits/${id}`);
  }

  approve(id: string): Observable<void> {
    return this.api.post<void>(`admin/manual-deposits/${id}/approve`, {});
  }

  reject(id: string, reason: string): Observable<void> {
    return this.api.post<void>(`admin/manual-deposits/${id}/reject`, { reason });
  }
}
