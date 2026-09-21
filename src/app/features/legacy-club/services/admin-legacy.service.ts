import { Injectable, inject, signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import {
  AdminLegacyEnrollRequest,
  AdminLegacyEnrollResponse,
  AdminLegacyMemberDetail,
  AdminLegacyMemberListItem,
  AdminLegacyMembersListResponse,
  AdminLegacyMembersQuery,
  AdminLegacyPackage,
  AdminLegacyPackageUpdatePayload,
  AdminLegacyPackagesResponse,
  LegacyPackageCode,
} from '../models/admin-legacy.models';

function unwrapData<T>(raw: unknown): T {
  if (raw && typeof raw === 'object' && 'data' in (raw as object)) {
    return (raw as { data: T }).data;
  }
  return raw as T;
}

function extractErrorMessage(err: unknown): string {
  const http = err as {
    error?: { message?: string | string[]; code?: string };
    message?: string;
  };
  const msg = http?.error?.message;
  if (Array.isArray(msg)) return msg.join(', ');
  if (typeof msg === 'string' && msg.trim()) return msg;
  return http?.message ?? 'Request failed';
}

@Injectable({ providedIn: 'root' })
export class AdminLegacyService {
  private readonly api = inject(ApiService);

  packages = signal<AdminLegacyPackage[]>([]);
  fxRateNgnPerUsd = signal(1000);
  packagesLoading = signal(false);
  packagesError = signal<string | null>(null);

  members = signal<AdminLegacyMemberListItem[]>([]);
  membersTotal = signal(0);
  membersLoading = signal(false);
  membersError = signal<string | null>(null);

  memberDetail = signal<AdminLegacyMemberDetail | null>(null);
  detailLoading = signal(false);
  detailError = signal<string | null>(null);

  loadPackages(): Observable<AdminLegacyPackage[]> {
    this.packagesLoading.set(true);
    this.packagesError.set(null);
    return this.api.get<unknown>('admin/legacy/packages').pipe(
      map((raw) => {
        const data = unwrapData<AdminLegacyPackagesResponse | AdminLegacyPackage[]>(raw);
        if (Array.isArray(data)) {
          return { fxRateNgnPerUsd: 1000, packages: data };
        }
        return {
          fxRateNgnPerUsd: data?.fxRateNgnPerUsd ?? 1000,
          packages: data?.packages ?? [],
        };
      }),
      tap((res) => {
        this.fxRateNgnPerUsd.set(res.fxRateNgnPerUsd);
        this.packages.set(res.packages);
        this.packagesLoading.set(false);
      }),
      map((res) => res.packages),
      catchError((err) => {
        this.packagesError.set(extractErrorMessage(err));
        this.packagesLoading.set(false);
        this.packages.set([]);
        return of([]);
      })
    );
  }

  updatePackage(
    code: LegacyPackageCode,
    payload: Partial<AdminLegacyPackageUpdatePayload>
  ): Observable<AdminLegacyPackage> {
    this.packagesError.set(null);
    return this.api
      .put<unknown>(`admin/legacy/packages/${encodeURIComponent(code)}`, payload)
      .pipe(
        map((raw) => {
          const data = unwrapData<AdminLegacyPackage | AdminLegacyPackagesResponse>(raw);
          if (data && typeof data === 'object' && 'packages' in data) {
            const found = (data as AdminLegacyPackagesResponse).packages?.find(
              (p) => p.code === code
            );
            if (found) return found;
          }
          return data as AdminLegacyPackage;
        }),
        tap((updated) => {
          const current = this.packages();
          const idx = current.findIndex((p) => p.code === code);
          if (idx >= 0) {
            this.packages.set([
              ...current.slice(0, idx),
              { ...current[idx], ...updated },
              ...current.slice(idx + 1),
            ]);
          } else {
            this.packages.set([...current, updated]);
          }
        }),
        catchError((err) => {
          // Fallback: bulk PUT if per-package endpoint is not available
          if ((err as { status?: number })?.status === 404) {
            return this.bulkUpdatePackage(code, payload);
          }
          this.packagesError.set(extractErrorMessage(err));
          return throwError(() => err);
        })
      );
  }

  private bulkUpdatePackage(
    code: LegacyPackageCode,
    payload: Partial<AdminLegacyPackageUpdatePayload>
  ): Observable<AdminLegacyPackage> {
    const current = this.packages().find((p) => p.code === code);
    const merged: AdminLegacyPackage = {
      code,
      isActive: payload.isActive ?? current?.isActive ?? true,
      purchaseAmount: payload.purchaseAmount ?? current?.purchaseAmount ?? 0,
      instantCommission: payload.instantCommission ?? current?.instantCommission ?? 0,
      monthlyCommissionBase:
        payload.monthlyCommissionBase ?? current?.monthlyCommissionBase ?? null,
      monthlyCommissionIncreased:
        payload.monthlyCommissionIncreased ??
        current?.monthlyCommissionIncreased ??
        null,
      successlineBonusPercent:
        payload.successlineBonusPercent ?? current?.successlineBonusPercent ?? 0,
      autoshipAmount: payload.autoshipAmount ?? current?.autoshipAmount ?? 0,
      cycleMonths: payload.cycleMonths ?? current?.cycleMonths ?? 6,
      minDirectsToIncreaseMonthly:
        payload.minDirectsToIncreaseMonthly ??
        current?.minDirectsToIncreaseMonthly ??
        3,
    };

    return this.api
      .put<unknown>('admin/legacy/packages', { packages: [merged] })
      .pipe(
        map((raw) => {
          const data = unwrapData<AdminLegacyPackagesResponse | AdminLegacyPackage[]>(raw);
          const list = Array.isArray(data) ? data : (data?.packages ?? [merged]);
          return list.find((p) => p.code === code) ?? merged;
        }),
        tap((updated) => {
          const list = this.packages();
          const idx = list.findIndex((p) => p.code === code);
          if (idx >= 0) {
            this.packages.set([
              ...list.slice(0, idx),
              { ...list[idx], ...updated },
              ...list.slice(idx + 1),
            ]);
          }
        }),
        catchError((err) => {
          this.packagesError.set(extractErrorMessage(err));
          return throwError(() => err);
        })
      );
  }

  loadMembers(query: AdminLegacyMembersQuery = {}): Observable<AdminLegacyMemberListItem[]> {
    this.membersLoading.set(true);
    this.membersError.set(null);

    const params: Record<string, unknown> = {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    };
    if (query.search?.trim()) params['search'] = query.search.trim();
    if (query.package) params['package'] = query.package;
    if (query.sponsorSource) params['sponsorSource'] = query.sponsorSource;

    return this.api.get<unknown>('admin/legacy/members', params).pipe(
      map((raw) => {
        const data = unwrapData<AdminLegacyMembersListResponse | AdminLegacyMemberListItem[]>(raw);
        if (Array.isArray(data)) {
          return { members: data, total: data.length };
        }
        const total =
          data.total ??
          data.pagination?.totalRecords ??
          data.members?.length ??
          0;
        return { members: data.members ?? [], total };
      }),
      tap((res) => {
        this.members.set(res.members);
        this.membersTotal.set(res.total);
        this.membersLoading.set(false);
      }),
      map((res) => res.members),
      catchError((err) => {
        this.membersError.set(extractErrorMessage(err));
        this.membersLoading.set(false);
        this.members.set([]);
        this.membersTotal.set(0);
        return of([]);
      })
    );
  }

  loadMemberDetail(userId: string): Observable<AdminLegacyMemberDetail | null> {
    this.detailLoading.set(true);
    this.detailError.set(null);
    this.memberDetail.set(null);

    return this.api
      .get<unknown>(`admin/legacy/members/${encodeURIComponent(userId)}`)
      .pipe(
        map((raw) => unwrapData<AdminLegacyMemberDetail>(raw)),
        tap((detail) => {
          this.memberDetail.set(detail);
          this.detailLoading.set(false);
        }),
        catchError((err) => {
          this.detailError.set(extractErrorMessage(err));
          this.detailLoading.set(false);
          this.memberDetail.set(null);
          return of(null);
        })
      );
  }

  enroll(body: AdminLegacyEnrollRequest): Observable<AdminLegacyEnrollResponse> {
    return this.api.post<unknown>('admin/legacy/enroll', body).pipe(
      map((raw) => unwrapData<AdminLegacyEnrollResponse>(raw)),
      catchError((err) => throwError(() => err))
    );
  }
}
