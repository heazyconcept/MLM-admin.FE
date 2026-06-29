import { Component, ChangeDetectionStrategy, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TableModule, TablePageEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { MessageService, MenuItem } from 'primeng/api';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { TableAction, TableColumn } from '../../../shared/components/data-table/data-table.types';

import { TooltipModule } from 'primeng/tooltip';
import { DatePickerModule } from 'primeng/datepicker';

import { UserProfileModalComponent } from '../user-profile-modal/user-profile-modal.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ConfirmationModalComponent, ConfirmationResult } from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { UsersService, User, UsersListQuery } from '../services/users.service';

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
    ConfirmationModalComponent,
    DataTableComponent,

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
  tableLoading = signal(false);
  actionLoading = signal(false);

  /** Server-side pagination (GET /admin/users) */
  totalRecords = signal(0);
  tableFirst = signal(0);
  pageRows = signal(20);

  // Filter signals
  searchVal = signal('');
  statusFilter = signal('');
  packageFilter = signal('');
  roleFilter = signal('');
  dateRange = signal<Date[] | null>(null);

  /**
   * Status / package / role are applied on the server via loadUsers().
   * Search and joined date range are client-only on the current page (API has no text search).
   * "Flagged" is client-only on the current page when the list API cannot filter by flag.
   */
  filteredUsers = computed(() => {
    let result = this.users();
    const status = this.statusFilter();
    const range = this.dateRange();
    const search = this.globalFilter().toLowerCase();

    if (status === 'Flagged') {
      result = result.filter((u) => u.status === 'Flagged');
    } else if (status === 'Registered') {
      result = result.filter((u) => u.status === 'Registered');
    } else if (status === 'Activated') {
      result = result.filter((u) => u.status === 'Activated');
    } else if (status === 'Active') {
      result = result.filter((u) => u.status === 'Active');
    } else if (status === 'Inactive') {
      result = result.filter((u) => u.status === 'Inactive');
    } else if (status === 'Suspended') {
      result = result.filter((u) => u.status === 'Suspended');
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
        (u.fullName || '').toLowerCase().includes(search) ||
        (u.email || '').toLowerCase().includes(search) ||
        (u.username || '').toLowerCase().includes(search) ||
        (u.id || '').toLowerCase().includes(search)
      );
    }

    return result;
  });

  // Table configurations
  columns = signal<TableColumn<User>[]>([
    { field: 'username', header: 'Username' },
    { field: 'referrerUsername', header: 'Referrer' },
    { field: 'uplineUsername', header: 'Upline' },
    { field: 'package', header: 'Package', width: '130px', align: 'center' },
    { field: 'status', header: 'Status', width: '130px', align: 'center' },
    {
      field: 'registrationDate',
      header: 'Joined',
      width: '160px',
      align: 'center',
      formatter: (val) => this.formatDate(val as Date)
    },
    { field: 'actions', header: 'Actions', width: '120px', align: 'center' }
  ]);

  tableHeaders = computed(() => this.columns().map(c => c.header));

  actions = signal<TableAction<User>[]>([
    {
      icon: 'pi pi-eye',
      tooltip: 'View Profile',
      command: (user) => this.router.navigate(['/admin/users', user.id]),
      severity: 'secondary'
    },
    // Suspend and Flag - commented out until backend supports
    // { icon: 'pi pi-ban', tooltip: 'Suspend User', visible: (user) => user.status === 'Active' || user.status === 'Flagged', command: (user) => this.showActionModal('suspend', user), severity: 'danger' },
    {
      icon: 'pi pi-check',
      tooltip: 'Reactivate',
      visible: (user) => user.status === 'Suspended',
      command: (user) => this.showActionModal('reactivate', user),
      severity: 'success'
    },
    // { icon: 'pi pi-flag', tooltip: 'Flag User', visible: (user) => user.status === 'Active', command: (user) => this.showActionModal('flag', user), severity: 'warning' },
    {
      icon: 'pi pi-key',
      tooltip: 'Reset Password',
      command: (user) => this.showActionModal('resetPassword', user),
      severity: 'info'
    }
  ]);

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
    { label: 'Registered', value: 'Registered' },
    { label: 'Activated', value: 'Activated' },
    { label: 'Active', value: 'Active' },
    { label: 'Inactive', value: 'Inactive' },
    { label: 'Suspended', value: 'Suspended' },
    { label: 'Flagged', value: 'Flagged' }
  ];

  packageOptions = [
    { label: 'All Packages', value: '' },
    { label: 'Nickel', value: 'Nickel' },
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

  /** Build query params supported by GET /admin/users */
  private serverQuery(): UsersListQuery {
    const q: UsersListQuery = {};
    const status = this.statusFilter();
    if (status === 'Suspended') {
      q.isActive = false;
    } else if (status === 'Registered') {
      q.isActive = true;
      q.isRegistrationPaid = false;
    } else if (status === 'Activated' || status === 'Active' || status === 'Inactive') {
      q.isActive = true;
      q.isRegistrationPaid = true;
    }
    const pkg = this.packageFilter();
    if (pkg) {
      q.package = pkg.toUpperCase();
    }
    const role = this.roleFilter();
    if (role === 'User') {
      q.role = 'USER';
    } else if (role === 'Merchant') {
      q.role = 'MERCHANT';
    }
    return q;
  }

  loadUsers(): void {
    this.tableLoading.set(true);
    this.usersService
      .getUsers({
        ...this.serverQuery(),
        limit: this.pageRows(),
        offset: this.tableFirst(),
      })
      .subscribe({
        next: ({ users, total }) => {
          this.users.set(users);
          this.totalRecords.set(total);
          this.tableLoading.set(false);
        },
        error: () => {
          this.tableLoading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load users from server',
          });
        },
      });
  }

  onPageChange(event: TablePageEvent): void {
    this.tableFirst.set(event.first);
    this.pageRows.set(event.rows);
    this.loadUsers();
  }

  /** Reset to first page when server-backed filters change */
  onServerFilterChange(): void {
    this.tableFirst.set(0);
    this.loadUsers();
  }

  onSearch(): void {
    this.globalFilter.set(this.searchVal().trim());
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
    this.searchVal.set('');
    this.statusFilter.set('');
    this.packageFilter.set('');
    this.roleFilter.set('');
    this.dateRange.set(null);
    this.tableFirst.set(0);
    this.loadUsers();
  }

  viewProfile(user: User): void {
    this.router.navigate(['/admin/users', user.id]);
  }

  getActionMenuItems(user: User, menu: { hide: () => void }): MenuItem[] {
    const items: MenuItem[] = [];

    // Suspend and Flag - commented out until backend supports
    // if (user.status === 'Active') {
    //   items.push(
    //     { label: 'Suspend User', icon: 'pi pi-ban', command: () => { menu.hide(); this.showActionModal('suspend', user); } },
    //     { label: 'Flag Account', icon: 'pi pi-flag', command: () => { menu.hide(); this.showActionModal('flag', user); } }
    //   );
    // }

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
        }
        // Suspend - commented out until backend supports
        // , { label: 'Suspend User', icon: 'pi pi-ban', command: () => { menu.hide(); this.showActionModal('suspend', user); } }
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
      },
      impersonate: {
        title: 'Login as User',
        message: `You will view the dashboard as ${user.username}. Actions are audited.`,
        icon: 'pi pi-user',
        iconClass: 'text-mlm-primary',
        confirmLabel: 'Continue',
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
        this.usersService.updateUserStatus(user.id, { isActive: false }).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'User Suspended',
              detail: `${user.fullName} has been suspended`
            });
            this.loadUsers();
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to suspend user'
            });
          }
        });
        break;
      case 'reactivate':
        this.usersService.updateUserStatus(user.id, { isActive: true }).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'User Reactivated',
              detail: `${user.fullName} has been reactivated`
            });
            this.loadUsers();
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to reactivate user'
            });
          }
        });
        break;
      case 'flag':
        this.usersService.updateUserStatus(user.id, { isActive: false }).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Account Flagged',
              detail: `${user.fullName}'s account has been flagged`
            });
            this.loadUsers();
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to flag account'
            });
          }
        });
        break;
      case 'unflag':
        this.usersService.updateUserStatus(user.id, { isActive: true }).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Flag Removed',
              detail: `Flag removed from ${user.fullName}'s account`
            });
            this.loadUsers();
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to remove flag'
            });
          }
        });
        break;
      case 'resetPassword':
        this.actionLoading.set(true);
        this.usersService.resetUserPassword(user.id).subscribe({
          next: (message) => {
            this.messageService.add({
              severity: 'success',
              summary: 'Password Reset',
              detail: message || `Password reset link sent to ${user.email}`
            });
            this.actionConfig.visible = false;
            this.selectedUser.set(null);
            this.actionLoading.set(false);
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: error?.error?.message || 'Failed to reset password'
            });
            this.actionLoading.set(false);
          }
        });
        return;
      case 'impersonate':
        this.actionLoading.set(true);
        this.usersService.impersonateUser(user.id).subscribe({
          next: (response) => {
            const url = `${response.redirectUrl}?code=${encodeURIComponent(response.exchangeCode)}`;
            window.open(url, '_blank');
            this.actionConfig.visible = false;
            this.selectedUser.set(null);
            this.actionLoading.set(false);
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Impersonation Failed',
              detail: error?.error?.message || 'Unable to start impersonation'
            });
            this.actionLoading.set(false);
          }
        });
        return;
    }

    this.actionConfig.visible = false;
    this.selectedUser.set(null);
  }

  onActionCancel(): void {
    this.actionLoading.set(false);
    this.actionConfig.visible = false;
    this.selectedUser.set(null);
  }

  onImpersonateClick(user: User, event: MouseEvent): void {
    event.stopPropagation();
    if (this.isImpersonationDisabled(user)) {
      return;
    }
    this.showActionModal('impersonate', user);
  }

  isImpersonationDisabled(user: User): boolean {
    return user.apiRole === 'ADMIN';
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
      'Nickel': '#64748b',
      'Silver': '#94a3b8',
      'Gold': '#F9A825',
      'Platinum': '#475569',
      'Ruby': '#ef4444',
      'Diamond': '#3b82f6'
    };
    return colors[pkg] || '#94a3b8';
  }
}
