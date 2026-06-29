import { Component, ChangeDetectionStrategy, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationModalComponent, ConfirmationResult } from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { UserGroupFormComponent } from './user-group-form/user-group-form.component';
import { AdminManagementService } from '../services/admin-management.service';
import { UserGroup, Role, ALL_PERMISSION_KEYS } from '../../../core/models/rbac.model';

@Component({
  selector: 'app-user-groups-list',
  imports: [
    CommonModule,
    FormsModule,
    ToastModule,
    InputTextModule,
    TooltipModule,
    ConfirmationModalComponent,
    UserGroupFormComponent,
  ],
  providers: [MessageService],
  templateUrl: './user-groups-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserGroupsListComponent implements OnInit {
  private readonly adminService = inject(AdminManagementService);
  private readonly messageService = inject(MessageService);

  groups = signal<UserGroup[]>([]);
  roles = signal<Role[]>([]);
  loading = signal(false);
  searchQuery = signal('');
  searchVal = signal('');

  // Form state
  formVisible = signal(false);
  editingGroup = signal<UserGroup | null>(null);

  // Delete confirmation
  deleteConfirmVisible = signal(false);
  deletingGroup = signal<UserGroup | null>(null);
  deleteLoading = signal(false);

  filteredGroups = computed(() => {
    const query = this.searchQuery().toLowerCase();
    if (!query) return this.groups();
    return this.groups().filter(
      g =>
        g.name.toLowerCase().includes(query) ||
        g.description.toLowerCase().includes(query)
    );
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);

    // Load groups
    this.adminService.getUserGroups({ limit: 100 }).subscribe({
      next: (res) => {
        this.groups.set(res.data);
        this.loading.set(false);
      },
      error: () => {
        this.groups.set(this.getDemoGroups());
        this.loading.set(false);
      },
    });

    // Load roles for the form
    this.adminService.getRoles({ limit: 100 }).subscribe({
      next: (res) => this.roles.set(res.data),
      error: () => this.roles.set(this.getDemoRoles()),
    });
  }

  onSearch(): void {
    this.searchQuery.set(this.searchVal().trim());
  }

  openCreate(): void {
    this.editingGroup.set(null);
    this.formVisible.set(true);
  }

  openEdit(group: UserGroup): void {
    this.editingGroup.set(group);
    this.formVisible.set(true);
  }

  onFormSave(): void {
    this.formVisible.set(false);
    this.editingGroup.set(null);
    this.loadData();
    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: 'User group saved successfully',
    });
  }

  onFormCancel(): void {
    this.formVisible.set(false);
    this.editingGroup.set(null);
  }

  confirmDelete(group: UserGroup): void {
    this.deletingGroup.set(group);
    this.deleteConfirmVisible.set(true);
  }

  onDeleteConfirm(result: ConfirmationResult): void {
    if (!result.confirmed) {
      this.deleteConfirmVisible.set(false);
      this.deletingGroup.set(null);
      return;
    }

    const group = this.deletingGroup();
    if (!group) return;

    this.deleteLoading.set(true);
    this.adminService.deleteUserGroup(group.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Deleted',
          detail: `Group "${group.name}" has been deleted`,
        });
        this.deleteConfirmVisible.set(false);
        this.deletingGroup.set(null);
        this.deleteLoading.set(false);
        this.loadData();
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to delete user group',
        });
        this.deleteLoading.set(false);
      },
    });
  }

  onDeleteCancel(): void {
    this.deleteConfirmVisible.set(false);
    this.deletingGroup.set(null);
  }

  /** Get total unique permissions across all roles in a group */
  getGroupPermissionCount(group: UserGroup): number {
    const keys = new Set<string>();
    for (const role of group.roles) {
      for (const p of role.permissions) {
        keys.add(p.key);
      }
    }
    return keys.size;
  }

  private getDemoRoles(): Role[] {
    const allPerms = ALL_PERMISSION_KEYS;
    return [
      {
        id: 'role-1', name: 'Super Administrator', description: 'Full access', permissions: allPerms,
        isSystemRole: true, userCount: 2, createdAt: '2024-01-01', updatedAt: '2024-01-01',
      },
      {
        id: 'role-2', name: 'Financial Officer', description: 'Finance operations',
        permissions: allPerms.filter(p => p.key.startsWith('wallets.') || p.key.startsWith('withdrawals.') || p.key.startsWith('payments.')),
        isSystemRole: false, userCount: 3, createdAt: '2024-02-01', updatedAt: '2024-02-01',
      },
      {
        id: 'role-3', name: 'Operations Manager', description: 'Orders & merchants',
        permissions: allPerms.filter(p => p.key.startsWith('orders.') || p.key.startsWith('merchants.')),
        isSystemRole: false, userCount: 2, createdAt: '2024-03-01', updatedAt: '2024-03-01',
      },
      {
        id: 'role-4', name: 'Support Agent', description: 'User support',
        permissions: allPerms.filter(p => p.key.startsWith('users.') || p.key.startsWith('notifications.')),
        isSystemRole: false, userCount: 5, createdAt: '2024-04-01', updatedAt: '2024-04-01',
      },
      {
        id: 'role-5', name: 'Report Viewer', description: 'View reports',
        permissions: allPerms.filter(p => p.key.startsWith('reports.') || p.key.startsWith('audit.')),
        isSystemRole: false, userCount: 4, createdAt: '2024-05-01', updatedAt: '2024-05-01',
      },
    ];
  }

  private getDemoGroups(): UserGroup[] {
    const roles = this.getDemoRoles();
    return [
      {
        id: 'grp-1', name: 'Super Admins', description: 'Full system access — all features and actions',
        roles: [roles[0]],
        memberCount: 2, isSystemGroup: true, createdAt: '2024-01-01', updatedAt: '2024-01-01',
      },
      {
        id: 'grp-2', name: 'Finance Team', description: 'Handle wallets, withdrawals, payments, and financial reporting',
        roles: [roles[1], roles[4]],
        memberCount: 3, isSystemGroup: false, createdAt: '2024-02-01', updatedAt: '2024-02-01',
      },
      {
        id: 'grp-3', name: 'Operations Team', description: 'Manage orders, logistics, and merchant operations',
        roles: [roles[2]],
        memberCount: 2, isSystemGroup: false, createdAt: '2024-03-01', updatedAt: '2024-03-01',
      },
      {
        id: 'grp-4', name: 'Support Team', description: 'Handle user inquiries, reset passwords, and manage notifications',
        roles: [roles[3]],
        memberCount: 5, isSystemGroup: false, createdAt: '2024-04-01', updatedAt: '2024-04-01',
      },
    ];
  }
}
