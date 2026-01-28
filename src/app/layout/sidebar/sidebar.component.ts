import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface MenuItem {
  label: string;
  icon: string;
  route?: string;
  badge?: number;
  action?: () => void;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  @Input() collapsed = false;
  @Output() collapsedChange = new EventEmitter<boolean>();

  menuSections: MenuSection[] = [
    {
      title: 'MAIN MENU',
      items: [
        { label: 'Dashboard', icon: 'pi pi-th-large', route: '/dashboard' },
        { label: 'User Management', icon: 'pi pi-users', route: '/users' },
        { label: 'Transactions', icon: 'pi pi-arrow-right-arrow-left', route: '/transactions' },
        { label: 'Invoices', icon: 'pi pi-file', route: '/invoices' }
      ]
    },
    {
      title: 'FEATURES',
      items: [
        { label: 'Recurring', icon: 'pi pi-refresh', route: '/recurring', badge: 16 },
        { label: 'Subscriptions', icon: 'pi pi-credit-card', route: '/subscriptions' },
        { label: 'Feedback', icon: 'pi pi-comments', route: '/feedback' }
      ]
    },
    {
      title: 'GENERAL',
      items: [
        { label: 'Settings', icon: 'pi pi-cog', route: '/settings' },
        { label: 'Help Desk', icon: 'pi pi-question-circle', route: '/help' },
        { label: 'Log out', icon: 'pi pi-sign-out', action: () => this.logout() }
      ]
    }
  ];

  toggleCollapse() {
    this.collapsed = !this.collapsed;
    this.collapsedChange.emit(this.collapsed);
  }

  logout() {
    // Implement logout logic
    console.log('Logging out...');
  }
}

