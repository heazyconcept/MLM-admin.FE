# Backend Request — User List Status Filter

**Date:** 2026-08-04  
**From:** Admin FE (`mlm-admin.fe`)  
**Endpoint:** `GET /admin/users`  
**Related:**
- [FRONTEND_INTEGRATION_ADMIN_USER_STATUS_FILTER.md](./FRONTEND_INTEGRATION_ADMIN_USER_STATUS_FILTER.md) (**shipped FE contract + integration**)
- [BACKEND_UPDATE_USER_MANAGEMENT.md](./BACKEND_UPDATE_USER_MANAGEMENT.md) (Part 2 — status classification)
- [docs/backend-test-reference/admin.service.get-users.spec.ts](./docs/backend-test-reference/admin.service.get-users.spec.ts) (backend test cases)

**Priority:** High — User Management status dropdown must return distinct result sets  
**Status:** FE integrated against `status=` — see frontend integration doc

---

## 1. Problem

On **User Management** (`/admin/users`), the status filter shows options:

`Registered` · `Activated` · `Active` · `Inactive` · `Suspended` · `Flagged`

Previously the list API only accepted boolean flags:

| Query param | Type |
|-------------|------|
| `isActive` | boolean (optional) |
| `isRegistrationPaid` | boolean (optional) |

The frontend therefore mapped multiple UI statuses onto the **same** query:

| UI filter | Legacy query | Distinct? |
|-----------|---------------|-----------|
| Suspended | `isActive=false` | Yes |
| Registered | `isActive=true` & `isRegistrationPaid=false` | Yes |
| **Activated** | `isActive=true` & `isRegistrationPaid=true` | **No — same as below** |
| **Active** | `isActive=true` & `isRegistrationPaid=true` | **No — same as above** |
| **Inactive** | `isActive=true` & `isRegistrationPaid=true` | **No — same as above** |
| Flagged | *(not supported by API)* | Client-only on current page |

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

## 3. API change — `status` query parameter

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
- When `status` is set, it **owns** the active/paid/referral predicates. FE must not also send `isActive` / `isRegistrationPaid` for the same filter.
- `limit` / `offset` apply to the **filtered** set.
- Response `total` = count of users matching `status` (+ other filters such as `package`, `role`, `search`).

Keep `isActive` and `isRegistrationPaid` for legacy callers. Prefer `status` for the admin User Management dropdown.

Full examples, FE mapping, and backend test matrix: [FRONTEND_INTEGRATION_ADMIN_USER_STATUS_FILTER.md](./FRONTEND_INTEGRATION_ADMIN_USER_STATUS_FILTER.md).

---

## 4. Frontend follow-up (done in admin FE)

1. `UsersListQuery.status` + `UI_STATUS_TO_API` mapping.
2. Status dropdown sends `status=` only (no shared boolean mapping for Activated/Active/Inactive).
3. Removed client-side Active / Inactive re-filtering on the current page.
4. Table / “matching filters” count use response `total`.

---

## 5. Acceptance checklist

- [ ] `GET /admin/users?status=SUSPENDED` returns only `isActive === false`; `total` matches that set
- [ ] `GET /admin/users?status=REGISTERED` returns only unpaid but login-active users
- [ ] `GET /admin/users?status=ACTIVE` returns only paid users with `directReferralsCount >= 3`
- [ ] `GET /admin/users?status=INACTIVE` returns only paid users with `directReferralsCount < 3` (and count present)
- [ ] `GET /admin/users?status=ACTIVATED` returns paid users with missing referral count (if that state still exists)
- [ ] `directReferralsCount` present on list and detail payloads
- [ ] Combining `status` with `package` / `role` / `search` / pagination keeps a correct filtered `total`
- [x] Admin FE switches the User Management dropdown to `status=` and shows server `total` per option

---

## 6. Out of scope

- **Flagged** — needs a separate backend field / filter if product still wants it
- Changing badge labels or referral threshold (threshold stays **3** unless product changes it)
