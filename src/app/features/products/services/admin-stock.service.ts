import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';

export interface AdminStockProductRow {
  productId: string;
  productName: string;
  sku: string | null;
  onHandTotal: number;
  deliveredToMerchants: number;
  totalOrdered: number;
  deliveredToUsers: number;
  merchantStockRemaining: number;
  warehouseRemaining: number;
}

export interface AdminStockListResponse {
  items: AdminStockProductRow[];
  total: number;
  limit: number;
  offset: number;
}

export interface AdminStockDetailResponse extends AdminStockProductRow {
  categoryId: string;
  categoryName: string | null;
}

export type StockMovementType =
  | 'ALLOCATION_ACCEPT'
  | 'ALLOCATION_DISPATCH'
  | 'ALLOCATION_RECEIPT'
  | 'ORDER_PICKUP'
  | 'ORDER_PICKUP_RELEASE'
  | 'ORDER_STOCK_RESTORE'
  | 'ORDER_MERCHANT_ASSIGN'
  | 'ADMIN_HOME_DELIVERY_APPROVE'
  | 'MANUAL_POOL_SET'
  | 'MANUAL_MERCHANT_ADJUST';

export type StockLocation = 'WAREHOUSE' | 'MERCHANT' | 'CUSTOMER';
export type StockActorType = 'ADMIN' | 'USER' | 'SYSTEM';

export interface StockMovementMetadata {
  merchantId?: string | null;
  merchantName?: string | null;
  businessName?: string | null;
  orderId?: string | null;
  orderName?: string | null;
  actorId?: string | null;
  actorName?: string | null;
}

export interface AdminStockMovementRow {
  id: string;
  productId: string;
  quantity: number;
  type: StockMovementType | string;
  fromLocation: StockLocation;
  toLocation: StockLocation;
  merchantId?: string | null;
  merchantName?: string | null;
  businessName?: string | null;
  orderId?: string | null;
  orderName?: string | null;
  allocationId?: string | null;
  actorType: StockActorType;
  actorId?: string | null;
  actorName?: string | null;
  metadata?: StockMovementMetadata | null;
  createdAt: string;
}

export interface AdminStockMovementsResponse {
  items: AdminStockMovementRow[];
  total: number;
  limit: number;
  offset: number;
}

@Injectable({
  providedIn: 'root',
})
export class AdminStockService {
  private readonly api = inject(ApiService);

  getStockList(params?: {
    categoryId?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Observable<AdminStockListResponse | null> {
    return this.api.get<AdminStockListResponse>('admin/stock', params).pipe(
      catchError(() => of(null))
    );
  }

  getStockDetail(productId: string): Observable<AdminStockDetailResponse | null> {
    return this.api.get<AdminStockDetailResponse>(`admin/stock/${encodeURIComponent(productId)}`).pipe(
      catchError(() => of(null))
    );
  }

  getStockMovements(productId: string, params?: {
    type?: StockMovementType;
    limit?: number;
    offset?: number;
  }): Observable<AdminStockMovementsResponse | null> {
    return this.api.get<AdminStockMovementsResponse>(
      `admin/stock/${encodeURIComponent(productId)}/movements`,
      params
    ).pipe(
      catchError(() => of(null))
    );
  }
}
