export type LegacyPackageCode = 'VIP' | 'EXECUTIVE' | 'SUPREME';
export type LegacySponsorSource = 'AUTO' | 'CHOSEN' | 'SEED';
export type LegacyRateTier = 'BASE' | 'INCREASED';
export type LegacyMonthStatus = 'SCHEDULED' | 'PENDING' | 'DROPPED';
export type LegacyHistoryKind =
  | 'JOIN'
  | 'UPGRADE'
  | 'REACTIVATE'
  | 'SEED'
  | 'JOIN_CANCELLED'
  | 'JOIN_WAIVED';
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
  cycleWeeks?: number;
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
  cashoutAmount?: number | null;
  voucherGross?: number | null;
  voucherFee?: number | null;
  voucherNet?: number | null;
  rateTier: LegacyRateTier;
  status: LegacyMonthStatus;
  droppedAt?: string | null;
  autoshipOrderId?: string | null;
}

export interface AdminLegacyPriorPending {
  cyclePackage?: LegacyPackageCode;
  periodIndex: number;
  amount: number;
  cashoutAmount?: number | null;
  voucherGross?: number | null;
  voucherFee?: number | null;
  voucherNet?: number | null;
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
  cycleWeeks?: number;
  issuedCount?: number;
  pendingAmount?: number | null;
  nextDueRateTier?: LegacyRateTier | null;
}

export interface AdminLegacyCancelJoinRequest {
  reason: string;
}

export interface AdminLegacyCancelJoinResponse {
  userId: string;
  username?: string;
  previousStatus: 'PENDING_JOIN';
  status: 'NONE';
  package?: LegacyPackageCode;
  cancelledAt: string;
  cancelledByAdminId?: string;
  reason: string;
}

export interface AdminLegacyWaiveJoinRequest {
  reason: string;
}

export interface AdminLegacyWaiveJoinResponse {
  userId: string;
  username?: string;
  previousStatus: 'PENDING_JOIN';
  status: 'ACTIVE';
  package?: LegacyPackageCode;
  joinedAt: string;
  waivedAt: string;
  waivedByAdminId?: string;
  reason: string;
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

export type LegacyPaymentPurpose = 'JOIN' | 'UPGRADE' | 'REACTIVATE';
export type LegacyPaymentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type LegacyPaymentMethod = 'REGISTRATION_WALLET' | 'MANUAL_BANK';

export interface AdminLegacyPaymentMembership {
  userId: string;
  user?: {
    username?: string;
    email?: string;
  };
}

export interface AdminLegacyPayment {
  id: string;
  membershipId?: string;
  requestKey?: string;
  purpose: LegacyPaymentPurpose;
  method?: LegacyPaymentMethod;
  status: LegacyPaymentStatus;
  package?: LegacyPackageCode;
  amountNgn?: number | string;
  amountBaseUsd?: number | string;
  instantNgn?: number | string;
  configSnapshot?: {
    autoship?: number;
    monthlyBase?: number;
    monthlyIncreased?: number;
  };
  depositorName?: string;
  evidenceUrl?: string;
  rejectionReason?: string | null;
  reviewedById?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  membership?: AdminLegacyPaymentMembership;
  /** Flat legacy shapes */
  userId?: string;
  username?: string;
  userEmail?: string;
  amount?: number;
  currency?: LegacyCurrency;
}

export function legacyPaymentUsername(p: AdminLegacyPayment): string | undefined {
  return p.membership?.user?.username ?? p.username;
}

export function legacyPaymentUserId(p: AdminLegacyPayment): string | undefined {
  return p.membership?.userId ?? p.userId;
}

export function legacyPaymentAmountNgn(p: AdminLegacyPayment): number {
  const raw = p.amountNgn ?? p.amount ?? 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

export interface AdminLegacyPaymentsListResponse {
  items?: AdminLegacyPayment[];
  payments?: AdminLegacyPayment[];
  total?: number;
  page?: number;
  limit?: number;
  pagination?: {
    totalRecords: number;
    currentPage: number;
    totalPages: number;
  };
}

export interface AdminLegacyPaymentsQuery {
  status?: LegacyPaymentStatus | '';
  search?: string;
  offset?: number;
  limit?: number;
}

/** Monthly flyer amount → weekly (backend ÷ 4). */
export function weeklyFromMonthly(monthlyNgn: number): number {
  return Number(monthlyNgn || 0) / 4;
}

export interface WeeklyCommissionPreview {
  weeklyCommission: number;
  weeklyAutoship: number;
  cashout: number;
  voucherNet: number;
}

/**
 * Read-only weekly breakdown from monthly config.
 * Cashout = weekly commission − weekly Autoship; voucher net = weekly Autoship × 0.9.
 */
export function weeklyCommissionPreview(
  monthlyCommissionNgn: number,
  autoshipMonthlyNgn: number
): WeeklyCommissionPreview {
  const weeklyCommission = weeklyFromMonthly(monthlyCommissionNgn);
  const weeklyAutoship = weeklyFromMonthly(autoshipMonthlyNgn);
  const cashout = Math.max(0, weeklyCommission - weeklyAutoship);
  const voucherNet = weeklyAutoship * 0.9;
  return { weeklyCommission, weeklyAutoship, cashout, voucherNet };
}

export function ngnToUsdPreview(amountNgn: number, fxRate = 1000): number {
  if (!fxRate || fxRate <= 0) return 0;
  return amountNgn / fxRate;
}

