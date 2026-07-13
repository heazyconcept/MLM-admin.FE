import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';

export interface MerchantStockTotals {
  totalAllocated: number;
  totalFulfilled: number;
  currentBalance: number;
  productCount: number;
}

export interface MerchantStockBalanceRow {
  merchantId: string;
  merchantUsername: string;
  merchantType: string;
  totals: MerchantStockTotals;
}

export interface MerchantStockCategoryBreakdown {
  categoryId: string;
  categoryName: string;
  productCount: number;
  totalAllocated: number;
  totalFulfilled: number;
  currentBalance: number;
}

export interface MerchantStockProductItem {
  productId: string;
  productName?: string;
  sku?: string;
  categoryId?: string;
  categoryName?: string;
  totalAllocated: number;
  totalFulfilled: number;
  currentBalance: number;
  authorizedQuantity: number;
  stockQuantity: number;
}

export interface MerchantStockBalanceDetail extends MerchantStockBalanceRow {
  byCategory: MerchantStockCategoryBreakdown[];
  items: MerchantStockProductItem[];
}

export interface MerchantStockBalanceListFilters {
  status?: string;
  merchantType?: string;
  limit?: number;
  offset?: number;
}

interface MerchantStockBalanceListResponse {
  merchants: MerchantStockBalanceRow[];
  total: number;
  limit?: number;
  offset?: number;
}

@Injectable({
  providedIn: 'root',
})
export class MerchantStockBalanceService {
  private readonly api = inject(ApiService);

  getStockBalanceList(
    filters?: MerchantStockBalanceListFilters
  ): Observable<{ merchants: MerchantStockBalanceRow[]; total: number } | null> {
    const params: Record<string, string | number> = {};
    if (filters?.status) params['status'] = filters.status;
    if (filters?.merchantType) params['merchantType'] = filters.merchantType;
    if (filters?.limit != null) params['limit'] = filters.limit;
    if (filters?.offset != null) params['offset'] = filters.offset;

    return this.api
      .get<MerchantStockBalanceListResponse>('admin/merchants/stock-balance', params)
      .pipe(
        map((res) => {
          const merchants = Array.isArray(res?.merchants) ? res.merchants : [];
          const total = typeof res?.total === 'number' ? res.total : merchants.length;
          return { merchants, total };
        }),
        catchError(() => of(null))
      );
  }

  getMerchantStockBalance(merchantId: string): Observable<MerchantStockBalanceDetail | null> {
    return this.api
      .get<MerchantStockBalanceDetail>(
        `admin/merchants/${encodeURIComponent(merchantId)}/stock-balance`
      )
      .pipe(
        map((res) => {
          if (!res?.merchantId) return null;
          return {
            ...res,
            byCategory: Array.isArray(res.byCategory) ? res.byCategory : [],
            items: Array.isArray(res.items) ? res.items : [],
          };
        }),
        catchError(() => of(null))
      );
  }
}
