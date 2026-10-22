import { Injectable, inject, signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import { mapAuditApiItem, type AuditDisplayEntry } from '../../../core/models/audit.model';
import {
  ActivateCaucusMemberRequest,
  ActivateCaucusMemberResponse,
  AdminCaucusAppealsListResponse,
  AdminCaucusAppealsQuery,
  AdminCaucusMemberDetail,
  AdminCaucusMemberListItem,
  AdminCaucusMembersListResponse,
  AdminCaucusMembersQuery,
  AdminCaucusMonthsResponse,
  AdminCaucusReferralsResponse,
  AdminCaucusTeamResponse,
  CaucusBackfillResponse,
  CaucusNoteRequest,
  VoidCaucusReferralRequest,
} from '../models/admin-caucus.models';
import { extractCaucusErrorMessage } from '../utils/caucus-error.util';

function unwrapData<T>(raw: unknown): T {
  if (raw && typeof raw === 'object' && 'data' in (raw as object)) {
    return (raw as { data: T }).data;
  }
  return raw as T;
}

function resolveTotal(
  data: AdminCaucusMembersListResponse | AdminCaucusAppealsListResponse,
  fallbackLength: number,
): number {
  const explicitTotal = 'total' in data ? data.total : undefined;
  return data.pagination?.totalRecords ?? explicitTotal ?? fallbackLength;
}

@Injectable({ providedIn: 'root' })
export class AdminCaucusService {
  private readonly api = inject(ApiService);

  members = signal<AdminCaucusMemberListItem[]>([]);
  membersTotal = signal(0);
  membersLoading = signal(false);
  membersError = signal<string | null>(null);

  memberDetail = signal<AdminCaucusMemberDetail | null>(null);
  detailLoading = signal(false);
  detailError = signal<string | null>(null);

  appeals = signal<AdminCaucusAppealsListResponse['appeals']>([]);
  appealsTotal = signal(0);
  appealsLoading = signal(false);
  appealsError = signal<string | null>(null);

  loadMembers(query: AdminCaucusMembersQuery): Observable<AdminCaucusMemberListItem[]> {
    this.membersLoading.set(true);
    this.membersError.set(null);
    return this.api.get<unknown>('admin/caucus/members', { ...query } as Record<string, unknown>).pipe(
      map((raw) => {
        const data = unwrapData<AdminCaucusMembersListResponse | AdminCaucusMemberListItem[]>(raw);
        if (Array.isArray(data)) {
          return { members: data, total: data.length };
        }
        const members = data?.members ?? [];
        return { members, total: resolveTotal(data, members.length) };
      }),
      tap(({ members, total }) => {
        this.members.set(members);
        this.membersTotal.set(total);
        this.membersLoading.set(false);
      }),
      map(({ members }) => members),
      catchError((err) => {
        this.membersError.set(extractCaucusErrorMessage(err));
        this.membersLoading.set(false);
        return of([]);
      }),
    );
  }

  loadMemberDetail(userId: string): Observable<AdminCaucusMemberDetail | null> {
    this.detailLoading.set(true);
    this.detailError.set(null);
    return this.api.get<unknown>(`admin/caucus/members/${userId}`).pipe(
      map((raw) => {
        const data = unwrapData<AdminCaucusMemberDetail>(raw);
        return {
          ...data,
          events: data.events ?? [],
          appeals: data.appeals ?? [],
          activityLog: (data.activityLog ?? []).map(mapAuditApiItem),
        };
      }),
      tap((detail) => {
        this.memberDetail.set(detail);
        this.detailLoading.set(false);
      }),
      catchError((err) => {
        this.detailError.set(extractCaucusErrorMessage(err));
        this.detailLoading.set(false);
        this.memberDetail.set(null);
        return of(null);
      }),
    );
  }

  loadReferrals(
    userId: string,
    month: string,
    page: number,
    limit: number,
  ): Observable<AdminCaucusReferralsResponse | null> {
    return this.api
      .get<unknown>(`admin/caucus/members/${userId}/referrals`, { month, page, limit })
      .pipe(
        map((raw) => unwrapData<AdminCaucusReferralsResponse>(raw)),
        catchError(() => of(null)),
      );
  }

  loadMonths(userId: string): Observable<AdminCaucusMonthsResponse | null> {
    return this.api.get<unknown>(`admin/caucus/members/${userId}/months`).pipe(
      map((raw) => unwrapData<AdminCaucusMonthsResponse>(raw)),
      catchError(() => of(null)),
    );
  }

  loadTeam(
    userId: string,
    page: number,
    limit: number,
    search?: string,
  ): Observable<AdminCaucusTeamResponse | null> {
    return this.api
      .get<unknown>(`admin/caucus/members/${userId}/team`, { page, limit, search: search || undefined })
      .pipe(
        map((raw) => unwrapData<AdminCaucusTeamResponse>(raw)),
        catchError(() => of(null)),
      );
  }

  loadAppeals(query: AdminCaucusAppealsQuery): Observable<AdminCaucusAppealsListResponse['appeals']> {
    this.appealsLoading.set(true);
    this.appealsError.set(null);
    return this.api.get<unknown>('admin/caucus/appeals', { ...query } as Record<string, unknown>).pipe(
      map((raw) => unwrapData<AdminCaucusAppealsListResponse>(raw)),
      tap((data) => {
        const list = data.appeals ?? [];
        this.appeals.set(list);
        this.appealsTotal.set(resolveTotal(data, list.length));
        this.appealsLoading.set(false);
      }),
      map((data) => data.appeals ?? []),
      catchError((err) => {
        this.appealsError.set(extractCaucusErrorMessage(err));
        this.appealsLoading.set(false);
        return of([]);
      }),
    );
  }

  activate(body: ActivateCaucusMemberRequest): Observable<ActivateCaucusMemberResponse> {
    return this.api.post<unknown>('admin/caucus/members', body).pipe(
      map((raw) => unwrapData<ActivateCaucusMemberResponse>(raw)),
      catchError((err) => throwError(() => new Error(extractCaucusErrorMessage(err)))),
    );
  }

  deactivate(userId: string, body: CaucusNoteRequest): Observable<void> {
    return this.api.post<unknown>(`admin/caucus/members/${userId}/deactivate`, body).pipe(
      map(() => undefined),
      catchError((err) => throwError(() => new Error(extractCaucusErrorMessage(err)))),
    );
  }

  reinstate(userId: string, body: CaucusNoteRequest): Observable<void> {
    return this.api.post<unknown>(`admin/caucus/members/${userId}/reinstate`, body).pipe(
      map(() => undefined),
      catchError((err) => throwError(() => new Error(extractCaucusErrorMessage(err)))),
    );
  }

  awardCar(userId: string): Observable<void> {
    return this.api.post<unknown>(`admin/caucus/members/${userId}/award-car`, {}).pipe(
      map(() => undefined),
      catchError((err) => throwError(() => new Error(extractCaucusErrorMessage(err)))),
    );
  }

  dismissAppeal(appealId: string, body: CaucusNoteRequest): Observable<void> {
    return this.api.post<unknown>(`admin/caucus/appeals/${appealId}/dismiss`, body).pipe(
      map(() => undefined),
      catchError((err) => throwError(() => new Error(extractCaucusErrorMessage(err)))),
    );
  }

  voidReferral(referralId: string, body: VoidCaucusReferralRequest): Observable<void> {
    return this.api.post<unknown>(`admin/caucus/referrals/${referralId}/void`, body).pipe(
      map(() => undefined),
      catchError((err) => throwError(() => new Error(extractCaucusErrorMessage(err)))),
    );
  }

  backfill(): Observable<CaucusBackfillResponse> {
    return this.api.post<unknown>('admin/caucus/referrals/backfill', {}).pipe(
      map((raw) => unwrapData<CaucusBackfillResponse>(raw)),
      catchError((err) => throwError(() => new Error(extractCaucusErrorMessage(err)))),
    );
  }
}
