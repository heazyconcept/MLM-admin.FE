import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import {
  NetWalletEffect,
  PackageTier,
  UpgradeLedgerEntry,
} from '../services/package-upgrade-history.service';

export type RegistrationActivationSource =
  | 'GATEWAY'
  | 'MANUAL_REGISTRATION_PAYMENT'
  | 'ADMIN_DEBIT_WALLET'
  | 'ADMIN_WAIVE';

export type RegistrationFundingMode =
  | 'GATEWAY_PAYMENT'
  | 'MANUAL_REGISTRATION_PAYMENT'
  | 'DEBIT_REGISTRATION_WALLET'
  | 'WAIVE'
  | 'UNKNOWN';

export interface RegistrationFunding {
  mode: RegistrationFundingMode | string;
  walletType?: string | null;
  creditedAmount?: number | null;
  debitedAmount?: number | null;
  netWalletEffect?: NetWalletEffect | string | null;
  description?: string | null;
}

export interface RegistrationActivationLinks {
  userId?: string | null;
  paymentId?: string | null;
  manualRegistrationPaymentId?: string | null;
}

export interface RegistrationActivationRecord {
  id: string;
  userId: string;
  username: string;
  email: string;
  fullName?: string;
  isMerchant?: boolean;
  merchantId?: string | null;
  package: string;
  amount?: number | null;
  currency?: string | null;
  source: RegistrationActivationSource | string;
  performedBy?: string | null;
  paymentId?: string | null;
  paymentReference?: string | null;
  manualRegistrationPaymentId?: string | null;
  fundingSummary?: string | null;
  funding?: RegistrationFunding | null;
  activatedAt: string;
}

export interface RegistrationActivationDetail extends RegistrationActivationRecord {
  ledgerEntries?: UpgradeLedgerEntry[];
  links?: RegistrationActivationLinks;
}

export interface RegistrationActivationFilters {
  search?: string;
  source?: RegistrationActivationSource;
  isMerchant?: boolean;
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}

interface RegistrationActivationsListResponse {
  items?: RegistrationActivationRecord[];
  total?: number;
  limit?: number;
  offset?: number;
}

@Injectable({
  providedIn: 'root',
})
export class RegistrationActivationService {
  private readonly api = inject(ApiService);

  private readonly recordsState = signal<RegistrationActivationRecord[]>([]);
  private readonly totalState = signal(0);
  private readonly loadingState = signal(false);
  private readonly loadingErrorState = signal<string | null>(null);

  readonly records = this.recordsState.asReadonly();
  readonly total = this.totalState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly loadingError = this.loadingErrorState.asReadonly();

  loadFromApi(
    filters?: RegistrationActivationFilters
  ): Observable<{ items: RegistrationActivationRecord[]; total: number }> {
    this.loadingState.set(true);
    this.loadingErrorState.set(null);

    return this.api
      .get<RegistrationActivationsListResponse | RegistrationActivationRecord[]>(
        'admin/users/registration-activations',
        this.buildParams(filters)
      )
      .pipe(
        map((response) => this.normalizeListResponse(response)),
        tap(({ items, total }) => {
          this.recordsState.set(items);
          this.totalState.set(total);
          this.loadingState.set(false);
        }),
        catchError((err) => {
          this.loadingState.set(false);
          this.loadingErrorState.set(
            err?.error?.message ?? err?.message ?? 'Failed to load registration activations'
          );
          this.recordsState.set([]);
          this.totalState.set(0);
          return of({ items: [] as RegistrationActivationRecord[], total: 0 });
        })
      );
  }

  getById(id: string): Observable<RegistrationActivationDetail> {
    return this.api
      .get<RegistrationActivationDetail>(`admin/users/registration-activations/${id}`)
      .pipe(map((record) => this.normalizeDetail(record)));
  }

  formatPackageLabel(pkg: string): string {
    if (!pkg) return '—';
    return pkg.charAt(0).toUpperCase() + pkg.slice(1).toLowerCase();
  }

  getPackageColor(pkg: string): string {
    const normalized = this.formatPackageLabel(pkg);
    const colors: Record<string, string> = {
      Nickel: '#64748b',
      Silver: '#94a3b8',
      Gold: '#F9A825',
      Platinum: '#475569',
      Ruby: '#ef4444',
      Diamond: '#3b82f6',
    };
    return colors[normalized] ?? '#94a3b8';
  }

  formatSourceLabel(source?: string | null): string {
    if (!source) return '—';
    const labels: Record<string, string> = {
      GATEWAY: 'Gateway',
      MANUAL_REGISTRATION_PAYMENT: 'Manual registration',
      ADMIN_DEBIT_WALLET: 'Admin debit',
      ADMIN_WAIVE: 'Admin waive',
    };
    return labels[source] ?? source;
  }

  formatFundingMode(mode?: string | null): string {
    if (!mode) return '—';
    return mode
      .split('_')
      .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
      .join(' ');
  }

  formatNetWalletEffect(effect?: string | null): string {
    if (!effect) return '—';
    const labels: Record<string, string> = {
      NONE: 'None',
      CREDIT_ONLY: 'Credit only',
      DEBIT_ONLY: 'Debit only',
      SETTLED_AS_UPGRADE: 'Settled as upgrade',
      CREDIT_THEN_DEBIT: 'Credit then debit',
    };
    return labels[effect] ?? this.formatFundingMode(effect);
  }

  private buildParams(
    filters?: RegistrationActivationFilters
  ): Record<string, string | number | boolean> {
    const params: Record<string, string | number | boolean> = {};
    if (filters?.search) params['search'] = filters.search;
    if (filters?.source) params['source'] = filters.source;
    if (filters?.isMerchant === true) params['isMerchant'] = true;
    if (filters?.dateFrom) params['dateFrom'] = filters.dateFrom;
    if (filters?.dateTo) params['dateTo'] = filters.dateTo;
    if (filters?.userId) params['userId'] = filters.userId;
    if (filters?.limit != null) params['limit'] = filters.limit;
    if (filters?.offset != null) params['offset'] = filters.offset;
    return params;
  }

  private normalizeListResponse(
    response: RegistrationActivationsListResponse | RegistrationActivationRecord[]
  ): { items: RegistrationActivationRecord[]; total: number } {
    if (Array.isArray(response)) {
      return { items: response.map((r) => this.normalizeRecord(r)), total: response.length };
    }
    const items = (response.items ?? []).map((r) => this.normalizeRecord(r));
    const total = typeof response.total === 'number' ? response.total : items.length;
    return { items, total };
  }

  private normalizeDetail(record: RegistrationActivationDetail): RegistrationActivationDetail {
    const base = this.normalizeRecord(record);
    return {
      ...base,
      funding: record.funding ?? null,
      ledgerEntries: record.ledgerEntries ?? [],
      links: record.links ?? {
        userId: record.userId,
        paymentId: record.paymentId ?? null,
        manualRegistrationPaymentId: record.manualRegistrationPaymentId ?? null,
      },
    };
  }

  private normalizeRecord(record: RegistrationActivationRecord): RegistrationActivationRecord {
    const raw = record as RegistrationActivationRecord & {
      registrationPackage?: PackageTier | string;
    };
    return {
      ...record,
      package: raw.package ?? raw.registrationPackage ?? '',
      isMerchant: !!record.isMerchant,
    };
  }
}
