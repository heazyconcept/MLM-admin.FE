import { Injectable, signal, computed, inject } from '@angular/core';
import { Observable, tap, map, catchError, of } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';

// Types
export type MerchantStatus = 'Pending' | 'Approved' | 'Suspended';
export type MerchantType = 'Regional' | 'National' | 'Global';

// Interfaces
export interface StatusHistoryEntry {
  date: Date;
  status: MerchantStatus;
  reason?: string;
  changedBy?: string;
}

export interface Merchant {
  id: string;
  businessName: string;
  ownerId: string;
  ownerName: string;
  type: MerchantType;
  region: string[];
  status: MerchantStatus;
  assignedProductIds: string[];
  statusHistory: StatusHistoryEntry[];
  suspendedReason?: string;
  registrationDate: Date;
  email: string;
  phone: string;
}

export interface MerchantPerformance {
  ordersFulfilled: number;
  deliverySuccessRate: number;
  earnings: number;
  customerRating?: number;
}

/** Query params for GET /admin/merchants (AdminMerchantFiltersDto) */
export interface AdminMerchantFilters {
  status?: 'PENDING' | 'ACTIVE' | 'SUSPENDED';
  type?: 'REGIONAL' | 'NATIONAL' | 'GLOBAL';
  search?: string;
  limit?: number;
  offset?: number;
}

// --- API response DTOs (align with backend; API.md / docs-json) ---
type ApiMerchantStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED';
type ApiMerchantType = 'REGIONAL' | 'NATIONAL' | 'GLOBAL';

interface AdminMerchantApi {
  id: string;
  businessName?: string;
  name?: string;
  status: ApiMerchantStatus;
  userId?: string;
  ownerId?: string;
  type?: ApiMerchantType;
  serviceAreas?: string[];
  region?: string[];
  createdAt: string;
  email?: string;
  phone?: string;
  suspendedReason?: string;
  assignedProductIds?: string[];
  productIds?: string[];
}

interface AdminMerchantsListResponse {
  merchants: AdminMerchantApi[];
  total: number;
  limit?: number;
  offset?: number;
}

@Injectable({
  providedIn: 'root'
})
export class MerchantService {
  private readonly api = inject(ApiService);

  // Mock regions list (for Assign Regions UI until API supports it)
  private readonly regionsList = signal<string[]>([
    'North Region',
    'South Region',
    'East Region',
    'West Region',
    'Central Region',
    'Metropolitan Area',
    'Suburban Zone',
    'Rural Districts'
  ]);

  // State (updated by loadMerchants / loadMerchant)
  private readonly merchantsState = signal<Merchant[]>([]);
  private readonly selectedMerchantState = signal<Merchant | null>(null);
  private readonly listTotalState = signal<number>(0);
  private readonly loadingState = signal<boolean>(false);
  private readonly loadingErrorState = signal<string | null>(null);

  readonly merchants = this.merchantsState.asReadonly();
  readonly selectedMerchant = this.selectedMerchantState.asReadonly();
  readonly regions = this.regionsList.asReadonly();
  readonly listTotal = this.listTotalState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly loadingError = this.loadingErrorState.asReadonly();

  readonly pendingCount = computed(() =>
    this.merchantsState().filter((m: Merchant) => m.status === 'Pending').length
  );
  readonly approvedCount = computed(() =>
    this.merchantsState().filter((m: Merchant) => m.status === 'Approved').length
  );
  readonly suspendedCount = computed(() =>
    this.merchantsState().filter((m: Merchant) => m.status === 'Suspended').length
  );

  private mapApiToMerchant(api: AdminMerchantApi): Merchant {
    const statusMap: Record<ApiMerchantStatus, MerchantStatus> = {
      PENDING: 'Pending',
      ACTIVE: 'Approved',
      SUSPENDED: 'Suspended'
    };
    const typeMap: Record<ApiMerchantType, MerchantType> = {
      REGIONAL: 'Regional',
      NATIONAL: 'National',
      GLOBAL: 'Global'
    };
    const name = api.businessName ?? api.name ?? 'Merchant';
    const ownerId = api.userId ?? api.ownerId ?? '';
    const region = api.serviceAreas ?? api.region ?? [];
    const productIds = api.assignedProductIds ?? api.productIds ?? [];
    return {
      id: api.id,
      businessName: name,
      ownerId,
      ownerName: api.email?.split('@')[0] ?? ownerId,
      type: api.type ? typeMap[api.type] : 'Regional',
      region,
      status: statusMap[api.status] ?? 'Pending',
      assignedProductIds: Array.isArray(productIds) ? productIds : [],
      statusHistory: [],
      suspendedReason: api.suspendedReason,
      registrationDate: new Date(api.createdAt),
      email: api.email ?? '',
      phone: api.phone ?? ''
    };
  }

