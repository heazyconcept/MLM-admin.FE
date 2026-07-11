# Frontend Integration: Profit Margin Update (P&L)

Date: 2026-06-25

This document describes the **profit calculation change** for the admin Profit & Revenue reports. Use it when updating the dashboard at `/admin/reports/profit/*`.

**Base URL:** `https://api.segulah.ng`  
**Auth:** Bearer token, role `ADMIN`, permission `reports.profit`

Related: [Admin Profit & Revenue Reports](./frontend-integration-admin-profit-reports.md)

---

## Summary of change

Profit is no longer derived from raw admin-fee rows and full autoship debits. It now uses **fixed margin rates** on each revenue stream.

| Before | After |
|--------|-------|
| `totalProfit = totalAdminFees + totalAutoshipCharges` | `totalProfit = sum of 5 category profits` |
| Registration profit = linked admin fee only | Registration profit = **10%** of registration revenue |
| Upgrade profit = linked admin fee (often `0`) | Upgrade profit = **10%** of upgrade payment |
| Product profit = `0` | Product profit = **20%** of order revenue |
| Autoship profit = net charge + autoship admin fee | Autoship profit = **10%** of **gross** autoship |
| No admin-fee category | New **`ADMIN_FEE`** category at **50%** of autoship admin fees |

---

## Endpoints (unchanged paths)

| Method | Path |
|--------|------|
| `GET` | `/admin/reports/profit/summary` |
| `GET` | `/admin/reports/profit/transactions` |

Query params are unchanged: `from`, `to` (optional ISO dates, max 90-day window), plus `category`, `limit`, `offset` on transactions.

---

## Profit margins (source of truth)

These rates are applied on the backend. **Do not recompute profit on the frontend** unless you are building offline previews — always display API values.

| Category | Margin | Applied to |
|----------|--------|------------|
| `REGISTRATION` | **10%** | Full registration ledger debit (`REGISTRATION_ACTIVATION`, `REFERRAL_CREATION`) |
| `UPGRADE` | **10%** | Successful `UPGRADE` payment `baseAmount` |
| `PRODUCT_PURCHASE` | **20%** | Paid order `baseAmount` |
| `AUTOSHIP` | **10%** | **Gross autoship** = net `AUTOSHIP-PV-*-OUT` debit + linked autoship admin fee |
| `ADMIN_FEE` | **50%** | Autoship admin fees only (`AdminFeeType.AUTOSHIP`) |

**Formulas:**

```
registrationProfit  = registrationRevenue  × 0.10
upgradeProfit       = upgradeRevenue       × 0.10
productProfit       = productRevenue       × 0.20
autoshipProfit      = autoshipGrossRevenue × 0.10
adminFeeProfit      = autoshipAdminFees    × 0.50

totalProfit = registrationProfit + upgradeProfit + productProfit + autoshipProfit + adminFeeProfit
```

**Important:** Registration-type admin fees are **not** in the `ADMIN_FEE` bucket (they are already part of registration/upgrade revenue). Only **autoship** admin fees use the 50% margin, to avoid double-counting.

---

## Response changes

### 1. New category: `ADMIN_FEE`

`byCategory` now has **five** keys. Add UI support for the new chip/tab/filter:

```json
"ADMIN_FEE": {
  "revenue": 25250,
  "profit": 12625,
  "transactionCount": 80
}
```

- **`revenue`** — total autoship admin fees in the period
- **`profit`** — 50% of that revenue
- **`transactionCount`** — number of autoship `AdminFee` rows

`ADMIN_FEE` revenue is **not** added to `totalRevenue` (autoship gross already includes the admin-fee portion).

### 2. `totalProfit` meaning changed

| Field | Old meaning | New meaning |
|-------|-------------|-------------|
| `totalProfit` | Admin fees + net autoship charges | Sum of all five category profits |

Remove any UI copy or tooltips that say `totalProfit = totalAdminFees + totalAutoshipCharges`.

### 3. Autoship revenue is now gross

| Field | Old | New |
|-------|-----|-----|
| `byCategory.AUTOSHIP.revenue` | Net autoship debit only (~90%) | Gross = net debit + linked autoship admin fee |
| Transaction `amount` (autoship) | Net debit | Gross amount |

