## Admin API – Frontend Integration Guide

### Overview

This document describes how frontend clients should integrate with the Admin API endpoints under the `/admin` namespace. All responses are JSON unless stated otherwise.

Most endpoints require a Bearer JWT with the `ADMIN` role. Public endpoints are explicitly marked.

---

## PUT `/admin/users/{id}/status`

### Endpoint Overview
Update a user’s active status and other admin-controlled flags.

### HTTP Method
**PUT**

### URL Path
`/admin/users/{id}/status`

### Authentication
**Required** – Bearer JWT with `ADMIN` role.

### Request Headers
- **Authorization**: `Bearer <admin_access_token>`
- **Content-Type**: `application/json`

### Query Parameters
None.

### Request Body

**Schema (simplified)**

```json
{
  "isActive": true,
  "role": "USER",
  "isRegistrationPaid": true
}
```

- `isActive` (boolean, optional): Activate or deactivate the user.
- `role` (string, optional): New role (e.g. `"USER"`, `"MERCHANT"`, `"ADMIN"`).
- `isRegistrationPaid` (boolean, optional): Mark registration as paid/unpaid.

### Response Format

**Success 200**

```json
{
  "isActive": true,
  "message": "User activated successfully"
}
```

### Error Responses
- **400** – Invalid input or disallowed role change.
- **401 / 403** – Missing/invalid token or not an admin.
- **404** – User not found.

### Frontend Integration Notes
- Only send fields you want to change; omitted fields are left unchanged.
- Use returned `isActive` to update toggle state in admin UI.

### Example Request (Axios)

```ts
await axios.put(
  `/admin/users/${userId}/status`,
  { isActive: true },
  { headers: { Authorization: `Bearer ${token}` } }
);
```

---

## PUT `/admin/users/{id}/identity/status`

### Endpoint Overview
Approve or reject a user’s identity (KYC) verification.

### HTTP Method
**PUT**

### URL Path
`/admin/users/{id}/identity/status`

### Authentication
**Required** – Bearer JWT with `ADMIN` role.

### Request Headers
- **Authorization**: `Bearer <admin_access_token>`
- **Content-Type**: `application/json`

### Query Parameters
None.

### Request Body

**Schema**

```json
{
  "status": "APPROVED",
  "rejectedReason": "Missing front photo"
}
```

- `status` (string, required): `"PENDING"`, `"APPROVED"`, `"REJECTED"` (exact values depend on backend enum).
- `rejectedReason` (string, optional): Required when `status` is `"REJECTED"`.

### Response Format

**Success 200**

```json
{
  "id": "identity-id",
  "idType": "NATIONAL_ID",
  "status": "REJECTED",
  "verifiedAt": null,
  "rejectedReason": "ID document expired",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:05:00.000Z"
}
```

### Error Responses
- **400** – Missing `status` or `rejectedReason` when rejected.
- **401 / 403** – Auth errors.
- **404** – User or identity not found.

### Frontend Integration Notes
- Enforce `rejectedReason` in the UI whenever `status` = `"REJECTED"`.
- Use returned object to refresh KYC status panel.

### Example Request (Fetch)

```ts
await fetch(`/admin/users/${userId}/identity/status`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    status: 'APPROVED'
  }),
});
```

---

## POST `/admin/withdrawals/{id}/approve`

### Endpoint Overview
Approve a pending withdrawal.

### HTTP Method
**POST**

### URL Path
`/admin/withdrawals/{id}/approve`

### Authentication
**Required** – Bearer JWT with `ADMIN` role.

### Request Headers
- **Authorization**: `Bearer <admin_access_token>`

### Query Parameters
None.

### Request Body
None.

### Response Format

**Success 200** – simplified `WithdrawalResponseDto`:

```json
{
  "id": "withdrawal-id",
  "userId": "user-id",
  "amount": 100,
  "currency": "USD",
  "status": "APPROVED",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:05:00.000Z"
}
```

### Error Responses
- **400** – Withdrawal not in approvable state.
- **401 / 403**, **404**.

### Frontend Integration Notes
- Trigger from “Approve” button for withdrawals with status `"PENDING"`.
- After success, refresh the list or update row to `APPROVED`.

### Example Request (Axios)

