import { Component, inject, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { WalletService, Wallet } from '../services/wallet.service';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-wallet-list',
  imports: [CommonModule, DataTableComponent, ButtonModule, TagModule, InputTextModule, TooltipModule],
  templateUrl: './wallet-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WalletListComponent {
  private walletService = inject(WalletService);
  router = inject(Router);

  wallets = this.walletService.wallets;
  loading = signal(false);
  searchQuery = signal('');

  readonly tableHeaders = ['Wallet ID', 'User', 'Type', 'Balance', 'Status', 'Last Updated', 'Actions'];
  readonly tableRows = 10;
  readonly tableRowsPerPageOptions = [10, 25, 50];

  filteredWallets = computed(() => {
    const query = this.searchQuery().toLowerCase();
    if (!query) return this.wallets();

    return this.wallets().filter(w =>
      w.id.toLowerCase().includes(query) ||
      w.userName.toLowerCase().includes(query) ||
      w.userId.toLowerCase().includes(query) ||
      w.type.toLowerCase().includes(query) ||
      w.status.toLowerCase().includes(query)
    );
  });

  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' {
    switch (status) {
      case 'Active': return 'success';
      case 'Locked': return 'danger';
      case 'Frozen': return 'warn';
      default: return 'info';
    }
  }

  onExport(): void {
    console.log('Export wallets');
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
  }
}

