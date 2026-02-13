import { Injectable, signal, computed } from '@angular/core';
import { AdminRole } from '../models/admin-permission.model';

const TOKEN_KEY = 'token';
const ROLE_KEY = 'adminRole';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _currentAdminRole = signal<AdminRole>(this.loadStoredRole());
  private readonly _token = signal<string | null>(this.loadStoredToken());

  readonly currentAdminRole = this._currentAdminRole.asReadonly();
  readonly isAuthenticated = computed(() => !!this._token() && !!this._currentAdminRole());

  private loadStoredToken(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  }

  private loadStoredRole(): AdminRole {
    if (typeof localStorage === 'undefined') return AdminRole.SuperAdmin;
    const stored = localStorage.getItem(ROLE_KEY);
    if (stored && Object.values(AdminRole).includes(stored as AdminRole)) {
      return stored as AdminRole;
    }
    return AdminRole.SuperAdmin;
  }

  login(email: string, _password: string, role?: AdminRole): void {
    const selectedRole = role ?? this._currentAdminRole() ?? AdminRole.SuperAdmin;
    localStorage.setItem(TOKEN_KEY, 'mock-token-' + Date.now());
    localStorage.setItem(ROLE_KEY, selectedRole);
    this._token.set(localStorage.getItem(TOKEN_KEY));
    this._currentAdminRole.set(selectedRole);
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
    this._token.set(null);
    this._currentAdminRole.set(AdminRole.SuperAdmin);
  }

  setRole(role: AdminRole): void {
    localStorage.setItem(ROLE_KEY, role);
    this._currentAdminRole.set(role);
  }
}