```ts
await axios.post(
  `/admin/withdrawals/${withdrawalId}/approve`,
  {},
  { headers: { Authorization: `Bearer ${token}` } }
);
```

---

## POST `/admin/withdrawals/{id}/reject`

### Endpoint Overview
Reject a withdrawal with a reason.

### HTTP Method
**POST**

### URL Path
`/admin/withdrawals/{id}/reject`

### Authentication
**Required** – Bearer JWT with `ADMIN` role.

### Request Headers
- **Authorization**: `Bearer <admin_access_token>`
- **Content-Type**: `application/json`

### Request Body

```json
{
  "reason": "Invalid bank account details"
}
```

### Response Format

**Success 200** – same shape as approve, but `status` = `"REJECTED"`.

### Error Responses
- **400** – Missing/empty `reason` or invalid status transition.
- **401 / 403**, **404**.

### Frontend Integration Notes
- Require a non-empty reason before submitting.
- Optionally display the rejection reason in user history if exposed.

### Example Request (Fetch)

```ts
await fetch(`/admin/withdrawals/${withdrawalId}/reject`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({ reason: 'Invalid bank account details' }),
});
```

---

## POST `/admin/withdrawals/{id}/mark-paid`

### Endpoint Overview
Mark an approved withdrawal as paid and attach a payout reference.

### HTTP Method
**POST**

### URL Path
`/admin/withdrawals/{id}/mark-paid`

### Authentication
**Required** – Bearer JWT with `ADMIN` role.

### Request Headers
- **Authorization**: `Bearer <admin_access_token>`
- **Content-Type**: `application/json`

### Request Body

```json
{
  "payoutReference": "BANK-TRX-123456"
}
```

### Response Format

**Success 200** – `WithdrawalResponseDto` with `status` = `"PAID"`.

### Error Responses
- **400** – Withdrawal is not in APPROVED state.
- **401 / 403**, **404**.

### Frontend Integration Notes
- Only show this for withdrawals in `APPROVED` status.
- Store `payoutReference` for reconciliation views.

### Example Request (Axios)

```ts
await axios.post(
  `/admin/withdrawals/${withdrawalId}/mark-paid`,
  { payoutReference: 'BANK-TRX-123456' },
  { headers: { Authorization: `Bearer ${token}` } }
);
```

---

## GET `/admin/withdrawals`

### Endpoint Overview
List withdrawals with optional filters and pagination.

### HTTP Method
**GET**

### URL Path
`/admin/withdrawals`

### Authentication
**Required** – Bearer JWT with `ADMIN` role.

### Request Headers
- **Authorization**: `Bearer <admin_access_token>`

### Query Parameters
- `status` (string, optional): `"PENDING"`, `"APPROVED"`, `"REJECTED"`, `"PAID"`.
- `userId` (string, optional).
- `fromDate` (string, optional, ISO).
- `toDate` (string, optional, ISO).
- `limit` (number, optional, default `20`).
- `offset` (number, optional, default `0`).

### Response Format

**Success 200**

