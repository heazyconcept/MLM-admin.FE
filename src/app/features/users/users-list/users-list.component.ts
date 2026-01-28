import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { ToastModule } from 'primeng/toast';
import { MessageService, MenuItem } from 'primeng/api';

import { UserFiltersComponent } from '../user-filters/user-filters.component';
import { UserProfileModalComponent } from '../user-profile-modal/user-profile-modal.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ConfirmationModalComponent, ConfirmationResult } from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { UsersService, User, UserFilters, UserStatus } from '../services/users.service';

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
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    MenuModule,
    ToastModule,
    UserFiltersComponent,
    UserProfileModalComponent,
    StatusBadgeComponent,
    ConfirmationModalComponent
  ],
  providers: [MessageService],
  templateUrl: './users-list.component.html',
  styleUrls: ['./users-list.component.css']
})
export class UsersListComponent implements OnInit {
  users: User[] = [];
  selectedUser: User | null = null;
  profileModalVisible = false;
  actionMenuItems: MenuItem[] = [];

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

  constructor(
    private usersService: UsersService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.users = this.usersService.getUsers();
  }

  onFiltersChange(filters: UserFilters): void {
    this.users = this.usersService.filterUsers(filters);
  }

  onExport(): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Export',
      detail: 'Export functionality will be available in future releases'
    });
  }

  viewProfile(user: User): void {
    this.selectedUser = user;
    this.profileModalVisible = true;
  }

  getActionMenuItems(user: User): MenuItem[] {
    const items: MenuItem[] = [
      {
        label: 'View Profile',
        icon: 'pi pi-eye',
        command: () => this.viewProfile(user)
      }
    ];

    if (user.status === 'Active') {
      items.push(
        {
          label: 'Suspend User',
          icon: 'pi pi-ban',
          command: () => this.showActionModal('suspend', user)
        },
        {
          label: 'Flag Account',
          icon: 'pi pi-flag',
          command: () => this.showActionModal('flag', user)
        }
      );
    }

    if (user.status === 'Suspended') {
      items.push({
        label: 'Reactivate User',
        icon: 'pi pi-check',
        command: () => this.showActionModal('reactivate', user)
      });
    }

    if (user.status === 'Flagged') {
      items.push(
        {
          label: 'Remove Flag',
          icon: 'pi pi-flag-fill',
          command: () => this.showActionModal('unflag', user)
        },
        {
          label: 'Suspend User',
          icon: 'pi pi-ban',
          command: () => this.showActionModal('suspend', user)
        }
      );
    }

    items.push({
      label: 'Reset Password',
      icon: 'pi pi-key',
      command: () => this.showActionModal('resetPassword', user)
    });

    return items;
  }

  showActionModal(action: string, user: User): void {
    this.selectedUser = user;
    
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
    this.profileModalVisible = false;
    this.showActionModal(event.action, event.user);
  }

  onActionConfirm(result: ConfirmationResult): void {
    if (!this.selectedUser || !result.confirmed) return;

    const user = this.selectedUser;
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
    this.selectedUser = null;
  }

  onActionCancel(): void {
    this.actionConfig.visible = false;
    this.selectedUser = null;
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

