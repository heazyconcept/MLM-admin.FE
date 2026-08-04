# Backend Request — User List Status Filter

**Date:** 2026-08-04  
**From:** Admin FE (`mlm-admin.fe`)  
**Endpoint:** `GET /admin/users`  
**Related:** [BACKEND_UPDATE_USER_MANAGEMENT.md](./BACKEND_UPDATE_USER_MANAGEMENT.md) (Part 2 — status classification)  
**Priority:** High — User Management status dropdown cannot return distinct result sets  
**Status:** Waiting on backend

---

## 1. Problem

On **User Management** (`/admin/users`), the status filter shows options:

`Registered` · `Activated` · `Active` · `Inactive` · `Suspended` · `Flagged`

Today the list API only accepts boolean flags:

| Query param | Type |
|-------------|------|
| `isActive` | boolean (optional) |
| `isRegistrationPaid` | boolean (optional) |

The frontend therefore maps multiple UI statuses onto the **same** query:

| UI filter | Current query | Distinct? |
|-----------|---------------|-----------|
| Suspended | `isActive=false` | Yes |
| Registered | `isActive=true` & `isRegistrationPaid=false` | Yes |
| **Activated** | `isActive=true` & `isRegistrationPaid=true` | **No — same as below** |
| **Active** | `isActive=true` & `isRegistrationPaid=true` | **No — same as above** |
| **Inactive** | `isActive=true` & `isRegistrationPaid=true` | **No — same as above** |
| Flagged | *(not supported by API)* | Client-only on current page |

**Observed behaviour:** selecting Activated, Active, or Inactive all hit e.g.

```http
GET /admin/users?isActive=true&isRegistrationPaid=true&limit=20&offset=0
```

and return the same users / same `total`. Pagination totals and the “matching filters” count above the table are therefore wrong for Active vs Inactive.

Client-side filtering after fetch cannot fix this: pagination and `total` are server-owned.

---

## 2. Status classification (source of truth)

UI badge / row status is derived from three fields:

| Status | Condition | Meaning |
|--------|-----------|---------|
| **Suspended** | `isActive === false` | Login disabled by admin |
| **Registered** | `isActive === true` && `isRegistrationPaid === false` | Signed up; registration unpaid |
| **Activated** | `isActive === true` && `isRegistrationPaid === true` && `directReferralsCount` is `null` / omitted | Paid; referral count missing (migration / incomplete data) |
| **Active** | `isActive === true` && `isRegistrationPaid === true` && `directReferralsCount >= 3` | Paid and ≥ 3 direct referrals |
| **Inactive** | `isActive === true` && `isRegistrationPaid === true` && `directReferralsCount < 3` | Paid but &lt; 3 direct referrals |
| **Flagged** | *(product-defined; not in current API)* | Out of scope unless backend adds a flag field |

`directReferralsCount` must be present on list **and** detail responses so badges and filters stay consistent.

---

## 3. Required API change

### 3.1 New query parameter

```http
GET /admin/users?status=REGISTERED|ACTIVATED|ACTIVE|INACTIVE|SUSPENDED
```

| Value | Server filter semantics |
|-------|-------------------------|
| `SUSPENDED` | `isActive === false` |
| `REGISTERED` | `isActive === true` AND `isRegistrationPaid === false` |
| `ACTIVATED` | `isActive === true` AND `isRegistrationPaid === true` AND (`directReferralsCount` IS NULL) |
| `ACTIVE` | `isActive === true` AND `isRegistrationPaid === true` AND `directReferralsCount >= 3` |
| `INACTIVE` | `isActive === true` AND `isRegistrationPaid === true` AND `directReferralsCount < 3` |

**Rules:**

- `status` is optional. Omit = all users (subject to other filters).
- When `status` is set, it **owns** the active/paid/referral predicates. Do not require the client to also send `isActive` / `isRegistrationPaid` for the same filter (ignore or reject conflicting booleans — pick one approach and document it).
- `limit` / `offset` apply to the **filtered** set.
- Response `total` = count of users matching `status` (+ other filters such as `package`, `role`, `search`).

### 3.2 Keep existing booleans (compat)

Keep `isActive` and `isRegistrationPaid` for callers that only need those dimensions. Prefer `status` for the admin User Management dropdown.

### 3.3 Response field

Every user in `users[]` (and `GET /admin/users/:id`) should include:

```json
{
  "directReferralsCount": 5
}
```

Use `null` (or omit) only when the count is genuinely unknown; that maps to UI **Activated**.

### 3.4 Example

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
      "directReferralsCount": 5,
      "…"
    }
  ],
  "total": 128,
  "limit": 20,
  "offset": 0
}
```

All rows must satisfy Active rules; `total` must be the full Active count, not the page size.

---

## 4. Frontend follow-up (after backend ships)

1. Add `status?: string` to `UsersListQuery` and pass `REGISTERED` / `ACTIVATED` / `ACTIVE` / `INACTIVE` / `SUSPENDED` from the status dropdown.
2. Stop mapping Activated / Active / Inactive onto the shared `isActive` + `isRegistrationPaid` pair.
3. Remove client-side Active / Inactive re-filtering on the current page (no longer needed).
4. Keep using response `total` for the “matching filters” count above the table.

Until then, Activated / Active / Inactive remain non-distinct in the UI.

---

## 5. Acceptance checklist

- [ ] `GET /admin/users?status=SUSPENDED` returns only `isActive === false`; `total` matches that set
- [ ] `GET /admin/users?status=REGISTERED` returns only unpaid but login-active users
- [ ] `GET /admin/users?status=ACTIVE` returns only paid users with `directReferralsCount >= 3`
- [ ] `GET /admin/users?status=INACTIVE` returns only paid users with `directReferralsCount < 3` (and count present)
- [ ] `GET /admin/users?status=ACTIVATED` returns paid users with missing referral count (if that state still exists)
- [ ] `directReferralsCount` present on list and detail payloads
- [ ] Combining `status` with `package` / `role` / `search` / pagination keeps a correct filtered `total`
- [ ] Admin FE can switch the User Management dropdown to `status=` and show different totals per option

---

## 6. Out of scope

- **Flagged** — needs a separate backend field / filter if product still wants it
- Changing badge labels or referral threshold (threshold stays **3** unless product changes it)
