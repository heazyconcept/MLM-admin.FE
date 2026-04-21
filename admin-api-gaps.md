# Admin API gaps and required endpoints

This document tracks the **remaining backend API gaps** for the admin frontend.

Last verified against frontend code on: **2026-03-14**  
**Backend implementation completed:** 2026-03-11

---

## Implemented (summary)

All eight gaps below have been implemented in the backend. See each section for contracts.

- **1. Wallet admin:** `GET /admin/wallets`, `GET /admin/wallets/:id`, `PUT /admin/wallets/:id/lock`, `PUT /admin/wallets/:id/unlock`, `POST /admin/wallets/:id/adjust`
- **2. Withdrawals:** `WithdrawalStatus.PROCESSING` added; `POST /admin/withdrawals/:id/mark-processing`
- **3. Payments:** `POST /admin/payments/:id/fail`, `POST /admin/payments/:id/reverse`, `POST /admin/payments/:id/flag` (body: `{ reason: string }`)
- **4. Payments list:** `GET /admin/payments` response includes `userEmail`, `userName`; returns `{ data: PaymentResponseDto[], total: number }`
- **5. Earnings:** `GET /admin/earnings/overview`, `GET /admin/earnings/activity/global`, `GET /admin/earnings/metrics`
- **6. Ranking rules:** `PUT /admin/ranking-rules` request schema documented (Swagger `UpdateRankingRulesDto`)
- **7. Products:** `GET /admin/products/:id`; admin product/category DTOs documented in Swagger
- **8. Dashboard:** `GET /admin/dashboard/summary`, `GET /admin/wallets/summary`; `GET /admin/withdrawals` and `GET /admin/payments` return `{ data, total }`

---

## 1. Wallet admin views and adjustments

### Implemented

- **GET /admin/wallets** – Query: `userId?`, `walletType?`, `status?`, `limit` (default 20), `offset` (default 0). Response: `{ items: AdminWalletListItemDto[], total: number }`. Each item: `id`, `userId`, `userEmail?`, `userName?`, `walletType`, `displayCurrency`, `status`, `balance` (ledger-derived), `createdAt`.
- **GET /admin/wallets/:id** – Response: `AdminWalletDetailResponseDto` (wallet fields, `balance`, `recentLedger` last 50 entries, optional `userEmail`/`userName`).
- **PUT /admin/wallets/:id/lock** – No body. Response: `{ message, status: WalletStatus }`. Delegates to wallet service (CASH only).
- **PUT /admin/wallets/:id/unlock** – No body. Response: `{ message, status: WalletStatus }`.
- **POST /admin/wallets/:id/adjust** – Body: `{ amount: number, reason: string, displayAmount?: number }`. Response: `{ message, balance }`.

---

## 2. Withdrawals processing state alignment

### Implemented

- **WithdrawalStatus** enum now includes `PROCESSING` (between PENDING and APPROVED). Migration: `20260311120000_add_withdrawal_processing_status`.
- **POST /admin/withdrawals/:id/mark-processing** – No body. Transitions `PENDING` → `PROCESSING`. Response: `WithdrawalResponseDto`. Frontend can use `Processing` in domain; backend supports it.

---

## Admin Withdrawals – Lifecycle Actions

The following admin-only endpoints control the lifecycle of a withdrawal:

- `POST /admin/withdrawals/{id}/approve` – approve a pending withdrawal.
- `POST /admin/withdrawals/{id}/mark-processing` – mark an approved withdrawal as “in processing”.
- `POST /admin/withdrawals/{id}/reject` – reject a withdrawal with a reason.
- `POST /admin/withdrawals/{id}/mark-paid` – mark a withdrawal as paid with a payout reference.

Typical state flow:

`PENDING` → `APPROVED` → `PROCESSING` → `PAID`  
or `PENDING/APPROVED/PROCESSING` → `REJECTED`

All endpoints:
- Require an **admin bearer token**.
- Operate on a single withdrawal identified by `{id}`.

---

## POST `/admin/withdrawals/{id}/approve`

### Endpoint Overview
Approve a **pending** withdrawal. Typically sets status from `PENDING` → `APPROVED`.

### HTTP Method
**POST**

### URL Path
`/admin/withdrawals/{id}/approve`

