export type LegacyPackageCode = 'VIP' | 'EXECUTIVE' | 'SUPREME';
export type LegacySponsorSource = 'AUTO' | 'CHOSEN' | 'SEED';
export type LegacyRateTier = 'BASE' | 'INCREASED';
export type LegacyMonthStatus = 'SCHEDULED' | 'PENDING' | 'DROPPED';
export type LegacyHistoryKind = 'JOIN' | 'UPGRADE' | 'REACTIVATE' | 'SEED';
export type LegacyWalletStatus = 'ACTIVE' | 'LOCKED';
export type LegacyCurrency = 'NGN' | 'USD';

export interface AdminLegacyPackage {
  code: LegacyPackageCode;
  name?: string;
  isActive: boolean;
  purchaseAmount: number;
  instantCommission: number;
  /** Phase 1 flyer field; prefer monthlyCommissionIncreased when present */
  monthlyCommission?: number;
  monthlyCommissionBase?: number | null;
  monthlyCommissionIncreased?: number | null;
  successlineBonusPercent: number;
  autoshipAmount: number;
  cycleMonths: number;
  minDirectsToIncreaseMonthly: number;
  updatedAt?: string;
}

export interface AdminLegacyPackagesResponse {
  fxRateNgnPerUsd?: number;
  packages: AdminLegacyPackage[];
}

export type AdminLegacyPackageUpdatePayload = Pick<
  AdminLegacyPackage,
  | 'purchaseAmount'
  | 'instantCommission'
  | 'monthlyCommissionBase'
  | 'monthlyCommissionIncreased'
  | 'successlineBonusPercent'
  | 'autoshipAmount'
  | 'cycleMonths'
  | 'minDirectsToIncreaseMonthly'
  | 'isActive'
>;

export interface AdminLegacyWalletSnapshot {
  walletId?: string;
  balance: number;
  status?: LegacyWalletStatus;
  currency?: LegacyCurrency;
}

export type LegacyMemberStatus = 'NONE' | 'PENDING_JOIN' | 'ACTIVE' | 'EXPIRED';

export interface AdminLegacyMemberListItem {
  userId: string;
  username: string;
  registrationPackage?: string;
  package: LegacyPackageCode;
  status: LegacyMemberStatus | string;
  sponsorUsername?: string | null;
  sponsorSource: LegacySponsorSource;
  successlineCount: number;
  issuedCount?: number;
  cycleMonths?: number;
  pendingAmount?: number | null;
  nextDueRateTier?: LegacyRateTier | null;
  lastAutoshipAt?: string | null;
  legacyCashoutBalance?: number | null;
  legacyVoucherBalance?: number | null;
  currency?: LegacyCurrency;
  joinedAt?: string | null;
}

export interface AdminLegacyMembersListResponse {
  members: AdminLegacyMemberListItem[];
  total: number;
  page?: number;
  limit?: number;
  /** Alternate pagination shapes */
  pagination?: {
    totalRecords: number;
    currentPage: number;
    totalPages: number;
  };
}

export interface AdminLegacyMembersQuery {
  page?: number;
  limit?: number;
  search?: string;
  package?: LegacyPackageCode | '';
  sponsorSource?: LegacySponsorSource | '';
}

export interface AdminLegacySuccessline {
  username: string;
  package: LegacyPackageCode;
  joinedAt: string;
  sponsorSource?: LegacySponsorSource;
}

export interface AdminLegacyPeriod {
  periodIndex: number;
  dueAt: string;
  amount: number;
  rateTier: LegacyRateTier;
  status: LegacyMonthStatus;
  droppedAt?: string | null;
  autoshipOrderId?: string | null;
}

export interface AdminLegacyPriorPending {
  cyclePackage?: LegacyPackageCode;
  periodIndex: number;
  amount: number;
  rateTier: LegacyRateTier;
  dueAt: string;
  status: LegacyMonthStatus;
}

export interface AdminLegacyEvent {
  id?: string;
  kind: LegacyHistoryKind;
  package: LegacyPackageCode;
  fromPackage?: LegacyPackageCode | null;
  instantAmount?: number;
  currency?: LegacyCurrency;
  at: string;
  orderId?: string | null;
}

export interface AdminLegacyMemberDetail {
  userId: string;
  username: string;
  fullName?: string;
  segulahPackage?: string;
  legacyPackage: LegacyPackageCode;
  status?: string;
  sponsorUsername?: string | null;
  sponsorSource: LegacySponsorSource;
  joinedAt: string;
  cycleStartedAt?: string | null;
  joinOrderId?: string | null;
  instantEarningRef?: string | null;
  seedWaivedPurchase?: boolean;
  directSuccesslineCount: number;
  monthlyQualifiedAt?: string | null;
  lastAutoshipAt?: string | null;
  lastAutoshipOrderId?: string | null;
  currency?: LegacyCurrency;
  legacyCashout?: AdminLegacyWalletSnapshot | null;
  legacyVoucher?: AdminLegacyWalletSnapshot | null;
  successlines?: AdminLegacySuccessline[];
  periods?: AdminLegacyPeriod[];
  priorPending?: AdminLegacyPriorPending[];
  events?: AdminLegacyEvent[];
  cycleMonths?: number;
  pendingAmount?: number | null;
  nextDueRateTier?: LegacyRateTier | null;
}

export interface AdminLegacyEnrollRequest {
  username: string;
  package: LegacyPackageCode;
  sponsorUsername?: string;
  waivePurchase: boolean;
}

export interface AdminLegacyEnrollResponse {
  userId: string;
  username?: string;
  package?: LegacyPackageCode;
  membershipId?: string;
  sponsorUsername?: string | null;
  sponsorSource?: LegacySponsorSource;
}

export function packageMonthlyDisplay(pkg: AdminLegacyPackage): {
  base: number;
  increased: number;
} {
  const increased =
    pkg.monthlyCommissionIncreased ?? pkg.monthlyCommission ?? 0;
  const base = pkg.monthlyCommissionBase ?? pkg.monthlyCommission ?? 0;
  return { base, increased };
}

export function ngnToUsd(amountNgn: number, fxRate = 1000): number {
  if (!fxRate || fxRate <= 0) return 0;
  return amountNgn / fxRate;
}