`totalAutoshipCharges` is unchanged: still **net** autoship debits only (informational KPI).

### 4. Product and upgrade profit are non-zero

Update tables and category chips — do not hard-code `0` for upgrade/product profit.

### 5. New transaction filter value and `sourceEntity`

**Category filter:**

```
REGISTRATION | UPGRADE | PRODUCT_PURCHASE | AUTOSHIP | ADMIN_FEE
```

**New `sourceEntity` value:** `admin_fee`

```json
{
  "id": "admin-fee-uuid",
  "category": "ADMIN_FEE",
  "occurredAt": "2026-05-01T02:00:00.000Z",
  "userId": "user-uuid",
  "currency": "NGN",
  "amount": 1000,
  "profit": 500,
  "reference": "AUTOSHIP-ADMIN-user-uuid-2026-05",
  "sourceEntity": "admin_fee",
  "metadata": { "type": "AUTOSHIP" }
}
```

Admin-fee rows may not include `userEmail` / `userName` — handle optional user fields.

### 6. Autoship transaction metadata

Autoship ledger rows may include breakdown fields in `metadata`:

```json
{
  "monthIdentifier": "2026-05",
  "adminFeeReference": "AUTOSHIP-ADMIN-user-uuid-2026-05",
  "netAmountUsd": 9,
  "adminFeeUsd": 1
}
```

Use these only for detail/tooltip views; **`amount`** and **`profit`** on the row are already gross and margin-calculated.

---

## Example summary response

```json
{
  "currency": "NGN",
  "from": "2026-04-01T00:00:00.000Z",
  "to": "2026-05-28T23:59:59.999Z",
  "totalRevenue": 12500500,
  "totalProfit": 1487425,
  "totalAdminFees": 120250,
  "totalAutoshipCharges": 770000,
  "byCategory": {
    "REGISTRATION": { "revenue": 8000000, "profit": 800000, "transactionCount": 42 },
    "UPGRADE": { "revenue": 1500000, "profit": 150000, "transactionCount": 8 },
    "PRODUCT_PURCHASE": { "revenue": 2200500, "profit": 440100, "transactionCount": 31 },
    "AUTOSHIP": { "revenue": 847000, "profit": 84700, "transactionCount": 80 },
    "ADMIN_FEE": { "revenue": 25250, "profit": 12625, "transactionCount": 80 }
  },
  "adminFeesByType": { "REGISTRATION": 95000, "AUTOSHIP": 25250 },
  "trend": [
    { "date": "2026-05-01", "revenue": 400000, "profit": 45000 },
    { "date": "2026-05-02", "revenue": 320000, "profit": 38000 }
  ]
}
```

**Sanity check for UI:** For each category, `profit / revenue` should approximate the margin (10%, 10%, 20%, 10%, 50%) except when revenue is `0`.

---

## Frontend migration checklist

### Types

- [ ] Add `'ADMIN_FEE'` to `ProfitCategory` union
- [ ] Add `'admin_fee'` to `sourceEntity` union
- [ ] Ensure `byCategory` is typed as `Record<ProfitCategory, …>` with all five keys

### Summary screen

- [ ] Update **Total profit** KPI to use new `totalProfit` (do not derive from admin fees + autoship)
- [ ] Add **Admin fee** category chip/card (`byCategory.ADMIN_FEE`)
- [ ] Update autoship chip to show **gross** revenue and 10% profit
- [ ] Show non-zero profit for upgrade and product categories
- [ ] Keep **Admin fees** and **Autoship charges** KPIs as informational (`totalAdminFees`, `totalAutoshipCharges`)

### Transactions table

- [ ] Add **Admin fee** to category filter dropdown
- [ ] Handle `sourceEntity: 'admin_fee'` in row actions (link to user when `userId` present)
- [ ] Remove assumption that upgrade/product `profit` is always `0`
- [ ] Autoship rows: display `amount` as gross revenue

### Charts

- [ ] Trend chart continues to use `trend[].revenue` and `trend[].profit` — no API shape change
- [ ] Category breakdown charts: include fifth segment for `ADMIN_FEE`

