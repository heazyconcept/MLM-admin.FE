/**
 * Backend test reference — expected coverage for GET /admin/users?status=…
 *
 * This file documents the Nest/admin service cases that should live in the
 * backend repo as `admin.service.get-users.spec.ts`. It is not executed by
 * the Angular test runner.
 *
 * Contract: FRONTEND_INTEGRATION_ADMIN_USER_STATUS_FILTER.md
 *
 * Paste / port these cases into the backend suite as `admin.service.get-users.spec.ts`.
 * Location in this repo (reference only): docs/backend-test-reference/admin.service.get-users.spec.ts
 */

describe('AdminService.getUsers — status filter (backend reference)', () => {
  // Inject AdminService / Users repository as in the real backend suite.

  const statuses = [
    'SUSPENDED',
    'REGISTERED',
    'ACTIVATED',
    'ACTIVE',
    'INACTIVE',
  ] as const;

  it.each(statuses)(
    'filters by status=%s and returns a total for the filtered set',
    async (_status) => {
      // const result = await service.getUsers({ status, limit: 20, offset: 0 });
      // expect(result.users.every(matchesStatusSemantics(status))).toBe(true);
      // expect(result.total).toBe(countMatching(status));
      // expect(result.users.length).toBeLessThanOrEqual(20);
    }
  );

  it('status=SUSPENDED returns only isActive === false', async () => {
    // const { users, total } = await service.getUsers({ status: 'SUSPENDED' });
    // expect(users.every((u) => u.isActive === false)).toBe(true);
    // expect(total).toBe(…)
  });

  it('status=REGISTERED returns active + unpaid only', async () => {
    // const { users } = await service.getUsers({ status: 'REGISTERED' });
    // expect(users.every((u) => u.isActive && !u.isRegistrationPaid)).toBe(true);
  });

  it('status=ACTIVATED returns paid users with missing directReferralsCount', async () => {
    // const { users } = await service.getUsers({ status: 'ACTIVATED' });
    // expect(users.every((u) =>
    //   u.isActive && u.isRegistrationPaid && (u.directReferralsCount == null)
    // )).toBe(true);
  });

  it('status=ACTIVE returns paid users with directReferralsCount >= 3', async () => {
    // const { users } = await service.getUsers({ status: 'ACTIVE' });
    // expect(users.every((u) =>
    //   u.isActive && u.isRegistrationPaid && (u.directReferralsCount ?? 0) >= 3
    // )).toBe(true);
  });

  it('status=INACTIVE returns paid users with directReferralsCount < 3', async () => {
    // const { users } = await service.getUsers({ status: 'INACTIVE' });
    // expect(users.every((u) =>
    //   u.isActive && u.isRegistrationPaid &&
    //   u.directReferralsCount != null && u.directReferralsCount < 3
    // )).toBe(true);
  });

  it('combines status=ACTIVE with package=GOLD', async () => {
    // const { users, total } = await service.getUsers({
    //   status: 'ACTIVE',
    //   package: 'GOLD',
    //   limit: 20,
    //   offset: 0,
    // });
    // expect(users.every((u) => u.registrationPackage === 'GOLD')).toBe(true);
    // expect(total).toBe(countActiveGold());
  });

  it('combines status=INACTIVE with search', async () => {
    // const { users, total } = await service.getUsers({
    //   status: 'INACTIVE',
    //   search: 'ada',
    //   limit: 20,
    //   offset: 0,
    // });
    // expect(total).toBe(countInactiveMatchingSearch('ada'));
  });

  it('combines status + package + search with correct filtered total', async () => {
    // const { users, total } = await service.getUsers({
    //   status: 'ACTIVE',
    //   package: 'SILVER',
    //   search: 'john',
    //   limit: 20,
    //   offset: 0,
    // });
    // expect(total).toBe(countIntersection({ status: 'ACTIVE', package: 'SILVER', search: 'john' }));
    // expect(users.length).toBeLessThanOrEqual(20);
  });

  it('paginates within the status-filtered set without changing total', async () => {
    // const page0 = await service.getUsers({ status: 'ACTIVE', limit: 20, offset: 0 });
    // const page1 = await service.getUsers({ status: 'ACTIVE', limit: 20, offset: 20 });
    // expect(page0.total).toBe(page1.total);
    // expect(page0.users[0]?.id).not.toBe(page1.users[0]?.id);
  });

  it('omitting status does not apply MLM status dimension', async () => {
    // const { users } = await service.getUsers({ limit: 20, offset: 0 });
    // // May include Registered, Active, Suspended, etc. in one page
  });

  it('legacy isActive / isRegistrationPaid still work without status', async () => {
    // const unpaid = await service.getUsers({ isActive: true, isRegistrationPaid: false });
    // expect(unpaid.users.every((u) => u.isActive && !u.isRegistrationPaid)).toBe(true);
  });
});
