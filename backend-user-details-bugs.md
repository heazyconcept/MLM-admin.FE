# User Details - Backend Issues

Date: 2026-05-29
Scope: Admin user details actions
Environment: Production API https://api.segulah.ng

## 1) Upgrade user package fails

- Endpoint: POST /admin/users/{userId}/upgrade
- Example URL: https://api.segulah.ng/admin/users/ca04eb92-56bd-481c-aee2-fb1988aefc30/upgrade
- Response: 400 Bad Request
- Error message:
  - "registrationPackage cannot be modified after registration"
- Expected:
  - Admin should be able to upgrade user package via admin upgrade endpoint.
- Actual:
  - API blocks the upgrade with validation error.
- Impact:
  - Admin cannot perform package upgrades from the dashboard.
- Notes:
  - Please confirm if this endpoint should allow upgrades for already registered users or if a different endpoint is required for upgrades.

## 2) Credit PV does not apply

- Action: Admin credits PV (personal PV or CPV) from user details
- Endpoint (expected): POST /admin/users/{userId}/volume/credit
- Expected:
  - User volume increases by the credited amount and is visible on the user record.
- Actual:
  - Credit action completes but user volume does not change.
- Impact:
  - Admin volume adjustments do not take effect.
- Needed from logs:
  - Request payload (amount, volumeType, reason)
  - Response body (if any)
  - Whether the API returns success despite no update

## 3) Admin cannot adjust user wallet because amount units are mismatched

- Action: Admin adjusts a user wallet
- Endpoint: POST /admin/wallets/{walletId}/adjust
- Example URL: https://api.segulah.ng/admin/wallets/28c15690-324d-4815-a0f0-e5e40ad564e4/adjust
- Response: 400 Bad Request
- Error message:
  - "Insufficient balance. Available: 495, Requested: 50000"
- Expected:
  - Admin should be able to adjust the wallet when the user balance is 495000.
- Actual:
  - API reads the available balance as 495 and compares it against the requested amount 50000.
- Impact:
  - Admin cannot adjust the user wallet even though the displayed wallet balance is sufficient.
- Notes:
  - This looks like a unit mismatch. The balance appears to be stored/displayed in minor units (495000), while the adjustment check treats the available balance like USD/major units (495).

## Requested backend actions

- Confirm intended behavior for /admin/users/{id}/upgrade and update validation or provide correct upgrade flow.
- Investigate PV credit endpoint to ensure volume is persisted and reflected in user stats.
- Fix wallet adjustment balance validation so available balance and requested amount use the same unit before comparison.
