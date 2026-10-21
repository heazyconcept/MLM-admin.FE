# Backend Request — Wallet global summary (Legacy types)

**Date:** 2026-10-20  
**From:** Admin app (`mlm-admin.fe`)  
**To:** HerbApi  
**Status:** Open  
**Priority:** Medium  
**Admin screens:**

- **Wallets → Wallet Management** — `/admin/wallets` (summary cards + member grid)
- **Wallets → Wallet Types** — `/admin/wallets/types`

---

## 1. Summary

Admin Wallet Management shows **six** wallet categories: four network types plus **Legacy cashout** and **Legacy product voucher**. Top-of-page totals and the Wallet Types table read from:

```http
GET /admin/wallets/global-summary
```

Today, `summaries[]` reliably includes network types (`REGISTRATION`, `CASH`, `VOUCHER`, `AUTOSHIP`) but often **omits** `LEGACY_CASHOUT` and `LEGACY_VOUCHER`. The UI then shows **₦0.00** and **0 wallets** for Legacy cards even when Legacy members have balances visible elsewhere (e.g. Legacy member detail, `GET /admin/wallets?userId=`).

We need **one authoritative global-summary response** for all six types so admin figures match ledger totals and we can **remove the frontend fallback** (see §5).

---

## 2. Problem (observed)

| Source | Legacy cashout / voucher |
|--------|---------------------------|
| `GET /admin/wallets/global-summary` | Missing rows or zero count/balance while network types are populated |
| `GET /admin/wallets?walletType=LEGACY_*` | Individual wallets exist; `total` reflects wallet count |
| `GET /admin/wallets/summary` | May or may not include `LEGACY_CASHOUT` / `LEGACY_VOUCHER` keys (inconsistent with global-summary) |
| `GET /admin/legacy/members/:userId` | Per-member legacy wallet balances on detail |

**Impact:** Admin cannot trust Legacy aggregate totals on Wallet Management / Wallet Types without cross-checking other endpoints.

---

## 3. Required API behavior

### 3.1 `GET /admin/wallets/global-summary`

Include **one summary object per wallet type** the platform supports for admin, at minimum:

| `walletType` | Admin label (UI only) |
|--------------|------------------------|
| `REGISTRATION` | Registration wallet |
| `CASH` | Cash wallet (network cashout / withdrawal) |
| `VOUCHER` | Product voucher wallet |
| `AUTOSHIP` | Autoship wallet |
| `LEGACY_CASHOUT` | Legacy cashout wallet |
| `LEGACY_VOUCHER` | Legacy product voucher |

**Aggregation rules (align with existing network types):**

- **`totalWallets`:** Count of wallets of that type included in the aggregate (same status filter as today for CASH/REGISTRATION/etc. — typically **ACTIVE** only; document if different).
- **`totalBalance`:** Sum of **ledger-derived** balances for those wallets (same calculation as list/detail `balance` and as used for network rows in global-summary today).
- **`currency`:** Display currency for the aggregate row. If balances for a type are split across `NGN` and `USD`, return **separate summary rows** per `(walletType, currency)` — do not mix currencies in one number (admin UI sums grand totals per currency).

**Always return Legacy rows:** If there are zero Legacy wallets, return explicit zeros (do not omit the type):

```json
{
  "walletType": "LEGACY_CASHOUT",
  "totalWallets": 0,
  "totalBalance": 0,
  "currency": "NGN"
}
```

Use canonical enum strings **`LEGACY_CASHOUT`** and **`LEGACY_VOUCHER`** (underscore, uppercase) to match wallet list `walletType`, ledger, and orders (`paidFromWalletType`).

### 3.2 `GET /admin/wallets/summary` (consistency)

The legacy key-value summary should include the **same** Legacy types and balances as global-summary (single source of truth on the backend):

```json
{
  "REGISTRATION": 450000.0,
  "CASH": 1254000.0,
  "VOUCHER": 7500.0,
  "AUTOSHIP": 3061794.73,
  "LEGACY_CASHOUT": 12345.67,
  "LEGACY_VOUCHER": 8900.0
}
```

If global-summary is the primary contract, `/summary` should stay in sync for dashboard and any consumers still on the map format.

---

## 4. Expected response (global-summary)

```json
{
  "summaries": [
    {
      "walletType": "REGISTRATION",
      "totalWallets": 1210,
      "totalBalance": 450000.0,
      "currency": "NGN"
    },
    {
      "walletType": "CASH",
      "totalWallets": 1540,
      "totalBalance": 1245000.0,
      "currency": "NGN"
    },
    {
      "walletType": "VOUCHER",
      "totalWallets": 880,
      "totalBalance": 7500.0,
      "currency": "NGN"
    },
    {
      "walletType": "AUTOSHIP",
      "totalWallets": 173,
      "totalBalance": 3061794.73,
      "currency": "NGN"
    },
    {
      "walletType": "LEGACY_CASHOUT",
      "totalWallets": 42,
      "totalBalance": 250000.0,
      "currency": "NGN"
    },
    {
      "walletType": "LEGACY_VOUCHER",
      "totalWallets": 42,
      "totalBalance": 180000.0,
      "currency": "NGN"
    }
  ]
}
```

*(Example numbers; production values must match DB/ledger.)*

---

## 5. Frontend (temporary fallback — remove after backend fix)

Until global-summary includes Legacy types with correct counts and balances, admin FE **`WalletService.getGlobalWalletSummary()`** merges:

1. Primary: `GET /admin/wallets/global-summary`
2. Fallback balance: `GET /admin/wallets/summary` (Legacy keys only when global row missing/zero)
3. Fallback count: `GET /admin/wallets?walletType=LEGACY_*&limit=1` → `total`

**Limitations of fallback (why backend fix is required):**

- Count and balance can come from **different** requests; they may not match global-summary rules (e.g. status filters).
- Extra API calls on every Wallet Management / Wallet Types load.
- If `/summary` also omits Legacy keys, cards can remain at zero despite wallets in the list.

**After backend ships §3:** Admin FE will call **only** `global-summary` and delete the merge logic in `wallet.service.ts` (`fetchPageSilent` legacy enrichment + `/summary` forkJoin).

---

## 6. Acceptance criteria

- [ ] `GET /admin/wallets/global-summary` includes `LEGACY_CASHOUT` and `LEGACY_VOUCHER` in every response (zero or non-zero).
- [ ] For an environment with known Legacy members, Legacy **totalBalance** equals the sum of `balance` on all included wallets of that type (spot-check vs `GET /admin/wallets?walletType=LEGACY_CASHOUT` paginated list).
- [ ] Legacy **totalWallets** matches the list endpoint `total` for the same `walletType` and status rules.
- [ ] Network type totals unchanged (regression check vs current production global-summary).
- [ ] `GET /admin/wallets/summary` includes Legacy keys consistent with global-summary balances.
- [ ] Multi-currency: if applicable, separate summary rows per currency; admin “All wallets” grand total is not a mixed-currency sum.

---

## 7. References

- Admin wallet list: `GET /admin/wallets` — `walletType` filter supports Legacy enums (see `admin-api-gaps.md`).
- Legacy member wallets: `GET /admin/legacy/members/:userId` — `legacyCashout` / `legacyVoucher`.
- Related gap notes: `new-fixes-issues.md` (Part 3 — global summary; Legacy types section).
- Frontend display config: `src/app/features/wallets/wallet-type-display.util.ts`.
