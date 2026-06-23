import { Component, ChangeDetectionStrategy, signal, computed, inject, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { AdminManagementService } from '../../services/admin-management.service';
import {
  Role,
  UserGroup,
  CreateUserGroupRequest,
  UpdateUserGroupRequest,
} from '../../../../core/models/rbac.model';

@Component({
  selector: 'app-user-group-form',
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    TextareaModule,
    ButtonModule,
    CheckboxModule,
  ],
  templateUrl: './user-group-form.component.html',
  styleUrl: './user-group-form.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserGroupFormComponent implements OnInit {
  private readonly adminService = inject(AdminManagementService);

  @Input() group: UserGroup | null = null;
  @Input() availableRoles: Role[] = [];
  @Output() save = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  name = signal('');
  description = signal('');
  selectedRoleIds = signal<Set<string>>(new Set());
  saving = signal(false);

  isEditing = computed(() => !!this.group);
  title = computed(() => this.isEditing() ? `Edit Group: ${this.group?.name}` : 'Create User Group');

  canSave = computed(() => {
    return this.name().trim().length > 0 && this.selectedRoleIds().size > 0;
  });

  /** Show how many total permissions this group grants */
  totalPermissions = computed(() => {
    const ids = this.selectedRoleIds();
    const keys = new Set<string>();
    for (const role of this.availableRoles) {
      if (ids.has(role.id)) {
        for (const p of role.permissions) {
          keys.add(p.key);
        }
      }
    }
    return keys.size;
  });

  ngOnInit(): void {
    if (this.group) {
      this.name.set(this.group.name);
      this.description.set(this.group.description);
      this.selectedRoleIds.set(new Set(this.group.roles.map(r => r.id)));
    }
  }

  isRoleSelected(roleId: string): boolean {
    return this.selectedRoleIds().has(roleId);
  }

  toggleRole(roleId: string): void {
    this.selectedRoleIds.update(ids => {
      const next = new Set(ids);
      if (next.has(roleId)) {
        next.delete(roleId);
      } else {
        next.add(roleId);
      }
      return next;
    });
  }

  onSave(): void {
    if (!this.canSave()) return;
    this.saving.set(true);

    const roleIds = Array.from(this.selectedRoleIds());

    if (this.isEditing() && this.group) {
      const data: UpdateUserGroupRequest = {
        name: this.name().trim(),
        description: this.description().trim(),
        roleIds,
      };
      this.adminService.updateUserGroup(this.group.id, data).subscribe({
        next: () => { this.saving.set(false); this.save.emit(); },
        error: () => { this.saving.set(false); this.save.emit(); },
      });
    } else {
      const data: CreateUserGroupRequest = {
        name: this.name().trim(),
        description: this.description().trim(),
        roleIds,
      };
      this.adminService.createUserGroup(data).subscribe({
        next: () => { this.saving.set(false); this.save.emit(); },
        error: () => { this.saving.set(false); this.save.emit(); },
      });
    }
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
