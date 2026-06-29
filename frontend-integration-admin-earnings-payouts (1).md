# Frontend Integration: Admin Earnings Payouts (Commissions Paid)

Date: 2026-05-29

Reports **commissions and CPV paid to members** (activations, products, PDPA, CDPA, bonuses, etc.). This is **not** company revenue — use [profit reports](./frontend-integration-admin-profit-reports.md) for platform inflows and admin-fee retention.

All routes require **Bearer token** with role `ADMIN`.

---

## API summary

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/admin/reports/earnings/summary` | KPI totals, per-submenu breakdown, daily trend |
| `GET` | `/admin/reports/earnings/transactions` | Paginated payout feed (filterable by category and unit) |

Query on both: `from`, `to` (ISO dates; optional; **max 90-day window** when both set).

Transactions only: `category`, `unit` (`CASH` \| `CPV` \| omit = both), `limit` (default 50), `offset` (default 0).

Legacy (still available): `GET /admin/earnings/overview`, `GET /admin/earnings/activity/global` — prefer the reports below for the Earnings admin page.

### Dashboard currency

Cash amounts use the admin `dashboardCurrency` setting (`GET` / `PUT` `/admin/settings`, key `dashboardCurrency`, default `NGN`). Responses include `currency`; cash fields are `totalCashPaid`, `cashPaid`, `amount` (not `*Usd`). **CPV/points are never converted.**

---

## Profit vs payouts (do not mix)

| Report | Endpoints | Meaning |
|--------|-----------|---------|
| **Profit / revenue** | `/admin/reports/profit/*` | Money **into** the platform (registrations, upgrades, orders, autoship) and company retention |
| **Earnings payouts** | `/admin/reports/earnings/*` | Money and CPV **out** to members (commissions, PDPA, CDPA, referral bonuses) |

---

## Category submenus (`category` query param)

| `category` | Cash commissions (`Earning`) | CPV (`CpvTransaction`) |
|------------|------------------------------|-------------------------|
| `ACTIVATION` | Direct referral, level commission, community referral, matching bonus | Registration personal PV, direct referral registration, community registration matrix |
| `UPGRADE` | *(none today — reserved)* | *(none today)* |
| `PRODUCT_PURCHASE` | Personal / direct / community product purchase, repeat purchase, merchant product & delivery bonuses | Product purchase PV, direct referral product PV, community product matrix |
| `PDPA` | PDPA daily proceeds | — |
| `CDPA` | CDPA daily proceeds | — |
| `BONUSES` | Ranking, leadership, CPV cash bonus, CPV milestone incentive | — |
| `ADMIN_ADJUSTMENT` | — | Admin CPV / personal PV adjustments |

Omit `category` on transactions to list all payout types (cash + CPV merged by date).

Use `unit=CASH` or `unit=CPV` to show only cash commissions or only CPV credits.

---

## A. Summary (`GET /admin/reports/earnings/summary`)

### Example response

```json
{
  "currency": "NGN",
  "from": "2026-04-01T00:00:00.000Z",
  "to": "2026-05-28T23:59:59.999Z",
  "totalCashPaid": 1234560,
  "totalCpvPaid": 8900,
  "cashPayoutCount": 120,
  "cpvPayoutCount": 45,
  "byCategory": {
    "ACTIVATION": { "cashPaid": 500000, "cpvPaid": 3000, "transactionCount": 80 },
    "PDPA": { "cashPaid": 12340, "cpvPaid": 0, "transactionCount": 200 },
    "CDPA": { "cashPaid": 8900, "cpvPaid": 0, "transactionCount": 150 },
    "PRODUCT_PURCHASE": { "cashPaid": 400000, "cpvPaid": 2000, "transactionCount": 30 },
    "UPGRADE": { "cashPaid": 0, "cpvPaid": 0, "transactionCount": 0 },
    "BONUSES": { "cashPaid": 50000, "cpvPaid": 0, "transactionCount": 5 },
    "ADMIN_ADJUSTMENT": { "cashPaid": 0, "cpvPaid": 100, "transactionCount": 2 }
  },
  "byEarningType": { "PDPA": 12340, "DIRECT_REFERRAL": 200000 },
  "byCpvSource": { "REGISTRATION_PERSONAL_PV": 1000 },
  "trend": [
    { "date": "2026-05-01", "cashPaid": 40000, "cpvPaid": 120 }
  ]
}
```

### UI layout

1. **Date range** — drives summary + table.
2. **KPI cards** — Total cash paid (USD), Total CPV paid, payout counts.
3. **Submenu chips** — Activations, Upgrades, Products, PDPA, CDPA, Bonuses, Admin adjustments — values from `byCategory` (`cashPaidUsd`, `cpvPaid`, `transactionCount`).
4. **Trend chart** — `trend[]` (cash vs CPV per day).
5. **Drill-down** — `byEarningType` / `byCpvSource` for fine-grained labels.

---

## B. Transactions (`GET /admin/reports/earnings/transactions`)

### Query examples

```
GET /admin/reports/earnings/transactions?category=PDPA&unit=CASH&limit=50&offset=0
GET /admin/reports/earnings/transactions?category=ACTIVATION&from=2026-05-01&to=2026-05-28
GET /admin/reports/earnings/transactions?unit=CPV&category=PRODUCT_PURCHASE
```

### Example response

```json
{
  "items": [
    {
      "id": "uuid",
      "unit": "CASH",
      "category": "PDPA",
      "earningType": "PDPA",
      "occurredAt": "2026-05-28T12:00:00.000Z",
      "recipientUserId": "uuid",
      "recipientEmail": "user@example.com",
      "recipientName": "jane_doe",
      "sourceUserId": null,
      "amountUsd": 0.42,
      "amount": 0.42,
      "currency": "USD",
      "status": "POSTED",
      "reference": "PDPA-..."
    },
    {
      "id": "uuid",
      "unit": "CPV",
      "category": "ACTIVATION",
      "cpvSource": "REGISTRATION_PERSONAL_PV",
      "occurredAt": "2026-05-27T10:00:00.000Z",
      "recipientUserId": "uuid",
      "recipientEmail": "sponsor@example.com",
      "recipientName": "sponsor",
      "amount": 50,
      "reference": "cpv-uuid"
    }
  ],
  "total": 1234
}
```

### Row fields

| Field | CASH | CPV |
|-------|------|-----|
| `unit` | `CASH` | `CPV` |
| `amountUsd` | USD base | — |
| `amount` | Original earning amount | CPV points |
| `status` | `POSTED` (available) / `PENDING` | — |
| `earningType` | Yes | — |
| `cpvSource` | — | Yes |

Use `total` with `limit` / `offset` for pagination (same pattern as profit transactions).

---

## C. Suggested Earnings admin page flow

1. Load **summary** for the selected date range.
2. Render submenu cards from `byCategory` (Activations, Upgrades, Products, PDPA, CDPA, Bonuses).
3. On submenu click, load **transactions** with `category=<name>`.
4. Optional tabs: **All** (no `unit`), **Cash only** (`unit=CASH`), **CPV only** (`unit=CPV`).
5. Do **not** use `/admin/reports/profit/*` for “commissions paid to users”.

---

## Notes

- **Upgrade commissions:** `UPGRADE` category is defined but empty until upgrade flows post `Earning` rows.
- **Amounts:** Cash totals use USD base (`convertToBaseCurrency`); list rows include `amountUsd` for CASH.
- **90-day cap:** When both `from` and `to` are set, the range is clamped to 90 days (same as profit reports).
