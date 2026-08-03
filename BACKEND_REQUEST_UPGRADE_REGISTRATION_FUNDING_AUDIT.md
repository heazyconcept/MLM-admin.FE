# Backend Request — Upgrade & Registration Funding Audit (Admin)

**Date:** 2026-07-28  
**From:** Admin FE (`mlm-admin.fe`)  
**Related:**
- [FRONTEND_INTEGRATION_UPGRADE_REGISTRATION_FUNDING_AUDIT.md](./FRONTEND_INTEGRATION_UPGRADE_REGISTRATION_FUNDING_AUDIT.md) (shipped API summary for FE)
- [BACKEND_PACKAGE_UPGRADE_HISTORY.md](./BACKEND_PACKAGE_UPGRADE_HISTORY.md) (base package-upgrade list)
- Manual deposit `purpose=PACKAGE_UPGRADE` (user FE + admin Manual Wallet Deposits)
- `POST /admin/users/:id/activate-registration`
- `POST /admin/users/:id/upgrade`
- Gateway `POST /payments/upgrade/initiate` + verify  
**Status:** Backend shipped — FE integrating against [FRONTEND_INTEGRATION_UPGRADE_REGISTRATION_FUNDING_AUDIT.md](./FRONTEND_INTEGRATION_UPGRADE_REGISTRATION_FUNDING_AUDIT.md)  
**Priority:** High — client needs to trace how users (including merchants-as-users) were funded and debited for upgrades, plus a registration funding/activation report

---

## 1. Problem

Client question:

> How do I trace the upgrade history and see how user or merchant were funded and debited for the upgrade?

And separately: they need a **registration** report (how registration was paid / debited / waived).

Today:

| Need | Current state |
|------|----------------|
| Who upgraded, from → to, when | `GET /admin/users/package-upgrades` (package fields only) |
| How it was paid / funded / debited | Scattered across Payments, Manual Deposits, wallet ledger — **not joined to the upgrade row** |
| Upgrade detail drill-down | `GET .../package-upgrades/:id` was optional; FE needs it with funding trail |
| Manual deposit package upgrades | Approve upgrades package but history `source` / funding links may be missing |
| Registration activations | No dedicated admin history list for gateway / manual registration payment / admin activate |

**Merchant scope (this request):** “Merchant” means a **platform user** who may also be a merchant. Same upgrade history; expose `isMerchant` / `merchantId` when available. **Merchant fee / merchant category (Regional→National→Global) package upgrades are out of scope** — see [BACKEND_REQUEST_MERCHANT_PACKAGE_UPGRADE_FUNDING_AUDIT.md](./BACKEND_REQUEST_MERCHANT_PACKAGE_UPGRADE_FUNDING_AUDIT.md).

**Registration** is a **separate** report API — do **not** mix registration activations into package-upgrade rows.

---

## 2. Definitions

| Term | Meaning |
|------|---------|
| **Upgrade event** | One immutable package change (`previousPackage` → `currentPackage`) |
| **Source** | How the upgrade happened: `ADMIN` \| `GATEWAY` \| `SYSTEM` \| `MANUAL_DEPOSIT` |
| **Funding trail** | Explicit summary of how money moved (or was waived) for that event, plus linked ledger entries when applicable |
| **Registration activation** | First-time registration paid / activated (`isRegistrationPaid` becomes true) — not a package upgrade |

Do **not** merge this with the earnings “Upgrade” commission report (`/admin/reports/earnings/upgrade`).

---

## 3. Part A — Extend package upgrade history

Extends [BACKEND_PACKAGE_UPGRADE_HISTORY.md](./BACKEND_PACKAGE_UPGRADE_HISTORY.md). Keep existing list behaviour; add funding audit fields and require detail.

### 3.1 `GET /admin/users/package-upgrades`

Paginated list (existing endpoint — **extend response + filters**).

**Auth:** Admin JWT + RBAC `users.view` (or dedicated `users.view_upgrade_history` if preferred).

**Query parameters (existing + new):**

