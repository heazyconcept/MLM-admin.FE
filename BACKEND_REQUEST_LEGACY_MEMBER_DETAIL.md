# Backend Request — Legacy Member Detail (Activity Log + Earnings)

**Date:** 2026-10-06  
**From:** Admin app (`mlm-admin.fe`)  
**To:** HerbApi / Legacy Club admin  
**Status:** Open — two tabs pending backend data  
**Priority:** Medium  
**Admin screen:** Legacy Club → Members → member detail

---

## 1. Summary

The Legacy member detail page is tabbed and **already wired** for most sections:

| Tab | Status | Data source |
|-----|--------|-------------|
| Account Info | Done | `GET /admin/legacy/members/:userId` |
| Network Details | Done | Same detail response (`successlines[]`) |
| Orders | Done | `GET /admin/orders?userId=&channel=` |
| **Activity Log** | **Needs backend** | See §2 |
| **Earnings Activity** | **Needs backend** | See §3 |

Only **Activity Log** and **Earnings Activity** require backend work.

---

## 2. Activity Log

### What admin expects

Same audited action log as standard user details: who did what, when, from which IP.

Columns: Timestamp, Actor, Action, Description, IP.

### What we have today

Legacy detail returns `events[]` (business lifecycle: JOIN, UPGRADE, AUTOSHIP, etc.). That is useful but **not** the admin audit trail shown on user details (`activityLog[]`).

### Request

Provide admin audit entries for Legacy members using **one** of:

1. Add `activityLog[]` to `GET /admin/legacy/members/:userId` — same schema as user detail, **or**
2. Expose a shared endpoint, e.g. `GET /admin/users/:userId/activity-log`, that works for Legacy members.

**Expected item shape** (match user detail):

```json
{
  "id": "uuid",
  "timestamp": "2026-10-01T14:30:00.000Z",
  "actorDisplayName": "Admin User",
  "action": "legacy.upgrade_member",
  "description": "Upgraded member from Silver to Gold",
  "ipAddress": "102.89.x.x"
}
```

**Acceptance:** Activity Log tab shows admin-audited actions (waive join, cancel pending join, upgrade, seed enroll, etc.), not only Legacy business events.

---

## 3. Earnings Activity

### What admin expects

Read-only earnings/ledger log for the member, including Legacy wallet movements:

- `LEGACY_CASHOUT` — Legacy account
- `LEGACY_VOUCHER` — Legacy product voucher

Examples: instant payout credits, autoship debits, upgrade charges, order refunds, cycle drops.

### What we have today

The tab calls the same endpoint as user details:

```http
GET /admin/earnings/activity?userId={userId}&limit=50&offset=0&from=&to=
```

Frontend is wired (date range, pagination, expandable rows). If the API omits Legacy wallet types, the tab shows an empty state.

### Request

Ensure `GET /admin/earnings/activity` returns ledger entries for Legacy members on `LEGACY_CASHOUT` and `LEGACY_VOUCHER` wallet types.

Optional: add `walletType` query param if filtering is needed.

**Acceptance:** For a Legacy member with transaction history, the Earnings Activity tab shows credits/debits on Legacy cashout and voucher wallets.

---

## 4. No backend work needed

- **Account Info** — membership, wallets, cycle weeks (detail API + list merge for balances)
- **Network Details** — `successlines[]` on detail response
- **Orders** — existing orders API with `userId` + `channel` filter

---

## 5. Frontend references

- Legacy detail: `src/app/features/legacy-club/members/legacy-member-detail.component.ts`
- User detail parity: `src/app/features/users/user-details/user-details.component.ts`
- Earnings service: `src/app/features/earnings/services/earnings.service.ts` → `getUserEarningsActivity()`
