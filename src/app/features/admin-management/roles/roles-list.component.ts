import { Component, ChangeDetectionStrategy, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationModalComponent, ConfirmationResult } from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { RoleBuilderComponent } from './role-builder/role-builder.component';
import { AdminManagementService } from '../services/admin-management.service';
import { Role, ALL_PERMISSION_KEYS } from '../../../core/models/rbac.model';

@Component({
  selector: 'app-roles-list',
  imports: [
    CommonModule,
    FormsModule,
    ToastModule,
    InputTextModule,
    ButtonModule,
    TooltipModule,
    ConfirmationModalComponent,
    RoleBuilderComponent,
  ],
  providers: [MessageService],
  templateUrl: './roles-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RolesListComponent implements OnInit {
  private readonly adminService = inject(AdminManagementService);
  private readonly messageService = inject(MessageService);

  roles = signal<Role[]>([]);
  loading = signal(false);
  searchQuery = signal('');

  // Role builder state
  builderVisible = signal(false);
  editingRole = signal<Role | null>(null);

  // Delete confirmation
  deleteConfirmVisible = signal(false);
  deletingRole = signal<Role | null>(null);
  deleteLoading = signal(false);

  filteredRoles = computed(() => {
    const query = this.searchQuery().toLowerCase();
    if (!query) return this.roles();
    return this.roles().filter(
      r =>
        r.name.toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query)
    );
  });

  ngOnInit(): void {
    this.loadRoles();
  }

  loadRoles(): void {
    this.loading.set(true);
    this.adminService.getRoles({ limit: 100 }).subscribe({
      next: (res) => {
        this.roles.set(res.data);
        this.loading.set(false);
      },
      error: () => {
        // Fallback with demo data when API not ready
        this.roles.set(this.getDemoRoles());
        this.loading.set(false);
      },
    });
  }

  openCreateBuilder(): void {
    this.editingRole.set(null);
    this.builderVisible.set(true);
  }

  openEditBuilder(role: Role): void {
    this.editingRole.set(role);
    this.builderVisible.set(true);
  }

  onBuilderSave(): void {
    this.builderVisible.set(false);
    this.editingRole.set(null);
    this.loadRoles();
    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Role saved successfully',
    });
  }

  onBuilderCancel(): void {
    this.builderVisible.set(false);
    this.editingRole.set(null);
  }

  confirmDelete(role: Role): void {
    this.deletingRole.set(role);
    this.deleteConfirmVisible.set(true);
  }

  onDeleteConfirm(result: ConfirmationResult): void {
    if (!result.confirmed) {
      this.deleteConfirmVisible.set(false);
      this.deletingRole.set(null);
      return;
    }

    const role = this.deletingRole();
    if (!role) return;

    this.deleteLoading.set(true);
    this.adminService.deleteRole(role.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Deleted',
          detail: `Role "${role.name}" has been deleted`,
        });
        this.deleteConfirmVisible.set(false);
        this.deletingRole.set(null);
        this.deleteLoading.set(false);
        this.loadRoles();
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to delete role',
        });
        this.deleteLoading.set(false);
      },
    });
  }

  onDeleteCancel(): void {
    this.deleteConfirmVisible.set(false);
    this.deletingRole.set(null);
  }

  /** Demo roles for UI testing before backend is ready */
  private getDemoRoles(): Role[] {
    const allPerms = ALL_PERMISSION_KEYS;
    return [
      {
        id: 'role-1',
        name: 'Super Administrator',
        description: 'Full system access — all permissions granted',
        permissions: allPerms,
        isSystemRole: true,
        userCount: 2,
        createdAt: '2024-01-01',
        updatedAt: '2024-06-01',
      },
      {
        id: 'role-2',
        name: 'Financial Officer',
        description: 'Manage wallets, withdrawals, payments, and financial reports',
        permissions: allPerms.filter(p =>
          p.key.startsWith('wallets.') ||
          p.key.startsWith('withdrawals.') ||
          p.key.startsWith('payments.') ||
          p.key === 'dashboard.view' ||
          p.key.startsWith('reports.')
        ),
        isSystemRole: false,
        userCount: 3,
        createdAt: '2024-02-15',
        updatedAt: '2024-05-20',
      },
      {
        id: 'role-3',
        name: 'Operations Manager',
        description: 'Manage orders, logistics, and merchant operations',
        permissions: allPerms.filter(p =>
          p.key.startsWith('orders.') ||
          p.key.startsWith('merchants.') ||
          p.key === 'dashboard.view'
        ),
        isSystemRole: false,
        userCount: 2,
        createdAt: '2024-03-10',
        updatedAt: '2024-04-15',
      },
      {
        id: 'role-4',
        name: 'Support Agent',
        description: 'Handle user support — view users, reset passwords, manage notifications',
        permissions: allPerms.filter(p =>
          p.key.startsWith('users.view') ||
          p.key === 'users.reset_password' ||
          p.key === 'users.suspend' ||
          p.key.startsWith('notifications.') ||
          p.key === 'dashboard.view'
        ),
        isSystemRole: false,
        userCount: 5,
        createdAt: '2024-04-01',
        updatedAt: '2024-06-10',
      },
      {
        id: 'role-5',
        name: 'Report Viewer',
        description: 'Read-only access to all reports and audit logs',
        permissions: allPerms.filter(p =>
          p.key.startsWith('reports.') ||
          p.key.startsWith('audit.') ||
          p.key === 'dashboard.view'
        ),
        isSystemRole: false,
        userCount: 4,
        createdAt: '2024-05-01',
        updatedAt: '2024-05-01',
      },
    ];
  }
}
