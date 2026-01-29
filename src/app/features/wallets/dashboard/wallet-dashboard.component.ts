import { Component, inject, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { WalletService } from '../services/wallet.service';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-wallet-dashboard',
  standalone: true,
  imports: [CommonModule, ChartModule, RouterModule, ButtonModule],
  templateUrl: './wallet-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WalletDashboardComponent {
  private walletService = inject(WalletService);
  
  overview = this.walletService.getOverview();
  wallets = this.walletService.wallets();

  // Computed statistics
  stats = computed(() => {
    const wallets = this.walletService.wallets();
    return {
      totalWallets: wallets.length,
      activeWallets: wallets.filter(w => w.status === 'Active').length,
      lockedWallets: wallets.filter(w => w.status === 'Locked').length,
      frozenWallets: wallets.filter(w => w.status === 'Frozen').length,
      mainWallets: wallets.filter(w => w.type === 'Main').length,
      tradingWallets: wallets.filter(w => w.type === 'Trading').length,
      bonusWallets: wallets.filter(w => w.type === 'Bonus').length
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
}
