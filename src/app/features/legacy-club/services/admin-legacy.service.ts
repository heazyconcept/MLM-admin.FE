import { Injectable, inject, signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
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
  AdminLegacyPayment,
  AdminLegacyPaymentsListResponse,
  AdminLegacyPaymentsQuery,
  AdminLegacyUpgradeDifference,
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
  upgradeDifferences = signal<AdminLegacyUpgradeDifference[]>([]);
  packagesLoading = signal(false);
  packagesError = signal<string | null>(null);

  members = signal<AdminLegacyMemberListItem[]>([]);
  membersTotal = signal(0);
  membersLoading = signal(false);
  membersError = signal<string | null>(null);

  memberDetail = signal<AdminLegacyMemberDetail | null>(null);
  detailLoading = signal(false);
  detailError = signal<string | null>(null);

  payments = signal<AdminLegacyPayment[]>([]);
  paymentsTotal = signal(0);
  paymentsLoading = signal(false);
  paymentsError = signal<string | null>(null);
  paymentDetail = signal<AdminLegacyPayment | null>(null);
  paymentDetailLoading = signal(false);
  paymentDetailError = signal<string | null>(null);

  loadPackages(): Observable<AdminLegacyPackage[]> {
    this.packagesLoading.set(true);
    this.packagesError.set(null);
    return this.api.get<unknown>('admin/legacy/packages').pipe(
      map((raw) => {
        const data = unwrapData<AdminLegacyPackagesResponse | AdminLegacyPackage[]>(raw);
        if (Array.isArray(data)) {
          return { packages: data, upgradeDifferences: [] as AdminLegacyUpgradeDifference[] };
        }
        return {
          packages: data?.packages ?? [],
          upgradeDifferences: data?.upgradeDifferences ?? [],
        };
      }),
      tap((res) => {
        this.packages.set(res.packages);
        this.upgradeDifferences.set(res.upgradeDifferences);
        this.packagesLoading.set(false);
      }),
      map((res) => res.packages),
      catchError((err) => {
        this.packagesError.set(extractErrorMessage(err));
        this.packagesLoading.set(false);
        this.packages.set([]);
        this.upgradeDifferences.set([]);
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
        switchMap((raw) => {
          const data = unwrapData<AdminLegacyPackage | AdminLegacyPackagesResponse>(raw);
          if (data && typeof data === 'object' && 'packages' in data) {
            const res = data as AdminLegacyPackagesResponse;
            this.packages.set(res.packages ?? []);
            this.upgradeDifferences.set(res.upgradeDifferences ?? []);
            const found = res.packages?.find((p) => p.package === code);
            if (found) return of(found);
          }
          if (data && typeof data === 'object' && 'package' in data) {
            return this.loadPackages().pipe(
              map((pkgs) => pkgs.find((p) => p.package === code) ?? (data as AdminLegacyPackage))
            );
          }
          return this.loadPackages().pipe(
            map((pkgs) => {
              const found = pkgs.find((p) => p.package === code);
              if (!found) throw new Error('Package not found after update');
              return found;
            })
          );
        }),
        catchError((err) => {
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
    const current = this.packages().find((p) => p.package === code);
    const merged: AdminLegacyPackage = {
      package: code,
      isActive: payload.isActive ?? current?.isActive ?? true,
      purchaseAmountNgn:
        payload.purchaseAmountNgn ?? current?.purchaseAmountNgn ?? 0,
      purchaseAmountUsd: current?.purchaseAmountUsd ?? 0,
      instantCommissionNgn:
        payload.instantCommissionNgn ?? current?.instantCommissionNgn ?? 0,
      instantCommissionUsd: current?.instantCommissionUsd ?? 0,
      monthlyCommissionBaseNgn:
        payload.monthlyCommissionBaseNgn ?? current?.monthlyCommissionBaseNgn ?? 0,
      monthlyCommissionBaseUsd: current?.monthlyCommissionBaseUsd ?? 0,
      monthlyCommissionIncreasedNgn:
        payload.monthlyCommissionIncreasedNgn ??
        current?.monthlyCommissionIncreasedNgn ??
        0,
      monthlyCommissionIncreasedUsd: current?.monthlyCommissionIncreasedUsd ?? 0,
      successlineBonusPercent:
        payload.successlineBonusPercent ?? current?.successlineBonusPercent ?? 0,
      autoshipAmountNgn:
        payload.autoshipAmountNgn ?? current?.autoshipAmountNgn ?? 0,
      autoshipAmountUsd: current?.autoshipAmountUsd ?? 0,
      cycleMonths: payload.cycleMonths ?? current?.cycleMonths ?? 6,
      minDirectsToIncreaseMonthly:
        payload.minDirectsToIncreaseMonthly ??
        current?.minDirectsToIncreaseMonthly ??
        3,
      updatedById: current?.updatedById ?? null,
      updatedAt: current?.updatedAt,
    };

    const putBody = {
      packages: [
        {
          package: code,
          purchaseAmountNgn: merged.purchaseAmountNgn,
          instantCommissionNgn: merged.instantCommissionNgn,
          monthlyCommissionBaseNgn: merged.monthlyCommissionBaseNgn,
          monthlyCommissionIncreasedNgn: merged.monthlyCommissionIncreasedNgn,
          successlineBonusPercent: merged.successlineBonusPercent,
          autoshipAmountNgn: merged.autoshipAmountNgn,
          cycleMonths: merged.cycleMonths,
          minDirectsToIncreaseMonthly: merged.minDirectsToIncreaseMonthly,
          isActive: merged.isActive,
        },
      ],
    };

    return this.api.put<unknown>('admin/legacy/packages', putBody).pipe(
      switchMap(() =>
        this.loadPackages().pipe(
          map((pkgs) => {
            const found = pkgs.find((p) => p.package === code);
            if (!found) throw new Error('Package not found after bulk update');
            return found;
          })
        )
      ),
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

  loadPayments(query: AdminLegacyPaymentsQuery = {}): Observable<AdminLegacyPayment[]> {
    this.paymentsLoading.set(true);
    this.paymentsError.set(null);

    const params: Record<string, unknown> = {
      offset: query.offset ?? 0,
      limit: query.limit ?? 20,
    };
    if (query.status) params['status'] = query.status;
    if (query.search?.trim()) params['search'] = query.search.trim();

    return this.api.get<unknown>('admin/legacy/payments', params).pipe(
      map((raw) => {
        const data = unwrapData<AdminLegacyPaymentsListResponse | AdminLegacyPayment[]>(raw);
        if (Array.isArray(data)) {
          return { items: data, total: data.length };
        }
        const items = data.items ?? data.payments ?? [];
        const total =
          data.total ??
          data.pagination?.totalRecords ??
          items.length;
        return { items, total };
      }),
      tap((res) => {
        this.payments.set(res.items);
        this.paymentsTotal.set(res.total);
        this.paymentsLoading.set(false);
      }),
      map((res) => res.items),
      catchError((err) => {
        this.paymentsError.set(extractErrorMessage(err));
        this.paymentsLoading.set(false);
        this.payments.set([]);
        this.paymentsTotal.set(0);
        return of([]);
      })
    );
  }

  getPayment(id: string): Observable<AdminLegacyPayment | null> {
    this.paymentDetailLoading.set(true);
    this.paymentDetailError.set(null);
    this.paymentDetail.set(null);

    return this.api
      .get<unknown>(`admin/legacy/payments/${encodeURIComponent(id)}`)
      .pipe(
        map((raw) => unwrapData<AdminLegacyPayment>(raw)),
        tap((payment) => {
          this.paymentDetail.set(payment);
          this.paymentDetailLoading.set(false);
        }),
        catchError((err) => {
          this.paymentDetailError.set(extractErrorMessage(err));
          this.paymentDetailLoading.set(false);
          this.paymentDetail.set(null);
          return of(null);
        })
      );
  }

  approvePayment(id: string): Observable<void> {
    return this.api
      .post<void>(`admin/legacy/payments/${encodeURIComponent(id)}/approve`, {})
      .pipe(catchError((err) => throwError(() => err)));
  }

  rejectPayment(id: string, reason: string): Observable<void> {
    return this.api
      .post<void>(`admin/legacy/payments/${encodeURIComponent(id)}/reject`, { reason })
      .pipe(catchError((err) => throwError(() => err)));
  }
}
