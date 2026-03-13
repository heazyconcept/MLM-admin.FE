import { Injectable, signal, inject } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { Observable, throwError } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

/** Package config as returned by GET /admin/packages or sent to PUT /admin/packages/:package */
export interface AdminPackageConfig {
  package: string;
  priceNGN: number;
  priceUSD: number;
  earningsPercentage: number;
  cashoutPercentage: number;
  registrationPV: number;
  registrationCPV: number;
  isActive: boolean;
  updatedAt: string;
  [key: string]: unknown;
}

// Fields that backend allows updating for a package
export type AdminPackageUpdatePayload = Pick<
  AdminPackageConfig,
  'priceNGN' | 'priceUSD' | 'earningsPercentage' | 'cashoutPercentage' | 'registrationPV' | 'registrationCPV'
>;

interface AdminPackagesResponse {
  packages: AdminPackageConfig[];
}

@Injectable({
  providedIn: 'root'
})
export class AdminPackagesService {
  private readonly api = inject(ApiService);

  packages = signal<AdminPackageConfig[]>([]);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  loadPackages(): Observable<AdminPackageConfig[]> {
    this.loading.set(true);
    this.error.set(null);
    return this.api.get<AdminPackagesResponse>('admin/packages').pipe(
      map((res) => res?.packages ?? []),
      tap((items) => {
        this.packages.set(items);
        this.loading.set(false);
      }),
      catchError((err) => {
        this.error.set(err?.message ?? 'Failed to load packages');
        this.loading.set(false);
        this.packages.set([]);
        return of([]);
      })
    );
  }

  updatePackage(packageId: string, payload: Partial<AdminPackageUpdatePayload>): Observable<AdminPackageConfig> {
    this.error.set(null);

    return this.api.put<AdminPackageConfig>(`admin/packages/${encodeURIComponent(packageId)}`, payload).pipe(
      tap((updated) => {
        const current = this.packages();
        const idx = current.findIndex(
          (p) => p.package.toUpperCase() === packageId.toUpperCase()
        );
        if (idx >= 0) {
          this.packages.set([
            ...current.slice(0, idx),
            { ...current[idx], ...updated },
            ...current.slice(idx + 1)
          ]);
        } else {
          this.packages.set([...current, updated]);
        }
      }),
      catchError((err) => {
        this.error.set(err?.error?.message ?? err?.message ?? 'Failed to update package');
        return throwError(() => err);
      })
    );
  }
}
