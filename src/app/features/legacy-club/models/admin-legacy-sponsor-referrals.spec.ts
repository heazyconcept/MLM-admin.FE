import { describe, expect, it } from 'vitest';
import {
  legacyPackageLabel,
  mapAdminLegacySponsorReferralItem,
  mapAdminLegacySponsorReferralJoinItem,
} from './admin-legacy.models';

describe('mapAdminLegacySponsorReferralItem', () => {
  it('maps camelCase and snake_case fields', () => {
    const mapped = mapAdminLegacySponsorReferralItem({
      userId: 'u1',
      username: 'UGWA',
      full_name: 'ANEBI OJONUGWA',
      referral_count: 11,
    });
    expect(mapped).toEqual({
      userId: 'u1',
      username: 'UGWA',
      fullName: 'ANEBI OJONUGWA',
      legacyPackage: null,
      referralCount: 11,
    });
  });

  it('treats empty full name as null', () => {
    const mapped = mapAdminLegacySponsorReferralItem({
      user_id: 'u2',
      username: 'bob',
      fullName: '   ',
      referralCount: 1,
    });
    expect(mapped.fullName).toBeNull();
    expect(mapped.userId).toBe('u2');
  });
});

describe('mapAdminLegacySponsorReferralJoinItem', () => {
  it('maps join row fields', () => {
    const mapped = mapAdminLegacySponsorReferralJoinItem({
      user_id: 'j1',
      username: 'joiner',
      fullName: 'A B',
      legacy_package: 'EXECUTIVE',
      activated_at: '2026-10-01T00:00:00.000Z',
    });
    expect(mapped).toEqual({
      userId: 'j1',
      username: 'joiner',
      fullName: 'A B',
      legacyPackage: 'EXECUTIVE',
      activatedAt: '2026-10-01T00:00:00.000Z',
    });
  });
});

describe('legacyPackageLabel', () => {
  it('labels known packages', () => {
    expect(legacyPackageLabel('SUPREME')).toBe('Supreme');
  });
});