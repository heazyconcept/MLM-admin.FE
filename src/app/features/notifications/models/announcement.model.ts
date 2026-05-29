export type AnnouncementStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface Announcement {
  id: string;
  title: string;
  message: string;
  imageUrls: string[];
  displayDays: number;
  publishedAt: string | null;
  endsAt: string | null;
  status: AnnouncementStatus;
  targetRoles: string[];
  targetPackages: string[];
  recipientCount: number;
  createdByAdminId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnnouncementsListFilters {
  status?: AnnouncementStatus;
  limit?: number;
  offset?: number;
}

export interface AnnouncementsListResponse {
  announcements: Announcement[];
  total?: number;
  limit?: number;
  offset?: number;
}

export interface CreateAnnouncementResponse {
  announcementId: string;
  recipientCount: number;
  announcement: Announcement;
}

export interface CreateAnnouncementInput {
  title: string;
  message: string;
  displayDays: number;
  targetRoles?: string[];
  targetPackages?: string[];
  images?: File[];
}

export interface BroadcastAnnouncementPayload {
  title: string;
  message: string;
  displayDays: number;
  targetRoles?: string[];
  targetPackages?: string[];
}

export interface BroadcastAnnouncementResponse {
  count: number;
  announcementId: string;
}

/** API role values for targeting (empty = all roles). */
export const ANNOUNCEMENT_TARGET_ROLES = [
  { label: 'User', value: 'USER' },
  { label: 'Merchant', value: 'MERCHANT' },
] as const;

/** API package values for targeting (empty = all packages). */
export const ANNOUNCEMENT_TARGET_PACKAGES = [
  { label: 'Nickel', value: 'NICKEL' },
  { label: 'Silver', value: 'SILVER' },
  { label: 'Gold', value: 'GOLD' },
  { label: 'Platinum', value: 'PLATINUM' },
  { label: 'Ruby', value: 'RUBY' },
  { label: 'Diamond', value: 'DIAMOND' },
] as const;

export const ANNOUNCEMENT_IMAGE_ACCEPT = 'image/jpeg,image/jpg,image/png,image/webp';
export const ANNOUNCEMENT_MAX_IMAGES = 5;
export const ANNOUNCEMENT_MAX_IMAGE_BYTES = 5 * 1024 * 1024;
