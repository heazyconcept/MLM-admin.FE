# Backend Request — Admin Change Own Login Password

**Date:** 2026-08-04  
**From:** Admin FE (`mlm-admin.fe`)  
**Scope:** The **logged-in admin** changing **their own** admin-console login password  
**Not in scope:** Setting / resetting a **platform member** password (`POST /admin/users/:id/reset-password`), or SuperAdmin resetting another admin (`POST /admin/admin-users/:id/reset-password`)  
**Priority:** Medium–High  
**Status:** Backend shipped — FE integrated (`PUT /admin/me/password`)

---

## 1. Problem

Admins want to change **their own login password** from the admin panel (current password → new password), on demand.

### What existed before

| Endpoint | Intended for | Notes |
|----------|--------------|-------|
| `PUT /users/me/password` | Platform user self-service | Admin FE previously called this on forced `/change-password`. Ambiguous for `admin_users`. |
| Forced `/change-password` UI | First login / temp password only | Guard blocked voluntary access. |
| `POST /admin/admin-users/:id/reset-password` | SuperAdmin → **another** admin | Sets a temporary password; not self-service. |
| `POST /admin/users/:id/reset-password` | Admin → **platform member** | Email reset link; unrelated. |

---

## 2. Implemented endpoint

```http
PUT /admin/me/password
```

### Auth

- Bearer JWT for the **current admin**.

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

- Min length **8**
- At least one uppercase, one lowercase, one digit, one special character
- `newPassword` must not equal `currentPassword`

### Backend behaviour

1. Resolve the admin from the JWT (do **not** take a target user id from the client).
2. Verify `currentPassword` against `admin_users.password_hash` (or equivalent).
3. Validate `newPassword`; reject with `400` if weak or same as current.
4. Hash and store the new password.
5. Set `must_change_password = false`.
6. Optionally invalidate other sessions / refresh tokens for this admin.
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
| `403` | Wrong `currentPassword` |
| `404` | Admin record missing for JWT (should be rare) |

---

## 3. Relationship to other routes

| Route | Role |
|------|------|
| `PUT /users/me/password` | Platform members only — admin FE no longer uses this for console login. |
| `PUT /admin/me/password` | Forced first-login + voluntary change (sidebar **Change password**). |
| `POST /admin/admin-users/:id/reset-password` | SuperAdmin resets **another** admin. Unchanged. |

---

## 4. Frontend integration (done)

1. `AuthService.changePassword()` → `PUT /admin/me/password`.
2. Sidebar **Change password** → `/change-password` (available when already logged in).
3. `/change-password` allows any authenticated admin (forced copy when `mustChangePassword`, voluntary otherwise).
4. Error interceptor suppresses global modal for `admin/me/password` so the form can show errors.
5. On success: clear local `mustChangePassword`, toast, navigate to dashboard.

---

## 5. Acceptance checklist

- [x] Logged-in admin can change their own password with current + new
- [x] Wrong current password rejected; weak new password rejected
- [x] `mustChangePassword` cleared after success
- [x] Subsequent login works with the new password only
- [x] Password never returned or written to logs
- [x] Does not change platform member passwords or other admins’ passwords
- [x] Forced first-login flow and voluntary change both use the same endpoint

---

## 6. Out of scope

- Admin setting a **platform user’s** password
- SuperAdmin setting another admin’s temporary password (already exists)
- Forgot-password email flow for admins (separate product decision)
