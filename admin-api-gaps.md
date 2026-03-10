# Admin API gaps and required endpoints

This document tracks gaps between the current Segulah admin API (`API.md` / Swagger) and what the admin frontend requires.

**Important for backend engineers:** whenever you implement or update an endpoint listed here, please come back to this document and:

- Add the **final request and response schemas** (including all fields and enums) as actually implemented.
- Note any **query params, guards, pagination rules, or special behaviours** (e.g. sorting, default limits, error cases).
- Confirm or correct the **example payloads** so the admin frontend can rely on this file as the single source of truth for integration.

---

## 1. Admin user detail by ID

### Current behaviour

- **Implemented endpoints (from `API.md`):**
  - `GET /admin/users` – list users; query per `UserFiltersDto`.
  - `PUT /admin/users/:id/status` – update user active status.
  - `POST /admin/users/:id/reset-password` – reset user password.
- **Missing endpoint:**
  - There is **no** `GET /admin/users/:id` defined in `API.md` or exposed in Swagger.

### Frontend requirement

The admin frontend has a **User Details** screen (`/admin/users/:id`) that needs to:

- Fetch a **single user** by ID for:
  - Displaying core profile fields (email, phone, package, role, registration status, createdAt).
  - Showing derived stats (e.g. total CPV, downline counts, wallet summary) when available.
  - Refreshing the view after actions (suspend/reactivate/flag/unflag/reset password) without reloading the entire list.

Relying only on `GET /admin/users` for this would require:

- Fetching the full paginated list and then filtering client‑side, which:
  - Does not scale for large datasets.
  - Becomes fragile once server‑side filters/pagination are applied.

### Proposed endpoint

- **Method**: `GET`
- **Path**: `/admin/users/:id`
- **Auth**: Bearer + Admin
- **Description**: Fetch full admin view of a single user by ID.

#### Request

- **Path params**:
  - `id` (string, required): User ID.

#### Response (example shape)

```json
{
  "id": "8961071d-5e7d-4b4c-b90f-f0f4209df711",
  "email": "ezekiel.fadipe@gmail.com",
  "phone": "08101435948",
  "role": "USER",
  "registrationPackage": "SILVER",
  "registrationCurrency": "NGN",
  "isActive": true,
  "isRegistrationPaid": true,
  "createdAt": "2026-02-25T14:38:36.195Z",
  "totalCpv": 1,
  "profile": {
    "firstName": "Ezekiel",
    "lastName": "Fadipe",
    "dateOfBirth": "1990-01-01",
    "address": "16 Shoremekun Street Shasha Lagos State",
    "city": "Egbeda",
    "state": "Lagos",
    "country": "Nigeria"
  },
  "walletSummary": {
    "cash": 0,
    "productVoucher": 0,
    "autoship": 0
  }
}
```

> Note: the exact shape can reuse/align with whatever DTO backs `GET /admin/users` today; the key requirement is that the endpoint exists so the admin UI can reliably fetch a single user by ID.

### Frontend usage

Once implemented, the frontend `UsersService.getUserById` can be wired to:

- Call `GET /admin/users/:id`.
- Map the response into the existing `User` view model used by the **User Details** page.

---

## 2. Wallet admin views and adjustments

### Current behaviour

- **Implemented endpoints (from `API.md`):**
  - `PUT /wallets/:id/lock` – lock wallet (admin-only guard).
  - `PUT /wallets/:id/unlock` – unlock wallet (admin-only guard).
  - `POST /admin/wallets/:id/adjust` – adjust wallet balance (body per `WalletAdjustmentDto`).
- **Missing endpoints:**
  - No `GET /admin/wallets` to list wallets for all users.
  - No `GET /admin/wallets/:id` to fetch a single wallet with balances and history.

### Frontend requirement

The admin wallets area needs:

- A paginated list of wallets with user info and balances.
- A details view per wallet showing:
  - Current balances by wallet type.
  - Recent ledger entries.
