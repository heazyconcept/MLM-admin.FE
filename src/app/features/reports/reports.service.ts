import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service';

/** GET /admin/reports/admin-fees */
export interface AdminFeeReportRow {
  type: string;
  total: number;
  count: number;
}

/** GET /admin/reports/autoship */
export interface AutoshipSummaryRow {
  monthIdentifier: string;
  userCount: number;
  totalAmountUsd: number;
}

export interface AutoshipDetailRow {
  userId: string;
  monthIdentifier: string;
  amountUsd: number;
  processedAt?: string;
}

export interface AutoshipReportResponse {
  summary: AutoshipSummaryRow[];
  rows: AutoshipDetailRow[];
}

export type ProfitCategory =
  | 'REGISTRATION'
  | 'UPGRADE'
  | 'PRODUCT_PURCHASE'
  | 'AUTOSHIP';

export interface ProfitSummaryCategory {
  revenueUsd?: number;
  profitUsd?: number;
  revenue?: number;
  profit?: number;
  transactionCount: number;
}

export interface ProfitTrendBucket {
  date: string;
  revenueUsd?: number;
  profitUsd?: number;
  revenue?: number;
  profit?: number;
}

export interface ProfitSummaryResponse {
  from?: string;
  currency?: string;
  to?: string;
  totalRevenueUsd: number;
  totalProfitUsd: number;
  totalAdminFeesUsd: number;
  totalAutoshipChargesUsd: number;
  totalRevenue?: number;
  totalProfit?: number;
  totalAdminFees?: number;
  totalAutoshipCharges?: number;
  byCategory: Record<ProfitCategory, ProfitSummaryCategory>;
  adminFeesByType?: Record<string, number>;
  trend: ProfitTrendBucket[];
}

export interface ProfitTransactionRow {
  id: string;
  category: ProfitCategory;
  occurredAt: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  amountUsd: number;
  displayAmount?: number;
  displayCurrency?: string;
  profitUsd: number;
  reference?: string;
  sourceEntity?: string;
  metadata?: Record<string, unknown>;
}

export interface ProfitTransactionsResponse {
  items: ProfitTransactionRow[];
  total: number;
  limit: number;
  offset: number;
}

export type EarningsPayoutCategory =
  | 'ACTIVATION'
  | 'UPGRADE'
  | 'PRODUCT_PURCHASE'
  | 'PDPA'
  | 'CDPA'
  | 'BONUSES'
  | 'ADMIN_ADJUSTMENT';

export type EarningsPayoutUnit = 'CASH' | 'CPV';

export interface EarningsSummaryCategory {
  cashPaid: number;
  cpvPaid: number;
  transactionCount: number;
}

export interface EarningsTrendBucket {
  date: string;
  cashPaid: number;
  cpvPaid: number;
}

export interface EarningsSummaryResponse {
  currency?: string;
  from?: string;
  to?: string;
  totalCashPaid: number;
  totalCpvPaid: number;
  cashPayoutCount: number;
  cpvPayoutCount: number;
  byCategory: Record<EarningsPayoutCategory, EarningsSummaryCategory>;
  byEarningType?: Record<string, number>;
  byCpvSource?: Record<string, number>;
  trend: EarningsTrendBucket[];
}

export interface EarningsTransactionRow {
  id: string;
  unit: EarningsPayoutUnit;
  category: EarningsPayoutCategory;
  occurredAt: string;
  recipientUserId?: string;
  recipientEmail?: string;
  recipientName?: string;
  sourceUserId?: string | null;
  amount: number;
  currency?: string;
  status?: string;
  reference?: string;
  earningType?: string;
  cpvSource?: string;
}

export interface EarningsTransactionsResponse {
  items: EarningsTransactionRow[];
  total: number;
  limit?: number;
  offset?: number;
}

@Injectable({
  providedIn: 'root',
})
export class ReportsService {
  private readonly api = inject(ApiService);

  getAdminFees(params?: { from?: string; to?: string }): Observable<AdminFeeReportRow[] | null> {
    return this.api.get<AdminFeeReportRow[]>('admin/reports/admin-fees', params).pipe(
      catchError(() => of(null))
    );
  }

  getAutoship(params?: {
    month?: string;
    monthFrom?: string;
    monthTo?: string;
    limit?: number;
    offset?: number;
  }): Observable<AutoshipReportResponse | null> {
    return this.api.get<AutoshipReportResponse>('admin/reports/autoship', params).pipe(
      catchError(() => of(null))
    );
  }

  getProfitSummary(params?: { from?: string; to?: string }): Observable<ProfitSummaryResponse | null> {
    return this.api.get<ProfitSummaryResponse>('admin/reports/profit/summary', params).pipe(
      catchError(() => of(null))
    );
  }

  getProfitTransactions(params?: {
    from?: string;
    to?: string;
    category?: ProfitCategory;
    limit?: number;
    offset?: number;
  }): Observable<ProfitTransactionsResponse | null> {
    return this.api.get<ProfitTransactionsResponse>('admin/reports/profit/transactions', params).pipe(
      catchError(() => of(null))
    );
  }

  getEarningsSummary(params?: { from?: string; to?: string }): Observable<EarningsSummaryResponse | null> {
    return this.api.get<EarningsSummaryResponse>('admin/reports/earnings/summary', params).pipe(
      catchError(() => of(null))
    );
  }

  getEarningsTransactions(params?: {
    from?: string;
    to?: string;
    category?: EarningsPayoutCategory;
    unit?: EarningsPayoutUnit;
    limit?: number;
    offset?: number;
  }): Observable<EarningsTransactionsResponse | null> {
    return this.api.get<EarningsTransactionsResponse>('admin/reports/earnings/transactions', params).pipe(
      catchError(() => of(null))
    );
  }
}
