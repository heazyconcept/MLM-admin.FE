import { Injectable, signal, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { AuditApiItem, AuditDisplayEntry, mapAuditApiItem } from '../../../core/models/audit.model';

export type UserStatus = 'Active' | 'Suspended' | 'Flagged' | 'Registered' | 'Activated' | 'Inactive';
export type UserPackage = 'Nickel' | 'Silver' | 'Gold' | 'Platinum' | 'Ruby' | 'Diamond';
export type UserRole = 'User' | 'Merchant';

/** Structured wallet from GET /admin/users/:id response */
export interface UserWallet {
  walletId: string;
  balance: number;
  displayCurrency: string;
  status: string;
}

export interface UserWallets {
  cash?: UserWallet;
  registration?: UserWallet;
  voucher?: UserWallet;
  autoship?: UserWallet;
}

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
  referralCode?: string;
  referrerUsername?: string;
  upline?: string;
  uplineUsername?: string;
  downlinesCount: number;
  rank: string;
  isActive: boolean;
  isRegistrationPaid: boolean;
  wallets: UserWallets;
  activityLog: ActivityLogItem[];
  directReferralsCount?: number;
}

export type ActivityLogItem = AuditDisplayEntry;

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
  referralCode?: string;
  referrerUsername?: string;
  uplineUsername?: string;
  role: 'USER' | 'ADMIN' | 'MERCHANT';
  registrationPackage: 'NICKEL' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'RUBY' | 'DIAMOND';
  registrationCurrency: string;
  isActive: boolean;
  isRegistrationPaid: boolean;
  createdAt: string;
  totalCpv?: number;
  wallets?: Record<string, { walletId: string; balance: number; displayCurrency: string; status: string }>;
  directReferralsCount?: number;
  activityLog?: AuditApiItem[];
}

interface AdminUsersListResponse {
  users: AdminUserApi[];
  total: number;
  limit: number;
  offset: number;
}

export interface UsersListQuery {
  limit?: number;
  offset?: number;
  package?: string;
  rank?: string;
  /** Prefer for User Management status dropdown — see FRONTEND_INTEGRATION_ADMIN_USER_STATUS_FILTER.md */
  status?: UsersListStatus;
  isRegistrationPaid?: boolean;
  isActive?: boolean;
  role?: 'USER' | 'MERCHANT' | 'ADMIN';
  search?: string;
}

/** GET /admin/users?status=… */
export type UsersListStatus =
  | 'REGISTERED'
  | 'ACTIVATED'
  | 'ACTIVE'
  | 'INACTIVE'
  | 'SUSPENDED';

/** UI status dropdown label → API `status` query value */
export const UI_STATUS_TO_API: Record<string, UsersListStatus> = {
  Registered: 'REGISTERED',
  Activated: 'ACTIVATED',
  Active: 'ACTIVE',
  Inactive: 'INACTIVE',
  Suspended: 'SUSPENDED',
};

export interface UsersListResult {
  users: User[];
  total: number;
}

export interface SetUserPasswordResponse {
  message: string;
  username: string;
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

/** POST /admin/users/:id/activate-registration */
export interface ActivateRegistrationPayload {
  mode: 'DEBIT_REGISTRATION_WALLET' | 'WAIVE_PAYMENT';
  reason: string;
}

export interface ActivateRegistrationResponse {
  activated: boolean;
}

/** POST /admin/users/:id/upgrade */
export interface UpgradePackagePayload {
  targetPackage: string;
  waivePayment: boolean;
}

export interface UpgradePackageResponse {
  message: string;
  fromPackage: string;
  toPackage: string;
}

/** POST /admin/users/:id/volume/credit */
export interface CreditVolumePayload {
  amount: number;
  volumeType: 'CPV' | 'PERSONAL_PV';
  reason: string;
  externalReference?: string;
}

export interface CreditVolumeResponse {
  amount: number;
  volumeType: string;
  totalCpv?: number;
  message: string;
}

export type AdminFundWalletType = 'REGISTRATION' | 'CASH' | 'VOUCHER' | 'AUTOSHIP';

export interface AdminFundWalletRequest {
  walletType: AdminFundWalletType;
  amount: number;
  reason: string;
}

export interface AdminFundWalletResponse {
  message: string;
  reference: string;
  walletId: string;
  walletType: string;
  balance: number;
  displayCurrency: 'NGN' | 'USD';
}

/** PUT /admin/users/:id/status */
export interface UpdateUserStatusPayload {
  isActive: boolean;
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

  /** PUT /admin/users/:id/status — login on/off */
  updateUserStatus(userId: string, payload: UpdateUserStatusPayload): Observable<void> {
    return this.api.put<void>(`admin/users/${userId}/status`, payload);
  }

  /** POST /admin/users/:id/activate-registration */
  activateRegistration(userId: string, payload: ActivateRegistrationPayload): Observable<ActivateRegistrationResponse> {
    return this.api.post<ActivateRegistrationResponse>(`admin/users/${userId}/activate-registration`, payload);
  }