- Actions that call:
  - `PUT /wallets/:id/lock` / `PUT /wallets/:id/unlock`.
  - `POST /admin/wallets/:id/adjust` with fields such as `{ amount, currency, type, reason }`.

### Proposed endpoints

- `GET /admin/wallets` – list wallets with filters (userId, status, type, fromDate, toDate, limit, offset).
- `GET /admin/wallets/:id` – detailed wallet view including balances and recent ledger entries.

The frontend can then safely wire existing wallet list/details UIs to these endpoints and use the current lock/unlock/adjust routes for actions.

---

## 3. Withdrawals admin flow – processing state

### Current behaviour

- **Implemented endpoints (from `API.md`):**
  - `GET /admin/withdrawals`
  - `POST /admin/withdrawals/:id/approve`
  - `POST /admin/withdrawals/:id/reject` with `{ reason }`
  - `POST /admin/withdrawals/:id/mark-paid` with `{ payoutReference }`
- **Frontend actions:**
  - Approve
  - Reject (with reason)
  - **Mark as Processing**
  - Mark as Paid

### Gap

There is **no dedicated API endpoint** for a `Processing` state:

- The enum in `API.md` only defines: `PENDING, APPROVED, REJECTED, PAID`.
- The frontend has a `Processing` state and a **“Mark as Processing”** action.

### Impact

- Approve / Reject / Mark Paid can be mapped cleanly to existing endpoints and have been wired.
- “Mark as Processing” currently cannot be persisted via the backend; it is treated as a non-supported action and surfaced as such in the UI.

### Options

- Either:
  - Introduce a `PROCESSING` state and an endpoint like `POST /admin/withdrawals/:id/mark-processing`, **or**
  - Remove the Processing status from the domain model and UI.

---

## 4. Payments admin actions (fail / reverse / flag)

### Current behaviour

- **Implemented endpoints (from `API.md`):**
  - `GET /admin/payments` – list payments.
  - `POST /admin/payments/:id/verify` – verify payment by ID (typically transitions to SUCCESS).
  - `POST /admin/payments/fund` – admin funding of a user (body per `AdminFundingDto`).
- **Frontend actions in the payment details UI:**
  - Confirm success (can map to `/admin/payments/:id/verify`).
  - Mark failed.
  - Reverse payment.
  - Flag payment (for review / notes).

### Gaps

- No explicit endpoints for:
  - Marking a payment as **Failed**.
  - Marking a payment as **Reversed**.
  - Persisting a **flagged** state or flag notes.

### Proposed endpoints

- `POST /admin/payments/:id/fail` with `{ reason }` – mark a payment as failed.
- `POST /admin/payments/:id/reverse` with `{ reason }` – reverse a previously successful payment.
- Optional: `POST /admin/payments/:id/flag` with `{ reason }` – store a flag and audit entry.

With these in place, the existing payment details screen can map each admin action to a concrete backend route instead of keeping these transitions purely in the frontend.

---

## 5. Payments list – missing user identity fields

### Current behaviour

- **Example `GET /admin/payments` item** (from live response):

```json
{
  "id": "85753999-e9aa-4792-99cf-6c28ee0a2d8d",
  "userId": "8961071d-5e7d-4b4c-b90f-f0f4209df711",
  "amount": 35000,
  "baseAmount": 35,
  "currency": "NGN",
  "displayCurrency": "NGN",
  "type": "REGISTRATION",
  "provider": "PAYSTACK",
  "reference": "e80348d2-7ec3-4ee7-b5a2-02eed2f8aa81",
  "status": "SUCCESS",
  "metadata": {
    "fxRate": 1000,
    "package": "SILVER"
  },
  "verifiedAt": "2026-02-25T14:42:22.273Z",
  "packageId": "SILVER",
  "createdAt": "2026-02-25T14:42:04.518Z"
}
```

- **Note**: The payload includes only `userId` — there is **no `userEmail` or `userName`**.
- The frontend therefore falls back to showing the raw `userId` in the **User** column for payments.

