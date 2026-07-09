import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, tap, map, catchError, of } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';

export type InventoryAdjustmentDisputeStatus =
  | 'OPEN'
  | 'ADMIN_APPROVED'
  | 'ADMIN_REJECTED'
  | 'CLOSED';

export type AdjustmentType = 'INCREASE' | 'DECREASE';

export interface InventoryAdjustmentDispute {
  id: string;
  merchantId: string;
  merchantName?: string;
  merchantBusinessName?: string;
  productId: string;
  productName?: string;
  productSku?: string;
  authorizedQuantity: number;
  requestedQuantity: number;
  adjustmentType: AdjustmentType;
  reason: string;
  status: InventoryAdjustmentDisputeStatus;
  adminNotes?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
}

export interface InventoryAdjustmentDisputeFilters {
  status?: InventoryAdjustmentDisputeStatus;
  merchantId?: string;
  productId?: string;
  limit?: number;
  offset?: number;
}

interface InventoryAdjustmentDisputesListResponse {
  disputes?: InventoryAdjustmentDispute[];
  total?: number;
  limit?: number;
  offset?: number;
}

export const INVENTORY_ADJUSTMENT_STATUS_LABELS: Record<InventoryAdjustmentDisputeStatus, string> = {
  OPEN: 'Open',
  ADMIN_APPROVED: 'Admin Approved',
  ADMIN_REJECTED: 'Admin Rejected',
  CLOSED: 'Closed',
};

@Injectable({
  providedIn: 'root',
})
export class InventoryAdjustmentDisputeService {
  private readonly api = inject(ApiService);

  private readonly disputesState = signal<InventoryAdjustmentDispute[]>([]);
  private readonly disputesTotalState = signal<number>(0);
  private readonly loadingState = signal<boolean>(false);
  private readonly loadingErrorState = signal<string | null>(null);

  readonly disputes = this.disputesState.asReadonly();
  readonly disputesTotal = this.disputesTotalState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly loadingError = this.loadingErrorState.asReadonly();

  readonly openCount = computed(
    () => this.disputesState().filter((d) => d.status === 'OPEN').length
  );

  loadFromApi(
    filters?: InventoryAdjustmentDisputeFilters
  ): Observable<{ disputes: InventoryAdjustmentDispute[]; total: number }> {
    this.loadingState.set(true);
    this.loadingErrorState.set(null);

    const params: Record<string, string | number> = {};
    if (filters?.status) params['status'] = filters.status;
    if (filters?.merchantId) params['merchantId'] = filters.merchantId;
    if (filters?.productId) params['productId'] = filters.productId;
    if (filters?.limit != null) params['limit'] = filters.limit;
    if (filters?.offset != null) params['offset'] = filters.offset;

    return this.api
      .get<InventoryAdjustmentDisputesListResponse | InventoryAdjustmentDispute[]>(
        'admin/merchants/inventory-adjustment-disputes',
        params
      )
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
          this.loadingErrorState.set(
            err?.message ?? 'Failed to load inventory adjustment disputes'
          );
          this.disputesState.set([]);
          this.disputesTotalState.set(0);
          return of({ disputes: [] as InventoryAdjustmentDispute[], total: 0 });
        })
      );
  }

  getById(id: string): Observable<InventoryAdjustmentDispute> {
    return this.api.get<InventoryAdjustmentDispute>(
      `admin/merchants/inventory-adjustment-disputes/${id}`
    );
  }

  approve(disputeId: string, adminNotes?: string): Observable<{ message: string }> {
    return this.api.post<{ message: string }>(
      `admin/merchants/inventory-adjustment-disputes/${disputeId}/approve`,
      adminNotes ? { adminNotes } : {}
    );
  }

  reject(disputeId: string, adminNotes: string): Observable<{ message: string }> {
    return this.api.post<{ message: string }>(
      `admin/merchants/inventory-adjustment-disputes/${disputeId}/reject`,
      { adminNotes }
    );
  }

  getStatusLabel(status: InventoryAdjustmentDisputeStatus): string {
    return INVENTORY_ADJUSTMENT_STATUS_LABELS[status] ?? status;
  }
}
