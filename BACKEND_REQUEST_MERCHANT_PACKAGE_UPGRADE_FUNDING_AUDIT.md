# Backend Request — Merchant Package (Category) Upgrade Funding Audit (Admin)

**Date:** 2026-07-29  
**From:** Admin FE (`mlm-admin.fe`)  
**Related:**
- [BACKEND_REQUEST_UPGRADE_REGISTRATION_FUNDING_AUDIT.md](./BACKEND_REQUEST_UPGRADE_REGISTRATION_FUNDING_AUDIT.md) — **user registration** package upgrades + registration activations (already shipped; **does not** cover merchant fees)
- [FRONTEND_INTEGRATION_UPGRADE_REGISTRATION_FUNDING_AUDIT.md](./FRONTEND_INTEGRATION_UPGRADE_REGISTRATION_FUNDING_AUDIT.md) — explicitly out of scope: merchant fee / merchant category upgrade payments
- [merchant-category-config.md](./merchant-category-config.md) — `REGIONAL` / `NATIONAL` / `GLOBAL` fees & PV
- [MERCHANT_INTEGRATION_AND_TESTING.md](./MERCHANT_INTEGRATION_AND_TESTING.md) — `POST /merchants/merchant-fee/initiate`
- [ADMIN_MERCHANTS_API.md](./ADMIN_MERCHANTS_API.md) / [ADMIN_MERCHANTS_FRONTEND_GUIDE.md](./ADMIN_MERCHANTS_FRONTEND_GUIDE.md)  
**Status:** Request for backend implementation  
**Priority:** High — client needs to trace **merchant package / category** upgrades and how they were funded/debited

---

## 1. Problem

Client question (clarified):

> How do I see history when a **merchant upgrades their merchant package** (e.g. Regional → National → Global), and how they were funded / debited?

What we already have today:

| Need | Current state |
|------|----------------|
| User MLM package upgrades (Nickel→Silver…) | `GET /admin/users/package-upgrades` (+ funding detail) |
| Merchants **as users** who upgraded MLM package | Same list, `isMerchant` filter |
| **Merchant category / fee package** upgrades | **Missing** — no admin history list or detail |
| Merchant fee payment trail joined to category change | **Missing** — fee initiate exists for user FE; admin cannot audit history |

**This request is separate.** Do **not** fold merchant fee / category upgrades into `/admin/users/package-upgrades`.

---

## 2. Definitions

| Term | Meaning |
|------|---------|
| **Merchant package / category** | Paid merchant tier: `REGIONAL` \| `NATIONAL` \| `GLOBAL` (from merchant category config). Not MLM user packages (`NICKEL`…`DIAMOND`). |
| **Merchant package event** | Immutable history row for (a) **initial fee settlement** for a merchant application/tier, or (b) a **category upgrade** (`previousType` → `currentType`). |
| **Source** | How the fee / upgrade was settled (gateway, wallet, admin waive, admin paid, etc.). |
| **Funding trail** | How money moved (or was waived), plus linked ledger entries when applicable. |

Out of scope for this request:

- User registration package upgrades (already shipped)
- Registration activations (already shipped)
- Earnings commission reports
- Stock / allocation / dispute flows

---

## 3. Proposed APIs

Preferred base path under merchants (RBAC: `merchants.view` or dedicated `merchants.view_package_history` if preferred).

### 3.1 `GET /admin/merchants/package-upgrades`

Paginated list of merchant package events (initial fee + category upgrades).

**Query parameters:**

| Param | Type | Notes |
|-------|------|-------|
| `search` | string | Merchant business name, username, email, fullName |
| `merchantId` | uuid | Optional — single merchant |
| `userId` | uuid | Optional — owning user |
| `eventType` | enum | `INITIAL_FEE` \| `CATEGORY_UPGRADE` (optional filter) |
| `previousType` | enum | `REGIONAL` \| `NATIONAL` \| `GLOBAL` (null for initial) |
| `currentType` | enum | `REGIONAL` \| `NATIONAL` \| `GLOBAL` |
| `source` | enum | See §3.3 |
| `dateFrom` / `dateTo` | ISO datetime | Filter on `occurredAt` |
| `limit` / `offset` | integer | Default 20 / 0 |

**Response (200):**

