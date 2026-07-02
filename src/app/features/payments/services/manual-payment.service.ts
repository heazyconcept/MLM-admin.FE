import { Injectable, signal, computed, inject } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export type ManualPaymentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ManualRegistrationPayment {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  amount: number;
  currency: string;
  depositorName: string;
  evidenceUrl: string;
  status: ManualPaymentStatus;
  rejectionReason: string | null;
  packageId: string;
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
}

interface ManualPaymentsResponse {
  items: ManualRegistrationPayment[];
  total: number;
  limit: number;
  offset: number;
}

export interface ManualPaymentListOptions {
  status?: ManualPaymentStatus;
  userId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ManualPaymentService {
  private readonly api = inject(ApiService);

  private paymentsSignal = signal<ManualRegistrationPayment[]>([]);
  private totalSignal = signal(0);

  readonly payments = computed(() => this.paymentsSignal());
  readonly total = computed(() => this.totalSignal());

  loadFromApi(options?: ManualPaymentListOptions): Observable<ManualRegistrationPayment[]> {
    const params: Record<string, unknown> = {};

    if (options?.status) {
      params['status'] = options.status;
    }

    if (options?.userId) {
      params['userId'] = options.userId;
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

    return this.api.get<ManualPaymentsResponse | ManualRegistrationPayment[]>(
      'admin/manual-registration-payments',
      params
    ).pipe(
      map(response => {
        const raw = response as { items?: ManualRegistrationPayment[]; total?: number };
        const items = Array.isArray(response) ? response : raw.items ?? [];
        const total = Array.isArray(response) ? response.length : raw.total ?? 0;
        this.paymentsSignal.set(items);
        this.totalSignal.set(total);
        return items;
      })
    );
  }

  getById(id: string): Observable<ManualRegistrationPayment> {
    return this.api.get<ManualRegistrationPayment>(`admin/manual-registration-payments/${id}`);
  }

  getPaymentFromCache(id: string | null): ManualRegistrationPayment | undefined {
    if (!id) return undefined;
    return this.payments().find(p => p.id === id);
  }

  approve(id: string): Observable<void> {
    return this.api.post<void>(`admin/manual-registration-payments/${id}/approve`, {});
  }

  reject(id: string, reason: string): Observable<void> {
    return this.api.post<void>(`admin/manual-registration-payments/${id}/reject`, { reason });
  }
}
