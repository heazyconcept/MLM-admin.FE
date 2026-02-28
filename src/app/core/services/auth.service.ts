import { Injectable, signal, computed, inject } from '@angular/core';
import { AdminRole } from '../models/admin-permission.model';
import { ApiService } from './api.service';
import { Observable, tap } from 'rxjs';

const TOKEN_KEY = 'token';
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

  login(username: string, password: string): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('auth/login', { username, password }).pipe(
      tap(response => {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(TOKEN_KEY, response.accessToken);
        }
        this._token.set(response.accessToken);
        this._currentAdminRole.set(this.loadStoredRole());
      })
    );
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
