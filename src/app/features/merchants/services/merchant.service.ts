import { Injectable, signal, computed, inject } from '@angular/core';
import { Observable, tap, map, catchError, of } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';

// Types matching API enums
export type MerchantStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED';
export type MerchantType = 'PICKUP_POINT' | 'DELIVERY_PARTNER' | 'REGIONAL' | 'NATIONAL' | 'GLOBAL';

// Sub-interfaces matching API response shape
export interface MerchantUser {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
}

export interface MerchantProduct {
  id: string;
  productId: string;
  productName?: string;
  isActive: boolean;
  merchantId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Merchant {
  id: string;
  userId: string;
  type: MerchantType;
  status: MerchantStatus;
  serviceAreas: string[];
  user: MerchantUser;
  products: MerchantProduct[];
  createdAt: string;
  updatedAt: string;
}

/** Query params for GET /admin/merchants */
export interface AdminMerchantFilters {
  status?: MerchantStatus;
  type?: MerchantType;
  userId?: string;
  limit?: number;
  offset?: number;
}

// API response DTOs
interface AdminMerchantsListResponse {
  merchants: Merchant[];
  total: number;
  limit: number;
  offset: number;
}

interface MerchantProductsResponse {
  products: MerchantProduct[];
}

interface MerchantRefillResponse {
  message: string;
  allocationIds?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class MerchantService {
  private readonly api = inject(ApiService);

  // State
  private readonly merchantsState = signal<Merchant[]>([]);
  private readonly selectedMerchantState = signal<Merchant | null>(null);
  private readonly listTotalState = signal<number>(0);
  private readonly loadingState = signal<boolean>(false);
  private readonly loadingErrorState = signal<string | null>(null);

  readonly merchants = this.merchantsState.asReadonly();
  readonly selectedMerchant = this.selectedMerchantState.asReadonly();
  readonly listTotal = this.listTotalState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly loadingError = this.loadingErrorState.asReadonly();

  readonly pendingCount = computed(() => 
    this.merchantsState().filter(m => m.status === 'PENDING').length
  );
  readonly activeCount = computed(() =>
    this.merchantsState().filter(m => m.status === 'ACTIVE').length
  );
  readonly suspendedCount = computed(() => 
    this.merchantsState().filter(m => m.status === 'SUSPENDED').length
  );

  // ---------- List ----------

  loadMerchants(filters?: AdminMerchantFilters): Observable<{ merchants: Merchant[]; total: number }> {
    this.loadingState.set(true);
    this.loadingErrorState.set(null);

    const params: Record<string, string | number> = {};
    if (filters?.status) params['status'] = filters.status;
    if (filters?.type) params['type'] = filters.type;
    if (filters?.userId) params['userId'] = filters.userId;
    if (filters?.limit != null) params['limit'] = filters.limit;
    if (filters?.offset != null) params['offset'] = filters.offset;

    return this.api.get<AdminMerchantsListResponse>('admin/merchants', params).pipe(
      map(res => {
        const merchants = Array.isArray(res.merchants) ? res.merchants : [];
        const total = typeof res.total === 'number' ? res.total : merchants.length;
        return { merchants, total };
      }),
      tap(({ merchants, total }) => {
        this.merchantsState.set(merchants);
        this.listTotalState.set(total);
        this.loadingState.set(false);
      }),
      catchError(err => {
        this.loadingState.set(false);
        this.loadingErrorState.set(err?.message ?? 'Failed to load merchants');
        this.merchantsState.set([]);
        this.listTotalState.set(0);
        return of({ merchants: [] as Merchant[], total: 0 });
      })
    );
  }

  // ---------- Detail ----------

  loadMerchant(id: string): Observable<Merchant | null> {
    return this.api.get<Merchant>(`admin/merchants/${id}`).pipe(
      tap(m => this.selectedMerchantState.set(m)),
      catchError(() => {
        this.selectedMerchantState.set(null);
        return of(null);
      })
    );
  }

  getMerchantById(id: string): Merchant | undefined {
    const fromList = this.merchantsState().find(m => m.id === id);
    if (fromList) {
      this.selectedMerchantState.set(fromList);
      return fromList;
    }
    const selected = this.selectedMerchantState();
    if (selected?.id === id) return selected;
    return undefined;
  }

  // ---------- Status actions ----------

  approveMerchant(id: string): Observable<{ message: string }> {
    return this.api.post<{ message: string }>(`admin/merchants/${id}/approve`, {}).pipe(
      tap(() => this.updateLocalStatus(id, 'ACTIVE'))
    );
  }

  rejectMerchant(id: string, reason: string): Observable<{ message: string }> {
    return this.api.post<{ message: string }>(`admin/merchants/${id}/reject`, { reason }).pipe(
      tap(() => this.updateLocalStatus(id, 'SUSPENDED'))
    );
  }

  suspendMerchant(id: string, reason?: string): Observable<{ message: string }> {
    return this.api.post<{ message: string }>(`admin/merchants/${id}/suspend`, reason ? { reason } : {}).pipe(
      tap(() => this.updateLocalStatus(id, 'SUSPENDED'))
    );
  }

  reactivateMerchant(id: string): Observable<{ message: string }> {
    return this.api.post<{ message: string }>(`admin/merchants/${id}/reactivate`, {}).pipe(
      tap(() => this.updateLocalStatus(id, 'ACTIVE'))
    );
  }

  refillMerchant(id: string): Observable<MerchantRefillResponse> {
    return this.api.post<MerchantRefillResponse>(`admin/merchants/${id}/refill`, {});
  }

  // ---------- Products ----------

  getMerchantProducts(merchantId: string): Observable<MerchantProduct[]> {
    return this.api.get<MerchantProductsResponse>(`admin/merchants/${merchantId}/products`).pipe(
      map(res => Array.isArray(res.products) ? res.products : [])
    );
  }

  assignProduct(merchantId: string, productId: string): Observable<{ message: string }> {
    return this.api.post<{ message: string }>(`admin/merchants/${merchantId}/products`, { productId });
  }

  removeProduct(merchantId: string, productId: string): Observable<{ message: string }> {
    return this.api.delete<{ message: string }>(`admin/merchants/${merchantId}/products/${productId}`);
  }

  // ---------- Orders ----------

  markOrderSent(merchantId: string, orderId: string): Observable<{ message: string }> {
    return this.api.post<{ message: string }>(`admin/merchants/${merchantId}/orders/${orderId}/mark-sent`, {});
  }

  confirmDelivery(merchantId: string, orderId: string, body?: { proof?: string; notes?: string }): Observable<{ message: string }> {
    return this.api.post<{ message: string }>(`admin/merchants/${merchantId}/orders/${orderId}/confirm-delivery`, body ?? {});
  }

  // ---------- Helpers ----------

  /** Get display name from merchant user object */
  getMerchantDisplayName(merchant: Merchant): string {
    if (merchant.user?.username) {
      return merchant.user.username;
    }
    if (merchant.user?.firstName || merchant.user?.lastName) {
      return `${merchant.user.firstName ?? ''} ${merchant.user.lastName ?? ''}`.trim();
    }
    return merchant.user?.email ? merchant.user.email.split('@')[0] : 'Unknown';
  }

  /** Map API status to display-friendly status for StatusBadge */
  getDisplayStatus(status: MerchantStatus): 'Pending' | 'Active' | 'Suspended' {
    const map: Record<MerchantStatus, 'Pending' | 'Active' | 'Suspended'> = {
      PENDING: 'Pending',
      ACTIVE: 'Active',
      SUSPENDED: 'Suspended'
    };
    return map[status] ?? 'Pending';
  }

  /** Map merchant type to display-friendly label */
  getDisplayType(type: MerchantType): string {
    const map: Record<MerchantType, string> = {
      PICKUP_POINT: 'Pickup Point',
      DELIVERY_PARTNER: 'Delivery Partner',
      REGIONAL: 'Regional',
      NATIONAL: 'National',
      GLOBAL: 'Global'
    };
    return map[type] ?? type;
  }

  private updateLocalStatus(id: string, status: MerchantStatus): void {
    const list = this.merchantsState().map(m =>
      m.id === id ? { ...m, status } : m
    );
    this.merchantsState.set(list);
    if (this.selectedMerchantState()?.id === id) {
      this.selectedMerchantState.set({ ...this.selectedMerchantState()!, status });
    }
  }
}