  /** Load list from API and update merchants + listTotal. */
  loadMerchants(filters?: AdminMerchantFilters): Observable<{ merchants: Merchant[]; total: number }> {
    this.loadingState.set(true);
    this.loadingErrorState.set(null);
    const params: Record<string, string | number> = {};
    if (filters?.status) params['status'] = filters.status;
    if (filters?.type) params['type'] = filters.type;
    if (filters?.search) params['search'] = filters.search;
    if (filters?.limit != null) params['limit'] = filters.limit;
    if (filters?.offset != null) params['offset'] = filters.offset;

    return this.api.get<AdminMerchantsListResponse>('admin/merchants', params).pipe(
      map(res => {
        const raw = res as unknown as { merchants?: AdminMerchantApi[]; data?: AdminMerchantApi[]; items?: AdminMerchantApi[] };
        const list = Array.isArray(raw.merchants) ? raw.merchants
          : Array.isArray(raw.data) ? raw.data
          : Array.isArray(raw.items) ? raw.items
          : Array.isArray(res) ? (res as AdminMerchantApi[]) : [];
        const total = typeof (res as AdminMerchantsListResponse).total === 'number'
          ? (res as AdminMerchantsListResponse).total : list.length;
        const merchants = list.map((m: AdminMerchantApi) => this.mapApiToMerchant(m));
        return { merchants, total };
      }),
      tap(({ merchants, total }) => {
        this.merchantsState.set(merchants);
        this.listTotalState.set(total);
        this.loadingState.set(false);
        this.loadingErrorState.set(null);
      }),
      catchError(err => {
        this.loadingState.set(false);
        this.loadingErrorState.set(err?.message ?? 'Failed to load merchants');
        this.merchantsState.set([]);
        this.listTotalState.set(0);
        return of({ merchants: [], total: 0 });
      })
    );
  }

  /** Load single merchant from API and set selectedMerchant. */
  loadMerchant(id: string): Observable<Merchant | null> {
    return this.api.get<AdminMerchantApi>(`admin/merchants/${id}`).pipe(
      map(api => this.mapApiToMerchant(api)),
      tap(m => this.selectedMerchantState.set(m)),
      catchError(() => {
        this.selectedMerchantState.set(null);
        return of(null);
      })
    );
  }

  /** Sync get from current state (e.g. after navigation). */
  getMerchantById(id: string): Merchant | undefined {
    const fromList = this.merchantsState().find((m: Merchant) => m.id === id);
    if (fromList) {
      this.selectedMerchantState.set(fromList);
      return fromList;
    }
    const selected = this.selectedMerchantState();
    if (selected?.id === id) return selected;
    return undefined;
  }

  approveMerchant(id: string): Observable<void> {
    return this.api.post<void>(`admin/merchants/${id}/approve`, {}).pipe(
      tap(() => {
        const list = this.merchantsState().map(m => m.id === id ? { ...m, status: 'Approved' as MerchantStatus } : m);
        this.merchantsState.set(list);
        if (this.selectedMerchantState()?.id === id) {
          this.selectedMerchantState.set({ ...this.selectedMerchantState()!, status: 'Approved' });
        }
      })
    );
  }

  rejectMerchant(id: string, reason?: string): Observable<void> {
    return this.api.post<void>(`admin/merchants/${id}/reject`, reason != null ? { reason } : {});
  }

  suspendMerchant(id: string, reason: string): Observable<void> {
    return this.api.post<void>(`admin/merchants/${id}/suspend`, { reason }).pipe(
      tap(() => {
        const list = this.merchantsState().map(m =>
          m.id === id ? { ...m, status: 'Suspended' as MerchantStatus, suspendedReason: reason } : m
        );
        this.merchantsState.set(list);
        if (this.selectedMerchantState()?.id === id) {
          this.selectedMerchantState.set({
            ...this.selectedMerchantState()!,
            status: 'Suspended',
            suspendedReason: reason
          });
        }
      })
    );
  }

