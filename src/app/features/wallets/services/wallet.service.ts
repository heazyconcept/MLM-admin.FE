import { Injectable, signal, computed, inject } from '@angular/core';
import { Observable, map, tap, switchMap, of } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';


// Raw list item from `GET /admin/wallets`
interface AdminWalletListItemDto {
  id: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  walletType: string;
  displayCurrency: string;
  status: string;
  balance: number;
  createdAt: string;
}

interface AdminWalletListResponse {
  items: AdminWalletListItemDto[];
  total: number;
}

// Ledger item from `AdminWalletDetailResponseDto.recentLedger` (matches API)
interface AdminWalletLedgerEntryDto {
  id: string;
  amount: number;
  displayAmount: number | null;
  displayCurrency: string;
  direction: string;
  source: string;
  earningType: string | null;
  reference: string | null;
  canUndo?: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AdminUndoAdjustmentResponse {
  message: string;
  reversalReference: string;
  balance: number;
  displayCurrency: string;
}

// Detail response from `GET /admin/wallets/:id`
interface AdminWalletDetailResponseDto {
  id: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  walletType: string;
  baseCurrency?: string;
  displayCurrency: string;
  status: string;
  balance: number;
  createdAt: string;
  recentLedger: AdminWalletLedgerEntryDto[];
}

export interface GlobalWalletSummaryItem {
  walletType: string;
  totalWallets: number;
  totalBalance: number;
  currency: string;
}

interface GlobalWalletSummaryResponse {
  summaries: GlobalWalletSummaryItem[];
}

// Public UI-facing models used by wallet components.
export interface Wallet {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  walletType: string;
  baseCurrency?: string;
  displayCurrency: string;
  status: string;
  balance: number;
  createdAt: Date;
}

export interface LedgerEntry {
  id: string;
  walletId: string;
  type: 'Credit' | 'Debit';
  amount: number;
  reason: string;
  timestamp: Date;
  reference?: string;
  source?: string;
  direction?: 'CREDIT' | 'DEBIT';
  canUndo?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  private readonly api = inject(ApiService);

  private walletsSignal = signal<Wallet[]>([]);
  readonly wallets = this.walletsSignal.asReadonly();

  private totalSignal = signal(0);
  readonly total = this.totalSignal.asReadonly();

  /**
   * Query options for `GET /admin/wallets`.
   * Returns only the wallet array for public callers.
   */
  listWallets(query: {
    userId?: string;
    walletType?: string;
    status?: string;
    limit?: number;
    offset?: number;
  } = {}): Observable<Wallet[]> {
    return this.fetchPage(query).pipe(
      map(({ items }) => items)
    );
  }

  /**
   * Fetches ALL wallets by iterating through pages until total is reached.
   * Accumulates results into the wallets signal progressively.
   */
  fetchAllWallets(query: {
    userId?: string;
    walletType?: string;
    status?: string;
    pageSize?: number;
  } = {}): Observable<Wallet[]> {
    const { pageSize = 100, ...rest } = query;
    const accumulated: Wallet[] = [];

    const loadNext = (offset: number): Observable<Wallet[]> =>
      this.fetchPage({ ...rest, limit: pageSize, offset }).pipe(
        switchMap(({ items, total }) => {
          accumulated.push(...items);
          this.walletsSignal.set([...accumulated]);
          const fetched = offset + items.length;
          if (fetched < total && items.length > 0) {
            return loadNext(fetched);
          }
          return of(accumulated);
        })
      );

    return loadNext(0);
  }

  /** Internal: fetches one page and returns both items + total. */
  private fetchPage(query: {
    userId?: string;
    walletType?: string;
    status?: string;
    limit?: number;
    offset?: number;
  } = {}): Observable<{ items: Wallet[]; total: number }> {
    const { userId, walletType, status, limit = 100, offset = 0 } = query;
    return this.api
      .get<AdminWalletListResponse>('admin/wallets', { userId, walletType, status, limit, offset })
      .pipe(
        map(response => {
          const items = (response?.items ?? []).map(item => this.mapListItemToWallet(item));
          const total = response?.total ?? offset + items.length;
          this.totalSignal.set(total);
          return { items, total };
        })
      );
  }

