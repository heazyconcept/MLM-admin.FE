# Backend Request — Caucus Team history / performance report

**Date:** 2026-11-20  
**From:** Admin app (`mlm-admin.fe`) — client request  
**To:** HerbApi  
**Status:** Open  
**Priority:** High (operations / Caucus oversight)  
**Permission:** `caucus.view_members` (same as Caucus member list and detail)  
**Admin screen (planned):** **Caucus Team → History** — `/admin/caucus/history`

**Related docs:** `docs/business/New Features/caucus-team/` (Phases 1–3, `caucus-allowance.util.ts` constants)

---

## 1. Business need (client)

The office manages **hundreds** of Caucus Team members. Today, the only way to see whether someone is performing, how many **direct Legacy referrals** they had in a month, or whether they were **paid on the 1st** is to open **each member’s dashboard** (`GET /admin/caucus/members/:userId` plus `.../months` and `.../referrals`).

That does not scale. The client wants a **single, simple report** under Caucus Team — a **History** submenu — so admins can:

- See **who performed** in a chosen month (direct referral count vs floor **10** and target **30**).
- See **who was paid** for the **last closed Lagos month** (and amount in NGN).
- See **who is under-performing** (below floor, kept aside, forfeited, consecutive misses) without logging in as each member.
- Filter and paginate like other admin lists; optional export later.

The reporting must feel **seamless**: one table, one month picker, clear totals — not hundreds of detail API calls.

---

## 2. Problem (current API)

| Capability | Today | Gap |
|------------|--------|-----|
| Member roster | `GET /admin/caucus/members` | No direct counts, no settlement, no “paid last month” |
| Per-member performance | `GET /admin/caucus/members/:userId` | Rich `currentMonth`, wallet, misses — **one user at a time** |
| Month history | `GET /admin/caucus/members/:userId/months` | Same — **N+1** for 200+ members |
| Referrals in a month | `GET /admin/caucus/members/:userId/referrals?monthKey=` | Same — **N+1** |

**Impact:** Building the History screen on existing endpoints would require **1 + N** (or **1 + 2N**) requests per page load. That is unacceptable for admin UX and server load.

**Data already exists** in Postgres:

- `CaucusReferral` — direct counts per `sponsorMembershipId` + `monthKey` (voided rows excluded from counts).
- `CaucusMonthSettlement` — closed-month outcomes: `directCount`, `ownAmountNgn`, `addedFromPreviousNgn`, `paidAmountNgn`, `status` (`PAID` \| `KEPT_ASIDE` \| `ADDED_TO_NEXT` \| `FORFEITED`), `settledAt`.
- `CaucusMembership` — `status`, `consecutiveMisses`, `carStatus`, dates.

Reuse the same rules and labels as `buildMonthSummaries` / `applySettlementLabels` in `caucus-allowance.util.ts` so admin numbers match the member app and settlement job.

---

## 3. Proposed API

### 3.1 Primary endpoint

```http
GET /admin/caucus/history-report
```

**Purpose:** Paginated roster of **all Caucus memberships** (or a filtered subset) with **one row per member** for a selected **Lagos `monthKey`**.

**Auth:** Admin Bearer token. Missing `caucus.view_members` → `403`.

### 3.2 Query parameters

| Query | Required | Default | Notes |
|--------|----------|---------|--------|
| `monthKey` | no | **Previous closed Lagos month** relative to server “now” (same as `previousMonthKey(lagosMonthKey(now))`; never default to the **open** current month for “last month paid”) | Format `YYYY-MM`, ≥ `CAUCUS_FIRST_MONTH` (`2026-10`) |
| `page` | no | `1` | ≥ 1 |
| `limit` | no | `20` | 1–100 |
| `search` | no | — | Match **username** (same behaviour as `GET /admin/caucus/members?search=`) |
| `membershipStatus` | no | — | `ACTIVE` \| `DEACTIVATED` (Prisma `CaucusMembershipStatus`) |
| `settlementStatus` | no | — | Filter on **stored** settlement for `monthKey` when that month is **closed**: `PAID` \| `KEPT_ASIDE` \| `ADDED_TO_NEXT` \| `FORFEITED`. If no row exists for that month, treat as “no settlement” (e.g. member joined after month, or month still open — see §3.4). |
| `floorMet` | no | — | `true` \| `false` — `directCount >= 10` for that month |
| `targetMet` | no | — | `true` \| `false` — `directCount >= 30` |
| `paidOnly` | no | `false` | Shorthand: `settlementStatus=PAID` |
| `minDirectCount` | no | — | Integer ≥ 0 |
| `sort` | no | `username` | See §3.5 |

