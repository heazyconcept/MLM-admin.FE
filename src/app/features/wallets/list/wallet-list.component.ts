import {
  Component,
  inject,
  ChangeDetectionStrategy,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  WalletService,
  Wallet,
  GlobalWalletSummaryItem,
} from '../services/wallet.service';
import { UsersService } from '../../users/services/users.service';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { PaginatorModule } from 'primeng/paginator';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { TablePageEvent } from 'primeng/table';
import { PaginatorState } from 'primeng/paginator';
import {
  WALLET_TYPE_DISPLAY_CONFIG,
  assignWalletToGroup,
  normalizeWalletTypeKey,
} from '../wallet-type-display.util';

@Component({
  selector: 'app-wallet-list',
  imports: [
    CommonModule,
    ButtonModule,
    TagModule,
    InputTextModule,
    TooltipModule,
    PaginatorModule,
    StatusBadgeComponent,
  ],
  templateUrl: './wallet-list.component.html',
  styleUrls: ['./wallet-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WalletListComponent implements OnInit {
  private walletService = inject(WalletService);
  private usersService = inject(UsersService);
  router = inject(Router);

  wallets = this.walletService.wallets;
  total = this.walletService.total;
  loading = signal(false);
  summaryLoading = signal(false);
  currentPage = signal({ first: 0, rows: 10 });

  /** Bound to search input (draft). */
  searchDraft = signal('');
  /** Last submitted search (drives API + client filter). */
  appliedSearch = signal('');
  searchTruncatedNote = signal<string | null>(null);
  searchHadNoUsers = signal(false);

  globalSummaries = signal<GlobalWalletSummaryItem[]>([]);

  expandedUsers = signal<Set<string>>(new Set());
  activeTypeFilter = signal<string>('All');

  readonly tableRowsPerPageOptions = [10, 25, 50];
  readonly typeSummaryConfig = WALLET_TYPE_DISPLAY_CONFIG;

  typeSummaryCards = computed(() => {
    const api = this.globalSummaries();
    return WALLET_TYPE_DISPLAY_CONFIG.map((config) => {
      const item = api.find(
        (s) => normalizeWalletTypeKey(s.walletType) === config.type,
      );
      return {
        ...config,
        totalBalance: item?.totalBalance ?? 0,
        totalWallets: item?.totalWallets ?? 0,
        currency: item?.currency ?? 'NGN',
      };
    });
  });

  grandTotalsByCurrency = computed(() => {
    const api = this.globalSummaries();
    const byCurrency = new Map<string, number>();
    for (const item of api) {
      const currency = item.currency || 'NGN';
      byCurrency.set(currency, (byCurrency.get(currency) ?? 0) + item.totalBalance);
    }
    if (byCurrency.size === 0) {
      return [{ currency: 'NGN', totalBalance: 0 }];
    }
    return Array.from(byCurrency.entries()).map(([currency, totalBalance]) => ({
      currency,
      totalBalance,
    }));
  });

  groupedWallets = computed<UserWalletGroup[]>(() => {
    const wallets = this.wallets();
    const search = this.appliedSearch().toLowerCase();
    const typeFilter = this.activeTypeFilter();

    const map = new Map<string, UserWalletGroup>();

    for (const w of wallets) {
      if (!map.has(w.userId)) {
        map.set(w.userId, {
          userId: w.userId,
          userName: w.userName ?? w.userId,
          userEmail: w.userEmail ?? '',
          wallets: [],
          registrationWallet: null,
          cashWallet: null,
          voucherWallet: null,
          autoshipWallet: null,
          legacyCashoutWallet: null,
          legacyVoucherWallet: null,
          worstStatus: 'Active',
          lastUpdated: w.createdAt,
        });
      }

      const group = map.get(w.userId)!;
      group.wallets.push(w);
      if (w.userEmail && !group.userEmail) {
        group.userEmail = w.userEmail;
      }
      assignWalletToGroup(group, w, w.walletType);

      const rank: Record<string, number> = { LOCKED: 3, FROZEN: 2, ACTIVE: 1 };
      const statusUpper = (w.status ?? '').toUpperCase();
      const currentRank = rank[statusUpper] ?? 0;
      const worstRank = rank[(group.worstStatus ?? '').toUpperCase()] ?? 0;
      if (currentRank > worstRank) {
        group.worstStatus = w.status ?? group.worstStatus;
      }

      if (w.createdAt > group.lastUpdated) {
        group.lastUpdated = w.createdAt;
      }
    }

    let groups = Array.from(map.values());

    if (search) {
      groups = groups.filter(
        (g) =>
          g.userName.toLowerCase().includes(search) ||
          g.userId.toLowerCase().includes(search) ||
          g.userEmail.toLowerCase().includes(search),
      );
    }

    if (typeFilter !== 'All') {
      const filterKey = normalizeWalletTypeKey(typeFilter);
      groups = groups.filter((g) =>
        g.wallets.some((w) => normalizeWalletTypeKey(w.walletType) === filterKey),
      );
      this.expandedUsers.set(new Set(groups.map((g) => g.userId)));
    }

    return groups;
  });

  pagedGroups = computed<UserWalletGroup[]>(() => {
    const groups = this.groupedWallets();
    const { first, rows } = this.currentPage();
    return groups.slice(first, first + rows);
  });

  emptyStateMessage = computed(() => {
    if (this.searchHadNoUsers() && this.appliedSearch().trim()) {
      return {
        title: 'No members match your search',
        subtitle: 'Try a different username, email, or member ID.',
      };
    }
    return {
      title: 'No wallets found',
      subtitle: 'Try adjusting your search or filters',
    };
  });

  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' {
    switch (status) {
      case 'Active':
        return 'success';
      case 'Locked':
        return 'danger';
      case 'Frozen':
        return 'warn';
      default:
        return 'info';
    }
  }

  toggleExpand(userId: string): void {
    this.expandedUsers.update((set) => {
      const next = new Set(set);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
  }

  isExpanded(userId: string): boolean {
    return this.expandedUsers().has(userId);
  }

  setTypeFilter(type: string): void {
    this.activeTypeFilter.set(type);
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchDraft.set(value);
  }

  onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.applySearch();
    }
  }

  applySearch(): void {
    const q = this.searchDraft().trim();
    this.appliedSearch.set(q);
    this.searchHadNoUsers.set(false);
    this.searchTruncatedNote.set(null);
    this.currentPage.set({ first: 0, rows: this.currentPage().rows });

    if (!q) {
      this.loadAllWallets();
      return;
    }

    this.loading.set(true);
    this.usersService.getUsers({ search: q, limit: 26, offset: 0 }).subscribe({
      next: ({ users, total }) => {
        if (users.length === 0) {
          this.searchHadNoUsers.set(true);
          this.walletService.fetchWalletsForUsers([]).subscribe({
            next: () => this.loading.set(false),
            error: () => this.loading.set(false),
          });
          return;
        }

        const truncated = total > 25 || users.length > 25;
        if (truncated) {
          this.searchTruncatedNote.set(
            'Showing wallets for the first 25 matching members.',
          );
        }

        const ids = users.slice(0, 25).map((u) => u.id);
        this.walletService.fetchWalletsForUsers(ids).subscribe({
          next: () => this.loading.set(false),
          error: () => this.loading.set(false),
        });
      },
      error: () => this.loading.set(false),
    });
  }

  clearSearch(): void {
    this.searchDraft.set('');
    this.appliedSearch.set('');
    this.searchHadNoUsers.set(false);
    this.searchTruncatedNote.set(null);
    this.currentPage.set({ first: 0, rows: this.currentPage().rows });
    this.loadAllWallets();
  }

  onExport(): void {
    console.log('Export wallets');
  }

  onPageChange(event: TablePageEvent | PaginatorState): void {
    const first = event.first ?? 0;
    const rows = event.rows ?? this.currentPage().rows;
    this.currentPage.set({ first, rows });
  }

  primaryWalletId(group: UserWalletGroup): string | undefined {
    return (
      group.cashWallet?.id ??
      group.registrationWallet?.id ??
      group.voucherWallet?.id ??
      group.autoshipWallet?.id ??
      group.legacyCashoutWallet?.id ??
      group.legacyVoucherWallet?.id ??
      group.wallets[0]?.id
    );
  }

  private loadAllWallets(): void {
    this.loading.set(true);
    this.walletService.fetchAllWallets().subscribe({
      next: () => this.loading.set(false),
      error: () => this.loading.set(false),
    });
  }

  private loadGlobalSummary(): void {
    this.summaryLoading.set(true);
    this.walletService.getGlobalWalletSummary().subscribe({
      next: (data) => {
        this.globalSummaries.set(data ?? []);
        this.summaryLoading.set(false);
        this.verifyLegacySummaryTypes(data ?? []);
      },
      error: () => this.summaryLoading.set(false),
    });
  }

  /** Logs missing legacy types; see new-fixes-issues.md if API omits them. */
  private verifyLegacySummaryTypes(items: GlobalWalletSummaryItem[]): void {
    const keys = new Set(items.map((i) => normalizeWalletTypeKey(i.walletType)));
    const missing = ['LEGACY_CASHOUT', 'LEGACY_VOUCHER', 'CAUCUS_CASHOUT'].filter((t) => !keys.has(t));
    const missing = ['LEGACY_CASHOUT', 'LEGACY_VOUCHER'].filter((t) => !keys.has(t));
    if (missing.length > 0 && typeof console !== 'undefined') {
      console.warn(
        '[Wallet Management] global-summary missing wallet types:',
        missing.join(', '),
      );
    }
  }

  ngOnInit(): void {
    this.loadAllWallets();
    this.loadGlobalSummary();
  }
}

interface UserWalletGroup {
  userId: string;
  userName: string;
  userEmail: string;
  wallets: Wallet[];
  registrationWallet: Wallet | null;
  cashWallet: Wallet | null;
  voucherWallet: Wallet | null;
  autoshipWallet: Wallet | null;
  legacyCashoutWallet: Wallet | null;
  legacyVoucherWallet: Wallet | null;
  worstStatus: string;
  lastUpdated: Date;
}
