# Backend Request — Package Upgrade History (Admin)

**Date:** 2026-07-09  
**From:** Admin FE (`mlm-admin.fe`)  
**Related:** [frontend-integration-admin-user-operations.md](./frontend-integration-admin-user-operations.md) (manual upgrade), user gateway upgrade flow  
**Status:** Request for backend implementation  
**Priority:** Medium — admin audit trail for package upgrades

---

## 1. Problem

Admins need a dedicated page listing **every package upgrade event**: who upgraded, **previous package → new package**, and **ranking stage at upgrade time**.

Today:

- `POST /admin/users/:id/upgrade` returns `fromPackage` / `toPackage` in the response only — **no persisted history**
- Gateway upgrades (`POST /payments/upgrade/initiate` + verify) do not expose an admin list
- Admin FE ships a **mock** page at `/admin/users/package-upgrades` until this API exists

---

## 2. Definitions

| Term | Meaning |
|------|---------|
| **Previous package** | User's `registrationPackage` immediately before the upgrade |
| **Current package** | Package after this specific upgrade (`toPackage`) — snapshot at event time |
| **Stage** | User's ranking stage (1–6) at upgrade time per `GET /admin/ranking-rules` |
| **Rank name** | Human label e.g. Bronze, Silver (optional display field) |
| **Source** | How the upgrade happened: `ADMIN`, `GATEWAY`, or `SYSTEM` |

Each row is one **immutable upgrade event**. If a user upgrades twice, there are two rows.

---

## 3. Requested API

### `GET /admin/users/package-upgrades`

Paginated list of package upgrade history.

**Auth:** Admin JWT + RBAC `users.view` (or dedicated `users.view_upgrade_history` if preferred).

**Query parameters:**

| Param | Type | Notes |
|-------|------|-------|
| `search` | string | Match username, email, fullName |
| `previousPackage` | enum | `NICKEL` \| `SILVER` \| `GOLD` \| `PLATINUM` \| `RUBY` \| `DIAMOND` |
| `currentPackage` | enum | Filter by `toPackage` |
| `stage` | integer | Ranking stage 1–6 at upgrade time |
| `source` | enum | `ADMIN` \| `GATEWAY` \| `SYSTEM` |
| `dateFrom` | ISO date | `upgradedAt >= dateFrom` |
| `dateTo` | ISO date | `upgradedAt <= dateTo` |
| `userId` | uuid | Optional — single user filter |
| `limit` | integer | Default 20 |
| `offset` | integer | Default 0 |

**Response (200):**

```json
{
  "items": [
    {
      "id": "uuid",
      "userId": "uuid",
      "username": "janedoe",
      "email": "jane@example.com",
      "fullName": "Jane Doe",
      "previousPackage": "SILVER",
      "currentPackage": "GOLD",
      "stage": 2,
      "rankName": "Bronze",
      "upgradedAt": "2026-07-09T10:00:00.000Z",
      "source": "GATEWAY",
      "performedBy": null,
      "paymentId": "uuid",
      "paymentReference": "PAY-..."
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | uuid | Yes | Upgrade history record id |
| `userId` | uuid | Yes | |
| `username` | string | Yes | |
| `email` | string | Yes | |
| `fullName` | string | No | |
| `previousPackage` | enum | Yes | Package before upgrade |
| `currentPackage` | enum | Yes | Package after upgrade |
| `stage` | integer | Yes | 1–6 at upgrade time |
| `rankName` | string | No | e.g. Bronze |
| `upgradedAt` | ISO datetime | Yes | When upgrade completed |
| `source` | enum | Yes | `ADMIN` \| `GATEWAY` \| `SYSTEM` |
| `performedBy` | string | No | Admin username when `source=ADMIN` |
| `paymentId` | uuid | No | When `source=GATEWAY` |
| `paymentReference` | string | No | When `source=GATEWAY` |

---

### `GET /admin/users/package-upgrades/:id` (optional)

Single record detail for future drill-down / audit.

**Response:** Same shape as one list item, optionally with extra metadata (admin notes, waive payment flag, etc.).

---

## 4. When to persist records

Create one history row on every **successful** package change:

| Trigger | `source` | Notes |
|---------|----------|-------|
| `POST /admin/users/:id/upgrade` succeeds | `ADMIN` | Set `performedBy` to acting admin username/id |
| Gateway upgrade payment verified | `GATEWAY` | Link `paymentId` / `paymentReference` |
| Initial registration activation (optional) | `SYSTEM` | Only if product wants activations in same list |

**Snapshot at write time:**

- `previousPackage` = user's package before change
- `currentPackage` = new package after change
- `stage` + `rankName` = user's ranking position at that moment (not recomputed later)

---

## 5. Suggested data model

```
PackageUpgradeHistory
  id
  userId
  previousPackage
  currentPackage
  stage
  rankName (nullable)
  source (ADMIN | GATEWAY | SYSTEM)
  performedByAdminId (nullable)
  paymentId (nullable)
  upgradedAt
  createdAt
```

Index: `(upgradedAt DESC)`, `(userId)`, `(previousPackage, currentPackage)`.

---

## 6. Acceptance criteria

- [ ] Every admin manual upgrade creates a history row
- [ ] Every successful gateway upgrade creates a history row
- [ ] `GET /admin/users/package-upgrades` supports pagination and all filters above
- [ ] `previousPackage` / `currentPackage` reflect the **event**, not the user's latest package if they upgraded again
- [ ] `stage` is captured at upgrade time
- [ ] RBAC: `users.view` can list (or document alternative permission)
- [ ] Admin FE can remove mock banner and call live endpoint

---

## 7. Frontend integration (admin)

| Area | Behaviour |
|------|-----------|
| Page | `/admin/users/package-upgrades` under Users submenu |
| Service | [`package-upgrade-history.service.ts`](src/app/features/users/services/package-upgrade-history.service.ts) — swap `loadMockData` → `GET /admin/users/package-upgrades` |
| Permissions | `users.view` to access page |

---

## 8. Distinction from earnings "Upgrade" report

| | Earnings upgrade payouts | Package upgrade history |
|--|--------------------------|-------------------------|
| Purpose | Commission / payout transactions | User registration package changes |
| Route | `/admin/reports/earnings/upgrade` | `/admin/users/package-upgrades` |
| Data | Earning rows, amounts | User, fromPackage, toPackage, stage |

Do not merge these into one endpoint.

---

## 9. Example flows

### Admin manual upgrade

1. User is SILVER; admin upgrades to GOLD via `POST /admin/users/:id/upgrade`.
2. Backend writes history: `SILVER → GOLD`, `source=ADMIN`, `performedBy=admin.user`.
3. Row appears in admin Package Upgrades list.

### Gateway upgrade

1. User pays via `POST /payments/upgrade/initiate` and payment verifies.
2. Backend writes history: `SILVER → GOLD`, `source=GATEWAY`, `paymentReference=PAY-...`.

### User upgrades twice

1. Row 1: `SILVER → GOLD` on 2026-06-01  
2. Row 2: `GOLD → PLATINUM` on 2026-07-01  
Both rows remain; list shows both events.

---

## 10. Changelog

| Date | Change |
|------|--------|
| 2026-07-09 | Initial request from Admin FE for package upgrade history API |
