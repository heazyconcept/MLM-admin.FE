import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AdminRole } from '../models/admin-permission.model';
import { ApiService } from './api.service';
import { Observable, tap, BehaviorSubject } from 'rxjs';

const TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refreshToken';
const ROLE_KEY = 'adminRole';
const MUST_CHANGE_PASSWORD_KEY = 'mustChangePassword';
const EFFECTIVE_PERMISSIONS_KEY = 'effectivePermissions';

export interface AuthUser {
  id: string;
  username: string;
  fullName?: string;
  email?: string;
  mustChangePassword?: boolean;
  groups?: string[];
  effectivePermissions?: string[];
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  user?: AuthUser;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);

  private readonly _currentAdminRole = signal<AdminRole>(this.loadStoredRole());
  private readonly _token = signal<string | null>(this.loadStoredToken());
  private readonly _refreshToken = signal<string | null>(this.loadStoredRefreshToken());
  private readonly _mustChangePassword = signal<boolean>(this.loadStoredMustChangePassword());
  private readonly _effectivePermissions = signal<string[]>(this.loadStoredEffectivePermissions());

  /** Subject to track refresh token status (used by interceptor) */
  private readonly refreshTokenSubject = new BehaviorSubject<string | null>(this._token());

  readonly currentAdminRole = this._currentAdminRole.asReadonly();
  readonly mustChangePassword = this._mustChangePassword.asReadonly();
  readonly effectivePermissions = this._effectivePermissions.asReadonly();
  readonly isAuthenticated = computed(() => !!this._token());

  private loadStoredToken(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  }

  private loadStoredRefreshToken(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  private loadStoredRole(): AdminRole {
    if (typeof localStorage === 'undefined') return AdminRole.SuperAdmin;
    const stored = localStorage.getItem(ROLE_KEY);
    if (stored && Object.values(AdminRole).includes(stored as AdminRole)) {
      return stored as AdminRole;
    }
    return AdminRole.SuperAdmin;
  }

  private loadStoredMustChangePassword(): boolean {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(MUST_CHANGE_PASSWORD_KEY) === 'true';
  }

  private loadStoredEffectivePermissions(): string[] {
    if (typeof localStorage === 'undefined') return [];
    const stored = localStorage.getItem(EFFECTIVE_PERMISSIONS_KEY);
    if (!stored) return [];
    try {
      const parsed: unknown = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed.filter((key): key is string => typeof key === 'string') : [];
    } catch {
      return [];
    }
  }

  login(username: string, password: string): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('auth/login', { username, password }).pipe(
      tap(response => {
        this.storeTokens(response.accessToken, response.refreshToken);
        this.setMustChangePassword(!!response.user?.mustChangePassword);
        this.setEffectivePermissions(response.user?.effectivePermissions ?? []);
      })
    );
  }

  /** PUT /admin/me/password — logged-in admin changes own console password */
  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    const body: ChangePasswordRequest = { currentPassword, newPassword };
    return this.api.put<void>('admin/me/password', body).pipe(
      tap(() => this.setMustChangePassword(false))
    );
  }

  /** Refresh the access token using the refresh token */
  refreshAccessToken(): Observable<AuthResponse> {
    const refreshToken = this._refreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    return this.api.post<AuthResponse>('auth/refresh', { refreshToken }).pipe(
      tap(response => {
        this.storeTokens(response.accessToken, response.refreshToken || refreshToken);
        this.refreshTokenSubject.next(response.accessToken);
        if (response.user?.mustChangePassword !== undefined) {
          this.setMustChangePassword(!!response.user.mustChangePassword);
        }
        if (response.user?.effectivePermissions) {
          this.setEffectivePermissions(response.user.effectivePermissions);
        }
      })
    );
  }

  setEffectivePermissions(permissions: string[]): void {
    const normalized = [...new Set(permissions)];
    if (typeof localStorage !== 'undefined') {
      if (normalized.length > 0) {
        localStorage.setItem(EFFECTIVE_PERMISSIONS_KEY, JSON.stringify(normalized));
      } else {
        localStorage.removeItem(EFFECTIVE_PERMISSIONS_KEY);
      }
    }
    this._effectivePermissions.set(normalized);
  }

  setMustChangePassword(required: boolean): void {
    if (typeof localStorage !== 'undefined') {
      if (required) {
        localStorage.setItem(MUST_CHANGE_PASSWORD_KEY, 'true');
      } else {
        localStorage.removeItem(MUST_CHANGE_PASSWORD_KEY);
      }
    }
    this._mustChangePassword.set(required);
  }

  /** Detect backend 403 requiring password change before admin access */
  isPasswordChangeRequiredError(error: HttpErrorResponse): boolean {
    if (error.status !== 403) {
      return false;
    }

    const message = error.error?.message;
    const messages = Array.isArray(message) ? message : [message];

    return messages.some(
      (entry) =>
        typeof entry === 'string' &&
        entry.toLowerCase().includes('password change required')
    );
  }

  /** Store both access and refresh tokens */
  private storeTokens(accessToken: string, refreshToken?: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, accessToken);
      if (refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      }
    }
    this._token.set(accessToken);
    if (refreshToken) {
      this._refreshToken.set(refreshToken);
    }
  }

  /** Get current access token */
  getAccessToken(): string | null {
    return this._token();
  }

  /** Get refresh token subject for interceptor use */
  getRefreshTokenSubject(): BehaviorSubject<string | null> {
    return this.refreshTokenSubject;
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(MUST_CHANGE_PASSWORD_KEY);
    localStorage.removeItem(EFFECTIVE_PERMISSIONS_KEY);
    this._token.set(null);
    this._refreshToken.set(null);
    this._currentAdminRole.set(AdminRole.SuperAdmin);
    this._mustChangePassword.set(false);
    this._effectivePermissions.set([]);
  }

  setRole(role: AdminRole): void {
    localStorage.setItem(ROLE_KEY, role);
    this._currentAdminRole.set(role);
  }
}
