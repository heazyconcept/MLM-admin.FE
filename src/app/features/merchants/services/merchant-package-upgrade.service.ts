import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { MerchantCategoryType } from '../../../core/models/merchant-category-config.model';

export type MerchantPackageEventType = 'INITIAL_FEE' | 'CATEGORY_UPGRADE';

export type MerchantPackageSource = 'GATEWAY' | 'WALLET' | 'ADMIN' | 'SYSTEM' | 'REFUND';

export type MerchantPackageFundingMode =
  | 'GATEWAY_PAYMENT'
  | 'WALLET_DEBIT'
  | 'ADMIN_WAIVE'
  | 'ADMIN_PAID'
  | 'REFUND'
  | 'UNKNOWN';

export type NetWalletEffect =
  | 'NONE'
  | 'CREDIT_ONLY'
  | 'DEBIT_ONLY'
  | 'SETTLED_AS_UPGRADE'
  | 'CREDIT_THEN_DEBIT';

export interface MerchantPackageFunding {
  mode: MerchantPackageFundingMode | string;
  walletType?: string | null;
  creditedAmount?: number | null;
  debitedAmount?: number | null;
  netWalletEffect?: NetWalletEffect | string | null;
  description?: string | null;
}

export interface MerchantPackageLedgerEntry {
  id: string;
  walletId?: string;
  walletType?: string;
  direction: 'CREDIT' | 'DEBIT' | string;
  amount: number;
  currency?: string;
  source?: string;
  reference?: string | null;
  createdAt: string;
}

export interface MerchantPackageUpgradeLinks {
  merchantId?: string | null;
  userId?: string | null;
  paymentId?: string | null;
}

export interface MerchantPackageUpgradeRecord {
  id: string;
  merchantId: string;
  userId: string;
  username: string;
  email: string;
  fullName?: string;
  businessName?: string;
  eventType: MerchantPackageEventType | string;
  previousType?: MerchantCategoryType | string | null;
  currentType: MerchantCategoryType | string;
  amount?: number | null;
  currency?: string | null;
  source: MerchantPackageSource | string;
  performedBy?: string | null;
  waivePayment?: boolean;
  paymentId?: string | null;
  paymentReference?: string | null;
  walletType?: string | null;
  fundingSummary?: string | null;
  occurredAt: string;
}

export interface MerchantPackageUpgradeDetail extends MerchantPackageUpgradeRecord {
  funding?: MerchantPackageFunding | null;
  ledgerEntries?: MerchantPackageLedgerEntry[];
  links?: MerchantPackageUpgradeLinks;
}

export interface MerchantPackageUpgradeFilters {
  search?: string;
  merchantId?: string;
  userId?: string;
  eventType?: MerchantPackageEventType;
  previousType?: MerchantCategoryType;
  currentType?: MerchantCategoryType;
  source?: MerchantPackageSource;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

interface MerchantPackageUpgradesListResponse {
  items?: MerchantPackageUpgradeRecord[];
  total?: number;
  limit?: number;
  offset?: number;
}

@Injectable({
  providedIn: 'root',
})
export class MerchantPackageUpgradeService {
  private readonly api = inject(ApiService);

  private readonly recordsState = signal<MerchantPackageUpgradeRecord[]>([]);
  private readonly totalState = signal(0);
  private readonly loadingState = signal(false);
  private readonly loadingErrorState = signal<string | null>(null);

  readonly records = this.recordsState.asReadonly();
  readonly total = this.totalState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly loadingError = this.loadingErrorState.asReadonly();