### Gap

For an admin console, displaying just a GUID-style `userId` is not user-friendly. The payments list needs at least one of:

- `userEmail`
- `userName` (full name or username)

### Proposed enhancement

Extend the `GET /admin/payments` item DTO to include:

- `userEmail: string` – primary email of the payer.
- Optionally `userName: string` – concatenated first/last name or a username.

This can be populated by joining to the Users table when building the admin payments query. The frontend can then display a clear, human-readable identifier (e.g. `Ezekiel Fadipe <ezekiel.fadipe@gmail.com>`) instead of raw `userId`.

---

## 6. Admin commission / CPV / ranking rules – update payloads

### Current behaviour

- **Documented endpoints (from `API.md`):**
  - `GET /admin/commission-rules` / `PUT /admin/commission-rules`
  - `GET /admin/cpv-rules` / `PUT /admin/cpv-rules`
  - `GET /admin/ranking-rules` / `PUT /admin/ranking-rules`
- **Observed responses (live API):**
  - `GET /admin/commission-rules` returns:
    ```json
    {
      "rules": [],
      "pdpaRates": {
        "NICKEL": 0.05,
        "SILVER": 0.08,
        "GOLD": 0.1,
        "PLATINUM": 0.15,
        "RUBY": 0.18,
        "DIAMOND": 0.2
      },
      "cdpaRates": {
        "NICKEL": 5,
        "SILVER": 10,
        "GOLD": 15,
        "PLATINUM": 20,
        "RUBY": 25,
        "DIAMOND": 30
      }
    }
    ```
- **Frontend implementation:**
  - `GET /admin/commission-rules` is mapped into a list of `BonusRule` items for the **Bonus Configuration** screen.
  - The UI currently surfaces PDPA/CDPA per package and allows editing the percentage/amount.
  - `PUT /admin/commission-rules` is implemented to send back only:
    - `pdpaRates` – derived from `BonusRule` items with ids like `pdpa-<PACKAGE>` (value converted back from percentage to decimal).
    - `cdpaRates` – derived from `BonusRule` items with ids like `cdpa-<PACKAGE>`.
  - Any extra complex `rules` (if the backend starts returning them) are **not** currently persisted back, because the UI does not expose or edit them.
  - `GET /admin/cpv-rules` and `GET /admin/ranking-rules` are wired and rendered read‑only in the UI; `PUT` endpoints are exposed in the `EarningsService` but **not yet invoked by any edit/save flow**.

### Gaps

- The exact DTOs for:
  - `UpdateCommissionRulesDto` (body of `PUT /admin/commission-rules`),
  - `UpdateCpvRulesDto` (body of `PUT /admin/cpv-rules`), and
  - `UpdateRankingRulesDto` (body of `PUT /admin/ranking-rules`)
  are **not documented** in `API.md` and must be inferred from Swagger/OpenAPI.
- The frontend currently assumes:
  - `PUT /admin/commission-rules` accepts the same top-level shape as the GET response and that sending only `pdpaRates` and `cdpaRates` is valid.
  - `PUT /admin/cpv-rules` accepts an array of CPV rule objects (same shape as returned by GET).
  - `PUT /admin/ranking-rules` accepts an array of rank stage objects (same shape as returned by GET).
- If the backend later introduces additional fields (e.g. advanced rule objects under `rules`), the current UI will **not** allow configuring them and may omit them from update payloads.

### Proposed follow‑ups

- Confirm the exact request schemas in Swagger/OpenAPI for:
  - `PUT /admin/commission-rules`
  - `PUT /admin/cpv-rules`
  - `PUT /admin/ranking-rules`
- Align the frontend DTOs with those schemas so:
  - Advanced commission rules (beyond PDPA/CDPA rate maps) can be viewed and edited safely.
  - CPV and ranking UIs can move from read‑only to full CRUD (with explicit Save actions that call the corresponding `PUT` endpoints).

---

