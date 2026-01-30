import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';

interface MenuItem {
  label: string;
  icon: string;
  route?: string;
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
  standalone: true,
  imports: [CommonModule, RouterModule, ConfirmDialogModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
  providers: [ConfirmationService]
})
export class SidebarComponent {
  private router = inject(Router);
  private confirmationService = inject(ConfirmationService);

  @Input() collapsed = false;
  @Output() collapsedChange = new EventEmitter<boolean>();

  menuSections: MenuSection[] = [
    {
      title: 'MAIN MENU',
      items: [
        { label: 'Dashboard', icon: 'pi pi-th-large', route: '/admin/dashboard' },
        { label: 'User Management', icon: 'pi pi-users', route: '/admin/users' },
        { label: 'Payments', icon: 'pi pi-credit-card', route: '/admin/payments' },
        { 
          label: 'Wallets', 
          icon: 'pi pi-wallet', 
          submenu: [
            { label: 'Overview', icon: 'pi pi-chart-bar', route: '/admin/wallets/overview' },
            { label: 'All Wallets', icon: 'pi pi-list', route: '/admin/wallets' }
          ]
        },
        { 
          label: 'Withdrawals', 
          icon: 'pi pi-money-bill', 
          submenu: [
            { label: 'All Requests', icon: 'pi pi-list', route: '/admin/withdrawals' },
            { label: 'Pending', icon: 'pi pi-clock', route: '/admin/withdrawals/pending' }
          ]
        },
        { label: 'Earnings', icon: 'pi pi-dollar', route: '/admin/earnings' }
      ]
    },
    {
      title: 'FEATURES',
      items: [
        { label: 'Products', icon: 'pi pi-shopping-bag', route: '/admin/products' },
        { label: 'Subscriptions', icon: 'pi pi-credit-card', route: '/admin/subscriptions' },
        { label: 'Feedback', icon: 'pi pi-comments', route: '/admin/feedback' }
      ]
    },
    {
      title: 'GENERAL',
      items: [
        { label: 'Settings', icon: 'pi pi-cog', route: '/admin/settings' },
        { label: 'Help Desk', icon: 'pi pi-question-circle', route: '/admin/help' },
        { label: 'Log out', icon: 'pi pi-sign-out', action: () => this.logout() }
      ]
    }
  ];

  toggleCollapse() {
    this.collapsed = !this.collapsed;
    this.collapsedChange.emit(this.collapsed);
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
        localStorage.removeItem('token');
        this.router.navigate(['/login']);
      }
    });
  }
}

