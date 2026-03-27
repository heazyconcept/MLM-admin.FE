import { Component, inject, ChangeDetectionStrategy, model, computed } from '@angular/core';
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
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarComponent {
  private router = inject(Router);
  private confirmationService = inject(ConfirmationService);
  private permission = inject(PermissionService);
  private auth = inject(AuthService);

  collapsed = model(false);

  private menuSections: MenuSection[] = [
    {
      title: 'MAIN MENU',
      items: [
        { label: 'Dashboard', icon: 'pi pi-th-large', route: '/admin/dashboard', feature: Feature.Dashboard },
        { label: 'Users', icon: 'pi pi-users', route: '/admin/users', feature: Feature.Users },
        { label: 'Earnings', icon: 'pi pi-dollar', route: '/admin/earnings', feature: Feature.Earnings },
        {
          label: 'Wallets',
          icon: 'pi pi-wallet',
          feature: Feature.Wallets,
          submenu: [
            { label: 'Overview', icon: 'pi pi-chart-bar', route: '/admin/wallets/overview', feature: Feature.Wallets },
            { label: 'All Wallets', icon: 'pi pi-list', route: '/admin/wallets', feature: Feature.Wallets }
          ]
        },
        {
          label: 'Withdrawals',
          icon: 'pi pi-money-bill',
          feature: Feature.Withdrawals,
          submenu: [
            { label: 'All Requests', icon: 'pi pi-list', route: '/admin/withdrawals', feature: Feature.Withdrawals },
            { label: 'Pending', icon: 'pi pi-clock', route: '/admin/withdrawals/pending', feature: Feature.Withdrawals }
          ]
        },
        { label: 'Payments', icon: 'pi pi-credit-card', route: '/admin/payments', feature: Feature.Payments },
        {
          label: 'Products',
          icon: 'pi pi-shopping-bag',
          feature: Feature.Products,
          submenu: [
            { label: 'Catalog', icon: 'pi pi-list', route: '/admin/products', feature: Feature.Products },
            { label: 'Categories', icon: 'pi pi-tags', route: '/admin/products/categories', feature: Feature.Products }
          ]
        },
        { label: 'Orders', icon: 'pi pi-credit-card', route: '/admin/orders', feature: Feature.OrdersLogistics},
        {
          label: 'Merchants',
          icon: 'pi pi-truck',
          feature: Feature.Merchants,
          submenu: [
            { label: 'All Merchants', icon: 'pi pi-list', route: '/admin/merchants', feature: Feature.Merchants },
            { label: 'Category Config', icon: 'pi pi-sliders-h', route: '/admin/merchants/category-config', feature: Feature.Merchants }
          ]
        },
        { label: 'Notifications', icon: 'pi pi-bell', route: '/admin/notifications', feature: Feature.Notifications }
      ]
    },
    {
      title: 'REPORTS & AUDIT',
      items: [
        { label: 'Reports', icon: 'pi pi-file-edit', route: '/admin/reports', feature: Feature.ReportsAudit },
        { label: 'Audit Logs', icon: 'pi pi-history', route: '/admin/audit', feature: Feature.ReportsAudit }
      ]
    },
    {
      title: 'GENERAL',
      items: [
          // { label: 'System Configuration', icon: 'pi pi-cog', route: '/admin/system', feature: Feature.SystemConfig },
        { label: 'Log out', icon: 'pi pi-sign-out', action: () => this.logout() }
      ]
    }
  ];

  filteredMenuSections = computed(() => {
    return this.menuSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          if (!item.feature) return true;
          return this.permission.hasAccess(item.feature);
        })
      }))
      .filter((section) => section.items.length > 0);
  });

  toggleCollapse() {
    this.collapsed.update((v) => !v);
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
      }
    });
  }
}