Optional (nice-to-have in v1): `includeInactiveForMonth` — when `false` (default), still list deactivated members but mark row; when filtering `membershipStatus=ACTIVE`, only active today.

### 3.3 Response `200`

```json
{
  "monthKey": "2026-10",
  "monthClosed": true,
  "constants": {
    "floor": 10,
    "target": 30,
    "missLimit": 3
  },
  "summary": {
    "totalMembers": 214,
    "matchedMembers": 214,
    "paidCount": 47,
    "totalPaidNgn": 3850000.0,
    "floorMetCount": 52,
    "targetMetCount": 12,
    "keptAsideCount": 30,
    "forfeitedCount": 2,
    "belowFloorCount": 162
  },
  "items": [
    {
      "userId": "93b3e324-8b63-4c1c-a989-553ca337bfd1",
      "username": "UGWA",
      "fullName": "ANEBI OJONUGWA",
      "registrationPackage": "ELITE",
      "membershipStatus": "ACTIVE",
      "activatedAt": "2026-10-18T12:00:00.000Z",
      "consecutiveMisses": 0,
      "carStatus": "NONE",
      "monthKey": "2026-10",
      "directCount": 14,
      "floorMet": true,
      "targetMet": false,
      "ownAmountNgn": 37333.33,
      "addedFromPreviousNgn": 0,
      "paidAmountNgn": 37333.33,
      "settlementStatus": "PAID",
      "displayStatus": "PAID",
      "settledAt": "2026-11-01T01:00:15.000Z",
      "pvCredited": false
    }
  ],
  "pagination": {
    "totalRecords": 214,
    "currentPage": 1,
    "totalPages": 11,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

#### Row field definitions

| Field | Source / rule |
|--------|----------------|
| `userId`, `username`, `registrationPackage` | `User` + `CaucusMembership` |
| `fullName` | User profile; empty string or omit if none (admin UI shows “—”) |
| `membershipStatus` | Current `CaucusMembership.status` (not historical snapshot) |
| `consecutiveMisses`, `carStatus` | Membership columns |
| `directCount` | Count of non-voided `CaucusReferral` for `monthKey` + membership |
| `floorMet` / `targetMet` | `directCount >= 10` / `>= 30` |
| `ownAmountNgn` | `allowanceNgn(directCount)` for open month; from settlement when closed |
| `addedFromPreviousNgn`, `paidAmountNgn` | From `CaucusMonthSettlement` when present; else derive preview rules only for **open** month per util (paid fields `0` until settled) |
| `settlementStatus` | DB enum when settlement row exists; `null` when month open or not yet settled |
| `displayStatus` | Same vocabulary as member/admin month list: `OPEN` \| `PENDING_PAYOUT` \| `KEPT_ASIDE` \| `ADDED_TO_NEXT` \| `NOT_PAYABLE` \| `PAID` — from util, not re-invented in SQL |
| `settledAt` | ISO8601 when settlement exists |
| `pvCredited` | From settlement row |

**Navigation:** Admin UI will link `username` → existing `GET /admin/caucus/members/:userId` and optionally deep-link to referrals for `monthKey`.

#### `summary` block

Computed **for the full filtered set** (not only the current page) so the History page can show headline cards:

- **Paid last month:** `paidCount`, `totalPaidNgn` (sum of `paidAmountNgn` where `settlementStatus === 'PAID'` for `monthKey`).
- **Performing:** `floorMetCount` (and optionally `targetMetCount` for PV line).
- **At risk:** `keptAsideCount`, `belowFloorCount`, `forfeitedCount` as appropriate for the month.

### 3.4 Open month vs closed month

- **`monthClosed: true`** when `monthKey` is strictly before current Lagos month (`monthKey < lagosMonthKey(now)`).
  - Prefer **authoritative** `CaucusMonthSettlement` for amounts and `settlementStatus` / `displayStatus` after the 1st job runs.
- **`monthClosed: false`** when `monthKey` equals current Lagos month.
  - `directCount` from live referrals; `displayStatus` = `OPEN`; settlement fields mostly null/zero; optional `nextDrop` preview fields are **not required** on the list endpoint (detail page already has `nextDrop`).

If admin selects a closed month **before** settlement backfill exists for some members, return referral-based counts and `settlementStatus: null` with a sensible `displayStatus` from util — do not 500.

### 3.5 Sort

| `sort` value | Order |
|--------------|--------|
| `username` (default) | `username` ASC |
| `directCount` | Direct count DESC, then username |
| `paidAmountNgn` | Paid amount DESC (nulls last), then username |
| `consecutiveMisses` | Misses DESC, then username |

### 3.6 Implementation notes (backend)

1. **Single query pattern:** Join `CaucusMembership` → `User`, left join settlement on `(membershipId, monthKey)`, subquery or lateral count for referrals — avoid per-row service calls to `figuresFor`.
2. **Indexes:** Existing `CaucusReferral (sponsorMembershipId, monthKey)`, `CaucusMonthSettlement (membershipId, monthKey)` unique, `@@index([status])` on settlement — sufficient; add composite only if explain shows need.
3. **Timezone:** All `monthKey` semantics = **Africa/Lagos** (already used in Caucus module).
4. **Constants in response:** Echo `floor`, `target`, `missLimit` so UI does not hardcode if rules change later.
5. **Deactivate mid-month:** Row still appears for months they were active; `directCount` only includes referrals recorded under their membership (existing recorder rules).

### 3.7 Optional v2 (not blocking admin v1)

| Feature | Notes |
|---------|--------|
| `GET /admin/caucus/history-report/export?monthKey=&...` | Same filters, `text/csv` stream, cap e.g. 10k rows |
| `GET /admin/caucus/history-report/months` | List selectable closed months with settlement completion hint |
| Multi-month matrix | Out of scope for v1; client asked for simple monthly report |

---

## 4. Admin UI contract (for alignment)

**Sidebar (planned):** Under **Caucus Team**, add **History** next to Members and Appeals (`caucus.view_members`).

**Screen behaviour:**

1. **Month** dropdown or picker — default = **last closed Lagos month** (who was paid last month).
2. Preset quick filters: **Paid**, **Met floor (10+)**, **Below floor**, **Target (30+)**, **Kept aside**, **All**.
3. Table columns: Username, Name, Status, Direct referrals, Floor/Target badges, Allowance / paid NGN, Settlement status, Consecutive misses.
4. Top **summary cards** from `summary` object.
5. Search username; paginate server-side.
6. Row click → existing Caucus member detail.

No client-side recomputation of allowance or settlement rules.

---

## 5. Acceptance criteria

1. One call returns **≥ 20 members per page** with correct `directCount` for `monthKey`, matching `GET /admin/caucus/members/:userId/months` for sampled users.
2. For a **closed** month after settlement run, `paidOnly=true` returns exactly members with `CaucusMonthSettlement.status === PAID` and `paidAmountNgn` matches wallet credit batch.
3. Default `monthKey` is **previous closed Lagos month**, not the open month.
4. `summary.paidCount` and `summary.totalPaidNgn` match sum of PAID rows for the filter set.
5. Performance: p95 **&lt; 500 ms** for `limit=50` with 300+ Caucus memberships on staging (no N+1).
6. `403` without permission; validate bad `monthKey` with `400` and clear message.

---

## 6. Out of scope

- Changing allowance formula, floor, target, or settlement cron.
- Manual “pay now” or editing `PAID` settlements.
- Network downline tree (use existing `.../team` on detail).
- Legacy Club sponsor report (`GET /admin/legacy/sponsor-referrals`) — different product line.

---

## 7. Reference — existing Caucus admin routes

| Method | Path | Use |
|--------|------|-----|
| GET | `/admin/caucus/members` | Roster only |
| GET | `/admin/caucus/members/:userId` | Detail + current month snapshot |
| GET | `/admin/caucus/members/:userId/months` | Per-member history |
| GET | `/admin/caucus/members/:userId/referrals` | Per-member referrals |

**New:**

| Method | Path |
|--------|------|
| GET | `/admin/caucus/history-report` |

---

## 8. Contact / delivery

When implemented, please notify admin FE with:

- Final query parameter names and enum values.
- Sample JSON for one closed month and one open month.
- Any deviation from `displayStatus` vocabulary above.

Admin FE will add `loadHistoryReport()` on `AdminCaucusService` and ship the History route after the endpoint is on staging.