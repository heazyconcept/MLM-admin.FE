import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service';

/** GET /admin/dashboard/summary — see admin-api-gaps.md §8 */
export interface RevenueTrendPoint {
  date: string;
  amount: number;
}

export interface AdminDashboardSummary {
  userCount: number;
  merchantCount: number;
  pendingWithdrawalsCount: number;
  initiatedPaymentsCount: number;
  pendingIdentityCount: number;
  pendingManualRegistrationPaymentsCount?: number;
  packageDistribution: Record<string, number>;
  revenueTrend: RevenueTrendPoint[];
  wallets: Record<string, number>;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly api = inject(ApiService);

  getSummary(): Observable<AdminDashboardSummary | null> {
    return this.api.get<AdminDashboardSummary>('admin/dashboard/summary').pipe(
      catchError(() => of(null))
    );
  }
}
