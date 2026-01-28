import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { StatCardComponent } from './components/stat-card/stat-card.component';
import { SystemStatusComponent } from './components/system-status/system-status.component';
import { WalletSummaryComponent, WalletSummaryData } from './components/wallet-summary/wallet-summary.component';
import { OverviewChartComponent } from './components/overview-chart/overview-chart.component';
import { PackageChartComponent } from './components/package-chart/package-chart.component';
import { PendingActionsComponent } from './components/pending-actions/pending-actions.component';
import { ActivityFeedComponent } from './components/activity-feed/activity-feed.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ButtonModule,
    StatCardComponent,
    SystemStatusComponent,
    WalletSummaryComponent,
    OverviewChartComponent,
    PackageChartComponent,
    PendingActionsComponent,
    ActivityFeedComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {
  userName = 'Admin';
  currentDate = new Date();

  // System Overview Stats
  systemStats = [
    {
      title: 'Total Users',
      value: '12,458',
      icon: 'pi pi-users',
      iconBg: 'bg-mlm-green-100',
      iconColor: 'text-mlm-primary',
      change: 12.5,
      changeLabel: 'from last month'
    },
    {
      title: 'Active Users',
      value: '8,934',
      subtitle: '71.6% of total',
      icon: 'pi pi-user-plus',
      iconBg: 'bg-mlm-success/10',
      iconColor: 'text-mlm-success',
      change: 8.2,
      changeLabel: 'from last month'
    },
    {
      title: 'Merchants',
      value: '156',
      icon: 'pi pi-shop',
      iconBg: 'bg-mlm-blue-100',
      iconColor: 'text-mlm-blue-600',
      change: 24.3,
      changeLabel: 'from last month'
    }
  ];

  // Financial Stats
  financialStats = [
    {
      title: 'Total Earnings',
      value: '$4,582,340.89',
      icon: 'pi pi-chart-line',
      iconBg: 'bg-mlm-primary/10',
      iconColor: 'text-mlm-primary',
      change: 18.7,
      changeLabel: 'from last month'
    },
    {
      title: 'Total Withdrawals',
      value: '$1,245,670.00',
      icon: 'pi pi-wallet',
      iconBg: 'bg-mlm-warning/10',
      iconColor: 'text-mlm-warning',
      change: -5.2,
      changeLabel: 'from last month'
    }
  ];

  // User Metrics
  userMetrics = [
    {
      title: 'New Registrations',
      value: '847',
      subtitle: 'This month',
      icon: 'pi pi-user-plus',
      iconBg: 'bg-mlm-success/10',
      iconColor: 'text-mlm-success',
      change: 15.3,
      changeLabel: 'from last month'
    },
    {
      title: 'Active Network',
      value: '45,892',
      subtitle: 'Total legs',
      icon: 'pi pi-sitemap',
      iconBg: 'bg-mlm-primary/10',
      iconColor: 'text-mlm-primary',
      change: 9.8,
      changeLabel: 'growth'
    }
  ];

  // Wallet Summary Data
  walletSummary: WalletSummaryData[] = [
    { type: 'Withdrawable', label: 'Cash Wallet', balance: '$2,456,780.00', icon: 'pi pi-wallet', color: '#49A321' },
    { type: 'Non-Withdrawable', label: 'Product Voucher', balance: '$892,450.00', icon: 'pi pi-ticket', color: '#3b82f6' },
    { type: 'Non-Withdrawable', label: 'Autoship Wallet', balance: '$345,890.00', icon: 'pi pi-refresh', color: '#F9A825' }
  ];

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  }
}
