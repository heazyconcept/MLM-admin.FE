# FE Integration — Upgrade & Registration Funding Audit

**Date:** 2026-07-28  
**Related:** [BACKEND_REQUEST_UPGRADE_REGISTRATION_FUNDING_AUDIT.md](./BACKEND_REQUEST_UPGRADE_REGISTRATION_FUNDING_AUDIT.md)

## Package upgrades

- `GET /admin/users/package-upgrades` — extended with `source` including `MANUAL_DEPOSIT`, `isMerchant`, amount/currency, `waivePayment`, `fundingSummary`, payment/deposit refs.
- `GET /admin/users/package-upgrades/:id` — adds `funding`, `ledgerEntries`, `links`.
- Auth: `users.view` (`USERS_LIST`).

### Ledger `source` values (WalletLedger)

Displayed as-is from backend. Values you may see on registration activation debits:

| Value | Meaning |
|-------|---------|
| `REGISTRATION_ACTIVATION` | Debit of registration wallet on activate |
| `DEPOSIT` | Credit from gateway / wallet funding |
| `ADMIN` | Admin wallet adjustment |
| `SYSTEM` | System ledger movement |

Package upgrades via gateway or manual deposit **settle as upgrade** and normally have **empty** `ledgerEntries` (`netWalletEffect=SETTLED_AS_UPGRADE` or `NONE`).

### Source enum

`ADMIN` | `GATEWAY` | `SYSTEM` (legacy activation snapshots only) | `MANUAL_DEPOSIT`

## Registration activations

- `GET /admin/users/registration-activations`
- `GET /admin/users/registration-activations/:id`
- Auth: `users.view` (`USERS_LIST`).
- One row per user (`userId` unique). Sources: `GATEWAY`, `MANUAL_REGISTRATION_PAYMENT`, `ADMIN_DEBIT_WALLET`, `ADMIN_WAIVE`.

## Out of scope

- Merchant fee / merchant category upgrade payments — tracked separately in [BACKEND_REQUEST_MERCHANT_PACKAGE_UPGRADE_FUNDING_AUDIT.md](./BACKEND_REQUEST_MERCHANT_PACKAGE_UPGRADE_FUNDING_AUDIT.md)
- Earnings commission report `/admin/reports/earnings/upgrade`