### Copy / tooltips

- [ ] Replace old profit formula text with margin-based explanation (see table above)
- [ ] Note: this report shows **profit only**, not explicit loss/expense lines

---

## TypeScript helpers

```typescript
type ProfitCategory =
  | 'REGISTRATION'
  | 'UPGRADE'
  | 'PRODUCT_PURCHASE'
  | 'AUTOSHIP'
  | 'ADMIN_FEE';

type ProfitSourceEntity = 'ledger' | 'payment' | 'order' | 'admin_fee';

/** Backend margin rates — for labels/tooltips only; display API profit values */
const PROFIT_MARGIN_LABELS: Record<ProfitCategory, string> = {
  REGISTRATION: '10%',
  UPGRADE: '10%',
  PRODUCT_PURCHASE: '20%',
  AUTOSHIP: '10%',
  ADMIN_FEE: '50%',
};

interface ProfitCategoryBreakdown {
  revenue: number;
  profit: number;
  transactionCount: number;
}

interface ProfitSummary {
  currency: 'NGN' | 'USD';
  from?: string;
  to?: string;
  totalRevenue: number;
  totalProfit: number;
  totalAdminFees: number;
  totalAutoshipCharges: number;
  byCategory: Record<ProfitCategory, ProfitCategoryBreakdown>;
  adminFeesByType: { REGISTRATION: number; AUTOSHIP: number };
  trend: { date: string; revenue: number; profit: number }[];
}

interface ProfitTransaction {
  id: string;
  category: ProfitCategory;
  occurredAt: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  currency: 'NGN' | 'USD';
  amount: number;
  displayAmount?: number;
  displayCurrency?: 'NGN' | 'USD';
  profit: number;
  reference: string;
  sourceEntity: ProfitSourceEntity;
  metadata?: Record<string, unknown>;
}
```

---

## Display currency

All monetary fields are in the **admin dashboard currency** (default NGN):

- Read: `GET /admin/settings` → `dashboardCurrency`
- Response includes top-level `currency` on summary and transactions
- Field names are neutral (`amount`, `profit`, `totalRevenue`) — not `*Usd`

---

## What this report does not include

The API does **not** expose separate **loss**, **COGS**, or **member payout** lines. Margins represent the company’s retained share of inflows; member earnings remain under `/admin/reports/earnings/*`.

Do not label this screen a full accounting P&L unless product adds explicit loss/expense endpoints later.

---

## Suggested UI layout

```
┌─────────────────────────────────────────────────────────────┐
│  Date range: [from] – [to]                                  │
├──────────────┬──────────────┬──────────────┬──────────────┤
│ Total revenue│ Total profit │ Admin fees   │ Autoship net │
│ 12,500,500   │ 1,487,425    │ 120,250      │ 770,000      │
├─────────────────────────────────────────────────────────────┤
│ Category breakdown (byCategory)                             │
│  REG 10% │ UPGR 10% │ PROD 20% │ AUTO 10% │ ADMIN 50%      │
├─────────────────────────────────────────────────────────────┤
│ Trend chart: revenue vs profit (trend[])                    │
├─────────────────────────────────────────────────────────────┤
│ Transactions table — filter: category, paginate limit/offset │
└─────────────────────────────────────────────────────────────┘
```

---

## Testing against the API

```http
GET /admin/reports/profit/summary?from=2026-05-01&to=2026-05-31
Authorization: Bearer <admin_token>
```

Verify:

1. `byCategory.ADMIN_FEE` exists
2. `byCategory.PRODUCT_PURCHASE.profit` ≈ 20% of its revenue
3. `byCategory.AUTOSHIP.profit` ≈ 10% of its revenue (gross)
4. `totalProfit` equals sum of all five `byCategory.*.profit` values
5. Transactions with `category=ADMIN_FEE` return `sourceEntity: "admin_fee"`

---

## Questions

Contact the backend team if you need:

- Explicit loss/expense fields on this endpoint
- Registration admin fees included in the 50% `ADMIN_FEE` bucket (would change totals)
- Different margin rates per package tier