## 7. Earnings admin overview and monitoring

### Current behaviour

- **Frontend screens:**
  - `EarningsOverviewComponent` shows:
    - KPIs: **Total Paid Out**, **Pending Payouts**, **Active Rules**, **System Status**, **Last update**.
    - Charts:
      - **Payout history** (bar chart) over time, with a period selector (e.g. last 6 months / last year).
      - **Earnings distribution** (doughnut chart) by bonus/earning type.
  - `EarningsMonitoringComponent` shows:
    - A **live activity feed** of earnings events (`type`, `user`, `amount`, `timestamp`, `status`).
    - Sidebar **real‑time metrics** (transactions/minute, average processing time) and a “High value payouts” style alert.
- **Implementation today:**
  - `EarningsService.getSystemOverview()` returns **hard‑coded demo values** for:
    - `totalPaidOut`
    - `pendingPayouts`
    - `activeRules`
    - `lastUpdate`
  - `EarningsService.recentActivity` is a static array used by the monitoring feed.
  - The charts in `EarningsOverviewComponent` are also populated with static sample data.

### Documented endpoints

- From `API.md`:
  - `GET /admin/reports/financial` – financial report; query: `from?`, `to?`.
  - `GET /admin/reports/earnings` – earnings report; query: `from?`, `to?`.
- No response schemas are documented for these endpoints, and they are not yet wired into the earnings admin UI.
- User‑context earnings endpoints exist:
  - `GET /earnings`, `GET /earnings/summary`, `GET /earnings/cpv`, `GET /earnings/ranking`
  - but these are **not suitable** for admin‑level global monitoring.

### Gaps

- There is **no defined admin API contract** that provides:
  - A global **earnings summary** for KPIs:
    - `totalPaidOut`
    - `pendingPayouts`
    - counts of active rules / other aggregates shown in the overview card row.
  - Time‑bucketed payout data for the **Payout history** bar chart (e.g. per month with amounts).
  - Breakdown of earnings by **LedgerEarningType** (PDPA, CDPA, MATCHING_BONUS, etc.) for the **Earnings distribution** doughnut chart.
  - A paginated **admin earnings activity feed** with:
    - `{ id, userId, userName/userEmail, type, amount, status, createdAt }`.
  - **Real‑time metrics** used in the monitoring sidebar:
    - `transactionsPerMinute`
    - `avgProcessingTimeSeconds`
    - any high‑value alert flags / messages.
- As a result, the admin earnings overview and monitoring screens are currently driven entirely by **static mock data** instead of live backend data.

### Proposed endpoints / enhancements

- Either extend the existing reports endpoints **or** introduce dedicated admin earnings endpoints:

1. **Admin earnings summary + charts**
   - **Option A (extend existing):**
     - `GET /admin/reports/earnings`
     - Response could include:
       ```json
       {
         "summary": {
           "totalPaidOut": 1250000,
           "pendingPayouts": 45000
         },
         "payoutHistory": [
           { "label": "2026-01", "totalPaidOut": 100000 },
           { "label": "2026-02", "totalPaidOut": 120000 }
         ],
         "byType": [
           { "type": "PDPA", "amount": 400000 },
           { "type": "CDPA", "amount": 250000 },
           { "type": "MATCHING_BONUS", "amount": 200000 }
         ]
       }
       ```
   - **Option B (new endpoint):**
     - `GET /admin/earnings/overview`
     - Returns a similar payload, tailored exactly to the overview UI needs.

2. **Admin earnings activity feed**
   - New endpoint:
     - `GET /admin/earnings/activity`
     - Query:
       - `type?`, `status?`, `userId?`, `from?`, `to?`, `limit?`, `offset?`
     - Response:
       ```json
       {
         "items": [
           {
             "id": "TX-1001",
             "userId": "user-123",
             "userName": "Sarah Okonkwo",
             "type": "Direct Referral",
             "amount": 50,
             "status": "Processed",
             "createdAt": "2026-02-26T10:15:00.000Z"
           }
         ],
         "total": 1234,
         "limit": 20,
         "offset": 0
       }
       ```

