import type { AuditDisplayEntry } from '../../../core/models/audit.model';

export type CaucusMembershipStatus = 'ACTIVE' | 'DEACTIVATED';

export type CaucusMonthDisplayStatus =
  | 'OPEN'
  | 'KEPT_ASIDE'
  | 'PENDING_PAYOUT'
  | 'PAID'
  | 'ADDED_TO_NEXT'
  | 'NOT_PAYABLE';

export type CaucusCarStatus = 'NONE' | 'QUALIFIED' | 'AWARDED';

export type CaucusAppealStatus = 'PENDING' | 'DISMISSED' | 'CLOSED_BY_REINSTATE';

export interface CaucusPagination {
  totalRecords: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface AdminCaucusMemberListItem {
  userId: string;
  username: string;
  registrationPackage: string;
  status: CaucusMembershipStatus;
  activatedAt: string;
  deactivatedAt: string | null;
  reinstatedAt: string | null;
  pendingAppeal: boolean;
}

export interface AdminCaucusMembersQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: CaucusMembershipStatus | '';
}

export interface AdminCaucusMembersListResponse {
  members: AdminCaucusMemberListItem[];
  pagination?: CaucusPagination;
  total?: number;
}

export interface CaucusCurrentMonth {
  monthKey: string;
  windowStartedAt: string;
  windowEndsAt: string;
  directCount: number;
  floor: number;
  target: number;
  floorMet: boolean;
  targetMet: boolean;
  amountNgn: number;
  keptAsideNgn: number;
  displayStatus: CaucusMonthDisplayStatus;
  pvPreview: boolean;
  currency: 'NGN';
}

export interface CaucusNetwork {
  downlineCount: number;
  carTarget: number;
  carStatus: CaucusCarStatus;
  carQualifiedAt: string | null;
  carAwardedAt: string | null;
}

export interface CaucusWalletSummary {
  balanceNgn: number;
  currency: 'NGN';
}

export interface CaucusMisses {
  count: number;
  limit: number;
}

export interface CaucusPvSummary {
  totalPoints: number;
}

export interface CaucusNextDrop {
  willPayNgn: number;
  keptAsideNgn: number;
  missesAfter: number;
  willRemove: boolean;
}

export interface CaucusMembershipEvent {
  type: string;
  actorUsername: string | null;
  note: string | null;
  createdAt: string;
}

export interface CaucusAppealItem {
  id: string;
  message: string;
  status: CaucusAppealStatus;
  submittedAt: string;
  resolvedAt: string | null;
}

export interface AdminCaucusMemberDetail extends AdminCaucusMemberListItem {
  currentMonth?: CaucusCurrentMonth;
  network?: CaucusNetwork;
  wallet?: CaucusWalletSummary;
  misses?: CaucusMisses;
  pv?: CaucusPvSummary;
  nextDrop?: CaucusNextDrop;
  events: CaucusMembershipEvent[];
  appeals: CaucusAppealItem[];
  activityLog: AuditDisplayEntry[];
}

export interface AdminCaucusReferral {
  id: string;
  userId: string;
  username: string;
  legacyPackage: string;
  qualifiedAt: string;
  voidedAt: string | null;
}

export interface AdminCaucusReferralsResponse {
  monthKey: string;
  referrals: AdminCaucusReferral[];
  pagination: CaucusPagination;
}

export interface AdminCaucusMonthRow {
  monthKey: string;
  directCount: number;
  amountNgn: number;
  addedFromPreviousNgn: number;
  floorMet: boolean;
  targetMet: boolean;
  displayStatus: CaucusMonthDisplayStatus;
  pvPreview: boolean;
}

export interface AdminCaucusMonthsResponse {
  months: AdminCaucusMonthRow[];
}

export interface AdminCaucusTeamMember {
  userId: string;
  username: string;
  status: CaucusMembershipStatus;
  activatedAt: string;
  depth: number;
}

export interface AdminCaucusTeamResponse {
  members: AdminCaucusTeamMember[];
  pagination: CaucusPagination;
}

export interface AdminCaucusAppealInboxItem {
  id: string;
  userId: string;
  username: string;
  message: string;
  status: CaucusAppealStatus;
  submittedAt: string;
}

export interface AdminCaucusAppealsQuery {
  page?: number;
  limit?: number;
  status?: CaucusAppealStatus | '';
}

export interface AdminCaucusAppealsListResponse {
  appeals: AdminCaucusAppealInboxItem[];
  pagination: CaucusPagination;
}

export interface ActivateCaucusMemberRequest {
  username: string;
  note?: string;
}

export interface ActivateCaucusMemberResponse {
  userId: string;
  username: string;
}

export interface CaucusBackfillResponse {
  scanned: number;
  inserted: number;
  skipped: number;
}

export interface CaucusNoteRequest {
  note?: string;
}

export interface VoidCaucusReferralRequest {
  note: string;
}
