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

export type HandoverStatus =
  | 'NONE'
  | 'REQUESTED'
  | 'SUPPLIER_APPROVED'
  | 'ADMIN_APPROVED'
  | 'READY_FOR_PICKUP'
  | 'COMPLETED'
  | 'REJECTED';

export type AllocationSource = 'CATEGORY' | 'MERCHANT_REQUEST' | 'DISPUTE_REMAINDER';

export interface AllocationDispute {
  id: string;
  status: DisputeStatus;
  dispatchedQuantity: number;
  claimedReceivedQuantity: number;
}

export interface HandoverMerchantSummary {
  id: string;
  businessName: string;
  type?: string;
  phoneNumber?: string;
  address?: string;
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
  merchantId?: string;
  handoverStatus?: HandoverStatus | null;
  sourceMerchantId?: string | null;
  sourceMerchant?: HandoverMerchantSummary | null;
  receiverMerchant?: HandoverMerchantSummary | null;
  supplierApprovedAt?: string | null;
  adminApprovedAt?: string | null;
  handoverReadyAt?: string | null;
  handoverRejectedAt?: string | null;
  handoverRejectedBy?: string | null;
  handoverRejectReason?: string | null;
  createdAt?: string;
  source?: AllocationSource | null;
  requestNotes?: string | null;
  requestedByUserId?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  cancelledByAdminId?: string | null;
  merchantBusinessName?: string;
  merchantName?: string;
}

export interface StockRequest {
  id: string;
  merchantId: string;
  productId: string;
  productName: string;
  quantity: number;
  status: AllocationStatus;
  source: AllocationSource;
  requestNotes?: string | null;
  requestedByUserId?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  cancelledByAdminId?: string | null;
  createdAt?: string;
  merchantBusinessName?: string;
  merchantName?: string;
  receiverMerchant?: HandoverMerchantSummary | null;
}

export interface StockRequestFilters {
  status?: AllocationStatus;
  merchantId?: string;
  productId?: string;
  limit?: number;
  offset?: number;
}

export interface HandoverRequest {
  id: string;
  merchantId: string;
  productId: string;
  productName: string;
  quantity: number;
  status: AllocationStatus;
  handoverStatus: HandoverStatus;
  sourceMerchantId?: string | null;
  sourceMerchant?: HandoverMerchantSummary | null;
  receiverMerchant?: HandoverMerchantSummary | null;
  supplierApprovedAt?: string | null;
  adminApprovedAt?: string | null;
  handoverReadyAt?: string | null;
  handoverRejectedAt?: string | null;
  handoverRejectedBy?: string | null;
  handoverRejectReason?: string | null;
  createdAt?: string;
}

