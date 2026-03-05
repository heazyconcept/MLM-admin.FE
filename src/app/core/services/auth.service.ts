import { Injectable, signal, computed, inject } from '@angular/core';
import { AdminRole } from '../models/admin-permission.model';
import { ApiService } from './api.service';
import { Observable, tap, BehaviorSubject } from 'rxjs';

const TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refreshToken';
const ROLE_KEY = 'adminRole';

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);

  private readonly _currentAdminRole = signal<AdminRole>(this.loadStoredRole());
  private readonly _token = signal<string | null>(this.loadStoredToken());
  private readonly _refreshToken = signal<string | null>(this.loadStoredRefreshToken());
  
  /** Subject to track refresh token status (used by interceptor) */
  private readonly refreshTokenSubject = new BehaviorSubject<string | null>(this._token());

  readonly currentAdminRole = this._currentAdminRole.asReadonly();
  readonly isAuthenticated = computed(() => !!this._token() && !!this._currentAdminRole());

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

  login(username: string, password: string): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('auth/login', { username, password }).pipe(
      tap(response => {
        this.storeTokens(response.accessToken, response.refreshToken);
      })
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
      })
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
    this._token.set(null);
    this._refreshToken.set(null);
    this._currentAdminRole.set(AdminRole.SuperAdmin);
  }

  setRole(role: AdminRole): void {
    localStorage.setItem(ROLE_KEY, role);
    this._currentAdminRole.set(role);
  }
}
