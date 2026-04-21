# Backend Issues – Frontend Integration

This document lists issues identified during admin frontend integration. Each item describes the problem, affected endpoints, and the expected behavior for the backend team to fix.

---

## Issue 1: Wallet balance returned in wrong currency for NGN users

### Problem

Wallet endpoints return the `balance` amount in USD (or a converted rate) even when the wallet's `displayCurrency` is NGN. The frontend displays the raw `balance` value with the wallet's `displayCurrency` symbol, which leads to incorrect and confusing display.

**Example:** A user has ₦300,000 NGN in their wallet, but the UI shows ₦30 (or NGN 30) because the backend is returning the USD-equivalent (~30 USD) while `displayCurrency` remains `"NGN"`.

### Affected endpoints

- `GET /admin/wallets` – list response `balance` per wallet
- `GET /admin/wallets/:id` – detail response `balance`
- `GET /admin/wallets/summary` – aggregate balances per wallet type (if applicable)
- Ledger entries: `amount` in `recentLedger` (if ledger amounts are also converted)

### Expected behavior

- `balance` MUST be in the wallet's native/display currency.
- For NGN wallets: return balance in NGN (e.g. `300000` for ₦300,000).
- For USD wallets: return balance in USD.
- Do NOT convert NGN balances to USD when returning. The frontend expects `balance` to match `displayCurrency` for display (e.g. `{{ balance | currency:displayCurrency }}`).

---

## Issue 2: Withdrawal approval and wallet lock state conflict

### Problem

The withdrawal approval flow has contradictory requirements and inconsistent behavior around wallet lock state:

1. **When wallet is locked:** Admin approves a pending withdrawal → API returns:
   ```json
   {
     "message": ["Failed to debit wallet: Wallet is locked and cannot perform this operation"],
     "error": "Bad Request"
   }
   ```
   The approval fails because the wallet is locked.

2. **Side effect:** When the approval fails (due to wallet locked), the wallet is **automatically unlocked** even though the admin did not call the unlock endpoint. This is unexpected.

3. **When wallet is unlocked:** Admin approves a pending withdrawal → API returns:
   ```json
   {
     "message": ["Wallet is not locked"]
   }
   ```
   The approval fails because the wallet is *not* locked.

**Summary:** The backend appears to require the wallet to be locked to approve a withdrawal, but when locked it rejects the debit. When unlocked it also rejects. The workflow is impossible to complete, and failed attempts cause unintended state changes (auto-unlock).

### Affected endpoints

- `POST /admin/withdrawals/:id/approve` (or equivalent approve endpoint)
- Wallet lock/unlock endpoints (behavior may be affected)
- Debit logic used during withdrawal approval

### Expected behavior

- **Clarify the intended workflow:** Does approval require the wallet to be locked or unlocked? The current behavior is contradictory.
- **Fix the logic:** Either:
  - Allow approval when wallet is **unlocked** (so the debit can proceed), and remove the "Wallet is not locked" check; or
  - If approval must happen while locked, ensure the debit/approval logic correctly handles the locked state (e.g. temporary unlock during debit, or a different flow).
- **Do not auto-unlock on failure:** If approval fails, the wallet lock state should remain unchanged. Do not unlock the wallet when the approval request fails.

### Frontend usage

- Withdrawal approval is triggered from the admin withdrawals management UI when an admin approves a pending withdrawal request.

---

## Issue 3: User Management – incomplete integration

### Problem

1. **User list table – full name not displayed:** The user list expects `fullName` (or `firstName` + `lastName`) from the API. If the backend does not return these fields, the table shows "None" for everyone. The frontend maps `fullName` or `firstName`/`lastName` from the API response; when these are missing or empty, the UI cannot display the user's name.

2. **User profile – no dedicated endpoint:** The user profile/detail page (`/admin/users/:id`) requires richer data than the current list endpoint provides:
   - `wallets` (cash, productVoucher, autoship) – currently defaulted to zeros
   - `activityLog` – currently empty
   - `upline` – currently undefined
   - `downlinesCount`, `rank` – derived from API or defaulted

   Either `GET /admin/users/:id` does not exist, or it returns the same minimal shape as the list and does not include profile-specific data (wallets, activity, network). The frontend cannot display a complete user profile without this data.

