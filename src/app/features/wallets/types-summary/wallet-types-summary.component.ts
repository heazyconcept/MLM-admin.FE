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
import { WalletService, Wallet, GlobalWalletSummaryItem } from '../services/wallet.service';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

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

  // States
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  
  // Live global summaries from the new API
  globalSummaries = signal<GlobalWalletSummaryItem[]>([]);

  // Defined wallet types list with rich metadata
  walletTypesConfig = [
    {
      type: 'CASH',
      label: 'Cash Wallet',
      description: 'Used for direct commission earnings, bonuses, and processing external bank withdrawals.',
      icon: 'pi pi-money-bill',
      colorClass: 'emerald',
      bgClass: 'bg-emerald-50/60 border-emerald-100',
      textClass: 'text-emerald-700',
      borderClass: 'border-emerald-200',
      fallbackCount: 0,
    },
    {
      type: 'REGISTRATION',
      label: 'Registration Wallet',
      description: 'Dedicated funds used exclusively for new user package registrations and sponsor activations.',
      icon: 'pi pi-user-plus',
      colorClass: 'blue',
      bgClass: 'bg-blue-50/60 border-blue-100',
      textClass: 'text-blue-700',
      borderClass: 'border-blue-200',
      fallbackCount: 0,
    },
    {
      type: 'AUTOSHIP',
      label: 'Autoship Wallet',
      description: 'Locked auto-shipment funds designated for monthly product cycles and maintenance purchases.',
      icon: 'pi pi-refresh',
      colorClass: 'purple',
      bgClass: 'bg-purple-50/60 border-purple-100',
      textClass: 'text-purple-700',
      borderClass: 'border-purple-200',
      fallbackCount: 0,
    },
    {
      type: 'VOUCHER',
      label: 'Product Voucher Wallet',
      description: 'Earned non-cashable product credit used to claim physical inventory and company promotional gifts.',
      icon: 'pi pi-ticket',
      colorClass: 'amber',
      bgClass: 'bg-amber-50/60 border-amber-100',
      textClass: 'text-amber-700',
      borderClass: 'border-amber-200',
      fallbackCount: 0,
    }
  ];

  // Computed final data merging configurations and real API global summary data
  typesSummary = computed<WalletTypeSummary[]>(() => {
    const apiSummaries = this.globalSummaries();
    
    return this.walletTypesConfig.map(config => {
      // Find matching item from live API summaries
      const apiItem = apiSummaries.find(s => s.walletType.toUpperCase() === config.type);
      
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

  // Global aggregate metrics
  globalMetrics = computed(() => {
    const summaries = this.typesSummary();
    const totalCount = summaries.reduce((acc, curr) => acc + curr.totalWallets, 0);
    const totalBalance = summaries.reduce((acc, curr) => acc + curr.totalBalance, 0);
    const currency = summaries[0]?.currency || 'NGN';
    
    return {
      totalCount,
      totalBalance,
      currency
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
        this.error.set(err?.error?.message ?? err?.message ?? 'Failed to load global wallet summaries');
        this.loading.set(false);
      }
    });
  }

  viewAllOfType(type: string): void {
    // Navigate to All Wallets with query parameter filter
    this.router.navigate(['/admin/wallets'], { queryParams: { walletType: type } });
  }
}
