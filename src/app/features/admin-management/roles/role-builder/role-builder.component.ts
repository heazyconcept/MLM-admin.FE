import { Component, ChangeDetectionStrategy, signal, computed, inject, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { CheckboxModule } from 'primeng/checkbox';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { AdminManagementService } from '../../services/admin-management.service';
import {
  Permission,
  PermissionGroup,
  Role,
  ALL_PERMISSION_KEYS,
  CreateRoleRequest,
  UpdateRoleRequest,
} from '../../../../core/models/rbac.model';

@Component({
  selector: 'app-role-builder',
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    TextareaModule,
    CheckboxModule,
    ButtonModule,
    TooltipModule,
  ],
  templateUrl: './role-builder.component.html',
  styleUrl: './role-builder.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleBuilderComponent implements OnInit {
  private readonly adminService = inject(AdminManagementService);

  @Input() role: Role | null = null;
  @Output() save = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  roleName = signal('');
  roleDescription = signal('');
  selectedPermissionIds = signal<Set<string>>(new Set());
  allPermissions = signal<Permission[]>([]);
  searchQuery = signal('');
  saving = signal(false);

  /** Permissions grouped by module, filtered by search */
  permissionGroups = computed<PermissionGroup[]>(() => {
    const query = this.searchQuery().toLowerCase();
    let perms = this.allPermissions();

    if (query) {
      perms = perms.filter(
        p =>
          p.label.toLowerCase().includes(query) ||
          p.key.toLowerCase().includes(query) ||
          p.module.toLowerCase().includes(query)
      );
    }

    const grouped = new Map<string, Permission[]>();
    for (const p of perms) {
      if (!grouped.has(p.module)) grouped.set(p.module, []);
      grouped.get(p.module)!.push(p);
    }
    return Array.from(grouped.entries()).map(([module, permissions]) => ({
      module,
      permissions,
    }));
  });

  selectedCount = computed(() => this.selectedPermissionIds().size);
  totalCount = computed(() => this.allPermissions().length);

  isEditing = computed(() => !!this.role);
  title = computed(() => this.isEditing() ? `Edit Role: ${this.role?.name}` : 'Create New Role');

  canSave = computed(() => {
    return this.roleName().trim().length > 0 && this.selectedPermissionIds().size > 0;
  });

  ngOnInit(): void {
    this.loadPermissions();

    if (this.role) {
      this.roleName.set(this.role.name);
      this.roleDescription.set(this.role.description);
      this.selectedPermissionIds.set(new Set(this.role.permissions.map(p => p.id)));
    }
  }

  loadPermissions(): void {
    this.adminService.getPermissions().subscribe({
      next: (perms) => this.allPermissions.set(perms),
      error: () => this.allPermissions.set(ALL_PERMISSION_KEYS),
    });
  }

  isSelected(permId: string): boolean {
    return this.selectedPermissionIds().has(permId);
  }

  togglePermission(permId: string): void {
    this.selectedPermissionIds.update(ids => {
      const next = new Set(ids);
      if (next.has(permId)) {
        next.delete(permId);
      } else {
        next.add(permId);
      }
      return next;
    });
  }

  /** Check/uncheck all permissions in a module */
  isModuleFullySelected(group: PermissionGroup): boolean {
    return group.permissions.every(p => this.selectedPermissionIds().has(p.id));
  }

  isModulePartiallySelected(group: PermissionGroup): boolean {
    const selected = group.permissions.filter(p => this.selectedPermissionIds().has(p.id));
    return selected.length > 0 && selected.length < group.permissions.length;
  }

  toggleModule(group: PermissionGroup): void {
    const allSelected = this.isModuleFullySelected(group);
    this.selectedPermissionIds.update(ids => {
      const next = new Set(ids);
      for (const p of group.permissions) {
        if (allSelected) {
          next.delete(p.id);
        } else {
          next.add(p.id);
        }
      }
      return next;
    });
  }

  selectAll(): void {
    this.selectedPermissionIds.set(new Set(this.allPermissions().map(p => p.id)));
  }

  deselectAll(): void {
    this.selectedPermissionIds.set(new Set());
  }

  onSave(): void {
    if (!this.canSave()) return;
    this.saving.set(true);

    const permIds = Array.from(this.selectedPermissionIds());

    if (this.isEditing() && this.role) {
      const data: UpdateRoleRequest = {
        name: this.roleName().trim(),
        description: this.roleDescription().trim(),
        permissionIds: permIds,
      };
      this.adminService.updateRole(this.role.id, data).subscribe({
        next: () => {
          this.saving.set(false);
          this.save.emit();
        },
        error: () => {
          this.saving.set(false);
          // Still emit save for demo purposes (API may not be ready)
          this.save.emit();
        },
      });
    } else {
      const data: CreateRoleRequest = {
        name: this.roleName().trim(),
        description: this.roleDescription().trim(),
        permissionIds: permIds,
      };
      this.adminService.createRole(data).subscribe({
        next: () => {
          this.saving.set(false);
          this.save.emit();
        },
        error: () => {
          this.saving.set(false);
          this.save.emit();
        },
      });
    }
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