```json
[
  {
    "id": "withdrawal-id",
    "userId": "user-id",
    "amount": 100,
    "currency": "USD",
    "status": "PENDING",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### Error Responses
- **401 / 403**.

### Frontend Integration Notes
- Use `limit`/`offset` for page or infinite-scroll lists.
- Date filters should be ISO strings convertible via `new Date(...)`.

### Example Request (Axios)

```ts
const res = await axios.get('/admin/withdrawals', {
  params: { status: 'PENDING', limit: 20, offset: 0 },
  headers: { Authorization: `Bearer ${token}` },
});
```

---

## POST `/admin/payments/fund`

### Endpoint Overview
Create an admin-initiated funding payment into a user’s wallet.

### HTTP Method
**POST**

### URL Path
`/admin/payments/fund`

### Authentication
**Required** – Bearer JWT with `ADMIN` role.

### Request Headers
- **Authorization**
- **Content-Type**: `application/json`

### Request Body

```json
{
  "userId": "user-id",
  "amount": 100,
  "currency": "USD",
  "reason": "Manual adjustment"
}
```

### Response Format

**Success 200** – simplified `PaymentResponseDto`:

```json
{
  "id": "payment-id",
  "userId": "user-id",
  "amount": 100,
  "currency": "USD",
  "status": "INITIATED",
  "type": "ADMIN_FUNDING",
  "reference": "PAY-REF-123",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### Error Responses
- **400** – Invalid amount or user.
- **401 / 403**, **404**.

### Frontend Integration Notes
- Typically used from an admin funding modal; show `reference` in receipts or audit logs.

### Example Request (Axios)

```ts
await axios.post(
  '/admin/payments/fund',
  { userId, amount: 100, currency: 'USD', reason: 'Promo credit' },
  { headers: { Authorization: `Bearer ${token}` } }
);
```

---

## GET `/admin/payments`

### Endpoint Overview
List payments with filters and pagination.

### HTTP Method
**GET**

### URL Path
`/admin/payments`

### Authentication
**Required** – Bearer JWT with `ADMIN` role.

### Request Headers
- **Authorization**

### Query Parameters
- `status` (string, optional): Payment status.
- `type` (string, optional): Payment type.
- `userId` (string, optional).
- `fromDate` (string, optional, ISO).
- `toDate` (string, optional, ISO).
- `limit` (number, optional, default `20`).
- `offset` (number, optional, default `0`).

### Response Format

**Success 200**

```json
[
  {
    "id": "payment-id",
    "userId": "user-id",
    "amount": 100,
    "currency": "USD",
    "status": "SUCCESS",
    "type": "FUNDING",
    "reference": "PAY-REF-123",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### Error Responses
- **401 / 403**.

### Frontend Integration Notes
- Combine `status`, `type`, and `userId` for powerful search filters.
- Use pagination params for admin tables.

### Example Request (Fetch)

```ts
const res = await fetch('/admin/payments?status=SUCCESS&limit=20', {
  headers: { Authorization: `Bearer ${token}` },
});
```

---

## GET `/admin/earnings/activity`

### Endpoint Overview
Get a paginated earnings activity log for a specific user.

### HTTP Method
**GET**

### URL Path
`/admin/earnings/activity`

### Authentication
**Required** – Bearer JWT with `ADMIN` role.

### Request Headers
- **Authorization**

### Query Parameters
- `userId` (string, required).
- `limit` (number, optional, default `50`).
- `offset` (number, optional, default `0`).
- `from` (string, optional, ISO).
- `to` (string, optional, ISO).

### Response Format

**Success 200** – simplified `ActivityLogResponseDto`:

```json
{
  "items": [
    {
      "id": "entry-id",
      "userId": "user-id",
      "amount": 10,
      "currency": "USD",
      "type": "COMMISSION",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

### Error Responses
- **400** – Missing `userId`.
- **401 / 403**.

### Frontend Integration Notes
- Require `userId` selection before fetching.
- Use `from`/`to` for date range pickers.
- **Backend caveat:** For some users, `amount` may be returned in a USD-equivalent (or normalized) form while `displayCurrency` is still `NGN`, so formatting `amount` with `displayCurrency` can show wrong values. See **Issue 4** in [`backend-issues.md`](backend-issues.md). Prefer fixing the API so `amount` matches `displayCurrency`, or expose explicit fields (e.g. display amount vs USD).

### Example Request (Axios)

```ts
const res = await axios.get('/admin/earnings/activity', {
  params: { userId, limit: 50, offset: 0 },
  headers: { Authorization: `Bearer ${token}` },
});
```

---

## GET `/admin/users`

### Endpoint Overview
Get a filtered, paginated list of users with summary earnings/CPV info.

### HTTP Method
**GET**

### URL Path
`/admin/users`

### Authentication
**Required** – Bearer JWT with `ADMIN` role.

### Request Headers
- **Authorization**

### Query Parameters
- `status` (string, optional): MLM classification filter — `REGISTERED` | `ACTIVATED` | `ACTIVE` | `INACTIVE` | `SUSPENDED`. Prefer this for the User Management status dropdown. When set, it owns active/paid/referral predicates; do not also send `isActive` / `isRegistrationPaid` for the same filter. See [FRONTEND_INTEGRATION_ADMIN_USER_STATUS_FILTER.md](./FRONTEND_INTEGRATION_ADMIN_USER_STATUS_FILTER.md).
- `package` (string, optional): Registration package enum.
- `rank` (string, optional).
- `role` (string, optional): `USER` | `MERCHANT` | `ADMIN`.
- `search` (string, optional): username / name / email when supported.
- `isRegistrationPaid` (boolean, optional): Legacy boolean filter (prefer `status` for MLM chips).
- `isActive` (boolean, optional): Legacy boolean filter (prefer `status` for MLM chips).
- `limit` (number, optional, default `20`).
- `offset` (number, optional, default `0`).

### Response Format

**Success 200** – `UserListResponseDto`:

```json
{
  "users": [
    {
      "id": "user-id",
      "email": "user@example.com",
      "phone": "+234...",
      "fullname": "John Doe",
      "role": "USER",
      "registrationPackage": "BASIC",
      "registrationCurrency": "USD",
      "isActive": true,
      "isRegistrationPaid": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "rank": "Bronze",
      "totalEarnings": 120.5,
      "totalCpv": 300
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

### Error Responses
- **401 / 403**.

### Frontend Integration Notes
- Good for admin user tables with multiple filters.
- Prefer `status` for User Management MLM filters so Activated / Active / Inactive return distinct sets and accurate `total` (do not client-re-filter paginated results).
- `rank` filtering is applied after mapping on the backend; you can use the `rank` field from response directly.
- Include `directReferralsCount` on each user for badge consistency with `status` filters.

### Example Request (Axios)

```ts
const res = await axios.get('/admin/users', {
  params: { status: 'ACTIVE', limit: 20, offset: 0 },
  headers: { Authorization: `Bearer ${token}` },
});
```

---

## POST `/admin/users/{id}/reset-password`

### Endpoint Overview
Generate a password reset token for a user and send a reset email.

### HTTP Method
**POST**

### URL Path
`/admin/users/{id}/reset-password`

### Authentication
**Required** – Bearer JWT with `ADMIN` role.

### Request Headers
- **Authorization**

### Request Body
None.

### Response Format

**Success 200**

```json
{
  "message": "Password reset token generated for user user@example.com. Token expires in 24 hours."
}
```

### Error Responses
- **401 / 403**.
- **404** – User not found.

### Frontend Integration Notes
- Show a confirmation dialog before firing this action.
- No extra UI data is needed besides the target user ID.

### Example Request (Fetch)

```ts
await fetch(`/admin/users/${userId}/reset-password`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
});
```

---

## GET `/admin/packages`

### Endpoint Overview
Retrieve registration package configuration (price, PV, CPV, etc.).

### HTTP Method
**GET**

### URL Path
`/admin/packages`

### Authentication
**Required** – Bearer JWT with `ADMIN` role.

### Request Headers
- **Authorization**

### Request Body
None.

### Response Format

**Success 200** – `PackageConfigResponseDto`:

```json
{
  "packages": [
    {
      "package": "BASIC",
      "priceNGN": 100000,
      "priceUSD": 100,
      "earningsPercentage": 10,
      "cashoutPercentage": 50,
      "registrationPV": 100,
      "registrationCPV": 50,
      "isActive": true,
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Error Responses
- **401 / 403**.

### Frontend Integration Notes
- Use this to render configuration tables or reference values in admin tools.
- Handle currency formatting on the client.

### Example Request (Axios)

```ts
const res = await axios.get('/admin/packages', {
  headers: { Authorization: `Bearer ${token}` },
});
```

---

## PUT `/admin/packages/{package}`

### Endpoint Overview
Update configuration for a specific registration package.

### HTTP Method
**PUT**

### URL Path
`/admin/packages/{package}`

### Authentication
**Required** – Bearer JWT with `ADMIN` role.

### Request Headers
- **Authorization**
- **Content-Type**: `application/json`

### Request Body

```json
{
  "priceNGN": 120000,
  "priceUSD": 120,
  "earningsPercentage": 12,
  "cashoutPercentage": 60,
  "registrationPV": 120,
  "registrationCPV": 60
}
```

All fields are optional; only provided fields are updated.

### Response Format

**Success 200** – updated `PackageConfigDto`.

### Error Responses
- **400** – Validation failed (e.g. negative values).
- **401 / 403**.

### Frontend Integration Notes
- Perform basic client-side validation for numeric fields.
- After save, either refresh packages or merge returned DTO into state.

### Example Request (Axios)

```ts
await axios.put(
  `/admin/packages/${pkg}`,
  { priceNGN: 120000 },
  { headers: { Authorization: `Bearer ${token}` } }
);
```

---

## GET `/admin/commission-rules`

### Endpoint Overview
Fetch active commission rules, PDPA/CDPA rates, and level commission table.

### HTTP Method
**GET**

### URL Path
`/admin/commission-rules`

### Authentication
**Required** – Bearer JWT with `ADMIN` role.

### Request Headers
- **Authorization**

### Response Format

**Success 200** – `CommissionRulesResponseDto`:

```json
{
  "rules": [
    {
      "id": "rule-id",
      "level": 1,
      "percentage": 5,
      "currency": "USD",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pdpaRates": { "BASIC": 1 },
  "cdpaRates": { "BASIC": 2 },
  "levelCommissions": [
    {
      "level": 1,
      "percentages": { "BASIC": 5, "PREMIUM": 5 }
    }
  ]
}
```

### Error Responses
- **401 / 403**.

### Frontend Integration Notes
- Use `levelCommissions` directly to render a matrix by level and package.
- `pdpaRates` and `cdpaRates` are keyed by package enum.

### Example Request (Axios)

```ts
const res = await axios.get('/admin/commission-rules', {
  headers: { Authorization: `Bearer ${token}` },
});
```

---

## PUT `/admin/commission-rules`

### Endpoint Overview
Replace current active commission rules with a new set.

### HTTP Method
**PUT**

### URL Path
`/admin/commission-rules`

### Authentication
**Required** – Bearer JWT with `ADMIN` role.

### Request Headers
- **Authorization**
- **Content-Type**: `application/json`

### Request Body

```json
{
  "rules": [
    {
      "level": 1,
      "percentage": 5,
      "currency": "USD"
    },
    {
      "level": 2,
      "percentage": 3,
      "currency": "USD"
    }
  ]
}
```

### Response Format

**Success 200** – updated `CommissionRulesResponseDto`.

### Error Responses
- **400** – Validation error (e.g. invalid levels).
- **401 / 403**.

### Frontend Integration Notes
- Backend deactivates old rules and creates new ones; treat this endpoint as a full replacement.
- Use a confirmation step due to impact on payouts.

### Example Request (Axios)

```ts
await axios.put(
  '/admin/commission-rules',
  { rules: [{ level: 1, percentage: 5, currency: 'USD' }] },
  { headers: { Authorization: `Bearer ${token}` } }
);
```

---

## GET `/admin/cpv-rules`

### Endpoint Overview
Fetch CPV (Customer Point Volume) reward rules.

### HTTP Method
**GET**

### URL Path
`/admin/cpv-rules`

### Authentication
**Required** – Bearer JWT with `ADMIN` role.

### Request Headers
- **Authorization**

### Response Format

**Success 200** – `CpvRulesResponseDto`:

```json
{
  "rules": [
    {
      "id": "cpv-rule-id",
      "threshold": 1000,
      "rewardType": "CASH",
      "rewardAmount": 50,
      "materialDescription": null,
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "name": "1,000 CPVs",
      "reward": "$50"
    }
  ]
}
```

### Error Responses
- **401 / 403**.

### Frontend Integration Notes
- Use `name` and `reward` as display-ready strings in admin UI.

### Example Request (Axios)

```ts
const res = await axios.get('/admin/cpv-rules', {
  headers: { Authorization: `Bearer ${token}` },
});
```

---

## PUT `/admin/cpv-rules`

### Endpoint Overview
Replace CPV rules with a new set.

### HTTP Method
**PUT**

### URL Path
`/admin/cpv-rules`

### Authentication
**Required** – Bearer JWT with `ADMIN` role.

### Request Headers
- **Authorization**
- **Content-Type**: `application/json`

### Request Body

```json
{
  "rules": [
    {
      "threshold": 1000,
      "rewardType": "CASH",
      "rewardAmount": 50,
      "materialDescription": null
    }
  ]
}
```

### Response Format

**Success 200** – updated `CpvRulesResponseDto`.

### Error Responses
- **400** – Validation errors.
- **401 / 403**.

### Frontend Integration Notes
- All existing rules are deactivated before new ones are created; treat this as a full replacement operation.

### Example Request (Fetch)

```ts
await fetch('/admin/cpv-rules', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    rules: [{ threshold: 1000, rewardType: 'CASH', rewardAmount: 50 }],
  }),
});
```

---

## GET `/admin/ranking-rules`

### Endpoint Overview
Fetch ranking rules used for user progression.

### HTTP Method
**GET**

### URL Path
`/admin/ranking-rules`

### Authentication
**Required** – Bearer JWT with `ADMIN` role.

### Request Headers
- **Authorization**

### Response Format

**Success 200** – `RankingRulesResponseDto`:

```json
{
  "rules": [
    {
      "id": "rule-id",
      "stage": 1,
      "rankName": "Bronze",
      "requiredLevel": 1,
      "bonusAmount": 100,
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Error Responses
- **401 / 403**.

### Frontend Integration Notes
- Use for admin configuration or to show rank requirements in internal tools.

### Example Request (Axios)

```ts
const res = await axios.get('/admin/ranking-rules', {
  headers: { Authorization: `Bearer ${token}` },
});
```

---

## PUT `/admin/ranking-rules`

### Endpoint Overview
Replace existing ranking rules with a new set.

### HTTP Method
**PUT**

### URL Path
`/admin/ranking-rules`

### Authentication
**Required** – Bearer JWT with `ADMIN` role.

### Request Headers
- **Authorization**
- **Content-Type**: `application/json`

### Request Body

```json
{
  "rules": [
    {
      "stage": 1,
      "rankName": "Bronze",
      "requiredLevel": 1,
      "bonusAmount": 100
    }
  ]
}
```

### Response Format

**Success 200** – updated `RankingRulesResponseDto`.

### Error Responses
- **400** – Validation errors.
- **401 / 403**.

### Frontend Integration Notes
- As with other rules endpoints, treat this as a full replacement (all-or-nothing).

### Example Request (Axios)

```ts
await axios.put(
  '/admin/ranking-rules',
  { rules: [{ stage: 1, rankName: 'Bronze', requiredLevel: 1, bonusAmount: 100 }] },
  { headers: { Authorization: `Bearer ${token}` } }
);
```

---

## POST `/admin/payments/{id}/verify`

### Endpoint Overview
Verify a manual/offline payment by its ID.

### HTTP Method
**POST**

### URL Path
`/admin/payments/{id}/verify`

### Authentication
**Required** – Bearer JWT with `ADMIN` role.

### Request Headers
- **Authorization**

### Request Body
None.

### Response Format

**Success 200**

```json
{
  "message": "Payment verified successfully"
}
```

### Error Responses
- **400** – Payment not in `INITIATED` status.
- **401 / 403**, **404**.

### Frontend Integration Notes
- Use for admin workflows to confirm receipt of manual payments.
- After success, refresh payment details.

### Example Request (Fetch)

```ts
await fetch(`/admin/payments/${paymentId}/verify`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
});
```

---

## POST `/admin/wallets/{id}/adjust`

### Endpoint Overview
Perform a ledger-safe manual adjustment (credit or debit) to a user wallet.

### HTTP Method
**POST**

### URL Path
`/admin/wallets/{id}/adjust`

### Authentication
**Required** – Bearer JWT with `ADMIN` role.

### Request Headers
- **Authorization**
- **Content-Type**: `application/json`

### Request Body

```json
{
  "amount": 50,
  "reason": "Manual correction",
  "displayAmount": 50000
}
```

- `amount` (number, required): Positive to credit, negative to debit (base in USD).
- `reason` (string, required).
- `displayAmount` (number, optional): Amount in display currency.

### Response Format

**Success 200**

```json
{
  "message": "Wallet credited successfully",
  "balance": 150
}
```

### Error Responses
- **400** – Insufficient balance on debit or invalid amount.
- **401 / 403**, **404**.

### Frontend Integration Notes
- For debits, highlight that insufficient balance will cause a 400 error.
- After success, use returned `balance` to update UI without re-fetching.

### Example Request (Axios)

```ts
await axios.post(
  `/admin/wallets/${walletId}/adjust`,
  { amount: 50, reason: 'Manual correction' },
  { headers: { Authorization: `Bearer ${token}` } }
);
```

---

## GET `/admin/settings`

### Endpoint Overview
Fetch system-wide configuration settings.

### HTTP Method
**GET**

### URL Path
`/admin/settings`

### Authentication
**Required** – Bearer JWT with `ADMIN` role.

### Request Headers
- **Authorization**

### Response Format

**Success 200** – `SystemSettingsResponseDto`:

```json
{
  "settings": [
    {
      "key": "SITE_NAME",
      "value": "Herb API",
      "version": 3,
      "description": "Name displayed in emails",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Error Responses
- **401 / 403**.

### Frontend Integration Notes
- `value` is generic JSON; ensure correct types in forms.

### Example Request (Axios)

```ts
const res = await axios.get('/admin/settings', {
  headers: { Authorization: `Bearer ${token}` },
});
```

---

## PUT `/admin/settings`

### Endpoint Overview
Update multiple system settings at once.

### HTTP Method
**PUT**

### URL Path
`/admin/settings`

### Authentication
**Required** – Bearer JWT with `ADMIN` role.

### Request Headers
- **Authorization**
- **Content-Type**: `application/json`

### Request Body

```json
{
  "settings": [
    { "key": "SITE_NAME", "value": "New Name" },
    { "key": "SUPPORT_EMAIL", "value": "support@example.com" }
  ]
}
```

### Response Format

**Success 200** – updated `SystemSettingsResponseDto`.

### Error Responses
- **400** – Invalid keys or values.
- **401 / 403**.

### Frontend Integration Notes
- Send only changed settings from UI.
- After success, rely on response to update form state.

### Example Request (Fetch)

```ts
await fetch('/admin/settings', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    settings: [{ key: 'SITE_NAME', value: 'New Name' }],
  }),
});
```

---

## GET `/admin/reports/admin-fees`

### Endpoint Overview
Get a summary of admin fees collected over a period.

### HTTP Method
**GET**

### URL Path
`/admin/reports/admin-fees`

### Authentication
**Required** – Bearer JWT with `ADMIN` role.

### Request Headers
- **Authorization**

### Query Parameters
- `from` (string, optional, ISO).
- `to` (string, optional, ISO).

### Response Format

**Success 200**

```json
[
  {
    "type": "WITHDRAWAL_FEE",
    "total": 150.5,
    "count": 23
  }
]
```

### Error Responses
- **401 / 403**.

### Frontend Integration Notes
- Ideal for charts and summary tables in admin dashboards.

### Example Request (Axios)

```ts
const res = await axios.get('/admin/reports/admin-fees', {
  params: { from: '2024-01-01', to: '2024-01-31' },
  headers: { Authorization: `Bearer ${token}` },
});
```

---

## GET `/admin/reports/autoship`

### Endpoint Overview
Monthly autoship report with summary and optional detailed rows.

### HTTP Method
**GET**

### URL Path
`/admin/reports/autoship`

### Authentication
**Required** – Bearer JWT with `ADMIN` role.

### Request Headers
- **Authorization**

### Query Parameters
- `month` (string, optional): `YYYY-MM`.
- `monthFrom` (string, optional): `YYYY-MM`.
- `monthTo` (string, optional): `YYYY-MM`.
- `limit` (number, optional, default `100`).
- `offset` (number, optional, default `0`).

### Response Format

**Success 200**

```json
{
  "summary": [
    {
      "monthIdentifier": "2024-01",
      "userCount": 10,
      "totalAmountUsd": 500
    }
  ],
  "rows": [
    {
      "userId": "user-id",
      "monthIdentifier": "2024-01",
      "amountUsd": 50,
      "processedAt": "2024-01-05T00:00:00.000Z"
    }
  ]
}
```

### Error Responses
- **401 / 403**.

### Frontend Integration Notes
- Use `summary` for overview charts and `rows` for drill-down views.

### Example Request (Axios)

```ts
const res = await axios.get('/admin/reports/autoship', {
  params: { monthFrom: '2024-01', monthTo: '2024-03' },
  headers: { Authorization: `Bearer ${token}` },
});
```

---

## GET `/admin/merchant-category-config`

### Endpoint Overview
Get configuration for merchant categories (commissions, onboarding, etc.).

### HTTP Method
**GET**

### URL Path
`/admin/merchant-category-config`

### Authentication
**Required** – Bearer JWT with `ADMIN` role.

### Request Headers
- **Authorization**

### Response Format

**Success 200**

```json
[
  {
    "type": "RESTAURANT",
    "deliveryCommissionPct": 5,
    "productCommissionPct": 10,
    "registrationFeeUsd": 100,
    "onboardingProductId": "product-id",
    "onboardingQuantity": 1,
    "onboardingItems": [
      { "productId": "product-id", "quantity": 1 }
    ]
  }
]
```

### Error Responses
- **401 / 403**.

### Frontend Integration Notes
- Use to prefill merchant category configuration forms.

### Example Request (Axios)

```ts
const res = await axios.get('/admin/merchant-category-config', {
  headers: { Authorization: `Bearer ${token}` },
});
```

---

## PUT `/admin/merchant-category-config/{type}`

### Endpoint Overview
Create or update configuration for a single merchant category type.

### HTTP Method
**PUT**

### URL Path
`/admin/merchant-category-config/{type}`

### Authentication
**Required** – Bearer JWT with `ADMIN` role.

### Request Headers
- **Authorization**
- **Content-Type**: `application/json`

### Request Body

```json
{
  "deliveryCommissionPct": 5,
  "productCommissionPct": 10,
  "registrationFeeUsd": 100,
  "onboardingProductId": "product-id",
  "onboardingQuantity": 1,
  "onboardingItems": [
    { "productId": "product-id", "quantity": 1 }
  ]
}
```

- Either `onboardingItems` **or** (`onboardingProductId` + `onboardingQuantity`) can define the onboarding bundle.

### Response Format

**Success 200**

```json
{
  "message": "Merchant category config updated"
}
```

### Error Responses
- **400** – Invalid onboarding fields or values.
- **401 / 403**.

### Frontend Integration Notes
- Enforce mutual exclusivity of onboarding definitions in your form.

### Example Request (Fetch)

```ts
await fetch(`/admin/merchant-category-config/${type}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    deliveryCommissionPct: 5,
    productCommissionPct: 10,
    registrationFeeUsd: 100,
    onboardingProductId: 'prod-1',
    onboardingQuantity: 1,
  }),
});
```

---

## POST `/admin/notifications/broadcast`

### Endpoint Overview
Send a broadcast notification to multiple users.

### HTTP Method
**POST**

### URL Path
`/admin/notifications/broadcast`

### Authentication
**Required** – Bearer JWT with `ADMIN` role.

### Request Headers
- **Authorization**
- **Content-Type**: `application/json`

### Request Body

```json
{
  "title": "Maintenance Notice",
  "message": "We will be down at 10 PM.",
  "targetAudience": "ALL"
}
```

*(Exact fields depend on `BroadcastAnnouncementDto`.)*

### Response Format

**Success 200**

```json
{
  "count": 123
}
```

### Error Responses
- **400** – Invalid payload.
- **401 / 403**.

### Frontend Integration Notes
- Provide a confirmation step due to potential wide reach.
- Show `count` in success toast or summary.

### Example Request (Axios)

```ts
await axios.post(
  '/admin/notifications/broadcast',
  { title: 'Maintenance', message: 'We will be down at 10 PM.', targetAudience: 'ALL' },
  { headers: { Authorization: `Bearer ${token}` } }
);
```

---

## POST `/admin/email/test`

### Endpoint Overview
Send a test email and return raw SMTP response for debugging.

### HTTP Method
**POST**

### URL Path
`/admin/email/test`

### Authentication
**None (Public)** – intentionally public to simplify SMTP testing.

### Request Headers
- **Content-Type**: `application/json`

### Request Body

```json
{
  "to": "test@example.com",
  "subject": "Test Email",
  "text": "Plain text body",
  "html": "<p>HTML body</p>"
}
```

### Response Format

**Success 200** – depends on mail transport, typically:

```json
{
  "accepted": ["test@example.com"],
  "rejected": [],
  "response": "250 OK ..."
}
```

### Error Responses
- **400** – Invalid email payload.
- **500** – SMTP failure.

### Frontend Integration Notes
- Because this endpoint is public, only expose it in protected internal tools (e.g. admin-only UI or behind environment flags).

### Example Request (Fetch)

```ts
await fetch('/admin/email/test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: 'test@example.com',
    subject: 'Test Email',
    text: 'Hello',
  }),
});
```