### Affected endpoints

- `GET /admin/users` – list response should include `fullName` or `firstName` and `lastName` for each user
- `GET /admin/users/:id` – detail/profile response should include:
  - `fullName` (or `firstName`, `lastName`)
  - `wallets` – `{ cash, productVoucher, autoship }` with actual balances
  - `activityLog` – array of activity items (if applicable)
  - `upline` – direct sponsor ID or name
  - `downlinesCount`, `rank` – network stats

### Expected behavior

- **List:** Ensure `GET /admin/users` returns `fullName` or `firstName`/`lastName` for each user so the frontend can display names in the user list table.
- **Profile:** Provide `GET /admin/users/:id` (or equivalent) that returns full profile data including wallets, activity log, upline, and network stats. If the endpoint exists but returns minimal data, extend it to include these fields.

---

## Issue 4: Earnings activity `amount` in USD equivalent while `displayCurrency` is NGN

### Problem

`GET /admin/earnings/activity` returns ledger-style items where `displayCurrency` indicates the user’s wallet/display currency (e.g. `"NGN"`), but the top-level `amount` field appears to be a **USD-equivalent** (or otherwise normalized) value, not an amount in that display currency. The admin UI cannot safely format `amount` with `displayCurrency` without misrepresenting the transaction (same class of bug as **Issue 1** for wallets).

**Example response fragment (NGN user):**

```json
{
  "type": "ledger",
  "id": "74c65fc2-7564-4b2b-b70d-7fb4863e134d",
  "createdAt": "2026-03-12T22:31:39.682Z",
  "walletType": "AUTOSHIP",
  "direction": "CREDIT",
  "source": "EARNING",
  "earningType": "PERSONAL_PRODUCT_PURCHASE",
  "amount": 0.35,
  "displayCurrency": "NGN",
  "reference": "EARN-PERSONAL_PRODUCT_PURCHASE-cce1ee9d-fb3b-4b97-8d3e-bda7c8cd8807-e9766325-6d52-4f1c-8bb9-03b0e0c665b0-AUTOSHIP",
  "metadata": {
    "rate": 0.05,
    "source": "product_purchase",
    "orderId": "cce1ee9d-fb3b-4b97-8d3e-bda7c8cd8807",
    "baseAmount": 20
  }
}
```

Here `amount: 0.35` does not read as an NGN ledger line item when `displayCurrency` is `"NGN"`; consumers may infer `metadata.baseAmount` reflects activity in native currency while `amount` is still not aligned with `displayCurrency`.

### Affected endpoints

- `GET /admin/earnings/activity` – per-user activity (`userId` query param)
- `GET /admin/earnings/activity/global` – if activity items reuse the same DTO/shape, the same mismatch applies there

### Expected behavior

- **`amount` MUST be expressed in the same currency as `displayCurrency`** (or the API must expose an unambiguous pair, e.g. `amountDisplay` + `displayCurrency` and optional `amountUsd` for reporting).
- For NGN users / NGN display: return the credited/debited amount in **NGN** when `displayCurrency` is `"NGN"`, consistent with how ledger and admin surfaces should present the line item.
- If the backend keeps an internal USD-normalized value for analytics, return it under an explicit field (e.g. `amountUsd` or inside `metadata`) rather than overloading `amount` while `displayCurrency` says NGN.

### Frontend usage

- Earnings monitoring and any admin view that lists per-user or global earnings activity and formats rows with `displayCurrency` (e.g. Angular `currency` pipe or shared money helpers). Until fixed, showing `amount` with the NGN symbol is misleading.

---

## How to add more issues

For each new issue, add a section with:

1. **Problem** – Clear description of what is wrong
2. **Affected endpoints** – API routes involved
3. **Expected behavior** – What the backend should return/do
4. **Frontend usage** – Where the frontend uses this (optional, for context)