  reactivateMerchant(id: string): Observable<void> {
    return this.api.post<void>(`admin/merchants/${id}/reactivate`, {}).pipe(
      tap(() => {
        const list = this.merchantsState().map(m =>
          m.id === id ? { ...m, status: 'Approved' as MerchantStatus, suspendedReason: undefined } : m
        );
        this.merchantsState.set(list);
        if (this.selectedMerchantState()?.id === id) {
          this.selectedMerchantState.set({
            ...this.selectedMerchantState()!,
            status: 'Approved',
            suspendedReason: undefined
          });
        }
      })
    );
  }

  getMerchantProducts(merchantId: string): Observable<string[]> {
    return this.api.get<{ productIds?: string[]; products?: { id: string }[] }>(`admin/merchants/${merchantId}/products`).pipe(
      map(res => {
        if (Array.isArray(res.productIds)) return res.productIds;
        if (Array.isArray(res.products)) return res.products.map(p => p.id);
        return [];
      })
    );
  }

  assignProduct(merchantId: string, productId: string): Observable<void> {
    return this.api.post<void>(`admin/merchants/${merchantId}/products`, { productId }).pipe(
      tap(() => {
        const m = this.selectedMerchantState();
        if (m?.id === merchantId && !m.assignedProductIds.includes(productId)) {
          this.selectedMerchantState.set({
            ...m,
            assignedProductIds: [...m.assignedProductIds, productId]
          });
        }
        const list = this.merchantsState().map(merchant =>
          merchant.id === merchantId && !merchant.assignedProductIds.includes(productId)
            ? { ...merchant, assignedProductIds: [...merchant.assignedProductIds, productId] }
            : merchant
        );
        this.merchantsState.set(list);
      })
    );
  }

  removeProduct(merchantId: string, productId: string): Observable<void> {
    return this.api.delete<void>(`admin/merchants/${merchantId}/products/${productId}`).pipe(
      tap(() => {
        const m = this.selectedMerchantState();
        if (m?.id === merchantId) {
          this.selectedMerchantState.set({
            ...m,
            assignedProductIds: m.assignedProductIds.filter(id => id !== productId)
          });
        }
        this.merchantsState.set(this.merchantsState().map(merchant =>
          merchant.id === merchantId
            ? { ...merchant, assignedProductIds: merchant.assignedProductIds.filter(id => id !== productId) }
            : merchant
        ));
      })
    );
  }

  confirmDelivery(merchantId: string, orderId: string, body?: { proof?: string; notes?: string }): Observable<void> {
    return this.api.post<void>(`admin/merchants/${merchantId}/orders/${orderId}/confirm-delivery`, body ?? {});
  }

  updateMerchantType(id: string, type: MerchantType): boolean {
    const merchants = this.merchantsState();
    const merchantIndex = merchants.findIndex((m: Merchant) => m.id === id);
    
    if (merchantIndex === -1) return false;
    
    const updatedMerchants = [...merchants];
    const merchant = { ...updatedMerchants[merchantIndex] };
    const oldType = merchant.type;
    
    merchant.type = type;
    merchant.statusHistory = [
      ...merchant.statusHistory,
      {
        date: new Date(),
        status: merchant.status,
        reason: `Type changed from ${oldType} to ${type}`,
        changedBy: 'Admin'
      }
    ];
    
    updatedMerchants[merchantIndex] = merchant;
    this.merchantsState.set(updatedMerchants);
    
    if (this.selectedMerchantState()?.id === id) {
      this.selectedMerchantState.set(merchant);
    }
    
    return true;
  }

  assignRegions(id: string, regions: string[]): boolean {
    const merchants = this.merchantsState();
    const merchantIndex = merchants.findIndex((m: Merchant) => m.id === id);
    
    if (merchantIndex === -1) return false;
    
    const updatedMerchants = [...merchants];
    const merchant = { ...updatedMerchants[merchantIndex] };
    
    merchant.region = regions;
    merchant.statusHistory = [
      ...merchant.statusHistory,
      {
        date: new Date(),
        status: merchant.status,
        reason: `Regions updated to: ${regions.join(', ')}`,
        changedBy: 'Admin'
      }
    ];
    
    updatedMerchants[merchantIndex] = merchant;
    this.merchantsState.set(updatedMerchants);
    
    if (this.selectedMerchantState()?.id === id) {
      this.selectedMerchantState.set(merchant);
    }
    
    return true;
  }

  getPerformance(id: string): MerchantPerformance {
    // TODO: replace with GET from merchant performance/earnings API when available
    return {
      ordersFulfilled: 0,
      deliverySuccessRate: 0,
      earnings: 0
    };
  }
}
