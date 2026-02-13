import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { permissionGuard } from './core/guards/permission.guard';
import { Feature } from './core/models/admin-permission.model';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'admin',
    loadComponent: () => import('./layout/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'access-restricted',
        loadComponent: () => import('./features/auth/access-restricted/access-restricted.component').then(m => m.AccessRestrictedComponent)
      },
      {
        path: 'dashboard',
        canActivate: [permissionGuard],
        data: { feature: Feature.Dashboard },
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'users',
        canActivate: [permissionGuard],
        data: { feature: Feature.Users },
        loadComponent: () => import('./features/users/users-list/users-list.component').then(m => m.UsersListComponent)
      },
      {
        path: 'users/:id',
        canActivate: [permissionGuard],
        data: { feature: Feature.Users },
        loadComponent: () => import('./features/users/user-details/user-details.component').then(m => m.UserDetailsComponent)
      },
      {
        path: 'earnings',
        canActivate: [permissionGuard],
        data: { feature: Feature.Earnings },
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
        canActivate: [permissionGuard],
        data: { feature: Feature.Wallets },
        children: [
          { path: 'overview', loadComponent: () => import('./features/wallets/dashboard/wallet-dashboard.component').then(m => m.WalletDashboardComponent) },
          { path: '', loadComponent: () => import('./features/wallets/list/wallet-list.component').then(m => m.WalletListComponent) },
          { path: ':id', loadComponent: () => import('./features/wallets/details/wallet-details.component').then(m => m.WalletDetailsComponent) }
        ]
      },
      {
        path: 'payments',
        canActivate: [permissionGuard],
        data: { feature: Feature.Payments },
        children: [
          { path: '', loadComponent: () => import('./features/payments/list/payments-list.component').then(m => m.PaymentsListComponent) },
          { path: ':id', loadComponent: () => import('./features/payments/details/payment-details.component').then(m => m.PaymentDetailsComponent) }
        ]
      },
      {
        path: 'withdrawals',
        canActivate: [permissionGuard],
        data: { feature: Feature.Withdrawals },
        children: [
          { path: '', loadComponent: () => import('./features/withdrawals/list/withdrawals-list.component').then(m => m.WithdrawalsListComponent) },
          { path: 'pending', loadComponent: () => import('./features/withdrawals/list/withdrawals-list.component').then(m => m.WithdrawalsListComponent), data: { defaultFilter: 'Pending' } },
          { path: ':id', loadComponent: () => import('./features/withdrawals/details/withdrawal-details.component').then(m => m.WithdrawalDetailsComponent) }
        ]
      },
      {
        path: 'products',
        canActivate: [permissionGuard],
        data: { feature: Feature.Products },
        children: [
          { path: '', loadComponent: () => import('./features/products/list/product-list.component').then(m => m.ProductListComponent) },
          { path: ':id/edit', loadComponent: () => import('./features/products/details/product-edit.component').then(m => m.ProductEditComponent) }
        ]
      },
      {
        path: 'orders',
        canActivate: [permissionGuard],
        data: { feature: Feature.OrdersLogistics },
        children: [
          { path: '', loadComponent: () => import('./features/orders/list/order-list.component').then(m => m.OrderListComponent) },
          { path: ':id', loadComponent: () => import('./features/orders/details/order-details.component').then(m => m.OrderDetailsComponent) }
        ]
      },
      {
        path: 'logistics',
        canActivate: [permissionGuard],
        data: { feature: Feature.OrdersLogistics },
        loadComponent: () => import('./features/orders/logistics/logistics-config.component').then(m => m.LogisticsConfigComponent)
      },
      {
        path: 'reports',
        canActivate: [permissionGuard],
        data: { feature: Feature.ReportsAudit },
        loadComponent: () => import('./features/reports/reports-overview.component').then(m => m.ReportsOverviewComponent)
      },
      {
        path: 'audit',
        canActivate: [permissionGuard],
        data: { feature: Feature.ReportsAudit },
        loadComponent: () => import('./features/audit/audit-logs.component').then(m => m.AuditLogsComponent)
      },
      {
        path: 'system',
        canActivate: [permissionGuard],
        data: { feature: Feature.SystemConfig },
        loadComponent: () => import('./features/system/config/system-layout.component').then(m => m.SystemLayoutComponent),
        children: [
          { path: '', redirectTo: 'overview', pathMatch: 'full' },
          { path: 'overview', loadComponent: () => import('./features/system/overview/system-overview.component').then(m => m.SystemOverviewComponent) },
          { path: 'general', loadComponent: () => import('./features/system/general/general-settings.component').then(m => m.GeneralSettingsComponent) },
          { path: 'financial', loadComponent: () => import('./features/system/financial/financial-rules.component').then(m => m.FinancialRulesComponent) },
          { path: 'currency', loadComponent: () => import('./features/system/currency/currency-localization.component').then(m => m.CurrencyLocalizationComponent) },
          { path: 'features', loadComponent: () => import('./features/system/features/feature-toggles.component').then(m => m.FeatureTogglesComponent) },
          { path: 'thresholds', loadComponent: () => import('./features/system/thresholds/thresholds-limits.component').then(m => m.ThresholdsLimitsComponent) }
        ]
      },
      {
        path: 'merchants',
        canActivate: [permissionGuard],
        data: { feature: Feature.Merchants },
        children: [
          { path: '', loadComponent: () => import('./features/merchants/list/merchants-list.component').then(m => m.MerchantsListComponent) },
          { path: ':id', loadComponent: () => import('./features/merchants/details/merchant-details.component').then(m => m.MerchantDetailsComponent) }
        ]
      },
      {
        path: 'notifications',
        canActivate: [permissionGuard],
        data: { feature: Feature.Notifications },
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
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
