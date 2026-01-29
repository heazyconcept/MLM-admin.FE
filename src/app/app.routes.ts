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
