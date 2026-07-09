import {
  Component,
  inject,
  ChangeDetectionStrategy,
  model,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { PermissionService } from '../../core/services/permission.service';
import { AuthService } from '../../core/services/auth.service';
import { Feature } from '../../core/models/admin-permission.model';

interface MenuItem {
  label: string;
  icon: string;
  route?: string;
  feature?: Feature;
  permissionKey?: string;
  badge?: number;
  action?: () => void;
  submenu?: MenuItem[];
  expanded?: boolean;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, RouterModule, ConfirmDialogModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
  providers: [ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  private router = inject(Router);
  private confirmationService = inject(ConfirmationService);
  private permission = inject(PermissionService);
  private auth = inject(AuthService);

  collapsed = model(false);
  mobileOpen = model(false);

  private menuSections: MenuSection[] = [
    {
      title: 'MAIN MENU',
      items: [
        {
          label: 'Dashboard',
          icon: 'pi pi-th-large',
          route: '/admin/dashboard',
          feature: Feature.Dashboard,
          permissionKey: 'dashboard.view',
        },
        {
          label: 'Users',
          icon: 'pi pi-users',
          route: '/admin/users',
          feature: Feature.Users,
          permissionKey: 'users.view',
        },
        {
          label: 'Earnings Payouts',
          icon: 'pi pi-percentage',
          feature: Feature.ReportsAudit,
          permissionKey: 'reports.earnings_payouts',
          submenu: [
            {
              label: 'All payouts',
              icon: 'pi pi-list',
              route: '/admin/reports/earnings',
              permissionKey: 'reports.earnings_payouts',
            },
            {
              label: 'Activation',
              icon: 'pi pi-bolt',
              route: '/admin/reports/earnings/activation',
              permissionKey: 'reports.earnings_payouts',
            },
            {
              label: 'Upgrade',
              icon: 'pi pi-level-up',
              route: '/admin/reports/earnings/upgrade',
              permissionKey: 'reports.earnings_payouts',
            },
            {
              label: 'Product purchase',
              icon: 'pi pi-shopping-cart',
              route: '/admin/reports/earnings/product-purchase',
              permissionKey: 'reports.earnings_payouts',
            },
            {
              label: 'PDPA',
              icon: 'pi pi-calendar',
              route: '/admin/reports/earnings/pdpa',
              permissionKey: 'reports.earnings_payouts',
            },
            {
              label: 'CDPA',
              icon: 'pi pi-calendar-plus',
              route: '/admin/reports/earnings/cdpa',
              permissionKey: 'reports.earnings_payouts',
            },
            {
              label: 'Bonuses',
              icon: 'pi pi-star',
              route: '/admin/reports/earnings/bonuses',
              permissionKey: 'reports.earnings_payouts',
            },
            {
              label: 'Admin adjustment',
              icon: 'pi pi-sliders-h',
              route: '/admin/reports/earnings/admin-adjustment',
              permissionKey: 'reports.earnings_payouts',
            },
            {
              label: 'CPV',
              icon: 'pi pi-chart-bar',
              route: '/admin/reports/earnings/cpv',
              permissionKey: 'reports.cpv',
            },
          ],
        },
        {
          label: 'CPV Milestones',
          icon: 'pi pi-chart-bar',
          route: '/admin/cpv-config',
          feature: Feature.Earnings,
          permissionKey: 'earnings.configure_cpv',
        },
        {
          label: 'Wallets',
          icon: 'pi pi-wallet',
          feature: Feature.Wallets,
          permissionKey: 'wallets.view',
          submenu: [
            {
              label: 'Wallet Types',
              icon: 'pi pi-wallet',
              route: '/admin/wallets/types',
              permissionKey: 'wallets.view',
            },
            {
              label: 'All Wallets',
              icon: 'pi pi-list',
              route: '/admin/wallets',
              permissionKey: 'wallets.view',
            },
          ],
        },
        {
          label: 'Withdrawals',
          icon: 'pi pi-money-bill',
          feature: Feature.Withdrawals,
          permissionKey: 'withdrawals.view',
          submenu: [
            {
              label: 'All Requests',
              icon: 'pi pi-list',
              route: '/admin/withdrawals',
              permissionKey: 'withdrawals.view',
            },
            {
              label: 'Pending',
              icon: 'pi pi-clock',
              route: '/admin/withdrawals/pending',
              permissionKey: 'withdrawals.view',
            },
          ],
        },
        {
          label: 'Payments',
          icon: 'pi pi-credit-card',
          route: '/admin/payments',
          feature: Feature.Payments,
          permissionKey: 'payments.view',
        },
        {
          label: 'Manual Payments',
          icon: 'pi pi-file-edit',
          route: '/admin/payments/manual',
          feature: Feature.Payments,
          permissionKey: 'payments.view',
        },
        {
          label: 'Manual Wallet Deposits',
          icon: 'pi pi-wallet',
          route: '/admin/payments/manual-deposits',
          feature: Feature.Payments,
          permissionKey: 'payments.view',
        },
        {
          label: 'Products',
          icon: 'pi pi-shopping-bag',
          feature: Feature.Products,
          permissionKey: 'products.view',
          submenu: [
            {
              label: 'Catalog',
              icon: 'pi pi-list',
              route: '/admin/products',
              permissionKey: 'products.view',
            },
            {
              label: 'Stock',
              icon: 'pi pi-box',
              route: '/admin/products/stock',
              permissionKey: 'products.manage_stock',
            },
            {
              label: 'Categories',
              icon: 'pi pi-tags',
              route: '/admin/products/categories',
              permissionKey: 'products.manage_categories',
            },
          ],
        },
        {
          label: 'Orders',
          icon: 'pi pi-credit-card',
          feature: Feature.OrdersLogistics,
          permissionKey: 'orders.view',
          submenu: [
            {
              label: 'All Orders',
              icon: 'pi pi-list',
              route: '/admin/orders',
              permissionKey: 'orders.view',
            },
            {
              label: 'Order Disputes',
              icon: 'pi pi-exclamation-circle',
              route: '/admin/orders/disputes',
              permissionKey: 'orders.view',
            },
          ],
        },
        {
          label: 'Merchants',
          icon: 'pi pi-truck',
          feature: Feature.Merchants,
          permissionKey: 'merchants.view',
          submenu: [
            {
              label: 'All Merchants',
              icon: 'pi pi-list',
              route: '/admin/merchants',
              permissionKey: 'merchants.view',
            },
            {
              label: 'Category Config',
              icon: 'pi pi-sliders-h',
              route: '/admin/merchants/category-config',
              permissionKey: 'merchants.configure_categories',
            },
            {
              label: 'Stock Disputes',
              icon: 'pi pi-exclamation-circle',
              route: '/admin/merchants/stock-disputes',
              permissionKey: 'merchants.view',
            },
          ],
        },
        {
          label: 'Notifications',
          icon: 'pi pi-bell',
          route: '/admin/notifications',
          feature: Feature.Notifications,
          permissionKey: 'notifications.view',
        },
      ],
    },
    {
      title: 'REPORTS & AUDIT',
      items: [
        {
          label: 'Profit Reports',
          icon: 'pi pi-chart-line',
          route: '/admin/reports/profit',
          feature: Feature.ReportsAudit,
          permissionKey: 'reports.profit',
        },
        {
          label: 'Audit Logs',
          icon: 'pi pi-history',
          route: '/admin/audit',
          feature: Feature.ReportsAudit,
          permissionKey: 'audit.view_logs',
        },
      ],
    },
    {
      title: 'GENERAL',
      items: [
        {
          label: 'Admin Management',
          icon: 'pi pi-shield',
          feature: Feature.AdminManagement,
          permissionKey: 'admin_management.view',
          submenu: [
            {
              label: 'Roles & Permissions',
              icon: 'pi pi-id-card',
              route: '/admin/admin-management/roles',
              permissionKey: 'admin_management.manage_roles',
            },
            {
              label: 'User Groups',
              icon: 'pi pi-sitemap',
              route: '/admin/admin-management/user-groups',
              permissionKey: 'admin_management.manage_groups',
            },
            {
              label: 'Admin Users',
              icon: 'pi pi-users',
              route: '/admin/admin-management/admin-users',
              permissionKey: 'admin_management.manage_users',
            },
          ],
        },
        {
          label: 'Log out',
          icon: 'pi pi-sign-out',
          action: () => this.logout(),
        },
      ],
    },
  ];

  filteredMenuSections = computed(() =>
    this.menuSections
      .map((section) => ({
        ...section,
        items: section.items
          .map((item) => this.filterMenuItem(item))
          .filter((item): item is MenuItem => item !== null),
      }))
      .filter((section) => section.items.length > 0)
  );

  private filterMenuItem(item: MenuItem): MenuItem | null {
    if (item.submenu?.length) {
      const submenu = item.submenu
        .map((child) => this.filterMenuItem(child))
        .filter((child): child is MenuItem => child !== null);

      if (submenu.length === 0) {
        return null;
      }

      return { ...item, submenu };
    }

    return this.isMenuItemVisible(item) ? item : null;
  }

  private isMenuItemVisible(item: MenuItem): boolean {
    if (item.action && !item.feature && !item.permissionKey) {
      return true;
    }

    if (item.permissionKey) {
      return this.permission.hasPermission(item.permissionKey);
    }

    if (item.feature) {
      return this.permission.hasAccess(item.feature);
    }

    return true;
  }

  toggleCollapse() {
    this.collapsed.update((v) => !v);
  }

  closeMobile() {
    this.mobileOpen.set(false);
  }

  onNavClick() {
    if (this.mobileOpen()) {
      this.mobileOpen.set(false);
    }
  }

  logout() {
    this.confirmationService.confirm({
      message: 'Are you sure you want to log out?',
      header: 'Logout Confirmation',
      icon: 'pi pi-info-circle',
      acceptButtonStyleClass: 'p-button-danger p-button-text',
      rejectButtonStyleClass: 'p-button-text p-button-text',
      acceptIcon: 'none',
      rejectIcon: 'none',
      accept: () => {
        this.auth.logout();
        this.router.navigate(['/login']);
      },
    });
  }
}