export interface HandoverRequestFilters {
  status?: HandoverStatus;
  merchantId?: string;
  limit?: number;
  offset?: number;
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

interface HandoverRequestsListResponse {
  items?: HandoverRequest[];
  data?: HandoverRequest[];
  requests?: HandoverRequest[];
  allocations?: HandoverRequest[];
  total?: number;
  limit?: number;
  offset?: number;
}

interface StockRequestsListResponse {
  items?: StockRequest[];
  data?: StockRequest[];
  requests?: StockRequest[];
  allocations?: StockRequest[];
  total?: number;
  limit?: number;
  offset?: number;
}

const HANDOVER_BLOCKING_STATUSES: ReadonlySet<HandoverStatus> = new Set([
  'REQUESTED',
  'SUPPLIER_APPROVED',
  'ADMIN_APPROVED',
  'READY_FOR_PICKUP',
]);

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

export const HANDOVER_STATUS_LABELS: Record<HandoverStatus, string> = {
  NONE: 'None',
  REQUESTED: 'Requested',
  SUPPLIER_APPROVED: 'Supplier Approved',
  ADMIN_APPROVED: 'Admin Approved',
  READY_FOR_PICKUP: 'Ready for Pickup',
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
};

export const ALLOCATION_SOURCE_LABELS: Record<AllocationSource, string> = {
  CATEGORY: 'Onboarding',
  MERCHANT_REQUEST: 'Top-up',
  DISPUTE_REMAINDER: 'Dispute remainder',
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

  private readonly handoverRequestsState = signal<HandoverRequest[]>([]);
  private readonly handoverRequestsTotalState = signal<number>(0);
  private readonly handoverLoadingState = signal<boolean>(false);
  private readonly handoverLoadingErrorState = signal<string | null>(null);

  private readonly stockRequestsState = signal<StockRequest[]>([]);
  private readonly stockRequestsTotalState = signal<number>(0);
  private readonly stockRequestsLoadingState = signal<boolean>(false);
  private readonly stockRequestsLoadingErrorState = signal<string | null>(null);

  readonly disputes = this.disputesState.asReadonly();
  readonly disputesTotal = this.disputesTotalState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly loadingError = this.loadingErrorState.asReadonly();

  readonly handoverRequests = this.handoverRequestsState.asReadonly();
  readonly handoverRequestsTotal = this.handoverRequestsTotalState.asReadonly();
  readonly handoverLoading = this.handoverLoadingState.asReadonly();
  readonly handoverLoadingError = this.handoverLoadingErrorState.asReadonly();

  readonly stockRequests = this.stockRequestsState.asReadonly();
  readonly stockRequestsTotal = this.stockRequestsTotalState.asReadonly();
  readonly stockRequestsLoading = this.stockRequestsLoadingState.asReadonly();
  readonly stockRequestsLoadingError = this.stockRequestsLoadingErrorState.asReadonly();

  readonly openDisputesCount = computed(
    () => this.disputesState().filter((d) => d.status === 'OPEN').length
  );

  readonly awaitingAdminHandoverCount = computed(
    () =>
      this.handoverRequestsState().filter((r) => r.handoverStatus === 'SUPPLIER_APPROVED')
        .length
  );

  readonly pendingStockRequestsCount = computed(
    () => this.stockRequestsState().filter((r) => r.status === 'PENDING').length
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

  getHandoverRequests(
    filters?: HandoverRequestFilters
  ): Observable<{ requests: HandoverRequest[]; total: number }> {
    this.handoverLoadingState.set(true);
    this.handoverLoadingErrorState.set(null);

    const params: Record<string, string | number> = {};
    if (filters?.status) params['status'] = filters.status;
    if (filters?.merchantId) params['merchantId'] = filters.merchantId;
    if (filters?.limit != null) params['limit'] = filters.limit;
    if (filters?.offset != null) params['offset'] = filters.offset;

    return this.api
      .get<HandoverRequestsListResponse | HandoverRequest[]>(
        `admin/merchants/handover-requests`,
        params
      )
      .pipe(
        map((res) => {
          if (Array.isArray(res)) {
            return { requests: res, total: res.length };
          }
          const requests = Array.isArray(res?.items)
            ? res.items
            : Array.isArray(res?.data)
              ? res.data
              : Array.isArray(res?.requests)
                ? res.requests
                : Array.isArray(res?.allocations)
                  ? res.allocations
                  : [];
          const total = typeof res?.total === 'number' ? res.total : requests.length;
          return { requests, total };
        }),
        tap(({ requests, total }) => {
          this.handoverRequestsState.set(requests);
          this.handoverRequestsTotalState.set(total);
          this.handoverLoadingState.set(false);
        }),
        catchError((err) => {
          this.handoverLoadingState.set(false);
          this.handoverLoadingErrorState.set(
            err?.message ?? 'Failed to load handover requests'
          );
          this.handoverRequestsState.set([]);
          this.handoverRequestsTotalState.set(0);
          return of({ requests: [] as HandoverRequest[], total: 0 });
        })
      );
  }

  approveHandoverRequest(allocationId: string): Observable<{ message: string }> {
    return this.api.post<{ message: string }>(
      `admin/merchants/handover-requests/${allocationId}/approve`,
      {}
    );
  }

  rejectHandoverRequest(
    allocationId: string,
    reason?: string
  ): Observable<{ message: string }> {
    return this.api.post<{ message: string }>(
      `admin/merchants/handover-requests/${allocationId}/reject`,
      reason ? { reason } : {}
    );
  }

  getStockRequests(
    filters?: StockRequestFilters
  ): Observable<{ requests: StockRequest[]; total: number }> {
    this.stockRequestsLoadingState.set(true);
    this.stockRequestsLoadingErrorState.set(null);

    const params: Record<string, string | number> = {};
    if (filters?.status) params['status'] = filters.status;
    if (filters?.merchantId) params['merchantId'] = filters.merchantId;
    if (filters?.productId) params['productId'] = filters.productId;
    if (filters?.limit != null) params['limit'] = filters.limit;
    if (filters?.offset != null) params['offset'] = filters.offset;

    return this.api
      .get<StockRequestsListResponse | StockRequest[]>(
        `admin/merchants/stock-requests`,
        params
      )
      .pipe(
        map((res) => {
          if (Array.isArray(res)) {
            return { requests: res, total: res.length };
          }
          const requests = Array.isArray(res?.requests)
            ? res.requests
            : Array.isArray(res?.items)
              ? res.items
              : Array.isArray(res?.data)
                ? res.data
                : Array.isArray(res?.allocations)
                  ? res.allocations
                  : [];
          const total = typeof res?.total === 'number' ? res.total : requests.length;
          return { requests, total };
        }),
        tap(({ requests, total }) => {
          this.stockRequestsState.set(requests);
          this.stockRequestsTotalState.set(total);
          this.stockRequestsLoadingState.set(false);
        }),
        catchError((err) => {
          this.stockRequestsLoadingState.set(false);
          this.stockRequestsLoadingErrorState.set(
            err?.message ?? 'Failed to load stock requests'
          );
          this.stockRequestsState.set([]);
          this.stockRequestsTotalState.set(0);
          return of({ requests: [] as StockRequest[], total: 0 });
        })
      );
  }

  rejectStockRequest(
    allocationId: string,
    reason?: string
  ): Observable<{ message: string }> {
    return this.api.post<{ message: string }>(
      `admin/merchants/stock-requests/${allocationId}/reject`,
      reason ? { reason } : {}
    );
  }

  isHandoverBlockingDispatch(status: HandoverStatus | null | undefined): boolean {
    if (!status || status === 'NONE') return false;
    return HANDOVER_BLOCKING_STATUSES.has(status);
  }

  getAllocationStatusLabel(status: AllocationStatus): string {
    return ALLOCATION_STATUS_LABELS[status] ?? status;
  }

  getDisputeStatusLabel(status: DisputeStatus): string {
    return DISPUTE_STATUS_LABELS[status] ?? status;
  }

  getHandoverStatusLabel(status: HandoverStatus): string {
    return HANDOVER_STATUS_LABELS[status] ?? status;
  }

  getAllocationSourceLabel(source: AllocationSource): string {
    return ALLOCATION_SOURCE_LABELS[source] ?? source;
  }
}