3. **Admin earnings metrics / alerts**
   - New endpoint:
     - `GET /admin/earnings/metrics`
     - Response:
       ```json
       {
         "transactionsPerMinute": 142,
         "avgProcessingTimeSeconds": 0.4,
         "highValuePayoutAlert": {
           "isActive": true,
           "description": "High volume of payouts detected for Diamond package users in last hour (>$50k)."
         }
       }
       ```

### Frontend usage

- Once these contracts are defined and implemented, the frontend can:
  - Replace `getSystemOverview()` and hardcoded chart data with live responses from `GET /admin/reports/earnings` (or `/admin/earnings/overview`).
  - Replace `recentActivity` mock data with live data from `GET /admin/earnings/activity`.
  - Populate the monitoring sidebar metrics and alerts from `GET /admin/earnings/metrics`.

---

## 9. Admin products & categories

### Current behaviour

- **Documented endpoints (from `API.md`):**
  - Categories: `POST /admin/categories`, `PUT /admin/categories/:id`, `GET /admin/categories`
  - Products: `POST /admin/products`, `PUT /admin/products/:id`, `PUT /admin/products/:id/status`, `POST /admin/products/:id/price`, `GET /admin/products`, `GET /admin/products/:id/price-history`
- **OpenAPI (docs-json):** Request/response bodies for admin categories and products use a placeholder schema (`Function` / empty object). No DTOs are exposed.
- **Frontend implementation:**
  - `AdminProductsService` calls all of the above endpoints. It uses best-guess DTOs (e.g. category: `{ id, name, description }`; product: `{ id, name, sku, categoryId/category, status, price, ... }`) and maps responses to the existing `Product` and `Category` models.
  - Product list loads via `GET /admin/products` with query `categoryId`, `status`, `limit`, `offset` (all sent; optional filters sent as empty string when not set).
  - Product edit resolves the current product by id from the **list** (no `GET /admin/products/:id`), so opening edit by direct URL may require loading the full list first.

### Gaps

1. **Request/response schemas not in OpenAPI**  
   The admin categories and products endpoints need their DTOs documented (e.g. in Swagger/OpenAPI and here) so the frontend can align exactly with the backend (field names, enums, required fields).

2. **Missing `GET /admin/products/:id`**  
   There is no documented endpoint to fetch a single product by id. The admin product edit screen currently uses the product from the list; direct navigation to `/admin/products/:id/edit` triggers a full list load to find that product. A dedicated `GET /admin/products/:id` would allow efficient single-product load and avoid reliance on list payload.

3. **Product status enum**  
   Frontend uses `Draft` | `Active` | `Inactive` | `Archived`. Backend may use different values (e.g. `DRAFT`, `ACTIVE`). The exact enum and any mapping should be documented.

4. **Category create/update body**  
   Frontend sends `{ name, description? }` for create and update. Please confirm required/optional fields and any validation.

5. **Product create/update body**  
   Frontend sends a subset of product fields (name, sku, categoryId/category, shortDescription, fullDescription, price, currency, pv, cpv, images, thumbnail, status, visibility). Please document the full create/update DTO and which fields are read-only or server-generated.

6. **Price history response**  
   `GET /admin/products/:id/price-history` is called by the service; the expected array shape (e.g. `{ amount, currency, effectiveAt }`) should be documented.

### Proposed follow-ups

- Expose and document in OpenAPI (and here):
  - `CreateCategoryDto` / `UpdateCategoryDto` and category response shape
  - `CreateProductDto` / `UpdateProductDto` and product list/detail response shape
  - `UpdateProductStatusDto` (e.g. `{ status: ProductStatus }`)
  - Product price body and price-history response shape
- Add `GET /admin/products/:id` and document response so the admin edit page can load a single product without loading the full list.

---

## 10. Admin dashboard

