# Backend Request — Admin Change Own Login Password

**Date:** 2026-08-04  
**From:** Admin FE (`mlm-admin.fe`)  
**Scope:** The **logged-in admin** changing **their own** admin-console login password  
**Not in scope:** Setting / resetting a **platform member** password (`POST /admin/users/:id/reset-password`), or SuperAdmin resetting another admin (`POST /admin/admin-users/:id/reset-password`)  
**Priority:** Medium–High — admins need a voluntary “change my password” path, not only first-login force change  
**Status:** Waiting on backend clarification / dedicated endpoint

---

## 1. Problem

Admins want to change **their own login password** from the admin panel (current password → new password), on demand.

### What exists today

| Endpoint | Intended for | Notes |
|----------|--------------|-------|
| `PUT /users/me/password` | Platform user self-service | Body: `{ currentPassword, newPassword }`. Admin FE **already calls this** on the forced `/change-password` page after login when `mustChangePassword === true`. It is **not** documented as the admin-console account API. |
| Forced `/change-password` UI | First login / temp password only | Guard blocks the page unless `mustChangePassword` is set — there is **no** voluntary “Account → Change password” flow yet. |
| `POST /admin/admin-users/:id/reset-password` | SuperAdmin → **another** admin | Sets a temporary password; not self-service. |
| `POST /admin/users/:id/reset-password` | Admin → **platform member** | Email reset link; unrelated. |

**Gap:** There is no clearly documented **admin-scoped** endpoint for “I am logged in as admin X; update my own password.” Relying on `PUT /users/me/password` is ambiguous if that route only updates platform `users` and not `admin_users`.

Admins need a supported contract so the FE can add a permanent account/security screen (not only the forced first-login page).

---

## 2. Proposed endpoint

```http
PUT /admin/me/password
```

(Acceptable alternate: `PUT /admin/admin-users/me/password`.)

### Auth

- Bearer JWT for the **current admin** (same token used for the rest of the admin API).
- No special permission beyond being authenticated as an admin (or a dedicated `admin.change_own_password` if you prefer explicit RBAC).

### Request body

```json
{
  "currentPassword": "OldPass1!",
  "newPassword": "NewSecure2!"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `currentPassword` | string | **Yes** | Must match the admin’s current password hash |
| `newPassword` | string | **Yes** | New login password for this admin account |

### Password validation

Align with existing admin / app rules (same as forced change flow):

- Min length **8**
- At least one uppercase, one lowercase, one digit, one special character
- `newPassword` must not equal `currentPassword`

### Backend behaviour

1. Resolve the admin from the JWT (do **not** take a target user id from the client).
2. Verify `currentPassword` against `admin_users.password_hash` (or equivalent).
3. Validate `newPassword`; reject with `400` if weak or same as current.
4. Hash and store the new password.
5. Set `must_change_password = false` (so voluntary or forced flows both clear the flag).
6. Optionally invalidate other sessions / refresh tokens for this admin (recommended; document if not).
7. Audit: admin id + timestamp; **never** log passwords.

### Success `200`

```json
{
  "message": "Password updated successfully",
  "mustChangePassword": false
}
```

### Errors

| Status | When |
|--------|------|
| `400` | Weak password, missing fields, new === current |
| `401` | Unauthenticated |
| `403` | Wrong `currentPassword` (or use `400` with a generic “Current password is incorrect” — prefer not leaking account state) |
| `404` | Admin record missing for JWT (should be rare) |

---

## 3. Relationship to existing routes

| Keep | Role |
|------|------|
| `PUT /users/me/password` | Platform members only (if that is its real scope). Prefer **not** requiring admin FE to call this for console logins once `/admin/me/password` exists. |
| Forced first-login page | Can switch to call `PUT /admin/me/password` instead of `users/me/password`. |
| `POST /admin/admin-users/:id/reset-password` | SuperAdmin resets **another** admin with a temporary password + `mustChangePassword: true`. Unchanged. |

If backend confirms that `PUT /users/me/password` **already** correctly updates `admin_users` for admin JWTs (including clearing `mustChangePassword`), document that as the official contract and we can skip a new path — but still need that confirmation in writing. A dedicated `/admin/me/password` is clearer and preferred.

---

## 4. Frontend follow-up (after contract is clear)

1. Point `AuthService.changePassword()` at `PUT /admin/me/password` (or keep `users/me/password` if officially supported for admins).
2. Add a voluntary **Change password** entry (e.g. profile / account menu / security settings) available when the admin is already in the app (`mustChangePassword === false`).
3. Reuse the same form fields: current, new, confirm + strength validators.
4. On success: toast, clear local `mustChangePassword` flag, stay on page (or soft-logout if sessions are invalidated).

---

## 5. Acceptance checklist

- [ ] Logged-in admin can change their own password with current + new
- [ ] Wrong current password rejected; weak new password rejected
- [ ] `mustChangePassword` cleared after success
- [ ] Subsequent login works with the new password only
- [ ] Password never returned or written to logs
- [ ] Does not change platform member passwords or other admins’ passwords
- [ ] Forced first-login flow and voluntary change both use the same endpoint (or documented dual support)

---

## 6. Out of scope

- Admin setting a **platform user’s** password
- SuperAdmin setting another admin’s temporary password (already exists)
- Forgot-password email flow for admins (separate product decision)
