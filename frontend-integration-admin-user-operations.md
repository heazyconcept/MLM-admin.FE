# Frontend Integration: Admin Manual User Operations

Date: 2026-05-28

Admin operators can manage user accounts, wallets, packages, and volume from the **user detail** page (`/admin/users/:id`) and the global wallets list. All routes require **Bearer token** with role `ADMIN`.

---

## API summary

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/admin/users/:id` | Profile + structured wallets (`walletId`, `status`, balances) |
| `PUT` | `/admin/users/:id/status` | Login on/off (`isActive`) |
| `POST` | `/admin/users/:id/activate-registration` | MLM activation (`isRegistrationPaid`) |
| `POST` | `/admin/users/:id/upgrade` | Manual package upgrade |
| `POST` | `/admin/users/:id/volume/credit` | Credit CPV or personal PV |
| `POST` | `/admin/payments/fund` | Fund user CASH wallet |
| `PUT` | `/admin/users/:id/cash-wallet/lock` | Block withdrawals + CASH transfers |
| `PUT` | `/admin/users/:id/cash-wallet/unlock` | Restore CASH wallet |
| `POST` | `/admin/wallets/:id/adjust` | Ledger credit/debit any wallet |
| `GET` | `/admin/wallets/:id` | Wallet detail + recent ledger |
| `POST` | `/admin/payments/:id/verify` | Verify offline registration/upgrade payment |

Related: [impersonation](./frontend-integration-admin-impersonation.md).

---

## Status model (UI chips)

| Field | Meaning | UI label suggestion |
|-------|---------|---------------------|
| `isActive` | Can log in | Active / Suspended |
| `isRegistrationPaid` | MLM activated (matrix, earnings) | Activated / Pending activation |

These are independent: a user can be login-active but not MLM-activated.

---

## A. User detail page (`GET /admin/users/:id`)

### Response wallets shape

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "fullName": "Jane Doe",
  "registrationPackage": "SILVER",
  "registrationCurrency": "NGN",
  "isActive": true,
  "isRegistrationPaid": false,
  "wallets": {
    "cash": {
      "walletId": "uuid",
      "balance": 150000,
      "displayCurrency": "NGN",
      "status": "ACTIVE"
    },
    "registration": {
      "walletId": "uuid",
      "balance": 35000,
      "displayCurrency": "NGN",
      "status": "ACTIVE"
    }
  },
  "activityLog": []
}
```

Wallet keys (`cash`, `registration`, `voucher`, `autoship`) are omitted when that wallet does not exist.

### Layout

- **Header:** name, package, rank, badges for `isActive` and `isRegistrationPaid`.
- **Actions menu:** Fund CASH, Activate registration, Upgrade package, Credit volume, Lock/unlock CASH, Impersonate, Reset password.
- **Wallets grid:** per wallet — balance formatted with `displayCurrency`, `status` badge, buttons **Adjust** and **View ledger** (`GET /admin/wallets/{walletId}`).

After any mutation, **re-fetch** `GET /admin/users/:id`.

---

## B. Login activate / deactivate

`PUT /admin/users/:id/status`

```json
{ "isActive": true }
```

**UI:** Toggle in profile header with confirm when disabling.

| Error | When |
|-------|------|
| 404 | User not found |

---

## C. MLM activation

`POST /admin/users/:id/activate-registration`

```json
{
  "mode": "DEBIT_REGISTRATION_WALLET",
  "reason": "Support ticket #12345: paid via bank transfer"
}
```

| Mode | When to use |
|------|-------------|
| `DEBIT_REGISTRATION_WALLET` | Registration wallet already funded (same as user **Activate** on registration page) |
| `WAIVE_PAYMENT` | Complimentary / offline approval — **no** registration-wallet debit; full matrix/earnings/CPV/IPV still run |

**UI:** Show only when `isRegistrationPaid === false`. Require mode selector + reason (min 10 chars). Extra confirm for `WAIVE_PAYMENT`.

**Success:** `{ "activated": true }`

| Error | When |
|-------|------|
| 400 | Already activated |
| 400 | Insufficient registration wallet balance (debit mode) |
| 404 | User not found |

---

## D. Fund CASH wallet

`POST /admin/payments/fund`

```json
{
  "userId": "uuid",
  "amount": 50000,
  "currency": "NGN",
  "reason": "Offline bank transfer ref 998877"
}
```

Credits **CASH** wallet only; creates `ADMIN_FUNDING` payment record.

**UI:** Modal from user detail; `userId` = current profile id.

---

## E. Manual package upgrade

`POST /admin/users/:id/upgrade`

```json
{
  "targetPackage": "GOLD",
  "reason": "Approved upgrade after offline payment",
  "waivePayment": true
}
```