| Param | Type | Notes |
|-------|------|-------|
| `search` | string | Match username, email, fullName |
| `previousPackage` | enum | `NICKEL` \| `SILVER` \| `GOLD` \| `PLATINUM` \| `RUBY` \| `DIAMOND` |
| `currentPackage` | enum | Filter by package after upgrade |
| `stage` | integer | Ranking stage 1–6 at upgrade time |
| `source` | enum | `ADMIN` \| `GATEWAY` \| `SYSTEM` \| **`MANUAL_DEPOSIT`** |
| `isMerchant` | boolean | Optional — only users flagged as merchants |
| `dateFrom` | ISO date | `upgradedAt >= dateFrom` |
| `dateTo` | ISO date | `upgradedAt <= dateTo` |
| `userId` | uuid | Optional — single user filter |
| `limit` | integer | Default 20 |
| `offset` | integer | Default 0 |

**Response (200):**

```json
{
  "items": [
    {
      "id": "uuid",
      "userId": "uuid",
      "username": "Oluwapelumi",
      "email": "user@example.com",
      "fullName": "Odetoyinbo Pelumi",
      "isMerchant": false,
      "merchantId": null,
      "previousPackage": "PLATINUM",
      "currentPackage": "RUBY",
      "stage": 3,
      "rankName": "Silver",
      "upgradedAt": "2026-07-23T17:30:00.000Z",
      "source": "MANUAL_DEPOSIT",
      "performedBy": null,
      "paymentId": null,
      "paymentReference": null,
      "manualDepositId": "5ddd22e6-5f30-42a0-9528-33a90c64426e",
      "amount": 1850000,
      "currency": "NGN",
      "waivePayment": false,
      "fundingSummary": "Manual deposit approved as package upgrade (registration wallet settled)"
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | uuid | Yes | Upgrade history record id |
| `userId` | uuid | Yes | |
| `username` | string | Yes | |
| `email` | string | Yes | |
| `fullName` | string | No | |
| `isMerchant` | boolean | No | Default `false` if unknown |
| `merchantId` | uuid | No | Set when user has a merchant profile |
| `previousPackage` | enum | Yes | Snapshot before upgrade |
| `currentPackage` | enum | Yes | Snapshot after upgrade |
| `stage` | integer | Yes | Ranking stage at upgrade time |
| `rankName` | string | No | |
| `upgradedAt` | ISO datetime | Yes | |
| `source` | enum | Yes | `ADMIN` \| `GATEWAY` \| `SYSTEM` \| `MANUAL_DEPOSIT` |
| `performedBy` | string | No | Admin username when `source=ADMIN` |
| `paymentId` | uuid | No | Gateway / created payment row |
| `paymentReference` | string | No | |
| `manualDepositId` | uuid | No | When `source=MANUAL_DEPOSIT` |
| `amount` | number | No | Upgrade amount when known |
| `currency` | string | No | e.g. `NGN` |
| `waivePayment` | boolean | No | `true` when admin waived payment |
| `fundingSummary` | string | No | One-line human summary for list UI |

Aliases `fromPackage` / `toPackage` may still be accepted on write paths; list should expose `previousPackage` / `currentPackage` consistently.

---

### 3.2 `GET /admin/users/package-upgrades/:id` (**required**)

Single upgrade event with full funding trail for admin drill-down.

**Auth:** Same as list.

**Response (200):** All list fields, plus:

```json
{
  "id": "uuid",
  "userId": "uuid",
  "username": "Oluwapelumi",
  "email": "user@example.com",
  "fullName": "Odetoyinbo Pelumi",
  "isMerchant": false,
  "merchantId": null,
  "previousPackage": "PLATINUM",
  "currentPackage": "RUBY",
  "stage": 3,
  "rankName": "Silver",
  "upgradedAt": "2026-07-23T17:30:00.000Z",
  "source": "MANUAL_DEPOSIT",
  "performedBy": null,
  "paymentId": null,
  "paymentReference": null,
  "manualDepositId": "5ddd22e6-5f30-42a0-9528-33a90c64426e",
  "amount": 1850000,
  "currency": "NGN",
  "waivePayment": false,
  "fundingSummary": "Manual deposit approved as package upgrade (registration wallet settled)",
  "funding": {
    "mode": "MANUAL_DEPOSIT_UPGRADE",
    "walletType": "REGISTRATION",
    "creditedAmount": null,
    "debitedAmount": 1850000,
    "netWalletEffect": "SETTLED_AS_UPGRADE",
    "description": "Manual bank transfer approved as package upgrade (no free spendable credit of the full upgrade amount)"
  },
  "ledgerEntries": [
    {
      "id": "uuid",
      "walletId": "uuid",
      "walletType": "REGISTRATION",
      "direction": "DEBIT",
      "amount": 1850000,
      "currency": "NGN",
      "source": "PACKAGE_UPGRADE",
      "reference": "manual-deposit:5ddd22e6-...",
      "createdAt": "2026-07-23T17:30:01.000Z"
    }
  ],
  "links": {
    "userId": "uuid",
    "paymentId": null,
    "manualDepositId": "5ddd22e6-5f30-42a0-9528-33a90c64426e"
  }
}
```

#### `funding.mode`

| Value | Meaning |
|-------|---------|
| `GATEWAY_PAYMENT` | Paid via payment gateway (`type=UPGRADE` or equivalent) |
| `MANUAL_DEPOSIT_UPGRADE` | Manual deposit with `purpose=PACKAGE_UPGRADE` approved |
| `ADMIN_WAIVE` | Admin upgrade with `waivePayment=true` — no debit |
| `ADMIN_PAID` | Admin upgrade with payment collected / not waived |
| `WALLET_SETTLEMENT` | Registration (or other) wallet credited then immediately debited to settle upgrade |
| `UNKNOWN` | Legacy / cannot classify — still return best-effort links |

#### `funding.netWalletEffect`

| Value | Meaning |
|-------|---------|
| `NONE` | No wallet movement (e.g. waive or pure gateway settlement outside wallet) |
| `CREDIT_ONLY` | Wallet credited only (should be rare for upgrades) |
| `DEBIT_ONLY` | Wallet debited only |
| `SETTLED_AS_UPGRADE` | Preferred for manual/gateway upgrade settlement — package updated; no leftover free spendable credit of the full amount |
| `CREDIT_THEN_DEBIT` | Explicit credit then debit of the same (or related) amount |

#### `ledgerEntries[]`

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | Ledger entry id |
| `walletId` | uuid | |
| `walletType` | string | e.g. `REGISTRATION` |
| `direction` | enum | `CREDIT` \| `DEBIT` |
| `amount` | number | |
| `currency` | string | |
| `source` | string | Backend ledger source / earning type label |
| `reference` | string | Correlation id / payment / deposit reference |
| `createdAt` | ISO datetime | |

Empty array when there is no wallet movement (`ADMIN_WAIVE`, some gateway flows).

---

### 3.3 When to persist / update upgrade history

Create **one** history row on every successful package change:

| Trigger | `source` | Funding notes |
|---------|----------|----------------|
| `POST /admin/users/:id/upgrade` succeeds | `ADMIN` | Set `performedBy`; `waivePayment` from request; `funding.mode` = `ADMIN_WAIVE` or `ADMIN_PAID` |
| Gateway upgrade payment verified | `GATEWAY` | Link `paymentId` / `paymentReference`; `funding.mode` = `GATEWAY_PAYMENT` |
| `POST /admin/manual-deposits/:id/approve` when deposit `purpose=PACKAGE_UPGRADE` | `MANUAL_DEPOSIT` | Link `manualDepositId`; amount/currency from deposit; `funding.mode` = `MANUAL_DEPOSIT_UPGRADE` |
| Other automated package changes (if any) | `SYSTEM` | Document case-by-case |

**Snapshot at write time** (immutable):

- `previousPackage` / `currentPackage` / `stage` / `rankName`
- `amount` / `currency` when known
- Payment / deposit / ledger ids used in `links` and `ledgerEntries`
- `isMerchant` / `merchantId` from user profile at event time

Do **not** recompute package or stage later if the user upgrades again.

---

### 3.4 Suggested data model extensions

```
PackageUpgradeHistory
  ...existing fields...
  source (ADMIN | GATEWAY | SYSTEM | MANUAL_DEPOSIT)
  performedByAdminId (nullable)
  paymentId (nullable)
  paymentReference (nullable)
  manualDepositId (nullable)
  amount (nullable)
  currency (nullable)
  waivePayment (boolean, default false)
  fundingMode (nullable enum)
  fundingWalletType (nullable)
  fundingSummary (nullable text)
  isMerchant (boolean, default false)
  merchantId (nullable)
  upgradedAt
  createdAt

