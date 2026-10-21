import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

// App
import { WalletService, GlobalWalletSummaryItem } from '../services/wallet.service';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import {
  WALLET_TYPE_DISPLAY_CONFIG,
  normalizeWalletTypeKey,
} from '../wallet-type-display.util';

interface WalletTypeSummary {
  type: string;
  label: string;
  description: string;
  icon: string;
  colorClass: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  totalWallets: number;
  totalBalance: number;
  currency: string;
  averageBalance: number;
}

@Component({
  selector: 'app-wallet-types-summary',
  imports: [
    CommonModule,
    ButtonModule,
    CardModule,
    TableModule,
    TagModule,
    TooltipModule,
    StatusBadgeComponent,
  ],
  templateUrl: './wallet-types-summary.component.html',
  styleUrls: ['./wallet-types-summary.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WalletTypesSummaryComponent implements OnInit {
  private walletService = inject(WalletService);
  private router = inject(Router);

  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  globalSummaries = signal<GlobalWalletSummaryItem[]>([]);

  walletTypesConfig = WALLET_TYPE_DISPLAY_CONFIG.map((c) => ({
    ...c,
    fallbackCount: 0,
  }));

  typesSummary = computed<WalletTypeSummary[]>(() => {
    const apiSummaries = this.globalSummaries();

    return this.walletTypesConfig.map((config) => {
      const apiItem = apiSummaries.find(
        (s) => normalizeWalletTypeKey(s.walletType) === config.type,
      );

      const totalBalance = apiItem ? apiItem.totalBalance : 0;
      const totalWallets = apiItem ? apiItem.totalWallets : config.fallbackCount;
      const currency = apiItem ? apiItem.currency : 'NGN';
      const averageBalance = totalWallets > 0 ? totalBalance / totalWallets : 0;

      return {
        type: config.type,
        label: config.label,
        description: config.description,
        icon: config.icon,
        colorClass: config.colorClass,
        bgClass: config.bgClass,
        textClass: config.textClass,
        borderClass: config.borderClass,
        totalWallets,
        totalBalance,
        currency,
        averageBalance,
      };
    });
  });

  globalMetrics = computed(() => {
    const summaries = this.globalSummaries();
    const totalCount = summaries.reduce((acc, curr) => acc + curr.totalWallets, 0);
    const byCurrency = new Map<string, number>();
    for (const item of summaries) {
      const currency = item.currency || 'NGN';
      byCurrency.set(currency, (byCurrency.get(currency) ?? 0) + item.totalBalance);
    }
    const grandTotals = Array.from(byCurrency.entries()).map(([currency, totalBalance]) => ({
      currency,
      totalBalance,
    }));

    return {
      totalCount,
      grandTotals,
      primaryCurrency: grandTotals[0]?.currency ?? 'NGN',
      primaryTotalBalance: grandTotals[0]?.totalBalance ?? 0,
    };
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);

    this.walletService.getGlobalWalletSummary().subscribe({
      next: (data) => {
        this.globalSummaries.set(data || []);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(
          err?.error?.message ?? err?.message ?? 'Failed to load global wallet summaries',
        );
        this.loading.set(false);
      },
    });
  }

  viewAllOfType(type: string): void {
    this.router.navigate(['/admin/wallets'], { queryParams: { walletType: type } });
  }
}