  loadFromApi(
    filters?: MerchantPackageUpgradeFilters
  ): Observable<{ items: MerchantPackageUpgradeRecord[]; total: number }> {
    this.loadingState.set(true);
    this.loadingErrorState.set(null);

    return this.api
      .get<MerchantPackageUpgradesListResponse | MerchantPackageUpgradeRecord[]>(
        'admin/merchants/package-upgrades',
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
            err?.error?.message ?? err?.message ?? 'Failed to load merchant package upgrades'
          );
          this.recordsState.set([]);
          this.totalState.set(0);
          return of({ items: [] as MerchantPackageUpgradeRecord[], total: 0 });
        })
      );
  }

  getById(id: string): Observable<MerchantPackageUpgradeDetail> {
    return this.api
      .get<MerchantPackageUpgradeDetail>(`admin/merchants/package-upgrades/${id}`)
      .pipe(map((record) => this.normalizeDetail(record)));
  }

  formatTypeLabel(type?: string | null): string {
    if (!type) return '—';
    const labels: Record<string, string> = {
      REGIONAL: 'Regional',
      NATIONAL: 'National',
      GLOBAL: 'Global',
    };
    return labels[type] ?? type.charAt(0) + type.slice(1).toLowerCase();
  }

  getTypeColor(type?: string | null): string {
    const colors: Record<string, string> = {
      REGIONAL: '#2563eb',
      NATIONAL: '#F9A825',
      GLOBAL: '#1B5E20',
    };
    return colors[type ?? ''] ?? '#94a3b8';
  }

  formatEventTypeLabel(eventType?: string | null): string {
    if (!eventType) return '—';
    const labels: Record<string, string> = {
      INITIAL_FEE: 'Initial fee',
      CATEGORY_UPGRADE: 'Category upgrade',
    };
    return labels[eventType] ?? eventType;
  }

  formatSourceLabel(source?: string | null): string {
    if (!source) return '—';
    const labels: Record<string, string> = {
      GATEWAY: 'Gateway',
      WALLET: 'Wallet',
      ADMIN: 'Admin',
      SYSTEM: 'System',
      REFUND: 'Refund',
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
    filters?: MerchantPackageUpgradeFilters
  ): Record<string, string | number | boolean> {
    const params: Record<string, string | number | boolean> = {};
    if (filters?.search) params['search'] = filters.search;
    if (filters?.merchantId) params['merchantId'] = filters.merchantId;
    if (filters?.userId) params['userId'] = filters.userId;
    if (filters?.eventType) params['eventType'] = filters.eventType;
    if (filters?.previousType) params['previousType'] = filters.previousType;
    if (filters?.currentType) params['currentType'] = filters.currentType;
    if (filters?.source) params['source'] = filters.source;
    if (filters?.dateFrom) params['dateFrom'] = filters.dateFrom;
    if (filters?.dateTo) params['dateTo'] = filters.dateTo;
    if (filters?.limit != null) params['limit'] = filters.limit;
    if (filters?.offset != null) params['offset'] = filters.offset;
    return params;
  }

  private normalizeListResponse(
    response: MerchantPackageUpgradesListResponse | MerchantPackageUpgradeRecord[]
  ): { items: MerchantPackageUpgradeRecord[]; total: number } {
    if (Array.isArray(response)) {
      return { items: response.map((r) => this.normalizeRecord(r)), total: response.length };
    }
    const items = (response.items ?? []).map((r) => this.normalizeRecord(r));
    const total = typeof response.total === 'number' ? response.total : items.length;
    return { items, total };
  }

  private normalizeDetail(record: MerchantPackageUpgradeDetail): MerchantPackageUpgradeDetail {
    const base = this.normalizeRecord(record);
    return {
      ...base,
      funding: record.funding ?? null,
      ledgerEntries: record.ledgerEntries ?? [],
      links: record.links ?? {
        merchantId: record.merchantId,
        userId: record.userId,
        paymentId: record.paymentId ?? null,
      },
    };
  }

  private normalizeRecord(record: MerchantPackageUpgradeRecord): MerchantPackageUpgradeRecord {
    const raw = record as MerchantPackageUpgradeRecord & {
      fromType?: string;
      toType?: string;
      type?: string;
    };

    return {
      ...record,
      previousType: raw.previousType ?? raw.fromType ?? null,
      currentType: raw.currentType ?? raw.toType ?? raw.type ?? '',
      waivePayment: !!record.waivePayment,
    };
  }
}
