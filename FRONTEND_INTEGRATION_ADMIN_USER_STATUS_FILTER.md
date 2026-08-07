# Frontend Integration — Admin User List Status Filter

**Date:** 2026-08-07  
**Endpoint:** `GET /admin/users`  
**Related:**
- [BACKEND_REQUEST_USER_LIST_STATUS_FILTER.md](./BACKEND_REQUEST_USER_LIST_STATUS_FILTER.md) (original request)
- [BACKEND_UPDATE_USER_MANAGEMENT.md](./BACKEND_UPDATE_USER_MANAGEMENT.md) (Part 2 — status classification)
- [admin-api.md](./admin-api.md) (`GET /admin/users`)
- [frontend-integration-admin-user-operations.md](./frontend-integration-admin-user-operations.md)

**Status:** API contract for FE — use `status` for User Management filters  
**UI:** `/admin/users` status dropdown

---

## 1. Summary

`GET /admin/users` now accepts a **`status`** query parameter so admins can filter members by MLM classification on the **server**.

Previously the FE could only send `isActive` + `isRegistrationPaid`. That made **Activated**, **Active**, and **Inactive** hit the same query, so the table and `total` looked identical. Client-side re-filtering on a paginated page cannot fix `total` or missing rows on other pages.

**Rule:** Prefer `status` for the User Management dropdown. Trust `users[]` and `total` from the response. Do **not** re-filter by status on the client (except **Flagged**, which the API still does not support).

---

## 2. New query parameter

```http
GET /admin/users?status=REGISTERED|ACTIVATED|ACTIVE|INACTIVE|SUSPENDED
```

| `status` value | Server semantics |
|----------------|------------------|
| `SUSPENDED` | `isActive === false` |
| `REGISTERED` | `isActive === true` AND `isRegistrationPaid === false` |
| `ACTIVATED` | `isActive === true` AND `isRegistrationPaid === true` AND `directReferralsCount` is `null` / unknown |
| `ACTIVE` | `isActive === true` AND `isRegistrationPaid === true` AND `directReferralsCount >= 3` |
| `INACTIVE` | `isActive === true` AND `isRegistrationPaid === true` AND `directReferralsCount < 3` (count present) |

### Rules

- `status` is **optional**. Omit = no status dimension (still subject to `package`, `role`, `search`, etc.).
- When `status` is set, it **owns** active / paid / referral predicates. FE should **not** also send `isActive` / `isRegistrationPaid` for the same dropdown selection.
- `limit` / `offset` apply to the **filtered** set.
- Response **`total`** = full count matching `status` (+ other filters), not page size.

### Compatible params (unchanged)

| Param | Notes |
|-------|--------|
| `package` | Registration package enum (e.g. `GOLD`) |
| `role` | `USER` \| `MERCHANT` \| `ADMIN` |
| `search` | Text / username / email (when supported) |
| `rank` | Optional |
| `isActive` / `isRegistrationPaid` | Kept for other callers; **do not use for the status dropdown** once `status` is available |
| `limit` / `offset` | Pagination |

### Response field

Each user in `users[]` (and detail) should include `directReferralsCount` so badges stay consistent with filters:

```json
{
  "directReferralsCount": 5
}
```

---

## 3. Examples

### Active only

```http
GET /admin/users?status=ACTIVE&limit=20&offset=0
```

```json
{
  "users": [
    {
      "id": "…",
      "username": "johndoe",
      "isActive": true,
      "isRegistrationPaid": true,
      "directReferralsCount": 5
    }
  ],
  "total": 128,
  "limit": 20,
  "offset": 0
}
```

### Status + package + search

```http
GET /admin/users?status=INACTIVE&package=GOLD&search=ada&limit=20&offset=0
```

`total` must be the count of users matching **all** of those filters.

### Suspended

```http
GET /admin/users?status=SUSPENDED&limit=20&offset=0
```

---

## 4. UI ↔ API mapping

| Dropdown label | Query `status` |
|----------------|----------------|
| All Statuses | *(omit)* |
| Registered | `REGISTERED` |
| Activated | `ACTIVATED` |
| Active | `ACTIVE` |
| Inactive | `INACTIVE` |
| Suspended | `SUSPENDED` |
| Flagged | *(no API support — client-only on current page, or hide until backend adds it)* |

---

## 5. Frontend integration guidance

### Do

1. Add `status?: 'REGISTERED' | 'ACTIVATED' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'` to the list query type.
2. Map the status dropdown → `status=` only (see table above).
3. Pass `package`, `role`, `search`, `limit`, `offset` alongside `status` when set.
4. Bind the table to the returned `users` and the “matching filters” count to `total`.
5. Keep row badges derived from `isActive` / `isRegistrationPaid` / `directReferralsCount` (same rules as the API).

### Do not

1. Map Activated / Active / Inactive to `isActive=true&isRegistrationPaid=true`.
2. Client-filter the current page by `status === 'Active'` / `'Inactive'` / `'Activated'` after a server status fetch — that empties rows or desyncs pagination.
3. Treat page `users.length` as the filtered total.

### Optional client-only filters

- **Joined date range** — still client-only if the API has no date params (current page only).
- **Flagged** — client-only until a backend flag/filter exists.

### Service sketch

```ts
getUsers({
  status: 'ACTIVE',       // from dropdown
  package: 'GOLD',        // optional
  search: 'ada',          // optional
  limit: 20,
  offset: 0,
});
// → GET /admin/users?status=ACTIVE&package=GOLD&search=ada&limit=20&offset=0
```

---

## 6. Backend test cases (`admin.service.get-users.spec.ts`)

These cases belong in the **backend** suite (Nest/admin service). Expected coverage:

| Case | Request | Expect |
|------|---------|--------|
| Suspended | `status=SUSPENDED` | Only `isActive === false`; `total` matches |
| Registered | `status=REGISTERED` | Active + unpaid only |
| Activated | `status=ACTIVATED` | Paid + missing `directReferralsCount` |
| Active | `status=ACTIVE` | Paid + `directReferralsCount >= 3` |
| Inactive | `status=INACTIVE` | Paid + `directReferralsCount < 3` |
| Status + package | `status=ACTIVE&package=GOLD` | Intersection; correct `total` |
| Status + search | `status=INACTIVE&search=…` | Intersection; correct `total` |
| Status + package + search | all three | Intersection; correct `total` |
| Pagination | `status=ACTIVE&limit=20&offset=20` | Page from filtered set; `total` unchanged |
| Omit status | no `status` | Unfiltered by status dimension |
| Booleans alone | `isActive` / `isRegistrationPaid` without `status` | Still work for legacy callers |

FE unit coverage for query wiring: `src/app/features/users/services/users.service.spec.ts`.  
Backend suite reference (port into Nest): `docs/backend-test-reference/admin.service.get-users.spec.ts`.

---

## 7. Acceptance checklist

- [ ] Each `status` value returns a **distinct** set / `total` where data exists
- [ ] Combining `status` with `package` / `search` / `role` keeps a correct filtered `total`
- [ ] Admin User Management dropdown no longer maps Active/Inactive/Activated to the same booleans
- [ ] FE does not client-re-filter server status results
- [ ] `directReferralsCount` present on list rows used for badges
- [ ] Backend specs cover the matrix in §6
