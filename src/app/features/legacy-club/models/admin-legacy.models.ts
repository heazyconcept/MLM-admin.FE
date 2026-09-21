export type LegacyPackageCode = 'VIP' | 'EXECUTIVE' | 'SUPREME';
export type LegacySponsorSource = 'AUTO' | 'CHOSEN' | 'SEED';
export type LegacyRateTier = 'BASE' | 'INCREASED';
export type LegacyMonthStatus = 'SCHEDULED' | 'PENDING' | 'DROPPED';
export type LegacyHistoryKind = 'JOIN' | 'UPGRADE' | 'REACTIVATE' | 'SEED';
export type LegacyWalletStatus = 'ACTIVE' | 'LOCKED';
export type LegacyCurrency = 'NGN' | 'USD';

export interface AdminLegacyPackage {
  package: LegacyPackageCode;
  purchaseAmountNgn: number;
  purchaseAmountUsd: number;
  instantCommissionNgn: number;
  instantCommissionUsd: number;
  monthlyCommissionBaseNgn: number;
  monthlyCommissionBaseUsd: number;
  monthlyCommissionIncreasedNgn: number;
  monthlyCommissionIncreasedUsd: number;
  successlineBonusPercent: number;
  autoshipAmountNgn: number;
  autoshipAmountUsd: number;
  cycleMonths: number;
  minDirectsToIncreaseMonthly: number;
  isActive: boolean;
  updatedById?: string | null;
  updatedAt?: string;
}

export interface AdminLegacyUpgradeDifference {
  fromPackage: LegacyPackageCode;
  toPackage: LegacyPackageCode;
  payAmountNgn: number;
  payAmountUsd: number;
  instantCommissionNgn: number;
  instantCommissionUsd: number;
}

export interface AdminLegacyPackagesResponse {
  packages: AdminLegacyPackage[];
  upgradeDifferences: AdminLegacyUpgradeDifference[];
}

export type AdminLegacyPackageUpdatePayload = Pick<
  AdminLegacyPackage,
  | 'purchaseAmountNgn'
  | 'instantCommissionNgn'
  | 'monthlyCommissionBaseNgn'
  | 'monthlyCommissionIncreasedNgn'
  | 'successlineBonusPercent'
  | 'autoshipAmountNgn'
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

