import { Injectable, signal, computed, inject } from '@angular/core';
import { Observable, tap, map, catchError, of } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';

export type ConsultantStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED';

export interface ConsultantUser {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  registrationPackage?: string;
  isRegistrationPaid?: boolean;
}

export interface BusinessConsultant {
  id: string;
  userId: string;
  status: ConsultantStatus;
  seminarCentreName: string;
  seminarCentreAddress?: string | null;
  seminarCentreCity?: string | null;
  seminarCentreState?: string | null;
  phoneNumber?: string | null;
  applicantNotes?: string | null;
  appliedAt: string;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  grantedByAdmin?: boolean;
  isStage1Complete?: boolean;
  effectiveRankingLevel?: number;
  createdAt?: string;
  updatedAt?: string;
  user?: ConsultantUser;
}

export interface AdminConsultantFilters {
  status?: ConsultantStatus;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface GrantConsultantRequest {
  userId: string;
  seminarCentreName?: string;
  seminarCentreAddress?: string;
  seminarCentreCity?: string;
  seminarCentreState?: string;
  phoneNumber?: string;
}

interface AdminConsultantsListResponse {
  items: BusinessConsultant[];
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class ConsultantService {
  private readonly api = inject(ApiService);

  private readonly consultantsState = signal<BusinessConsultant[]>([]);
  private readonly selectedConsultantState = signal<BusinessConsultant | null>(null);
  private readonly listTotalState = signal<number>(0);
  private readonly loadingState = signal<boolean>(false);
  private readonly loadingErrorState = signal<string | null>(null);

  readonly consultants = this.consultantsState.asReadonly();
  readonly selectedConsultant = this.selectedConsultantState.asReadonly();
  readonly listTotal = this.listTotalState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly loadingError = this.loadingErrorState.asReadonly();

  readonly pendingCount = computed(() =>
    this.consultantsState().filter(c => c.status === 'PENDING').length
  );
  readonly approvedCount = computed(() =>
    this.consultantsState().filter(c => c.status === 'APPROVED').length
  );
  readonly rejectedCount = computed(() =>
    this.consultantsState().filter(c => c.status === 'REJECTED').length
  );
  readonly revokedCount = computed(() =>
    this.consultantsState().filter(c => c.status === 'REVOKED').length
  );

  loadConsultants(filters?: AdminConsultantFilters): Observable<{ items: BusinessConsultant[]; total: number }> {
    this.loadingState.set(true);
    this.loadingErrorState.set(null);

    const params: Record<string, string | number> = {};
    if (filters?.status) params['status'] = filters.status;
    if (filters?.search) params['search'] = filters.search;
    if (filters?.limit != null) params['limit'] = filters.limit;
    if (filters?.offset != null) params['offset'] = filters.offset;

    return this.api.get<AdminConsultantsListResponse>('admin/consultants', params).pipe(
      map(res => {
        const items = Array.isArray(res.items) ? res.items : [];
        const total = typeof res.total === 'number' ? res.total : items.length;
        return { items, total };
      }),
      tap(({ items, total }) => {
        this.consultantsState.set(items);
        this.listTotalState.set(total);
        this.loadingState.set(false);
      }),
      catchError(err => {
        this.loadingState.set(false);
        this.loadingErrorState.set(err?.message ?? 'Failed to load consultants');
        this.consultantsState.set([]);
        this.listTotalState.set(0);
        return of({ items: [] as BusinessConsultant[], total: 0 });
      })
    );
  }

  loadConsultant(id: string): Observable<BusinessConsultant | null> {
    return this.api.get<BusinessConsultant>(`admin/consultants/${id}`).pipe(
      tap(c => this.selectedConsultantState.set(c)),
      catchError(() => {
        this.selectedConsultantState.set(null);
        return of(null);
      })
    );
  }

  getConsultantById(id: string): BusinessConsultant | undefined {
    const fromList = this.consultantsState().find(c => c.id === id);
    if (fromList) {
      this.selectedConsultantState.set(fromList);
      return fromList;
    }
    const selected = this.selectedConsultantState();
    if (selected?.id === id) return selected;
    return undefined;
  }

  grantConsultant(body: GrantConsultantRequest): Observable<BusinessConsultant> {
    return this.api.post<BusinessConsultant>('admin/consultants/grant', body);
  }

  approveConsultant(id: string): Observable<BusinessConsultant> {
    return this.api.post<BusinessConsultant>(`admin/consultants/${id}/approve`, {}).pipe(
      tap(c => this.updateLocalConsultant(id, c))
    );
  }

  rejectConsultant(id: string, reason: string): Observable<BusinessConsultant> {
    return this.api.post<BusinessConsultant>(`admin/consultants/${id}/reject`, { reason }).pipe(
      tap(c => this.updateLocalConsultant(id, c))
    );
  }

  revokeConsultant(id: string): Observable<BusinessConsultant> {
    return this.api.post<BusinessConsultant>(`admin/consultants/${id}/revoke`, {}).pipe(
      tap(c => this.updateLocalConsultant(id, c))
    );
  }

  getDisplayStatus(status: ConsultantStatus): string {
    const map: Record<ConsultantStatus, string> = {
      PENDING: 'Pending',
      APPROVED: 'Approved',
      REJECTED: 'Rejected',
      REVOKED: 'Revoked'
    };
    return map[status] ?? status;
  }

  getApplicantDisplayName(consultant: BusinessConsultant): string {
    const user = consultant.user;
    if (user?.firstName || user?.lastName) {
      return `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    }
    if (user?.username) return user.username;
    if (user?.email) return user.email.split('@')[0];
    return 'Unknown';
  }

  private updateLocalConsultant(id: string, updated: BusinessConsultant): void {
    const list = this.consultantsState().map(c => (c.id === id ? { ...c, ...updated } : c));
    this.consultantsState.set(list);
    if (this.selectedConsultantState()?.id === id) {
      this.selectedConsultantState.set({ ...this.selectedConsultantState()!, ...updated });
    }
  }
}
