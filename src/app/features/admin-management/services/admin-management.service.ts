import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import {
  Permission,
  Role,
  CreateRoleRequest,
  UpdateRoleRequest,
  UserGroup,
  CreateUserGroupRequest,
  UpdateUserGroupRequest,
  AdminUser,
  CreateAdminUserRequest,
  UpdateAdminUserRequest,
  AdminUserStatusRequest,
  ResetAdminPasswordRequest,
  PaginatedResponse,
} from '../../../core/models/rbac.model';

@Injectable({ providedIn: 'root' })
export class AdminManagementService {
  private readonly api = inject(ApiService);

  // ── Permissions ──────────────────────────────

  /** List all seeded permissions */
  getPermissions(): Observable<Permission[]> {
    return this.api.get<Permission[]>('admin/permissions');
  }

  // ── Roles ────────────────────────────────────

  /** List all roles */
  getRoles(params?: Record<string, unknown>): Observable<PaginatedResponse<Role>> {
    return this.api.get<PaginatedResponse<Role>>('admin/roles', params);
  }

  /** Get a single role with its permissions */
  getRole(id: string): Observable<Role> {
    return this.api.get<Role>(`admin/roles/${id}`);
  }

  /** Create a new role */
  createRole(data: CreateRoleRequest): Observable<Role> {
    return this.api.post<Role>('admin/roles', data);
  }

  /** Update a role */
  updateRole(id: string, data: UpdateRoleRequest): Observable<Role> {
    return this.api.put<Role>(`admin/roles/${id}`, data);
  }

  /** Delete a role */
  deleteRole(id: string): Observable<void> {
    return this.api.delete<void>(`admin/roles/${id}`);
  }

  // ── User Groups ──────────────────────────────

  /** List all user groups */
  getUserGroups(params?: Record<string, unknown>): Observable<PaginatedResponse<UserGroup>> {
    return this.api.get<PaginatedResponse<UserGroup>>('admin/user-groups', params);
  }

  /** Get a single user group with members */
  getUserGroup(id: string): Observable<UserGroup> {
    return this.api.get<UserGroup>(`admin/user-groups/${id}`);
  }

  /** Create a new user group */
  createUserGroup(data: CreateUserGroupRequest): Observable<UserGroup> {
    return this.api.post<UserGroup>('admin/user-groups', data);
  }

  /** Update a user group */
  updateUserGroup(id: string, data: UpdateUserGroupRequest): Observable<UserGroup> {
    return this.api.put<UserGroup>(`admin/user-groups/${id}`, data);
  }

  /** Delete a user group */
  deleteUserGroup(id: string): Observable<void> {
    return this.api.delete<void>(`admin/user-groups/${id}`);
  }

  // ── Admin Users ──────────────────────────────

  /** List admin users */
  getAdminUsers(params?: Record<string, unknown>): Observable<PaginatedResponse<AdminUser>> {
    return this.api.get<PaginatedResponse<AdminUser>>('admin/admin-users', params);
  }

  /** Get a single admin user with effective permissions */
  getAdminUser(id: string): Observable<AdminUser> {
    return this.api.get<AdminUser>(`admin/admin-users/${id}`);
  }

  /** Create a new admin user */
  createAdminUser(data: CreateAdminUserRequest): Observable<AdminUser> {
    return this.api.post<AdminUser>('admin/admin-users', data);
  }

  /** Update an admin user */
  updateAdminUser(id: string, data: UpdateAdminUserRequest): Observable<AdminUser> {
    return this.api.put<AdminUser>(`admin/admin-users/${id}`, data);
  }

  /** Activate or deactivate an admin user */
  updateAdminUserStatus(id: string, data: AdminUserStatusRequest): Observable<AdminUser> {
    return this.api.patch<AdminUser>(`admin/admin-users/${id}/status`, data);
  }

  /** Reset an admin user's password (sets temporary password) */
  resetAdminPassword(id: string, data: ResetAdminPasswordRequest): Observable<{ message: string }> {
    return this.api.post<{ message: string }>(`admin/admin-users/${id}/reset-password`, data);
  }
}
