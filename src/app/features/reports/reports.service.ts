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
}