  /** POST /admin/users/:id/upgrade */
  upgradePackage(userId: string, payload: UpgradePackagePayload): Observable<UpgradePackageResponse> {
    return this.api.post<UpgradePackageResponse>(`admin/users/${userId}/upgrade`, {
      ...payload,
      reason: 'Admin upgrade',
    });
  }

  /** POST /admin/users/:id/volume/credit */
  creditVolume(userId: string, payload: CreditVolumePayload): Observable<CreditVolumeResponse> {
    return this.api.post<CreditVolumeResponse>(`admin/users/${userId}/volume/credit`, payload);
  }

  /** POST /admin/users/:userId/wallets/fund */
  fundWallet(userId: string, payload: AdminFundWalletRequest): Observable<AdminFundWalletResponse> {
    return this.api.post<AdminFundWalletResponse>(`admin/users/${userId}/wallets/fund`, payload);
  }

  /** PUT /admin/users/:id/cash-wallet/lock */
  lockCASHWallet(userId: string): Observable<{ message: string; status: string }> {
    return this.api.put<{ message: string; status: string }>(`admin/users/${userId}/cash-wallet/lock`, {});
  }

  /** PUT /admin/users/:id/cash-wallet/unlock */
  unlockCASHWallet(userId: string): Observable<{ message: string; status: string }> {
    return this.api.put<{ message: string; status: string }>(`admin/users/${userId}/cash-wallet/unlock`, {});
  }

  setUserPassword(userId: string, newPassword: string): Observable<SetUserPasswordResponse> {
    return this.api.post<SetUserPasswordResponse>(`admin/users/${userId}/reset-password`, {
      newPassword,
    });
  }

  impersonateUser(userId: string): Observable<AdminImpersonationStartResponse> {
    return this.api.post<AdminImpersonationStartResponse>(`admin/users/${userId}/impersonate`, {});
  }

  addActivityLog(userId: string, action: string): Observable<void> {
    return this.api.post<void>(`admin/users/${userId}/activity`, { action });
  }

  private mapApiUserToUser(apiUser: AdminUserApi): User {
    const packageMap: Record<string, UserPackage> = {
      NICKEL: 'Nickel',
      SILVER: 'Silver',
      GOLD: 'Gold',
      PLATINUM: 'Platinum',
      RUBY: 'Ruby',
      DIAMOND: 'Diamond'
    };

    let status: UserStatus;
    if (!apiUser.isActive) {
      status = 'Suspended';
    } else if (!apiUser.isRegistrationPaid) {
      status = 'Registered';
    } else {
      const referrals = apiUser.directReferralsCount;
      if (referrals === undefined || referrals === null) {
        status = 'Activated';
      } else if (referrals >= 3) {
        status = 'Active';
      } else {
        status = 'Inactive';
      }
    }

    const roleMap: Record<string, UserRole> = {
      USER: 'User',
      MERCHANT: 'Merchant',
      ADMIN: 'User'
    };

    const fullName =
      apiUser.fullName?.trim() ||
      `${apiUser.firstName ?? ''} ${apiUser.lastName ?? ''}`.trim();

    const rawWallets = apiUser.wallets ?? {};
    const wallets: UserWallets = {};
    if (rawWallets['cash']) {
      wallets.cash = {
        walletId: rawWallets['cash'].walletId,
        balance: rawWallets['cash'].balance,
        displayCurrency: rawWallets['cash'].displayCurrency,
        status: rawWallets['cash'].status,
      };
    }
    if (rawWallets['registration']) {
      wallets.registration = {
        walletId: rawWallets['registration'].walletId,
        balance: rawWallets['registration'].balance,
        displayCurrency: rawWallets['registration'].displayCurrency,
        status: rawWallets['registration'].status,
      };
    }
    if (rawWallets['voucher']) {
      wallets.voucher = {
        walletId: rawWallets['voucher'].walletId,
        balance: rawWallets['voucher'].balance,
        displayCurrency: rawWallets['voucher'].displayCurrency,
        status: rawWallets['voucher'].status,
      };
    }
    if (rawWallets['autoship']) {
      wallets.autoship = {
        walletId: rawWallets['autoship'].walletId,
        balance: rawWallets['autoship'].balance,
        displayCurrency: rawWallets['autoship'].displayCurrency,
        status: rawWallets['autoship'].status,
      };
    }

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
      referralCode: apiUser.referralCode,
      referrerUsername: apiUser.referrerUsername ?? undefined,
      upline: undefined,
      uplineUsername: apiUser.uplineUsername ?? undefined,
      downlinesCount: apiUser.totalCpv ?? 0,
      rank: apiUser.isRegistrationPaid ? 'Active Member' : 'Pending Registration',
      isActive: apiUser.isActive,
      isRegistrationPaid: apiUser.isRegistrationPaid,
      wallets,
      activityLog: (apiUser.activityLog ?? []).map(mapAuditApiItem),
      directReferralsCount: apiUser.directReferralsCount
    };
  }
}
