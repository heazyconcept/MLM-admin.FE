# Admin — Upgrade a customer's Legacy Club membership

**Date:** 2026-10-03  
**Audience:** Backend + admin FE  
**Status:** Backend implemented; admin FE pending

---

## 1. Purpose

Allow an admin to upgrade an **ACTIVE** Legacy Club member to a higher package, with a choice to:

- **Debit the customer** — the upgrade difference is taken from the customer's network **REGISTRATION** wallet (same wallet and amount as a customer self-upgrade), or
- **Not debit the customer** — complimentary upgrade; nothing is taken from any wallet.

In **both** cases the customer receives everything a paid upgrade gives:

- Legacy voucher credit for the upgrade difference (`LEGACY_VOUCHER`)
- Instant commission difference (`LEGACY_CASHOUT`)
- Successline Instant bonus to the Legacy sponsor (when the sponsor is earning-eligible)
- Current cycle ended, new 6-month `UPGRADE` cycle started at the new package rates
- `UPGRADE` event on the member timeline

This is **not** the same as:

- **Customer self-upgrade** (`POST /legacy/upgrade/start` + `POST /legacy/payments/wallet`)
- **Waive join** (`POST /admin/legacy/members/:userId/waive-join`) — only for `PENDING_JOIN`
- **Seed enroll** (`POST /admin/legacy/enroll`)

---

## 2. Admin API

**Permission (either):** `legacy.upgrade_member` (new, seeded for Super Administrator) or `legacy.enroll_seed`.

### 2.1 Quote (recommended before submitting)

```
GET /admin/legacy/members/:userId/upgrade/quote?package=EXECUTIVE
```

**Success `200`:**

```json
{
  "data": {
    "userId": "uuid",
    "username": "customer1",
    "fromPackage": "VIP",
    "toPackage": "EXECUTIVE",
    "currency": "NGN",
    "payAmount": 140000,
    "instantCommission": 60000,
    "registrationWalletBalance": 250000,
    "registrationWalletStatus": "ACTIVE",
    "canDebit": true
  }
}
```

- Amounts are in the customer's `currency`.
- `canDebit` is `false` when the registration wallet is missing, locked, or below `payAmount`. Use it to warn or disable the **Debit customer** option.
- `registrationWalletStatus` is `null` when the customer has no registration wallet.

### 2.2 Upgrade

```
POST /admin/legacy/members/:userId/upgrade
```

**Request body:**

```json
{
  "package": "EXECUTIVE",
  "debitCustomer": true,
  "reason": "Support ticket #1234 - customer requested upgrade",
  "requestKey": "550e8400-e29b-41d4-a716-446655440000"
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `package` | `LegacyPackage` | yes | Must be active and higher than the current package |
| `debitCustomer` | boolean | yes | `true` debits the registration wallet; `false` is complimentary |
| `reason` | string | yes | Trimmed, min 10 chars, max 500 |
| `requestKey` | UUID | yes | Generate once per submit; reuse when retrying the same request |

**Success `200`:**

```json
{
  "data": {
    "userId": "uuid",
    "username": "customer1",
    "fromPackage": "VIP",
    "toPackage": "EXECUTIVE",
    "debitCustomer": true,
    "paymentMethod": "REGISTRATION_WALLET",
    "upgradeAmount": 140000,
    "amountCharged": 140000,
    "instantCommission": 60000,
    "currency": "NGN",
    "paymentId": "uuid",
    "cycleId": "uuid",
    "upgradedAt": "2026-10-03T14:00:00.000Z",
    "upgradedByAdminId": "uuid",
    "reason": "Support ticket #1234 - customer requested upgrade"
  }
}
```

- `amountCharged` is `0` and `paymentMethod` is `ADMIN_WAIVED` when `debitCustomer` is `false`.
- `upgradeAmount` is always the package difference (also the voucher credit).

**Errors:**

| HTTP | Code | When |
|---|---|---|
| 404 | `USER_NOT_FOUND` | Unknown user |
| 404 | `LEGACY_MEMBERSHIP_NOT_FOUND` | User has no Legacy membership |
| 409 | `LEGACY_NOT_ACTIVE` | Membership is not `ACTIVE` (pending, suspended, expired, cancelled) |
| 400 | `LEGACY_UPGRADE_INVALID_PACKAGE` | Target is not higher than current, or is inactive |
| 400 | `REGISTRATION_UNPAID` | Customer network registration is unpaid |
| 422 | `LEGACY_PAYMENT_PENDING` | A manual Legacy payment is awaiting review — approve/reject it first |
| 400 | `INSUFFICIENT_BALANCE` | `debitCustomer: true` and the registration wallet is missing or short |
| 400 | `WALLET_LOCKED` | `debitCustomer: true` and the registration wallet is locked |
| 409 | `REQUEST_KEY_CONFLICT` | `requestKey` reused with a different package or debit option |
| 403 | — | Missing permission, or impersonation session |

All failures roll back completely: no debit, no credits, no package change.

---

## 3. Backend behaviour

- Runs in a single serializable transaction with the customer row locked.
- If the customer had started their own upgrade intent, the admin's chosen package replaces it; the intent is cleared afterwards.
- A `LegacyPayment` row is recorded with `purpose: UPGRADE`, `status: APPROVED`, `reviewedById: <adminId>` and `method`:
  - `REGISTRATION_WALLET` when debited (ledger debit metadata `kind: LEGACY_ADMIN_UPGRADE`, `adminId`, `reason`)
  - `ADMIN_WAIVED` when not debited
- Audit log `LEGACY_ADMIN_UPGRADE` on `LegacyMembership` with `fromPackage`, `toPackage`, `debitCustomer`, `amountNgn`, `instantNgn`, `reason`, `paymentId`.
- Customer receives a `LEGACY_UPGRADED` notification (same wire category as `LEGACY_JOIN_CANCELLED`, `actionUrl: /legacy`, payload `fromPackage`, `toPackage`, `upgradedBy: "admin"`).
- Retrying with the same `requestKey` returns the original result without charging or notifying again.

---

## 4. Admin FE (to implement)

| Location | Change |
|---|---|
| `/admin/legacy/members/:userId` | **Upgrade package** action when `status === ACTIVE` and a higher package exists |
| Upgrade dialog | Package select (higher packages only), **Debit customer** toggle, reason textarea, quote summary from 2.1 |
| Service | `GET admin/legacy/members/:userId/upgrade/quote`, `POST admin/legacy/members/:userId/upgrade` |

**Permission check:** `legacy.upgrade_member` or fallback `legacy.enroll_seed`.

---

## 5. Related docs

- [ADMIN_WAIVE_LEGACY_JOIN.md](./ADMIN_WAIVE_LEGACY_JOIN.md)
- [BACKEND_BUG_LEGACY_PAYMENT_UPGRADE_PURPOSE_CHECK.md](./BACKEND_BUG_LEGACY_PAYMENT_UPGRADE_PURPOSE_CHECK.md)
- Phase 3 upgrade flow: `docs/business/New Features/legacy-club/phase-3-backend.md`