The admin **Dashboard** (`/admin/dashboard`) is the landing page after login. All data is currently **hardcoded or mock**. Below is what the UI shows and which endpoints are needed to power it with real data.

### Dashboard sections and data sources

| Section | What the UI shows | Current source | Endpoints needed |
|--------|--------------------|----------------|------------------|
| **System Overview** | Total Users, Active Users, Merchants, System Status (online/uptime) | Hardcoded values | See below |
| **Financial Snapshot** | Total Earnings, Total Withdrawals, Revenue Trend (bar chart) | Hardcoded + default chart data | See below |
| **User & Network Metrics** | New Registrations (this month), Active Network (total legs), Top Legs Growth, Rank Advances | Hardcoded | See below |
| **Package Distribution** | Doughnut chart: user count per package (Silver, Gold, Platinum, Ruby, Diamond) | Default mock in `PackageChartComponent` | See below |
| **Wallet Summary** | Platform-level balances: Cash, Product Voucher, Autoship; total balance | Hardcoded array in `DashboardComponent` | See below |
| **Pending Actions** | Counts and list: Pending Withdrawals, Merchant Approvals, Failed Payments, Compliance Alerts | `PendingActionsComponent` default counts + `getMockItems()` | See below |
| **Recent Activity** | Feed of recent events (registration, earning, withdrawal, order, merchant) | `ActivityFeedComponent` default mock list | See below |

### Endpoints needed (existing vs missing)

- **Total Users / Active Users**
  - **Use:** `GET /admin/users` with appropriate filters (e.g. no filter for total; filter by active status if supported).
  - **Gap:** Response must expose **total count** (and ideally active count) without requiring the frontend to load all pages. If the API returns `{ users, total, limit, offset }`, the dashboard can use `total`; if it only returns a page of users, the frontend would need a dedicated **count** or **summary** endpoint (e.g. `GET /admin/users/summary` → `{ total, activeCount }`) to avoid heavy requests.

- **Merchants count**
  - **Use:** `GET /admin/merchants` with query filters. Response must include a **total** count (e.g. `total` in body or via response header) so the dashboard can show the number without loading all merchant records.

- **System Status (online / uptime)**
  - **Use:** Optional. If the backend exposes a health or status endpoint (e.g. `GET /` or `GET /health`), the dashboard can call it to show “All systems operational” or uptime. No admin-specific endpoint is required unless you want stored uptime metrics.

- **Total Earnings / Total Withdrawals / Revenue Trend**
  - **Use:** `GET /admin/reports/financial` and/or `GET /admin/reports/earnings` with query `from`, `to` (e.g. this month, last month, this year).
  - **Gap:** Response schemas are **not documented** in `API.md`. The dashboard needs at least:
    - Aggregates: e.g. `totalEarnings`, `totalWithdrawals`, `totalRevenue` (or equivalent names).
    - Time-series data for the Revenue Trend chart: e.g. `revenueByMonth: { label, value }[]` or similar so the frontend can plot monthly revenue.

- **New Registrations (this month) / Active Network / Rank Advances**
  - **Use:** Either:
    - `GET /admin/users` with date filter and total count (for new registrations and possibly “active network” if defined as user count), or
    - A dedicated **admin dashboard summary** endpoint that returns counts for: new registrations this month, active network size, rank advances this month, etc.
  - **Gap:** No single “dashboard summary” endpoint exists. If list endpoints do not support efficient count-only or summary responses, adding something like `GET /admin/dashboard/summary` (or `GET /admin/reports/dashboard`) with `{ newRegistrations, activeNetwork, rankAdvances, ... }` would avoid multiple heavy list calls.

- **Package Distribution (user count per package)**
  - **Use:** Either:
    - `GET /admin/users` with aggregation by package (if the API supports it), or
    - A report/summary endpoint that returns counts per package (e.g. `GET /admin/reports/earnings` or a new endpoint that includes `packageDistribution: { package, count }[]`).
  - **Gap:** No documented endpoint returns **user counts by package**. The frontend could in theory fetch all users and aggregate client-side, but that does not scale. A report or summary that includes package distribution is needed.