```json
{
  "items": [
    {
      "id": "uuid",
      "merchantId": "uuid",
      "userId": "uuid",
      "username": "janedoe",
      "email": "jane@example.com",
      "fullName": "Jane Doe",
      "businessName": "Jane Stores",
      "eventType": "CATEGORY_UPGRADE",
      "previousType": "REGIONAL",
      "currentType": "NATIONAL",
      "amount": 2500000,
      "currency": "NGN",
      "source": "GATEWAY",
      "performedBy": null,
      "waivePayment": false,
      "paymentId": "uuid-or-null",
      "paymentReference": "psk_ref_or_null",
      "walletType": null,
      "fundingSummary": "Paystack merchant fee for National upgrade",
      "occurredAt": "2026-07-28T14:00:00.000Z"
    }
  ],
  "total": 12,
  "limit": 20,
  "offset": 0
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | uuid | Yes | History row id |
| `merchantId` / `userId` | uuid | Yes | |
| `username` / `email` | string | Yes | Denormalized for list UI |
| `fullName` / `businessName` | string | No | |
| `eventType` | enum | Yes | `INITIAL_FEE` \| `CATEGORY_UPGRADE` |
| `previousType` | enum \| null | No | `null` for `INITIAL_FEE` |
| `currentType` | enum | Yes | Tier after event |
| `amount` / `currency` | number / string | No | Fee charged when known |
| `source` | enum | Yes | See §3.3 |
| `performedBy` | string | No | Admin username for admin paths |
| `waivePayment` | boolean | No | Admin complimentary upgrade / fee waive |
| `paymentId` / `paymentReference` | | No | Gateway payment when used |
| `walletType` | string | No | e.g. `REGISTRATION` / `CASH` when wallet-funded |
| `fundingSummary` | string | No | One-line list summary |
| `occurredAt` | ISO datetime | Yes | When fee settled / type changed |

---

### 3.2 `GET /admin/merchants/package-upgrades/:id`

Detail = list fields + funding trail.

```json
{
  "id": "uuid",
  "merchantId": "uuid",
  "userId": "uuid",
  "username": "janedoe",
  "email": "jane@example.com",
  "fullName": "Jane Doe",
  "businessName": "Jane Stores",
  "eventType": "CATEGORY_UPGRADE",
  "previousType": "REGIONAL",
  "currentType": "NATIONAL",
  "amount": 2500000,
  "currency": "NGN",
  "source": "GATEWAY",
  "performedBy": null,
  "waivePayment": false,
  "paymentId": "uuid",
  "paymentReference": "psk_xxx",
  "walletType": null,
  "fundingSummary": "Paystack merchant fee for National upgrade",
  "occurredAt": "2026-07-28T14:00:00.000Z",
  "funding": {
    "mode": "GATEWAY_PAYMENT",
    "walletType": null,
    "creditedAmount": null,
    "debitedAmount": 2500000,
    "netWalletEffect": "NONE",
    "description": "Merchant category upgrade fee paid via Paystack"
  },
  "ledgerEntries": [],
  "links": {
    "merchantId": "uuid",
    "userId": "uuid",
    "paymentId": "uuid"
  }
}
```

#### `funding.mode` (suggested)

| Value | Meaning |
|-------|---------|
| `GATEWAY_PAYMENT` | Paid via Paystack / gateway (`POST /merchants/merchant-fee/initiate` with Paystack source) |
| `WALLET_DEBIT` | Fee deducted from `REGISTRATION_WALLET` or `CASH_WALLET` |
| `ADMIN_WAIVE` | Admin set/changed type with no fee collected |
| `ADMIN_PAID` | Admin recorded / collected fee outside normal gateway (if supported) |
| `REFUND` | Fee refunded (e.g. reject PENDING after fee paid) — optional event type or funding mode |
| `UNKNOWN` | Legacy / cannot classify |

#### `funding.netWalletEffect`

Same family as user upgrade audit: `NONE` \| `CREDIT_ONLY` \| `DEBIT_ONLY` \| `CREDIT_THEN_DEBIT` \| `SETTLED_AS_UPGRADE` (use only if settlement semantics match).

#### `ledgerEntries[]`

Same shape as user package-upgrade detail (`id`, `walletId`, `walletType`, `direction`, `amount`, `currency`, `source`, `reference`, `createdAt`). Empty when gateway-only or waive.

---

### 3.3 `source` enum

| Value | Typical trigger |
|-------|-----------------|
| `GATEWAY` | `POST /merchants/merchant-fee/initiate` with Paystack (or equivalent) |
| `WALLET` | Fee initiate with `REGISTRATION_WALLET` / `CASH_WALLET` |
| `ADMIN` | Admin change merchant type / complimentary upgrade |
| `SYSTEM` | Legacy backfill / migration |
| `REFUND` | Fee refunded on reject (if modelled as its own history row) |

---

### 3.4 When to persist rows

| Trigger | `eventType` | `previousType` → `currentType` | `source` |
|---------|-------------|-------------------------------|----------|
| Merchant fee successfully paid for application tier | `INITIAL_FEE` | `null` → applied type | `GATEWAY` / `WALLET` |
| Merchant upgrades category (Regional→National, etc.) after fee for new tier | `CATEGORY_UPGRADE` | old → new | `GATEWAY` / `WALLET` / `ADMIN` |
| Admin changes merchant type with waive | `CATEGORY_UPGRADE` (or `INITIAL_FEE` if first tier assign) | old → new | `ADMIN`, `waivePayment=true` |
| Admin rejects PENDING and refunds fee | optional `REFUND` row **or** funding note on original — prefer explicit row if refunds must be auditable | | `REFUND` |

If category upgrade is **not implemented yet** on user FE/backend, still:

1. Ship history for **`INITIAL_FEE`** from existing `merchant-fee/initiate` success path.
2. Document / implement the **upgrade** write path (`CATEGORY_UPGRADE`) so admin can audit as soon as upgrades go live.
3. Confirm whether admin “Change merchant type” (product UI mention in `10-merchant-management.md`) already exists as an API — if yes, every successful change must write history.

---

## 4. Suggested persistence

```
MerchantPackageUpgradeHistory
  id
  merchantId
  userId
  eventType
  previousType (nullable)
  currentType
  amount / currency (nullable)
  source
  performedBy (nullable)
  waivePayment
  paymentId (nullable)
  paymentReference (nullable)
  walletType (nullable)
  fundingMode / fundingSummary / netWalletEffect (or JSON funding blob)
  occurredAt
  createdAt
