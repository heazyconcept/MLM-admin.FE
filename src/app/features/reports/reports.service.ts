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
  | 'AUTOSHIP'
  | 'ADMIN_FEE';

export type ProfitSourceEntity = 'ledger' | 'payment' | 'order' | 'admin_fee';

/** Backend margin rates — for labels/tooltips only; display API profit values */
export const PROFIT_MARGIN_LABELS: Record<ProfitCategory, string> = {
  REGISTRATION: '10%',
  UPGRADE: '10%',
  PRODUCT_PURCHASE: '20%',
  AUTOSHIP: '10%',
  ADMIN_FEE: '50%',
};

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
  totalRevenueUsd?: number;
  totalProfitUsd?: number;
  totalAdminFeesUsd?: number;
  totalAutoshipChargesUsd?: number;
  totalRevenue?: number;
  totalProfit?: number;
  totalAdminFees?: number;
  totalAutoshipCharges?: number;
  byCategory: Record<ProfitCategory, ProfitSummaryCategory>;
  adminFeesByType?: { REGISTRATION: number; AUTOSHIP: number };
  trend: ProfitTrendBucket[];
}

export interface ProfitTransactionRow {
  id: string;
  category: ProfitCategory;
  occurredAt: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  amount?: number;
  amountUsd?: number;
  displayAmount?: number;
  displayCurrency?: string;
  profit?: number;
  profitUsd?: number;
  reference?: string;
  sourceEntity?: ProfitSourceEntity;
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

export type CpvSource =
  | 'REGISTRATION_PERSONAL_PV'
  | 'DIRECT_REFERRAL_REGISTRATION'
  | 'COMMUNITY_REGISTRATION_MATRIX'
  | 'PRODUCT_PURCHASE_PV'
  | 'DIRECT_REFERRAL_PRODUCT_PV'
  | 'COMMUNITY_PRODUCT_MATRIX'
  | 'ADMIN_CPV_ADJUSTMENT';

export interface CpvTrendBucket {
  date: string;
  cpvGenerated: number;
}

export interface CpvSummaryResponse {
  from?: string;
  to?: string;
  username?: string | null;
  minTotalCpv?: number | null;
  maxTotalCpv?: number | null;
  totalCpvGenerated: number;
  transactionCount: number;
  byCpvSource: Record<string, number>;
  trend: CpvTrendBucket[];
}

export interface CpvUserRow {
  userId: string;
  username: string;
  email: string;
  totalCpvGenerated: number;
  transactionCount: number;
  topSource?: CpvSource | string;
  byCpvSource?: Record<string, number>;
}

export interface CpvUsersResponse {
  items: CpvUserRow[];
  total: number;
  limit: number;
  offset: number;
}

export interface CpvTransactionRow {
  id: string;
  occurredAt: string;
  recipientUserId: string;
  recipientUsername: string;
  recipientEmail: string;
  cpvSource: CpvSource | string;
  amount: number;
  sourceUserId?: string | null;
  sourceUsername?: string | null;
  reference?: string | null;
  category?: string;
}

export interface CpvTransactionsResponse {
  items: CpvTransactionRow[];
  total: number;
  limit: number;
  offset: number;
}

export interface CpvSummaryParams {
  from?: string;
  to?: string;
  username?: string;
  minTotalCpv?: number;
  maxTotalCpv?: number;
}

export interface CpvUsersParams extends CpvSummaryParams {
  limit?: number;
  offset?: number;
}

export interface CpvTransactionsParams {
  from?: string;
  to?: string;
  username?: string;
  amount?: number;
  minAmount?: number;
  maxAmount?: number;
  cpvSource?: string;
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

  getCpvSummary(params?: CpvSummaryParams): Observable<CpvSummaryResponse | null> {
    return this.api
      .get<CpvSummaryResponse>('admin/reports/cpv/summary', params as Record<string, unknown>)
      .pipe(catchError(() => of(null)));
  }

  getCpvUsers(params?: CpvUsersParams): Observable<CpvUsersResponse | null> {
    return this.api
      .get<CpvUsersResponse>('admin/reports/cpv/users', params as Record<string, unknown>)
      .pipe(catchError(() => of(null)));
  }

  getCpvTransactions(params?: CpvTransactionsParams): Observable<CpvTransactionsResponse | null> {
    return this.api
      .get<CpvTransactionsResponse>('admin/reports/cpv/transactions', params as Record<string, unknown>)
      .pipe(catchError(() => of(null)));
  }
}
