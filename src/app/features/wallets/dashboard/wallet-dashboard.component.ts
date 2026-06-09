import { Component, inject, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { WalletService } from '../services/wallet.service';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-wallet-dashboard',
  imports: [CommonModule, ChartModule, RouterModule, ButtonModule],
  templateUrl: './wallet-dashboard.component.html',
  styleUrls: ['./wallet-dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WalletDashboardComponent {
  private walletService = inject(WalletService);
  
  wallets = this.walletService.wallets;

  overview = computed(() => {
    const wallets = this.wallets();
    return {
      totalBalanceUSD: wallets
        .filter(w => (w.displayCurrency ?? '').toUpperCase() === 'USD')
        .reduce((acc, w) => acc + w.balance, 0),
      totalBalanceNGN: wallets
        .filter(w => (w.displayCurrency ?? '').toUpperCase() === 'NGN')
        .reduce((acc, w) => acc + w.balance, 0)
    };
  });

  // Computed statistics
  stats = computed(() => {
    const wallets = this.wallets();
    return {
      totalWallets: wallets.length,
      activeWallets: wallets.filter(w => w.status === 'Active').length,
      lockedWallets: wallets.filter(w => w.status === 'Locked').length,
      frozenWallets: wallets.filter(w => w.status === 'Frozen').length,
      mainWallets: wallets.filter(w => w.walletType === 'CASH').length,
      tradingWallets: wallets.filter(w => w.walletType === 'TRADING').length,
      bonusWallets: wallets.filter(w => w.walletType === 'BONUS').length
    };
  });

  // Dynamic Chart Data
  chartData = computed(() => {
    const s = this.stats();
    return {
      labels: ['Main', 'Trading', 'Bonus'],
      datasets: [
        {
          data: [s.mainWallets, s.tradingWallets, s.bonusWallets],
          backgroundColor: ['#10B981', '#3B82F6', '#F59E0B'],
          hoverBackgroundColor: ['#059669', '#2563EB', '#D97706']
        }
      ]
    };
  });

  chartOptions = {
    cutout: '60%',
    plugins: {
      legend: {
        position: 'bottom'
      }
    }
  };

  ngOnInit(): void {
    // Load a sample of wallets to drive basic stats and chart.
    this.walletService.listWallets({ limit: 50, offset: 0 }).subscribe();
  }
}
