import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, tap, map, catchError, of } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';

export type AllocationStatus =
  | 'PENDING'
  | 'DISPATCHED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'RECEIVED'
  | 'ACCEPTED'
  | 'CANCELLED';

export type DisputeStatus =
  | 'OPEN'
  | 'ADMIN_REJECTED'
  | 'ADMIN_ACCEPTED'
  | 'MERCHANT_ACKNOWLEDGED'
  | 'CLOSED';

export interface AllocationDispute {
  id: string;
  status: DisputeStatus;
  dispatchedQuantity: number;
  claimedReceivedQuantity: number;
}

export interface MerchantAllocation {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  status: AllocationStatus;
  quantityReceived: number | null;
  dispatchedAt: string | null;
  inTransitAt: string | null;
  deliveredAt: string | null;
  receivedAt: string | null;
  trackingReference: string | null;
  parentAllocationId: string | null;
  dispute?: AllocationDispute | null;
}

export interface StockDispute {
  id: string;
  status: DisputeStatus;
  merchantId: string;
  merchantName?: string;
  merchantBusinessName?: string;
  allocationId: string;
  productId: string;
  productName?: string;
  dispatchedQuantity: number;
  claimedReceivedQuantity: number;
  merchantNotes?: string | null;
  adminNotes?: string | null;
  evidenceUrls?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface StockDisputeFilters {
  status?: DisputeStatus;
  merchantId?: string;
  limit?: number;
  offset?: number;
}

export interface DispatchAllocationBody {
  dispatchNotes?: string;
  trackingReference?: string;
}

export interface UpdateAllocationStatusBody {
  status: 'IN_TRANSIT' | 'DELIVERED';
}

export interface ResolveDisputeBody {
  adminNotes?: string;
}

interface AllocationsListResponse {
  allocations?: MerchantAllocation[];
}

interface StockDisputesListResponse {
  disputes?: StockDispute[];
  total?: number;
  limit?: number;
  offset?: number;
}

export const ALLOCATION_STATUS_LABELS: Record<AllocationStatus, string> = {
  PENDING: 'Pending',
  DISPATCHED: 'Dispatched',
  IN_TRANSIT: 'In Transit',
  DELIVERED: 'Delivered',
  RECEIVED: 'Received',
  ACCEPTED: 'Accepted',
  CANCELLED: 'Cancelled',
};

export const DISPUTE_STATUS_LABELS: Record<DisputeStatus, string> = {
  OPEN: 'Open',
  ADMIN_REJECTED: 'Admin Rejected',
  ADMIN_ACCEPTED: 'Admin Accepted',
  MERCHANT_ACKNOWLEDGED: 'Merchant Acknowledged',
  CLOSED: 'Closed',
};

@Injectable({
  providedIn: 'root',
})
export class MerchantAllocationService {
  private readonly api = inject(ApiService);

  private readonly disputesState = signal<StockDispute[]>([]);
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

  getAllocations(merchantId: string): Observable<MerchantAllocation[]> {
    return this.api
      .get<AllocationsListResponse | MerchantAllocation[]>(`admin/merchants/${merchantId}/allocations`)
      .pipe(
        map((res) => {
          if (Array.isArray(res)) return res;
          return Array.isArray(res?.allocations) ? res.allocations : [];
        }),
        catchError(() => of([] as MerchantAllocation[]))
      );
  }

  dispatchAllocation(
    merchantId: string,
    allocationId: string,
    body: DispatchAllocationBody
  ): Observable<{ message: string }> {
    return this.api.post<{ message: string }>(
      `admin/merchants/${merchantId}/allocations/${allocationId}/dispatch`,
      body
    );
  }

  updateAllocationStatus(
    merchantId: string,
    allocationId: string,
    status: 'IN_TRANSIT' | 'DELIVERED'
  ): Observable<{ message: string }> {
    return this.api.patch<{ message: string }>(
      `admin/merchants/${merchantId}/allocations/${allocationId}/status`,
      { status }
    );
  }

  getStockDisputes(filters?: StockDisputeFilters): Observable<{ disputes: StockDispute[]; total: number }> {
    this.loadingState.set(true);
    this.loadingErrorState.set(null);

    const params: Record<string, string | number> = {};
    if (filters?.status) params['status'] = filters.status;
    if (filters?.merchantId) params['merchantId'] = filters.merchantId;
    if (filters?.limit != null) params['limit'] = filters.limit;
    if (filters?.offset != null) params['offset'] = filters.offset;

    return this.api
      .get<StockDisputesListResponse | StockDispute[]>(`admin/merchants/stock-disputes`, params)
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
          this.loadingErrorState.set(err?.message ?? 'Failed to load stock disputes');
          this.disputesState.set([]);
          this.disputesTotalState.set(0);
          return of({ disputes: [] as StockDispute[], total: 0 });
        })
      );
  }

  rejectDispute(disputeId: string, adminNotes: string): Observable<{ message: string }> {
    return this.api.post<{ message: string }>(
      `admin/merchants/stock-disputes/${disputeId}/reject`,
      { adminNotes }
    );
  }

  acceptDispute(disputeId: string, adminNotes?: string): Observable<{ message: string }> {
    return this.api.post<{ message: string }>(
      `admin/merchants/stock-disputes/${disputeId}/accept`,
      adminNotes ? { adminNotes } : {}
    );
  }

  getAllocationStatusLabel(status: AllocationStatus): string {
    return ALLOCATION_STATUS_LABELS[status] ?? status;
  }

  getDisputeStatusLabel(status: DisputeStatus): string {
    return DISPUTE_STATUS_LABELS[status] ?? status;
  }
}