- Requires `isRegistrationPaid === true`.
- `targetPackage` must be **higher** than current (`NICKEL` → … → `DIAMOND`).
- Does **not** credit CASH or create Paystack payment when `waivePayment` is true (default).
- Does not recalculate historical earnings.

**Success:**

```json
{
  "message": "Package upgraded from SILVER to GOLD",
  "fromPackage": "SILVER",
  "toPackage": "GOLD"
}
```

| Error | When |
|-------|------|
| 400 | Not activated |
| 400 | Target not higher than current |
| 404 | User not found |

---

## F. Wallet adjust / lock / unlock

### Adjust balance

`POST /admin/wallets/:walletId/adjust`

```json
{
  "amount": 10000,
  "reason": "Manual correction per finance",
  "displayAmount": 10000
}
```

- Positive `amount` = credit; negative = debit.
- `displayAmount` optional (display currency units).

Use `walletId` from `GET /admin/users/:id` → `wallets.cash.walletId`, etc.

### Lock / unlock CASH (by user)

`PUT /admin/users/:id/cash-wallet/lock`  
`PUT /admin/users/:id/cash-wallet/unlock`

No body. Response: `{ "message": "...", "status": "LOCKED" | "ACTIVE" }`.

**Effect when locked:**

- User cannot request **withdrawals**.
- User cannot **transfer** from CASH to REGISTRATION / VOUCHER / AUTOSHIP.

**UI copy:** “Locking blocks cashouts and internal transfers from the CASH wallet.”

Alternative (by wallet id): `PUT /admin/wallets/:walletId/lock` — **CASH wallets only**.

---

## G. Credit CPV / Personal PV

`POST /admin/users/:id/volume/credit`

```json
{
  "amount": 25.5,
  "volumeType": "CPV",
  "reason": "Correction for missing milestone volume",
  "externalReference": "ticket-12345-cpv"
}
```

| volumeType | Effect |
|------------|--------|
| `CPV` | Updates `CpvSummary.totalCpv`; may trigger milestone bonuses |
| `PERSONAL_PV` | Personal PV row only; does **not** change total CPV summary |

**Success:**

```json
{
  "amount": 25.5,
  "volumeType": "CPV",
  "totalCpv": 120.5,
  "message": "CPV credited successfully"
}
```

`totalCpv` is omitted for `PERSONAL_PV`.

**UI:** Radio or select for volume type; warn when crediting CPV that milestones may fire.

---

## H. Error matrix (common)

| statusCode | Typical cause |
|------------|----------------|
| 400 | Validation, business rule (already activated, bad package, insufficient balance) |
| 403 | Not admin |
| 404 | User or wallet not found |

Display `message` from API (string or string[]).

---

## I. Related flows

- **Offline registration payment:** User has `INITIATED` payment → `POST /admin/payments/:id/verify` instead of waive activation.
- **Withdrawals queue:** `GET /admin/withdrawals` — approve/reject after user requests payout.
- **Impersonation:** [frontend-integration-admin-impersonation.md](./frontend-integration-admin-impersonation.md)

---

## J. Frontend checklist

### User list (`/admin/users`)

- [ ] Link to user detail
- [ ] Columns or filters for `isActive`, `isRegistrationPaid`, package
- [x] Status dropdown uses `GET /admin/users?status=REGISTERED|ACTIVATED|ACTIVE|INACTIVE|SUSPENDED` (not shared booleans for Active/Inactive/Activated) — see [FRONTEND_INTEGRATION_ADMIN_USER_STATUS_FILTER.md](./FRONTEND_INTEGRATION_ADMIN_USER_STATUS_FILTER.md)
- [x] Matching-filters count uses response `total`; no client re-filter of server status results

### User detail (`/admin/users/:id`)

- [ ] Load `GET /admin/users/:id` on mount
- [ ] Login active toggle → `PUT .../status`
- [ ] “Activate registration” when `!isRegistrationPaid` → `POST .../activate-registration`
- [ ] “Fund wallet” modal → `POST /admin/payments/fund`
- [ ] “Upgrade package” when `isRegistrationPaid` → `POST .../upgrade`
- [ ] “Credit volume” modal → `POST .../volume/credit`
- [ ] Per-wallet Adjust / View ledger using `walletId`
- [ ] Lock/unlock CASH using `wallets.cash.status` + user-scoped lock routes
- [ ] Re-fetch profile after every successful mutation
- [ ] Reason field min 10 characters on all financial actions

### Wallets admin (`/admin/wallets`)

- [ ] Support `?userId=` deep link from user profile
- [ ] Lock/unlock/adjust on wallet detail page