```

Indexes: `(occurredAt DESC)`, `(merchantId)`, `(userId)`, `(eventType)`, `(source)`, `(currentType)`, `(paymentId)`.

Snapshots must remain immutable after later upgrades.

---

## 5. Acceptance criteria

- [ ] `GET /admin/merchants/package-upgrades` lists merchant package events with previous/current type, amount, source, fundingSummary
- [ ] Filters: search, merchantId, eventType, previousType, currentType, source, date range
- [ ] `GET /admin/merchants/package-upgrades/:id` returns `funding` + `ledgerEntries` + `links`
- [ ] Successful `POST /merchants/merchant-fee/initiate` (wallet or gateway verify) creates `INITIAL_FEE` (and `CATEGORY_UPGRADE` when that flow exists)
- [ ] Admin type change / waive creates history with `source=ADMIN` and correct `waivePayment`
- [ ] Reject+refund is auditable (dedicated row or clear funding mode)
- [ ] Not mixed into `/admin/users/package-upgrades`
- [ ] RBAC documented (`merchants.view` or dedicated key)
- [ ] Clear 400/404 for missing ids

---

## 6. Frontend integration (after API ships)

| Area | Behaviour |
|------|-----------|
| Merchants sidebar | New item: **Merchant Package Upgrades** → `/admin/merchants/package-upgrades` |
| List | Columns: merchant/user, previous → current type, event type, source, amount, funding summary, occurredAt; filters for source / type / event |
| Detail | Funding card + ledger + links to merchant, user, payment |
| Permissions | Match backend RBAC |

---

## 7. Example flows

### Gateway initial merchant fee

1. User applies `POST /merchants/apply` with `type=REGIONAL`.
2. User pays `POST /merchants/merchant-fee/initiate` (`source=PAYSTACK`), payment verifies.
3. History: `eventType=INITIAL_FEE`, `previousType=null`, `currentType=REGIONAL`, `source=GATEWAY`, `paymentId` set.

### Wallet-funded category upgrade

1. Active REGIONAL merchant upgrades to NATIONAL (future/user FE flow).
2. Fee initiate succeeds from `CASH_WALLET`.
3. History: `eventType=CATEGORY_UPGRADE`, `REGIONAL` → `NATIONAL`, `source=WALLET`, `walletType=CASH`, ledger debit present, merchant `type` updated.

### Admin waive type change

1. Admin changes merchant type Regional → National with no fee.
2. History: `source=ADMIN`, `waivePayment=true`, `funding.mode=ADMIN_WAIVE`, empty ledger.

---

## 8. Open questions for backend

1. Does a **merchant category upgrade** API already exist (user or admin), or only initial fee + admin type change?
2. Exact payment / ledger `source` values used for merchant fee today (for consistent FE badges).
3. On reject after fee paid: is refund always to CASH wallet, and should that be a separate history row?
4. Preferred permission key: reuse `merchants.view` vs new `merchants.view_package_history`.
5. Should `INITIAL_FEE` and `CATEGORY_UPGRADE` share one table/endpoint (recommended above) or two endpoints?

---

## 9. Clarification vs existing audit

| Report | Tracks |
|--------|--------|
| `/admin/users/package-upgrades` | User MLM registration package (Nickel→Diamond…), optional `isMerchant` |
| `/admin/users/registration-activations` | First-time **user** registration paid/activated |
| **`/admin/merchants/package-upgrades` (this request)** | Merchant category package fee + Regional/National/Global upgrades |

---

## 10. Changelog

| Date | Change |
|------|--------|
| 2026-07-29 | Initial request: merchant package/category upgrade + fee funding audit for admin |
