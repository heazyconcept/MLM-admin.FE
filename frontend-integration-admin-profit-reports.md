# Frontend Integration: Admin Profit & Revenue Reports

Date: 2026-05-29

Unified finance view for **registrations**, **upgrades**, **product purchases**, and **monthly autoships**. All routes require **Bearer token** with role `ADMIN`.

### Dashboard currency

Monetary fields are returned in the **admin dashboard currency** (default **NGN**), not hard-coded USD:

- Read/write setting: `GET` / `PUT` `/admin/settings` with key `dashboardCurrency` (`"NGN"` \| `"USD"`).
- Every summary/transaction response includes top-level `currency` and neutral field names (`totalRevenue`, `revenue`, `profit`, etc.).
- Internal ledger math stays USD base; conversion uses platform FX (`NGN_TO_USD_RATE`, default 1000).

Related: [admin user operations](./frontend-integration-admin-user-operations.md), legacy [admin-fees / autoship](#legacy-endpoints) reports.

---

## API summary

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/admin/reports/profit/summary` | KPI totals, per-category breakdown, daily trend |
| `GET` | `/admin/reports/profit/transactions` | Paginated transaction feed (filterable by category) |

Query on both: `from`, `to` (ISO dates; optional; **max 90-day window** when both set).

Transactions only: `category`, `limit` (default 50), `offset` (default 0).

---

## Definitions

### Revenue (`totalRevenue`)

Gross platform inflows (USD base internally, presented in `currency`):

| Category | Source |
|----------|--------|
| `REGISTRATION` | Ledger debits: `REGISTRATION_ACTIVATION`, `REFERRAL_CREATION` |
| `UPGRADE` | `Payment` type `UPGRADE`, status `SUCCESS` |
| `PRODUCT_PURCHASE` | Orders not in `CREATED`, `PENDING`, `CANCELLED`, `FAILED` |
| `AUTOSHIP` | Ledger debits: `AUTOSHIP_TO_PV` (`AUTOSHIP-PV-*-OUT`) |

Excluded: wallet top-ups, waived activations (no ledger debit), failed payments.

### Profit (`totalProfit`)

**`totalAdminFees` + `totalAutoshipCharges`**

- **Admin fees** — `AdminFee` rows (registration + autoship admin portions; not distributed to members).
- **Autoship charges** — full compulsory monthly autoship amount (same as autoship category revenue).

Per-row `profit`:

- Registration → linked admin fee only.
- Autoship → monthly charge + linked autoship admin fee.
- Upgrade / product → `0` (no COGS in this release).

### Manual admin actions

- **Waived registration** (`activate-registration` with `WAIVE_PAYMENT`) — no revenue/profit row.
- **Manual package upgrade** (`POST /admin/users/:id/upgrade`) — no payment row until user pays via gateway upgrade flow.

---

## A. Summary (`GET /admin/reports/profit/summary`)

### Example response

```json
{
  "currency": "NGN",
  "from": "2026-04-01T00:00:00.000Z",
  "to": "2026-05-28T23:59:59.999Z",
  "totalRevenue": 12500500,
  "totalProfit": 890250,
  "totalAdminFees": 120250,
  "totalAutoshipCharges": 770000,
  "byCategory": {
    "REGISTRATION": { "revenue": 8000000, "profit": 95000, "transactionCount": 42 },
    "UPGRADE": { "revenue": 1500000, "profit": 0, "transactionCount": 8 },
    "PRODUCT_PURCHASE": { "revenue": 2200500, "profit": 0, "transactionCount": 31 },
    "AUTOSHIP": { "revenue": 800000, "profit": 825000, "transactionCount": 80 }
  },
  "adminFeesByType": { "REGISTRATION": 95000, "AUTOSHIP": 25250 },
  "trend": [
    { "date": "2026-05-01", "revenue": 400000, "profit": 45000 },
    { "date": "2026-05-02", "revenue": 320000, "profit": 38000 }
  ]
}
```

### UI layout

1. **Date range** — drives summary + table refresh.
2. **KPI cards** — Total revenue, Total profit, Admin fees, Autoship charges.
3. **Category chips** — values from `byCategory` (revenue + profit + count).
4. **Trend chart** — `trend[]` (dual series: revenue vs profit).

---

## B. Transactions (`GET /admin/reports/profit/transactions`)

### Query

```
GET /admin/reports/profit/transactions?from=2026-05-01&to=2026-05-28&category=AUTOSHIP&limit=50&offset=0
```

`category` optional: `REGISTRATION` | `UPGRADE` | `PRODUCT_PURCHASE` | `AUTOSHIP`.

### Example item

```json
{
  "id": "ledger-uuid",
  "category": "AUTOSHIP",
  "occurredAt": "2026-05-01T02:00:00.000Z",
  "userId": "user-uuid",
  "userEmail": "member@example.com",
  "userName": "jane",
  "amountUsd": 10,
  "displayAmount": 10000,
  "displayCurrency": "NGN",
  "profitUsd": 11,
  "reference": "AUTOSHIP-PV-user-uuid-2026-05-OUT",
  "sourceEntity": "ledger",
  "metadata": { "monthIdentifier": "2026-05" }
}
```

### Table columns

| Column | Field |
|--------|--------|
| Date | `occurredAt` |
| Category | `category` badge |
| User | `userName` / `userEmail` |
| Revenue | `amountUsd` (+ optional `displayAmount` `displayCurrency`) |
| Profit | `profitUsd` |
| Reference | `reference` (monospace) |

### Row actions

| `sourceEntity` | Deep link |
|----------------|-----------|
| `ledger` | `GET /admin/wallets` filtered by user, or user detail wallets |
| `payment` | Admin payments list / verify |
| `order` | Order admin views (when available) |
| any | `GET /admin/users/:userId` when `userId` present |

---

## Legacy endpoints

Still available; prefer profit summary for dashboard cards:

- `GET /admin/reports/admin-fees?from=&to=`
- `GET /admin/reports/autoship?month=&monthFrom=&monthTo=`

---

## Error handling

| Case | Behavior |
|------|----------|
| Invalid `category` enum | `400` validation error |
| Range &gt; 90 days | Backend clamps `from` to 90 days before `to` |
| Empty period | Zeros in summary; `items: []`, `total: 0` |

---

## TypeScript helpers

```typescript
type ProfitCategory =
  | 'REGISTRATION'
  | 'UPGRADE'
  | 'PRODUCT_PURCHASE'
  | 'AUTOSHIP';

interface ProfitSummary {
  currency: 'NGN' | 'USD';
  totalRevenue: number;
  totalProfit: number;
  totalAdminFees: number;
  totalAutoshipCharges: number;
  byCategory: Record<
    ProfitCategory,
    { revenue: number; profit: number; transactionCount: number }
  >;
  trend: { date: string; revenue: number; profit: number }[];
}
```
