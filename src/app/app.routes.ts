import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'admin',
    loadComponent: () => import('./layout/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./features/users/users-list/users-list.component').then(m => m.UsersListComponent)
      },
      {
        path: 'users/:id',
        loadComponent: () => import('./features/users/user-details/user-details.component').then(m => m.UserDetailsComponent)
      },
      {
        path: 'earnings',
        loadComponent: () => import('./features/earnings/layout/earnings-layout.component').then(m => m.EarningsLayoutComponent),
        children: [
          { path: '', redirectTo: 'overview', pathMatch: 'full' },
          { path: 'overview', loadComponent: () => import('./features/earnings/overview/earnings-overview.component').then(m => m.EarningsOverviewComponent) },
          { path: 'bonuses', loadComponent: () => import('./features/earnings/bonuses/bonus-configuration.component').then(m => m.BonusConfigurationComponent) },
          { path: 'ranking', loadComponent: () => import('./features/earnings/ranking/ranking-stages.component').then(m => m.RankingStagesComponent) },
          { path: 'cpv', loadComponent: () => import('./features/earnings/cpv/cpv-configuration.component').then(m => m.CpvConfigurationComponent) },
          { path: 'monitoring', loadComponent: () => import('./features/earnings/monitoring/earnings-monitoring.component').then(m => m.EarningsMonitoringComponent) }
        ]
      },
      {
        path: 'wallets',
        children: [
          { path: 'overview', loadComponent: () => import('./features/wallets/dashboard/wallet-dashboard.component').then(m => m.WalletDashboardComponent) },
          { path: '', loadComponent: () => import('./features/wallets/list/wallet-list.component').then(m => m.WalletListComponent) },
          { path: ':id', loadComponent: () => import('./features/wallets/details/wallet-details.component').then(m => m.WalletDetailsComponent) }
        ]
      },
      {
        path: 'payments',
        children: [
          { path: '', loadComponent: () => import('./features/payments/list/payments-list.component').then(m => m.PaymentsListComponent) },
          { path: ':id', loadComponent: () => import('./features/payments/details/payment-details.component').then(m => m.PaymentDetailsComponent) }
        ]
      },
      {
        path: 'withdrawals',
        children: [
          { path: '', loadComponent: () => import('./features/withdrawals/list/withdrawals-list.component').then(m => m.WithdrawalsListComponent) },
          { path: 'pending', loadComponent: () => import('./features/withdrawals/list/withdrawals-list.component').then(m => m.WithdrawalsListComponent), data: { defaultFilter: 'Pending' } },
          { path: ':id', loadComponent: () => import('./features/withdrawals/details/withdrawal-details.component').then(m => m.WithdrawalDetailsComponent) }
        ]
      },
      {
        path: 'products',
        children: [
          { path: '', loadComponent: () => import('./features/products/list/product-list.component').then(m => m.ProductListComponent) },
          { path: ':id/edit', loadComponent: () => import('./features/products/details/product-edit.component').then(m => m.ProductEditComponent) }
        ]
      },
      {
        path: 'orders',
        children: [
          { path: '', loadComponent: () => import('./features/orders/list/order-list.component').then(m => m.OrderListComponent) },
          { path: ':id', loadComponent: () => import('./features/orders/details/order-details.component').then(m => m.OrderDetailsComponent) }
        ]
      },
      {
        path: 'logistics',
        loadComponent: () => import('./features/orders/logistics/logistics-config.component').then(m => m.LogisticsConfigComponent)
      },
      {
        path: 'reports',
        loadComponent: () => import('./features/reports/reports-overview.component').then(m => m.ReportsOverviewComponent)
      },
      {
        path: 'audit',
        loadComponent: () => import('./features/audit/audit-logs.component').then(m => m.AuditLogsComponent)
      },
      {
        path: 'merchants',
        children: [
          { path: '', loadComponent: () => import('./features/merchants/list/merchants-list.component').then(m => m.MerchantsListComponent) },
          { path: ':id', loadComponent: () => import('./features/merchants/details/merchant-details.component').then(m => m.MerchantDetailsComponent) }
        ]
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  }

];

