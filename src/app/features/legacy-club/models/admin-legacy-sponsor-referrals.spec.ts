import { describe, expect, it } from 'vitest';
import { mapAdminLegacySponsorReferralItem } from './admin-legacy.models';

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