- **Wallet Summary (platform-level)**
  - **Use:** There is **no** `GET /admin/wallets` or “platform wallet totals” in `API.md`. Section **2** of this document already describes the gap for admin wallet list/detail.
  - **Need:** Either extend the existing wallet gaps (e.g. `GET /admin/wallets` returning platform-level totals or list of wallets with balances) or add a dedicated `GET /admin/wallets/summary` (or similar) that returns aggregate balances by wallet type (Cash, Product Voucher, Autoship) for the dashboard.

- **Pending Actions (counts and items)**
  - **Use:**
    - **Pending Withdrawals:** `GET /admin/withdrawals?status=PENDING` (and optionally limit to first page). Response should include **total** so the dashboard can show “24 pending” without loading all.
    - **Merchant Approvals:** `GET /admin/merchants` with status filter for pending (if supported). Need **total** or count.
    - **Failed Payments:** `GET /admin/payments?status=FAILED` (or equivalent). Need **total** or count.
  - **Compliance Alerts:** No standard endpoint is listed in `API.md`. If “compliance” is derived from audit or other data, that contract should be documented; otherwise the dashboard may leave this as placeholder or remove it.

- **Recent Activity**
  - **Use:** `GET /admin/audit` with `limit=20` (and optionally `from`/`to`) to show the latest admin audit entries. Map each audit item to the activity feed format (type, title, description, timestamp, user/actor).
  - **Gap:** None for basic “recent events”; the existing audit endpoint is sufficient if the response shape is documented (see audit section in this doc). Optional: a dedicated “dashboard activity” endpoint that returns a pre-shaped list for the feed.

### Summary table: endpoints for dashboard

| Data | Endpoint(s) to use | Notes |
|------|--------------------|--------|
| Total / active users | `GET /admin/users` (use `total` from response) or `GET /admin/users/summary` | Prefer summary if list does not expose total efficiently |
| Merchant count | `GET /admin/merchants` (response must include total) | |
| Financial totals & revenue trend | `GET /admin/reports/financial`, `GET /admin/reports/earnings` | Document response schema (totals + time series) |
| New registrations, network size, rank advances | List endpoints with filters + total, or `GET /admin/dashboard/summary` | New summary endpoint recommended |
| Package distribution | Report/summary with package counts, or users list with aggregation | New or extended report recommended |
| Wallet summary (platform) | `GET /admin/wallets` or `GET /admin/wallets/summary` | See gap §2 |
| Pending withdrawals count + items | `GET /admin/withdrawals?status=PENDING` | Response must include total |
| Pending merchants count | `GET /admin/merchants` (filter by status) | Response must include total |
| Failed payments count | `GET /admin/payments?status=FAILED` | Response must include total |
| Recent activity | `GET /admin/audit?limit=20` | Map to activity feed format |
| System status | Optional: `GET /health` or similar | Not blocking |

### Proposed follow-ups

- Document response schemas for `GET /admin/reports/financial` and `GET /admin/reports/earnings` (including totals and time-series for charts).
- Add **dashboard summary** endpoint (e.g. `GET /admin/dashboard/summary` or `GET /admin/reports/dashboard`) that returns: `totalUsers`, `activeUsers`, `merchantCount`, `newRegistrationsThisMonth`, `activeNetwork`, `rankAdvancesThisMonth`, `packageDistribution: { package, count }[]`, and optionally financial totals, so the dashboard can load in one or two calls.
- Resolve wallet summary for dashboard via the existing wallet gaps (§2): e.g. `GET /admin/wallets` or `GET /admin/wallets/summary` with platform-level balances.
- Ensure list endpoints used for counts (`/admin/withdrawals`, `/admin/merchants`, `/admin/payments`) return a **total** (or equivalent) in the response so the dashboard can show counts without paginating through all results.


