import { Injectable, signal, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';

export type UserStatus = 'Active' | 'Suspended' | 'Flagged';
export type UserPackage = 'Nickel' | 'Silver' | 'Gold' | 'Platinum' | 'Ruby' | 'Diamond';
export type UserRole = 'User' | 'Merchant';

export interface User {
  id: string;
  fullName: string;
  username: string;
  email: string;
  phone: string;
  package: UserPackage;
  status: UserStatus;
  role: UserRole;
  apiRole: 'USER' | 'ADMIN' | 'MERCHANT';
  registrationDate: Date;
  upline?: string;
  downlinesCount: number;
  rank: string;
  wallets: {
    cash: number;
    productVoucher: number;
    autoship: number;
  };
  activityLog: ActivityLogItem[];
}

export interface ActivityLogItem {
  id: string;
  action: string;
  timestamp: Date;
  performedBy: string;
}

export interface UserFilters {
  search: string;
  status: UserStatus | '';
  package: UserPackage | '';
  role: UserRole | '';
  dateFrom: Date | null;
  dateTo: Date | null;
}

interface AdminUserApi {
  id: string;
  email: string;
  phone?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  role: 'USER' | 'ADMIN' | 'MERCHANT';
  registrationPackage: 'NICKEL' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'RUBY' | 'DIAMOND';
  registrationCurrency: string;
  isActive: boolean;
  isRegistrationPaid: boolean;
  createdAt: string;
  totalCpv?: number;
}

interface AdminUsersListResponse {
  users: AdminUserApi[];
  total: number;
  limit: number;
  offset: number;
}

/** GET /admin/users query params */
export interface UsersListQuery {
  limit?: number;
  offset?: number;
  package?: string;
  rank?: string;
  isRegistrationPaid?: boolean;
  isActive?: boolean;
  role?: 'USER' | 'MERCHANT' | 'ADMIN';
}

export interface UsersListResult {
  users: User[];
  total: number;
}

interface ResetPasswordResponse {
  message: string;
}

export interface AdminImpersonationStartResponse {
  exchangeCode: string;
  expiresInSeconds: number;
  redirectUrl: string;
  targetUser: {
    id: string;
    username: string;
    email: string;
    role: 'USER' | 'ADMIN' | 'MERCHANT';
  };
}

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private readonly api = inject(ApiService);

  users = signal<User[]>([]);
  selectedUser = signal<User | null>(null);

  getUsers(query?: UsersListQuery): Observable<UsersListResult> {
    const params = query as Record<string, unknown> | undefined;
    return this.api.get<AdminUsersListResponse>('admin/users', params).pipe(
      map((response) => ({
        users: (response.users ?? []).map((u) => this.mapApiUserToUser(u)),
        total: response.total ?? 0,
      }))
    );
  }

  getUserById(id: string): Observable<User> {
    return this.api.get<AdminUserApi>(`admin/users/${id}`).pipe(
      map(u => this.mapApiUserToUser(u))
    );
  }

  updateUserStatus(userId: string, status: UserStatus, reason: string): Observable<void> {
    return this.api.put<void>(`admin/users/${userId}/status`, { status, reason });
  }

  resetUserPassword(userId: string): Observable<string> {
    return this.api.post<ResetPasswordResponse>(`admin/users/${userId}/reset-password`, {}).pipe(
      map(response => response.message)
    );
  }

  impersonateUser(userId: string): Observable<AdminImpersonationStartResponse> {
    return this.api.post<AdminImpersonationStartResponse>(`admin/users/${userId}/impersonate`, {});
  }

  addActivityLog(userId: string, action: string): Observable<void> {
    return this.api.post<void>(`admin/users/${userId}/activity`, { action });
  }

  private mapApiUserToUser(apiUser: AdminUserApi): User {
    const packageMap: Record<AdminUserApi['registrationPackage'], UserPackage> = {
      NICKEL: 'Nickel',
      SILVER: 'Silver',
      GOLD: 'Gold',
      PLATINUM: 'Platinum',
      RUBY: 'Ruby',
      DIAMOND: 'Diamond'
    };

    const status: UserStatus = apiUser.isActive ? 'Active' : 'Suspended';

    const roleMap: Record<AdminUserApi['role'], UserRole> = {
      USER: 'User',
      MERCHANT: 'Merchant',
      ADMIN: 'User' // treat admin accounts as regular users in this view for now
    };

    const fullName =
      apiUser.fullName?.trim() ||
      `${apiUser.firstName ?? ''} ${apiUser.lastName ?? ''}`.trim();

    return {
      id: apiUser.id,
      fullName,
      username: apiUser.username || apiUser.email.split('@')[0],
      email: apiUser.email || '',
      phone: apiUser.phone || '',
      package: packageMap[apiUser.registrationPackage] ?? 'Silver',
      status,
      role: roleMap[apiUser.role] ?? 'User',
      apiRole: apiUser.role,
      registrationDate: new Date(apiUser.createdAt),
      upline: undefined,
      downlinesCount: apiUser.totalCpv ?? 0,
      rank: apiUser.isRegistrationPaid ? 'Active Member' : 'Pending Registration',
      wallets: {
        cash: 0,
        productVoucher: 0,
        autoship: 0
      },
      activityLog: []
    };
  }
}

