import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, tap, map, catchError, of } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import {
  OrderDispute,
  OrderDisputeFilters,
  OrderDisputeStatus,
  ResolveOrderDisputeBody,
} from '../../../core/models/order.model';

interface OrderDisputesListResponse {
  disputes?: OrderDispute[];
  total?: number;
  limit?: number;
  offset?: number;
}

export const ORDER_DISPUTE_STATUS_LABELS: Record<OrderDisputeStatus, string> = {
  OPEN: 'Open',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

@Injectable({
  providedIn: 'root',
})
export class OrderDisputeService {
  private readonly api = inject(ApiService);

  private readonly disputesState = signal<OrderDispute[]>([]);
  private readonly disputesTotalState = signal<number>(0);
  private readonly loadingState = signal<boolean>(false);
  private readonly loadingErrorState = signal<string | null>(null);

  readonly disputes = this.disputesState.asReadonly();
  readonly disputesTotal = this.disputesTotalState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly loadingError = this.loadingErrorState.asReadonly();

  readonly openDisputesCount = computed(
    () => this.disputesState().filter((d) => d.status === 'OPEN').length
  );

  getDisputes(filters?: OrderDisputeFilters): Observable<{ disputes: OrderDispute[]; total: number }> {
    this.loadingState.set(true);
    this.loadingErrorState.set(null);

    const params: Record<string, string | number> = {};
    if (filters?.status) params['status'] = filters.status;
    if (filters?.merchantId) params['merchantId'] = filters.merchantId;
    if (filters?.limit != null) params['limit'] = filters.limit;
    if (filters?.offset != null) params['offset'] = filters.offset;

    return this.api
      .get<OrderDisputesListResponse | OrderDispute[]>(`admin/orders/disputes`, params)
      .pipe(
        map((res) => {
          if (Array.isArray(res)) {
            return { disputes: res, total: res.length };
          }
          const disputes = Array.isArray(res?.disputes) ? res.disputes : [];
          const total = typeof res?.total === 'number' ? res.total : disputes.length;
          return { disputes, total };
        }),
        tap(({ disputes, total }) => {
          this.disputesState.set(disputes);
          this.disputesTotalState.set(total);
          this.loadingState.set(false);
        }),
        catchError((err) => {
          this.loadingState.set(false);
          this.loadingErrorState.set(err?.message ?? 'Failed to load order disputes');
          this.disputesState.set([]);
          this.disputesTotalState.set(0);
          return of({ disputes: [] as OrderDispute[], total: 0 });
        })
      );
  }

  resolveDispute(disputeId: string, body: ResolveOrderDisputeBody): Observable<{ message: string }> {
    return this.api.post<{ message: string }>(`admin/orders/disputes/${disputeId}/resolve`, body);
  }

  getDisputeStatusLabel(status: OrderDisputeStatus): string {
    return ORDER_DISPUTE_STATUS_LABELS[status] ?? status;
  }
}
