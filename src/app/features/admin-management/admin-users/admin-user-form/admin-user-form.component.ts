import { Component, ChangeDetectionStrategy, signal, computed, inject, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import { AdminManagementService } from '../../services/admin-management.service';
import {
  AdminUser,
  UserGroup,
  CreateAdminUserRequest,
  UpdateAdminUserRequest,
} from '../../../../core/models/rbac.model';

@Component({
  selector: 'app-admin-user-form',
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    ButtonModule,
    PasswordModule,
  ],
  templateUrl: './admin-user-form.component.html',
  styleUrl: './admin-user-form.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUserFormComponent implements OnInit {
  private readonly adminService = inject(AdminManagementService);

  @Input() user: AdminUser | null = null;
  @Input() availableGroups: UserGroup[] = [];
  @Output() save = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  fullName = signal('');
  email = signal('');
  username = signal('');
  temporaryPassword = signal('');
  showTemporaryPassword = signal(false);
  selectedGroupIds = signal<Set<string>>(new Set());
  saving = signal(false);

  isEditing = computed(() => !!this.user);
  title = computed(() => this.isEditing() ? `Edit Admin: ${this.user?.fullName}` : 'Create Admin User');

  canSave = computed(() => {
    const hasBasicInfo = this.fullName().trim().length > 0
      && this.email().trim().length > 0
      && this.username().trim().length > 0;
    const hasGroup = this.selectedGroupIds().size > 0;

    if (this.isEditing()) {
      return hasBasicInfo && hasGroup;
    }
    return hasBasicInfo && hasGroup && this.temporaryPassword().trim().length >= 8;
  });

  /** Show effective permissions from selected groups */
  effectivePermissions = computed(() => {
    const ids = this.selectedGroupIds();
    const keys = new Set<string>();
    for (const group of this.availableGroups) {
      if (ids.has(group.id)) {
        for (const role of group.roles) {
          for (const p of role.permissions) {
            keys.add(p.key);
          }
        }
      }
    }
    return Array.from(keys).sort();
  });

  ngOnInit(): void {
    if (this.user) {
      this.fullName.set(this.user.fullName);
      this.email.set(this.user.email);
      this.username.set(this.user.username);
      this.selectedGroupIds.set(new Set(this.user.groups.map(g => g.id)));
    }
  }

  isGroupSelected(groupId: string): boolean {
    return this.selectedGroupIds().has(groupId);
  }

  toggleGroup(groupId: string): void {
    this.selectedGroupIds.update(ids => {
      const next = new Set(ids);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }

  onSave(): void {
    if (!this.canSave()) return;
    this.saving.set(true);

    const groupIds = Array.from(this.selectedGroupIds());

    if (this.isEditing() && this.user) {
      const data: UpdateAdminUserRequest = {
        fullName: this.fullName().trim(),
        email: this.email().trim(),
        groupIds,
      };
      this.adminService.updateAdminUser(this.user.id, data).subscribe({
        next: () => { this.saving.set(false); this.save.emit(); },
        error: () => { this.saving.set(false); this.save.emit(); },
      });
    } else {
      const data: CreateAdminUserRequest = {
        fullName: this.fullName().trim(),
        email: this.email().trim(),
        username: this.username().trim(),
        temporaryPassword: this.temporaryPassword().trim(),
        groupIds,
      };
      this.adminService.createAdminUser(data).subscribe({
        next: () => { this.saving.set(false); this.save.emit(); },
        error: () => { this.saving.set(false); this.save.emit(); },
      });
    }
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
