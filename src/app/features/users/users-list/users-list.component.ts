import { Component, ChangeDetectionStrategy, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { MessageService, MenuItem } from 'primeng/api';

import { TooltipModule } from 'primeng/tooltip';
import { DatePickerModule } from 'primeng/datepicker';

import { UserProfileModalComponent } from '../user-profile-modal/user-profile-modal.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ConfirmationModalComponent, ConfirmationResult } from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { UsersService, User, UserFilters } from '../services/users.service';

interface ActionConfig {
  visible: boolean;
  title: string;
  message: string;
  icon: string;
  iconClass: string;
  confirmLabel: string;
  confirmClass: string;
  showReasonField: boolean;
  reasonRequired: boolean;
  action: string;
}

@Component({
  selector: 'app-users-list',
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    MenuModule,
    ToastModule,
    InputTextModule,
    SelectModule,
    TooltipModule,
    DatePickerModule,
    UserProfileModalComponent,
    StatusBadgeComponent,
    ConfirmationModalComponent
  ],
  providers: [MessageService],
  templateUrl: './users-list.component.html',
  styleUrls: ['./users-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsersListComponent implements OnInit {
  private usersService = inject(UsersService);
  private messageService = inject(MessageService);
  protected router = inject(Router);

  // State signals
  users = signal<User[]>([]);
  selectedUser = signal<User | null>(null);
  profileModalVisible = signal(false);
  globalFilter = signal('');

  // Filter signals
  statusFilter = signal('');
  packageFilter = signal('');
  roleFilter = signal('');
  dateRange = signal<Date[] | null>(null);

  // Computed filtered users
  filteredUsers = computed(() => {
    let result = this.users();
    const status = this.statusFilter();
    const pkg = this.packageFilter();
    const role = this.roleFilter();
    const range = this.dateRange();
    const search = this.globalFilter().toLowerCase();

    if (status) {
      result = result.filter(u => u.status === status);
    }
    if (pkg) {
      result = result.filter(u => u.package === pkg);
    }
    if (role) {
      result = result.filter(u => u.role === role);
    }
    if (range && range.length === 2 && range[0] && range[1]) {
      const start = new Date(range[0]);
      const end = new Date(range[1]);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      
      result = result.filter(u => {
        const regDate = new Date(u.registrationDate);
        return regDate >= start && regDate <= end;
      });
    }
    if (search) {
      result = result.filter(u =>
        u.fullName.toLowerCase().includes(search) ||
        u.email.toLowerCase().includes(search) ||
        u.username.toLowerCase().includes(search) ||
        u.id.toLowerCase().includes(search)
      );
    }

    return result;
  });

  actionConfig: ActionConfig = {
    visible: false,
    title: '',
    message: '',
    icon: '',
    iconClass: '',
    confirmLabel: '',
    confirmClass: '',
    showReasonField: false,
    reasonRequired: false,
    action: ''
  };

  // Filter options
  statusOptions = [
    { label: 'All Statuses', value: '' },
    { label: 'Active', value: 'Active' },
    { label: 'Suspended', value: 'Suspended' },
    { label: 'Flagged', value: 'Flagged' }
  ];

  packageOptions = [
    { label: 'All Packages', value: '' },
    { label: 'Silver', value: 'Silver' },
    { label: 'Gold', value: 'Gold' },
    { label: 'Platinum', value: 'Platinum' },
    { label: 'Ruby', value: 'Ruby' },
    { label: 'Diamond', value: 'Diamond' }
  ];

  roleOptions = [
    { label: 'All Roles', value: '' },
    { label: 'User', value: 'User' },
    { label: 'Merchant', value: 'Merchant' }
  ];

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.users.set(this.usersService.getUsers());
  }

  onExport(): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Export',
      detail: 'Export functionality will be available in future releases'
    });
  }

  clearFilters(): void {
    this.globalFilter.set('');
    this.statusFilter.set('');
    this.packageFilter.set('');
    this.roleFilter.set('');
    this.dateRange.set(null);
  }

  viewProfile(user: User): void {
    this.selectedUser.set(user);
    this.profileModalVisible.set(true);
  }

  getActionMenuItems(user: User, menu: any): MenuItem[] {
    const items: MenuItem[] = [];

    if (user.status === 'Active') {
      items.push(
        {
          label: 'Suspend User',
          icon: 'pi pi-ban',
          command: () => {
            menu.hide();
            this.showActionModal('suspend', user);
          }
        },
        {
          label: 'Flag Account',
          icon: 'pi pi-flag',
          command: () => {
            menu.hide();
            this.showActionModal('flag', user);
          }
        }
      );
    }

    if (user.status === 'Suspended') {
      items.push({
        label: 'Reactivate User',
        icon: 'pi pi-check',
        command: () => {
          menu.hide();
          this.showActionModal('reactivate', user);
        }
      });
    }

    if (user.status === 'Flagged') {
      items.push(
        {
          label: 'Remove Flag',
          icon: 'pi pi-flag-fill',
          command: () => {
            menu.hide();
            this.showActionModal('unflag', user);
          }
        },
        {
          label: 'Suspend User',
          icon: 'pi pi-ban',
          command: () => {
            menu.hide();
            this.showActionModal('suspend', user);
          }
        }
      );
    }

    items.push({
      label: 'Reset Password',
      icon: 'pi pi-key',
      command: () => {
        menu.hide();
        this.showActionModal('resetPassword', user);
      }
    });

    return items;
  }

  showActionModal(action: string, user: User): void {
    this.selectedUser.set(user);

    const configs: Record<string, Partial<ActionConfig>> = {
      suspend: {
        title: 'Suspend User',
        message: `Are you sure you want to suspend ${user.fullName}'s account?`,
        icon: 'pi pi-ban',
        iconClass: 'text-mlm-error',
        confirmLabel: 'Suspend',
        confirmClass: 'p-button-danger',
        showReasonField: true,
        reasonRequired: true
      },
      reactivate: {
        title: 'Reactivate User',
        message: `Are you sure you want to reactivate ${user.fullName}'s account?`,
        icon: 'pi pi-check-circle',
        iconClass: 'text-mlm-success',
        confirmLabel: 'Reactivate',
        confirmClass: 'p-button-success',
        showReasonField: false,
        reasonRequired: false
      },
      flag: {
        title: 'Flag Account',
        message: `Are you sure you want to flag ${user.fullName}'s account for review?`,
        icon: 'pi pi-flag',
        iconClass: 'text-mlm-warning',
        confirmLabel: 'Flag Account',
        confirmClass: 'p-button-warning',
        showReasonField: true,
        reasonRequired: true
      },
      unflag: {
        title: 'Remove Flag',
        message: `Are you sure you want to remove the flag from ${user.fullName}'s account?`,
        icon: 'pi pi-flag-fill',
        iconClass: 'text-mlm-secondary',
        confirmLabel: 'Remove Flag',
        confirmClass: 'p-button-primary',
        showReasonField: false,
        reasonRequired: false
      },
      resetPassword: {
        title: 'Reset Password',
        message: `Are you sure you want to reset ${user.fullName}'s password? A temporary password will be sent to their email.`,
        icon: 'pi pi-key',
        iconClass: 'text-mlm-blue-600',
        confirmLabel: 'Reset Password',
        confirmClass: 'p-button-primary',
        showReasonField: false,
        reasonRequired: false
      }
    };

    const config = configs[action];
    if (config) {
      this.actionConfig = {
        visible: true,
        action,
        ...config
      } as ActionConfig;
    }
  }

  onProfileAction(event: { action: string; user: User }): void {
    this.profileModalVisible.set(false);
    this.showActionModal(event.action, event.user);
  }

  onActionConfirm(result: ConfirmationResult): void {
    const user = this.selectedUser();
    if (!user || !result.confirmed) return;

    const action = this.actionConfig.action;

    switch (action) {
      case 'suspend':
        this.usersService.updateUserStatus(user.id, 'Suspended', result.reason || '');
        this.messageService.add({
          severity: 'success',
          summary: 'User Suspended',
          detail: `${user.fullName} has been suspended`
        });
        break;
      case 'reactivate':
        this.usersService.updateUserStatus(user.id, 'Active', '');
        this.messageService.add({
          severity: 'success',
          summary: 'User Reactivated',
          detail: `${user.fullName} has been reactivated`
        });
        break;
      case 'flag':
        this.usersService.updateUserStatus(user.id, 'Flagged', result.reason || '');
        this.messageService.add({
          severity: 'success',
          summary: 'Account Flagged',
          detail: `${user.fullName}'s account has been flagged`
        });
        break;
      case 'unflag':
        this.usersService.updateUserStatus(user.id, 'Active', '');
        this.messageService.add({
          severity: 'success',
          summary: 'Flag Removed',
          detail: `Flag removed from ${user.fullName}'s account`
        });
        break;
      case 'resetPassword':
        this.usersService.addActivityLog(user.id, 'Password reset requested');
        this.messageService.add({
          severity: 'success',
          summary: 'Password Reset',
          detail: `Password reset link sent to ${user.email}`
        });
        break;
    }

    this.loadUsers();
    this.actionConfig.visible = false;
    this.selectedUser.set(null);
  }

  onActionCancel(): void {
    this.actionConfig.visible = false;
    this.selectedUser.set(null);
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getPackageColor(pkg: string): string {
    const colors: Record<string, string> = {
      'Silver': '#94a3b8',
      'Gold': '#F9A825',
      'Platinum': '#64748b',
      'Ruby': '#ef4444',
      'Diamond': '#3b82f6'
    };
    return colors[pkg] || '#94a3b8';
  }
}