  /**
   * Load a single wallet and its recent ledger entries from `GET /admin/wallets/:id`.
   */
  getWalletById(id: string): Observable<{ wallet: Wallet; ledger: LedgerEntry[] }> {
    return this.api
      .get<AdminWalletDetailResponseDto>(`admin/wallets/${id}`)
      .pipe(
        map(dto => ({
          wallet: this.mapDetailToWallet(dto),
          ledger: (dto.recentLedger ?? []).map(entry => this.mapLedgerEntry(entry, dto.id))
        }))
      );
  }

  /**
   * Lock / unlock actions delegate to the backend and return the updated status.
   */
  lockWallet(id: string): Observable<string> {
    return this.api
      .put<{ message: string; status: string }>(`admin/wallets/${id}/lock`, {})
      .pipe(map(res => res.status));
  }

  unlockWallet(id: string): Observable<string> {
    return this.api
      .put<{ message: string; status: string }>(`admin/wallets/${id}/unlock`, {})
      .pipe(map(res => res.status));
  }

  /**
   * Manual adjustment via `POST /admin/wallets/:id/adjust`.
   * Returns the new balance from the backend.
   */
  adjustWallet(
    id: string,
    payload: { amount: number; reason: string; displayAmount?: number }
  ): Observable<number> {
    return this.api
      .post<{ message: string; balance: number }>(`admin/wallets/${id}/adjust`, payload)
      .pipe(map(res => res.balance));
  }

  /**
   * Undo an admin credit via `POST /admin/wallets/adjustments/:reference/undo`.
   */
  undoAdjustment(reference: string, payload: { reason: string }): Observable<AdminUndoAdjustmentResponse> {
    return this.api.post<AdminUndoAdjustmentResponse>(
      `admin/wallets/adjustments/${reference}/undo`,
      payload
    );
  }

  /**
   * Aggregate wallet balances per wallet type from `GET /admin/wallets/summary`.
   */
  getWalletSummary(): Observable<Record<string, number>> {
    return this.api.get<Record<string, number>>('admin/wallets/summary');
  }

  /**
   * Fetch per-type ACTIVE wallet count and ledger balance from `GET /admin/wallets/global-summary`.
   */
  getGlobalWalletSummary(): Observable<GlobalWalletSummaryItem[]> {
    return this.api.get<GlobalWalletSummaryResponse>('admin/wallets/global-summary').pipe(
      map(res => res.summaries || [])
    );
  }

  /**
   * Returns wallets for the given user from the last list load (e.g. after listWallets({ userId })).
   */
  getWalletsByUserId(userId: string): Wallet[] {
    return this.wallets().filter(w => w.userId === userId);
  }

  // Mapping helpers

  private mapListItemToWallet(item: AdminWalletListItemDto): Wallet {
    return {
      id: item.id,
      userId: item.userId,
      userName: item.userName,
      userEmail: item.userEmail,
      walletType: item.walletType,
      displayCurrency: item.displayCurrency,
      status: item.status,
      balance: item.balance,
      createdAt: new Date(item.createdAt)
    };
  }

  private mapDetailToWallet(dto: AdminWalletDetailResponseDto): Wallet {
    return {
      id: dto.id,
      userId: dto.userId,
      userName: dto.userName,
      userEmail: dto.userEmail,
      walletType: dto.walletType,
      baseCurrency: dto.baseCurrency,
      displayCurrency: dto.displayCurrency,
      status: dto.status,
      balance: dto.balance,
      createdAt: new Date(dto.createdAt)
    };
  }

  private mapLedgerEntry(dto: AdminWalletLedgerEntryDto, walletId?: string): LedgerEntry {
    const direction = dto.direction?.toUpperCase() === 'CREDIT' ? 'CREDIT' : 'DEBIT';
    const type = direction === 'CREDIT' ? 'Credit' : 'Debit';
    const reasonParts = [dto.source, dto.earningType].filter(Boolean);
    const reason = reasonParts.length > 0
      ? reasonParts.join(' · ')
      : (dto.reference ? dto.reference.slice(0, 40) + (dto.reference.length > 40 ? '…' : '') : '—');

    return {
      id: dto.id,
      walletId: walletId ?? '',
      type,
      amount: dto.amount,
      reason,
      timestamp: new Date(dto.createdAt),
      reference: dto.reference ?? undefined,
      source: dto.source,
      direction,
      canUndo: dto.canUndo === true,
    };
  }
}