### Authentication
**Required** – Bearer JWT with `ADMIN` role.

### Request Headers
- **Authorization**: `Bearer <admin_access_token>`

### Path Parameters
- `id` (string, required): Withdrawal ID.

### Request Body
None.

### Response Format

**Success 200** – `WithdrawalResponseDto` (simplified):

```json
{
  "id": "wd_123",
  "userId": "user_123",
  "walletId": "wallet_123",
  "amount": 100,
  "baseAmount": 100,
  "currency": "USD",
  "status": "APPROVED",
  "reason": null,
  "payoutReference": null,
  "approvedAt": "2024-01-02T10:00:00.000Z",
  "paidAt": null,
  "rejectedAt": null,
  "approvedById": "admin_1",
  "rejectedById": null,
  "paidById": null,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### Error Responses
- **400** – Withdrawal not in a state that can be approved.
- **401 / 403**, **404** – Auth or not found.

### Frontend Integration Notes
- Show this action on **pending** withdrawals in the admin UI.
- After success, update the row to `APPROVED` and optionally record `approvedAt`.

### Example Request (Axios)

```ts
await axios.post(
  `/admin/withdrawals/${withdrawalId}/approve`,
  {},
  { headers: { Authorization: `Bearer ${token}` } }
);
```

---

## POST `/admin/withdrawals/{id}/mark-processing`

### Endpoint Overview
Mark an approved withdrawal as **processing** by operations/finance.  
Moves status, for example, `APPROVED` → `PROCESSING`.

### HTTP Method
**POST**

### URL Path
`/admin/withdrawals/{id}/mark-processing`

### Authentication
**Required** – Bearer JWT with `ADMIN` role.

### Request Headers
- **Authorization**: `Bearer <admin_access_token>`

### Path Parameters
- `id` (string, required): Withdrawal ID.

### Request Body
Usually **none** (status-only change). If your backend adds metadata, pass it as JSON.

### Response Format

**Success 200**

```json
{
  "id": "wd_123",
  "userId": "user_123",
  "walletId": "wallet_123",
  "amount": 100,
  "baseAmount": 100,
  "currency": "USD",
  "status": "PROCESSING",
  "reason": null,
  "payoutReference": null,
  "approvedAt": "2024-01-02T10:00:00.000Z",
  "paidAt": null,
  "rejectedAt": null,
  "approvedById": "admin_1",
  "rejectedById": null,
  "paidById": null,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### Error Responses
- **400** – Withdrawal cannot be moved to processing from its current status.
- **401 / 403**, **404**.

### Frontend Integration Notes
- Use this as an intermediate step in ops dashboards (“Start processing”).
- Show `PROCESSING` with a distinct badge/colour so teams see items in progress.

### Example Request (Fetch)

```ts
await fetch(`/admin/withdrawals/${withdrawalId}/mark-processing`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
});
```

---

## POST `/admin/withdrawals/{id}/reject`

### Endpoint Overview
Reject a withdrawal and record a rejection reason. Sets status to `REJECTED`.

### HTTP Method
**POST**

### URL Path
`/admin/withdrawals/{id}/reject`

### Authentication
**Required** – Bearer JWT with `ADMIN` role.

### Request Headers
- **Authorization**: `Bearer <admin_access_token>`
- **Content-Type**: `application/json`

### Path Parameters
- `id` (string, required): Withdrawal ID.

### Request Body

```json
{
  "reason": "Invalid bank account details"
}
```

### Response Format

**Success 200**

```json
{
  "id": "wd_123",
  "userId": "user_123",
  "walletId": "wallet_123",
  "amount": 100,
  "baseAmount": 100,
  "currency": "USD",
  "status": "REJECTED",
  "reason": "Invalid bank account details",
  "payoutReference": null,
  "approvedAt": null,
  "paidAt": null,
  "rejectedAt": "2024-01-02T10:30:00.000Z",
  "approvedById": null,
  "rejectedById": "admin_1",
  "paidById": null,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### Error Responses
- **400** – Missing/empty `reason` or invalid status transition.
- **401 / 403**, **404**.

### Frontend Integration Notes
- In the UI, enforce that `reason` is required and non-empty.
- Use `reason` and `rejectedAt` in both admin views and user history screens.

### Example Request (Axios)

```ts
await axios.post(
  `/admin/withdrawals/${withdrawalId}/reject`,
  { reason: 'Invalid bank account details' },
  { headers: { Authorization: `Bearer ${token}` } }
);
```

---

## POST `/admin/withdrawals/{id}/mark-paid`

### Endpoint Overview
Mark a withdrawal as **paid** and attach a payout reference from your payment processor/bank.

### HTTP Method
**POST**

### URL Path
`/admin/withdrawals/{id}/mark-paid`

### Authentication
**Required** – Bearer JWT with `ADMIN` role.

### Request Headers
- **Authorization**: `Bearer <admin_access_token>`
- **Content-Type**: `application/json`

### Path Parameters
- `id` (string, required): Withdrawal ID.

### Request Body

```json
{
  "payoutReference": "BANK-TRX-123456"
}
```

### Response Format

**Success 200**

```json
{
  "id": "wd_123",
  "userId": "user_123",
  "walletId": "wallet_123",
  "amount": 100,
  "baseAmount": 100,
  "currency": "USD",
  "status": "PAID",
  "reason": null,
  "payoutReference": "BANK-TRX-123456",
  "approvedAt": "2024-01-02T10:00:00.000Z",
  "paidAt": "2024-01-02T11:00:00.000Z",
  "rejectedAt": null,
  "approvedById": "admin_1",
  "rejectedById": null,
  "paidById": "admin_1",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### Error Responses
- **400** – Withdrawal not in a state that can be marked paid (e.g. not yet approved/processing).
- **401 / 403**, **404**.

### Frontend Integration Notes
- Only show this action after verifying that the off-platform payment has succeeded.
- Display `payoutReference` and `paidAt` in admin reconciliation tools and user receipts.

### Example Request (Axios)

```ts
await axios.post(
  `/admin/withdrawals/${withdrawalId}/mark-paid`,
  { payoutReference: 'BANK-TRX-123456' },
  { headers: { Authorization: `Bearer ${token}` } }
);
```

## 3. Payments admin actions (fail / reverse / flag)

### Implemented

- **POST /admin/payments/:id/fail** – Body: `PaymentActionReasonDto` (`{ reason: string }`, min length 1). Allowed when status is `INITIATED`. Sets status to `FAILED`, stores `failReason`, `failedAt`, `failedById` in metadata. Response: `PaymentResponseDto`.
- **POST /admin/payments/:id/reverse** – Body: `{ reason: string }`. Allowed when status is `SUCCESS` and not already reversed. Credits the appropriate wallet (REGISTRATION or CASH by payment type) with `LedgerSource.REVERSAL`; stores `reversed`, `reverseReason`, `reversedAt`, `reversedById` in metadata. Response: `PaymentResponseDto`.
- **POST /admin/payments/:id/flag** – Body: `{ reason: string }`. No status change. Stores `flagged`, `flagReason`, `flaggedAt`, `flaggedById` in metadata. Response: `PaymentResponseDto`.

---

## 4. Payments list identity fields

### Implemented

- **GET /admin/payments** returns `{ data: PaymentResponseDto[], total: number }`. Each `PaymentResponseDto` now includes `userEmail?` and `userName?` (from joined user). Repository includes `user.email` and `user.username`; mapper sets `userEmail`, `userName` on each payment. Swagger: `PaymentResponseDto` has `userEmail`, `userName` as optional.

---

## 5. Earnings overview and monitoring APIs

### Implemented

- **GET /admin/earnings/overview** – Query: `from?`, `to?` (date strings). Response: `{ summary: { totalEarnings, totalCpv, earningCount, cpvCount }, byType: Record<string, number>, cpvBySource: Record<string, number>, chartBuckets: { date, earnings, cpv }[] }`.
- **GET /admin/earnings/activity/global** – Query: `limit` (default 50), `offset` (default 0), `from?`, `to?`. Response: `{ items: (LedgerActivityItemDto | PvActivityItemDto)[] }` (items may include `userId` for display). Merges ledger credits (EARNING/DEPOSIT) and CPV transactions across all users.
- **GET /admin/earnings/metrics** – Response: `{ transactionsPerMinute: 0, averageProcessingTimeMs: 0, alerts: [] }` (stub for future instrumentation).
- **GET /admin/earnings/activity** (existing) – Still requires `userId`; returns per-user activity log.

---

## 6. Ranking rules save flow and DTO clarity

### Implemented (backend)

- **PUT /admin/ranking-rules** – Request: `UpdateRankingRulesDto` with `rules: RankingRuleDto[]`. Each `RankingRuleDto`: `stage` (1–6), `rankName`, `requiredLevel` (min 1), `bonusAmount?` (min 0). Response: `RankingRulesResponseDto` with `rules: RankingRuleResponseDto[]`. Swagger: `@ApiProperty` on all fields. UI save flow remains frontend responsibility.

---

## 7. Products: single-item fetch + schema documentation

### Implemented

- **GET /admin/products/:id** – Returns `AdminProductDetailResponseDto`: `id`, `categoryId`, `category?`, `name`, `description`, `sku`, `status`, `visibleToAll`, `visibleToPackages`, `merchantOnly`, `images[]`, `currentPrice?` (NGN), `poolQuantity`, `createdAt`, `updatedAt`. Swagger: `@ApiOkResponse({ type: AdminProductDetailResponseDto })`.
- **Swagger:** Category create/update (`CreateCategoryDto`, `UpdateCategoryDto`), product status (`UpdateProductStatusDto`), and admin product detail DTOs use `@ApiProperty` / `@ApiPropertyOptional`. Price history shape returned by existing `GET /admin/products/:id/price-history`.

### Admin frontend (§5–7)

- **§5:** [`earnings.service.ts`](src/app/features/earnings/services/earnings.service.ts) calls `GET admin/earnings/overview`, `GET admin/earnings/activity/global`, `GET admin/earnings/metrics`. Consumed by [`earnings-overview`](src/app/features/earnings/overview/earnings-overview.component.ts) and [`earnings-monitoring`](src/app/features/earnings/monitoring/earnings-monitoring.component.ts).
- **§6:** Earnings → Ranking & Stages uses [`SystemConfigService`](src/app/features/system/services/system-config.service.ts) `loadRankingRules()` (read-only table + link to System → Financial for edits). `PUT admin/ranking-rules` save path remains in [`financial-rules.component.ts`](src/app/features/system/financial/financial-rules.component.ts).
- **§7:** [`AdminProductsService.loadProductById`](src/app/features/products/services/admin-products.service.ts) calls `GET admin/products/:id` and upserts into the products list; [`product-edit.component.ts`](src/app/features/products/details/product-edit.component.ts) uses it for deep links (fallback: list load).

---

## 8. Admin dashboard live data

### Implemented

- **GET /admin/dashboard/summary** – Response: `userCount`, `merchantCount`, `pendingWithdrawalsCount`, `initiatedPaymentsCount`, `pendingIdentityCount`, `packageDistribution: Record<Package, number>`, `revenueTrend: { date, amount }[]` (last 30 days of SUCCESS payments by day), `wallets: Record<WalletType, number>` (platform totals by type from ledger).
- **GET /admin/wallets/summary** – Response: `Record<WalletType, number>` (aggregate balance per wallet type from ledger). Also included in dashboard summary as `wallets`.
- **Pagination total:** `GET /admin/withdrawals` and `GET /admin/payments` now return `{ data: T[], total: number }`. Query params unchanged; `total` is the full count for the applied filters.

### Admin frontend (§8)

- [`DashboardService`](src/app/features/dashboard/dashboard.service.ts) calls **`GET admin/dashboard/summary`** on the admin home dashboard. Stats, revenue trend chart, package distribution, wallet totals, and pending-action counts are driven from that response (`wallets` field for wallet cards; no second request to `/admin/wallets/summary` on dashboard load). **`GET admin/wallets/summary`** remains on [`WalletService.getWalletSummary`](src/app/features/wallets/services/wallet.service.ts) for other features.

---

## Backend update checklist

Completed for all gaps above:

- Request/response schemas documented in this file and in Swagger (DTOs with `@ApiProperty`).
- Enum values: `WithdrawalStatus` includes `PROCESSING`; others unchanged.
- Query/filter/pagination: documented per endpoint in the "Implemented" subsections.
- Run `prisma migrate deploy` to apply migration `20260311120000_add_withdrawal_processing_status` for Gap 2.
