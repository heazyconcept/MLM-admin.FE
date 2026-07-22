import { Component, ChangeDetectionStrategy, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationModalComponent, ConfirmationResult } from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { AdminUserFormComponent } from './admin-user-form/admin-user-form.component';
import { AdminPasswordResetResultModalComponent } from './modals/admin-password-reset-result-modal.component';
import { AdminManagementService } from '../services/admin-management.service';
import { AdminUser, UserGroup, ALL_PERMISSION_KEYS } from '../../../core/models/rbac.model';

const TEMPORARY_PASSWORD = 'TempPass123!';

@Component({
  selector: 'app-admin-users-list',
  imports: [
    CommonModule,
    FormsModule,
    ToastModule,
    InputTextModule,
    TooltipModule,
    ConfirmationModalComponent,
    AdminUserFormComponent,
    AdminPasswordResetResultModalComponent,
  ],
  providers: [MessageService],
  templateUrl: './admin-users-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUsersListComponent implements OnInit {
  private readonly adminService = inject(AdminManagementService);
  private readonly messageService = inject(MessageService);

  adminUsers = signal<AdminUser[]>([]);
  groups = signal<UserGroup[]>([]);
  loading = signal(false);
  searchQuery = signal('');
  searchVal = signal('');

  // Form state
  formVisible = signal(false);
  editingUser = signal<AdminUser | null>(null);

  // Action state
  actionConfirmVisible = signal(false);
  actionUser = signal<AdminUser | null>(null);
  actionType = signal<'deactivate' | 'activate' | 'resetPassword'>('deactivate');
  actionLoading = signal(false);

  // Reset password result modal
  resetResultVisible = signal(false);
  resetResultUser = signal<{ fullName: string; temporaryPassword: string } | null>(null);

  // Detail view
  detailUser = signal<AdminUser | null>(null);
  detailVisible = signal(false);

  filteredUsers = computed(() => {
    const query = this.searchQuery().toLowerCase();
    if (!query) return this.adminUsers();
    return this.adminUsers().filter(
      u =>
        u.fullName.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        u.username.toLowerCase().includes(query) ||
        u.groups.some(g => g.name.toLowerCase().includes(query))
    );
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);

    this.adminService.getAdminUsers({ limit: 100 }).subscribe({
      next: (res) => {
        this.adminUsers.set(res.data);
        this.loading.set(false);
      },
      error: () => {
        this.adminUsers.set(this.getDemoUsers());
        this.loading.set(false);
      },
    });

    this.adminService.getUserGroups({ limit: 100 }).subscribe({
      next: (res) => this.groups.set(res.data),
      error: () => this.groups.set(this.getDemoGroups()),
    });
  }

  onSearch(): void {
    this.searchQuery.set(this.searchVal().trim());
  }

  openCreate(): void {
    this.editingUser.set(null);
    this.formVisible.set(true);
  }

  openEdit(user: AdminUser): void {
    this.editingUser.set(user);
    this.formVisible.set(true);
  }

  onFormSave(): void {
    this.formVisible.set(false);
    this.editingUser.set(null);
    this.loadData();
    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Admin user saved successfully',
    });
  }

  onFormCancel(): void {
    this.formVisible.set(false);
    this.editingUser.set(null);
  }

  // ── Actions ──────────────────────────────────

  showAction(type: 'deactivate' | 'activate' | 'resetPassword', user: AdminUser): void {
    this.actionType.set(type);
    this.actionUser.set(user);
    this.actionConfirmVisible.set(true);
  }

  getActionTitle(): string {
    switch (this.actionType()) {
      case 'deactivate': return 'Deactivate Admin User';
      case 'activate': return 'Activate Admin User';
      case 'resetPassword': return 'Reset Password';
    }
  }

  getActionMessage(): string {
    const name = this.actionUser()?.fullName || '';
    switch (this.actionType()) {
      case 'deactivate': return `Are you sure you want to deactivate ${name}? They will lose access to the admin panel.`;
      case 'activate': return `Are you sure you want to activate ${name}? They will regain access to the admin panel.`;
      case 'resetPassword': return `Reset ${name}'s password? A temporary password will need to be set.`;
    }
  }

  getActionIcon(): string {
    switch (this.actionType()) {
      case 'deactivate': return 'pi pi-ban';
      case 'activate': return 'pi pi-check-circle';
      case 'resetPassword': return 'pi pi-key';
    }
  }

  getActionIconClass(): string {
    switch (this.actionType()) {
      case 'deactivate': return 'text-red-500';
      case 'activate': return 'text-emerald-500';
      case 'resetPassword': return 'text-blue-500';
    }
  }

  getActionLabel(): string {
    switch (this.actionType()) {
      case 'deactivate': return 'Deactivate';
      case 'activate': return 'Activate';
      case 'resetPassword': return 'Reset Password';
    }
  }

  getActionClass(): string {
    switch (this.actionType()) {
      case 'deactivate': return 'p-button-danger';
      case 'activate': return 'p-button-success';
      case 'resetPassword': return 'p-button-primary';
    }
  }

  onActionConfirm(result: ConfirmationResult): void {
    if (!result.confirmed) {
      this.actionConfirmVisible.set(false);
      this.actionUser.set(null);
      return;
    }

    const user = this.actionUser();
    if (!user) return;

    this.actionLoading.set(true);

    switch (this.actionType()) {
      case 'deactivate':
      case 'activate':
        this.adminService.updateAdminUserStatus(user.id, {
          isActive: this.actionType() === 'activate',
        }).subscribe({
          next: () => this.handleActionSuccess(`User ${this.actionType() === 'activate' ? 'activated' : 'deactivated'}`),
          error: () => this.handleActionError(),
        });
        break;
      case 'resetPassword':
        this.adminService.resetAdminPassword(user.id, {
          temporaryPassword: TEMPORARY_PASSWORD,
        }).subscribe({
          next: () => this.handleResetPasswordSuccess(user.fullName),
          error: () => this.handleActionError(),
        });
        break;
    }
  }

  onActionCancel(): void {
    this.actionConfirmVisible.set(false);
    this.actionUser.set(null);
  }

  onResetResultClose(): void {
    this.resetResultVisible.set(false);
    this.resetResultUser.set(null);
  }

  // ── Detail View ──────────────────────────────

  openDetail(user: AdminUser): void {
    this.detailUser.set(user);
    this.detailVisible.set(true);
  }

  closeDetail(): void {
    this.detailVisible.set(false);
    this.detailUser.set(null);
  }

  // ── Helpers ──────────────────────────────────

  formatDate(date: string | null): string {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  }

  formatDateTime(date: string | null): string {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  private handleActionSuccess(detail: string): void {
    this.messageService.add({ severity: 'success', summary: 'Success', detail });
    this.actionConfirmVisible.set(false);
    this.actionUser.set(null);
    this.actionLoading.set(false);
    this.loadData();
  }

  private handleResetPasswordSuccess(fullName: string): void {
    this.actionConfirmVisible.set(false);
    this.actionUser.set(null);
    this.actionLoading.set(false);
    this.resetResultUser.set({ fullName, temporaryPassword: TEMPORARY_PASSWORD });
    this.resetResultVisible.set(true);
    this.loadData();
  }

  private handleActionError(): void {
    this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Action failed' });
    this.actionLoading.set(false);
  }

  private getDemoGroups(): UserGroup[] {
    const allPerms = ALL_PERMISSION_KEYS;
    return [
      {
        id: 'grp-1', name: 'Super Admins', description: 'Full access',
        roles: [{ id: 'r-1', name: 'Super Administrator', description: '', permissions: allPerms, isSystemRole: true, userCount: 2, createdAt: '', updatedAt: '' }],
        memberCount: 2, isSystemGroup: true, createdAt: '', updatedAt: '',
      },
      {
        id: 'grp-2', name: 'Finance Team', description: 'Finance ops',
        roles: [{ id: 'r-2', name: 'Financial Officer', description: '', permissions: allPerms.filter(p => p.key.startsWith('wallets.')), isSystemRole: false, userCount: 3, createdAt: '', updatedAt: '' }],
        memberCount: 3, isSystemGroup: false, createdAt: '', updatedAt: '',
      },
      {
        id: 'grp-3', name: 'Support Team', description: 'User support',
        roles: [{ id: 'r-3', name: 'Support Agent', description: '', permissions: allPerms.filter(p => p.key.startsWith('users.')), isSystemRole: false, userCount: 5, createdAt: '', updatedAt: '' }],
        memberCount: 5, isSystemGroup: false, createdAt: '', updatedAt: '',
      },
    ];
  }

  private getDemoUsers(): AdminUser[] {
    const groups = this.getDemoGroups();
    return [
      {
        id: 'admin-1', fullName: 'John Doe', email: 'john@segulah.com', username: 'johndoe',
        isActive: true, mustChangePassword: false, groups: [groups[0]],
        effectivePermissions: ALL_PERMISSION_KEYS.map(p => p.key),
        createdAt: '2024-01-15', lastLogin: '2024-06-20T14:30:00',
      },
      {
        id: 'admin-2', fullName: 'Jane Smith', email: 'jane@segulah.com', username: 'janesmith',
        isActive: true, mustChangePassword: false, groups: [groups[1]],
        effectivePermissions: ALL_PERMISSION_KEYS.filter(p => p.key.startsWith('wallets.') || p.key.startsWith('withdrawals.')).map(p => p.key),
        createdAt: '2024-02-20', lastLogin: '2024-06-19T09:15:00',
      },
      {
        id: 'admin-3', fullName: 'Mike Johnson', email: 'mike@segulah.com', username: 'mikej',
        isActive: true, mustChangePassword: true, groups: [groups[2]],
        effectivePermissions: ALL_PERMISSION_KEYS.filter(p => p.key.startsWith('users.')).map(p => p.key),
        createdAt: '2024-04-10', lastLogin: null,
      },
      {
        id: 'admin-4', fullName: 'Sarah Williams', email: 'sarah@segulah.com', username: 'sarahw',
        isActive: false, mustChangePassword: false, groups: [groups[1]],
        effectivePermissions: [],
        createdAt: '2024-03-05', lastLogin: '2024-05-10T16:45:00',
      },
    ];
  }
}
