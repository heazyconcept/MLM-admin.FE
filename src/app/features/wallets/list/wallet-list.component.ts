import { Component, inject, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { WalletService, Wallet } from '../services/wallet.service';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { PaginatorModule } from 'primeng/paginator';
import { StatusBadgeComponent } from "../../../shared/components/status-badge/status-badge.component";
import { TablePageEvent } from 'primeng/table';
import { PaginatorState } from 'primeng/paginator';

@Component({
  selector: 'app-wallet-list',
  imports: [CommonModule, ButtonModule, TagModule, InputTextModule, TooltipModule, PaginatorModule, StatusBadgeComponent],
  templateUrl: './wallet-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WalletListComponent {
  private walletService = inject(WalletService);
  router = inject(Router);

  wallets = this.walletService.wallets;
  total = this.walletService.total;
  loading = signal(false);
  currentPage = signal({ first: 0, rows: 10 });
  searchQuery = signal('');

  // Expanded rows per user
  expandedUsers = signal<Set<string>>(new Set());

  // Type filter (Registration / Cash / Voucher / All)
  activeTypeFilter = signal<string>('All');

  readonly tableHeaders = ['Wallet ID', 'User', 'Type', 'Balance', 'Status', 'Last Updated', 'Actions'];
  readonly tableRowsPerPageOptions = [10, 25, 50];

  // Group wallets by user for expandable rows and type filtering
  groupedWallets = computed<UserWalletGroup[]>(() => {
    const wallets = this.wallets();
    const search = this.searchQuery().toLowerCase();
    const typeFilter = this.activeTypeFilter();

    const map = new Map<string, UserWalletGroup>();

    for (const w of wallets) {
      if (!map.has(w.userId)) {
        map.set(w.userId, {
          userId: w.userId,
          userName: w.userName ?? w.userId,
          wallets: [],
          registrationWallet: null,
          cashWallet: null,
          voucherWallet: null,
          worstStatus: 'Active',
          lastUpdated: w.createdAt
        });
      }

      const group = map.get(w.userId)!;
      group.wallets.push(w);

      const type = w.walletType?.toLowerCase();
      if (type === 'registration') group.registrationWallet = w;
      if (type === 'cash') group.cashWallet = w;
      if (type === 'voucher') group.voucherWallet = w;

      // Use backend status; rank so worst (LOCKED > FROZEN > ACTIVE) wins
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
      groups = groups.filter(g =>
        g.userName.toLowerCase().includes(search) ||
        g.userId.toLowerCase().includes(search)
      );
    }

    if (typeFilter !== 'All') {
      groups = groups.filter(g =>
        g.wallets.some(w => w.walletType?.toLowerCase() === typeFilter.toLowerCase())
      );
      this.expandedUsers.set(new Set(groups.map(g => g.userId)));
    }

    return groups;
  });

  // Slice grouped users for current page (project-style table pagination)
  pagedGroups = computed<UserWalletGroup[]>(() => {
    const groups = this.groupedWallets();
    const { first, rows } = this.currentPage();
    return groups.slice(first, first + rows);
  });

  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' {
    switch (status) {
      case 'Active': return 'success';
      case 'Locked': return 'danger';
      case 'Frozen': return 'warn';
      default: return 'info';
    }
  }

  toggleExpand(userId: string): void {
    this.expandedUsers.update(set => {
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

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
  }

  onExport(): void {
    console.log('Export wallets');
  }

  onPageChange(event: TablePageEvent | PaginatorState): void {
    const first = event.first ?? 0;
    const rows = event.rows ?? this.currentPage().rows;
    this.currentPage.set({ first, rows });
  }

  private loadPage(): void {
    this.loading.set(true);
    // Load an initial reasonable slice; client-side pagination is done on grouped results.
    this.walletService.listWallets({ limit: 100, offset: 0 }).subscribe({
      next: () => this.loading.set(false),
      error: () => this.loading.set(false)
    });
  }

  ngOnInit(): void {
    this.loadPage();
  }
}

interface UserWalletGroup {
  userId: string;
  userName: string;
  wallets: Wallet[];
  registrationWallet: Wallet | null;
  cashWallet: Wallet | null;
  voucherWallet: Wallet | null;
  worstStatus: string;
  lastUpdated: Date;
}