PackageUpgradeLedgerLink (optional join table)
  upgradeHistoryId
  ledgerEntryId
```

Indexes: `(upgradedAt DESC)`, `(userId)`, `(source)`, `(manualDepositId)`, `(paymentId)`.

---

## 4. Part B — Registration activation history (new)

Separate from package upgrades. Answers: how was registration funded / debited / waived?

### 4.1 `GET /admin/users/registration-activations`

**Auth:** Admin JWT + RBAC `users.view` (or `users.view_registration_history` if preferred).

**Query parameters:**

| Param | Type | Notes |
|-------|------|-------|
| `search` | string | username, email, fullName |
| `source` | enum | `GATEWAY` \| `MANUAL_REGISTRATION_PAYMENT` \| `ADMIN_DEBIT_WALLET` \| `ADMIN_WAIVE` |
| `dateFrom` | ISO date | `activatedAt >= dateFrom` |
| `dateTo` | ISO date | `activatedAt <= dateTo` |
| `userId` | uuid | Optional |
| `isMerchant` | boolean | Optional |
| `limit` | integer | Default 20 |
| `offset` | integer | Default 0 |

**Response (200):**

```json
{
  "items": [
    {
      "id": "uuid",
      "userId": "uuid",
      "username": "janedoe",
      "email": "jane@example.com",
      "fullName": "Jane Doe",
      "isMerchant": false,
      "merchantId": null,
      "package": "SILVER",
      "amount": 50000,
      "currency": "NGN",
      "source": "ADMIN_DEBIT_WALLET",
      "performedBy": "superadmin",
      "paymentId": null,
      "paymentReference": null,
      "manualRegistrationPaymentId": null,
      "fundingSummary": "Registration wallet debited on admin activate",
      "funding": {
        "mode": "DEBIT_REGISTRATION_WALLET",
        "walletType": "REGISTRATION",
        "creditedAmount": null,
        "debitedAmount": 50000,
        "netWalletEffect": "DEBIT_ONLY",
        "description": "Admin activated registration by debiting registration wallet"
      },
      "activatedAt": "2026-07-20T12:00:00.000Z"
    }
  ],
  "total": 18,
  "limit": 20,
  "offset": 0
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | uuid | Yes | Activation history id |
| `userId` | uuid | Yes | |
| `username` / `email` | string | Yes | |
| `fullName` | string | No | |
| `isMerchant` / `merchantId` | | No | Same meaning as upgrade list |
| `package` | enum | Yes | Registration package at activation |
| `amount` | number | No | Amount paid or debited when known |
| `currency` | string | No | |
| `source` | enum | Yes | See table below |
| `performedBy` | string | No | Admin for admin activate paths |
| `paymentId` / `paymentReference` | | No | Gateway registration payment |
| `manualRegistrationPaymentId` | uuid | No | When source is manual registration payment |
| `fundingSummary` | string | No | List one-liner |
| `funding` | object | No | Compact funding object (same shape family as upgrades) |
| `activatedAt` | ISO datetime | Yes | |

#### Registration `source`

| Value | Trigger |
|-------|---------|
| `GATEWAY` | Registration payment verified via gateway |
| `MANUAL_REGISTRATION_PAYMENT` | `POST /admin/manual-registration-payments/:id/approve` succeeds |
| `ADMIN_DEBIT_WALLET` | `POST /admin/users/:id/activate-registration` with `mode=DEBIT_REGISTRATION_WALLET` |
| `ADMIN_WAIVE` | Activate with `mode=WAIVE_PAYMENT` |

#### Registration `funding.mode`

| Value | Meaning |
|-------|---------|
| `GATEWAY_PAYMENT` | Paid via gateway |
| `MANUAL_REGISTRATION_PAYMENT` | Offline proof approved |
| `DEBIT_REGISTRATION_WALLET` | Admin debit of registration wallet |
| `WAIVE` | Complimentary activation — no debit |
| `UNKNOWN` | Legacy |

---

### 4.2 `GET /admin/users/registration-activations/:id`

Detail = list item + `ledgerEntries[]` (same shape as upgrade detail) when a debit/credit occurred, plus `links`:

```json
{
  "links": {
    "userId": "uuid",
    "paymentId": null,
    "manualRegistrationPaymentId": null
  },
  "ledgerEntries": []
}
```

---

### 4.3 When to persist registration activation rows

| Trigger | `source` |
|---------|----------|
| Gateway registration payment verified / activates user | `GATEWAY` |
| Manual registration payment approved | `MANUAL_REGISTRATION_PAYMENT` |
| Admin activate `DEBIT_REGISTRATION_WALLET` | `ADMIN_DEBIT_WALLET` |
| Admin activate `WAIVE_PAYMENT` | `ADMIN_WAIVE` |

One row per successful activation. If a user can only activate once, `userId` should be unique in this table (document if re-activation is possible).

---

## 5. Acceptance criteria

### Package upgrades

- [ ] List exposes `source` (including `MANUAL_DEPOSIT`), payment/deposit refs, `amount` / `currency`, `waivePayment`, `fundingSummary`, `isMerchant` / `merchantId`
- [ ] List filters support extended `source` and optional `isMerchant`
- [ ] `GET /admin/users/package-upgrades/:id` returns `funding` + `ledgerEntries` + `links`
- [ ] Approving a manual deposit with `purpose=PACKAGE_UPGRADE` creates history with `source=MANUAL_DEPOSIT` and `manualDepositId`
- [ ] Admin waive upgrades create history with `waivePayment=true` and `funding.mode=ADMIN_WAIVE` (empty ledger ok)
- [ ] Gateway upgrades link `paymentId` / `paymentReference`
- [ ] Event snapshots remain immutable after later upgrades

### Registration activations

- [ ] `GET /admin/users/registration-activations` lists gateway, manual registration payment, admin debit, and admin waive paths
- [ ] Detail returns ledger entries when a wallet debit/credit occurred
- [ ] RBAC documented (`users.view` or dedicated keys)

### Cross-cutting

- [ ] Earnings “Upgrade” commission report remains separate
- [ ] Merchant **fee** payments remain out of scope
- [ ] Clear 400/404 messages for missing ids

---

## 6. Frontend integration (after API ships)

| Area | Behaviour |
|------|-----------|
| Package Upgrades list | Show Source, Amount, Payment/Deposit ref, Funding summary; filter by source / merchant |
| Package Upgrade detail | New page or drawer: funding card + ledger table + deep links to user / payment / manual deposit |
| Registration Activations | New Users submenu report calling the new list/detail APIs |
| Permissions | `users.view` (unless backend introduces dedicated keys) |

Existing FE touchpoints:

- [`package-upgrade-history.service.ts`](src/app/features/users/services/package-upgrade-history.service.ts)
- [`package-upgrades-list.component.ts`](src/app/features/users/package-upgrades/package-upgrades-list.component.ts)
- Manual deposits already show `purpose` / `targetPackage` on admin review

---

## 7. Example flows

### Manual deposit package upgrade

1. User submits manual deposit: `purpose=PACKAGE_UPGRADE`, `targetPackage=RUBY`, amount `1850000` NGN.
2. Admin approves `POST /admin/manual-deposits/:id/approve`.
3. Backend upgrades package **and** writes upgrade history:
   - `source=MANUAL_DEPOSIT`
   - `manualDepositId=...`
   - `funding.mode=MANUAL_DEPOSIT_UPGRADE`
   - `ledgerEntries` for any wallet settlement
4. Admin opens Package Upgrades → row → detail sees fund/debit trail.

### Admin waive upgrade

1. Admin `POST /admin/users/:id/upgrade` with `waivePayment=true`.
2. History: `source=ADMIN`, `waivePayment=true`, `funding.mode=ADMIN_WAIVE`, `ledgerEntries=[]`.

### Registration admin debit

1. Admin activates with `mode=DEBIT_REGISTRATION_WALLET`.
2. Registration activation history: `source=ADMIN_DEBIT_WALLET`, funding debit amount, ledger entry linked.

### Registration waive

1. Admin activates with `mode=WAIVE_PAYMENT`.
2. History: `source=ADMIN_WAIVE`, `funding.mode=WAIVE`, no ledger debit.

---

## 8. Open questions for backend (non-blocking)

1. Exact ledger `source` string values already used in production for package upgrade settlement (so FE can display consistently).
2. For `MANUAL_DEPOSIT_UPGRADE`, confirm preferred ledger rule remains **settle as upgrade** (no leftover free spendable credit of full amount) vs credit-then-debit.
3. Whether `isMerchant` is derived from an existing merchant application/profile table or a user flag.

---

## 9. Changelog

| Date | Change |
|------|--------|
| 2026-07-28 | Initial request: extend upgrade history with funding/debit audit; add registration activation history APIs |
