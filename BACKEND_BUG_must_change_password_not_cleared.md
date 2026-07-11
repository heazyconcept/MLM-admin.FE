# Backend Bug: `mustChangePassword` Not Cleared After Admin Password Change

> **Endpoints involved**  
> - `PUT /users/me/password` — self-service password change  
> - `POST /auth/login` — login response includes `user.mustChangePassword`  
> **Severity**: High — blocks admin access after first-login password change  
> **Status**: Fixed  
> **Reported**: 2026-06-23  
> **Fixed**: 2026-06-23 — `PUT /users/me/password` now sets `mustChangePassword: false` for admin users in `UsersService.changePassword()`

---

## 1. Summary

After a newly created admin user completes the forced password-change flow, they are **still redirected to `/change-password` on every subsequent login**, even when signing in with the new password.

The frontend behavior is correct: it trusts `user.mustChangePassword` from the login response. The backend continues to return `"mustChangePassword": true` after the password has already been changed.

**This was a backend bug.** Fixed in `UsersService.changePassword()`: admin password changes via `PUT /users/me/password` now clear `mustChangePassword` in the database.

---

## 2. Observed Behavior

### Expected

1. SuperAdmin creates admin user → backend sets `must_change_password = true`.
2. Admin logs in → login returns `user.mustChangePassword: true` → frontend shows change-password page.
3. Admin submits `PUT /users/me/password` with `{ currentPassword, newPassword }` → backend:
   - Updates password hash
   - Sets `must_change_password = false`
4. Admin logs in again with the new password → login returns `user.mustChangePassword: false` → frontend goes to dashboard.

### Actual

Step 4 fails. Login still returns `mustChangePassword: true`:

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "98fdafe3503302ded66066e7b13d2f6f2069c67bd17172072994c8de07ad5110",
  "user": {
    "id": "2054e7d2-3a81-4ab8-b77f-1891b4e61771",
    "username": "olamide",
    "fullName": "Olamide Odetoyinbo",
    "email": "odetoyinbopelu@gmail.com",
    "mustChangePassword": true,
    "groups": ["Finance Team"],
    "effectivePermissions": ["dashboard.view", "..."]
  }
}
```

The user can authenticate (valid tokens are issued), but admin routes remain blocked because the flag was never cleared in the database.

---

## 3. Root Cause (Likely)

Per [BACKEND_RBAC_API.md](BACKEND_RBAC_API.md):

- Admin users live in `admin_users` with column `must_change_password`.
- New admin users are created with `must_change_password = true`.
- Login is expected to return `user.mustChangePassword` from that record.

However, the only documented self-service change endpoint is:

| Method | Path | Documented for |
|--------|------|----------------|
| `PUT` | `/users/me/password` | Platform users (`GET /users/me`) |

There is **no admin-specific change-password endpoint** in the RBAC spec. The most likely causes:

1. **`PUT /users/me/password` does not update `admin_users.must_change_password`**  
   Password hash may be updated on one table/entity while the flag remains `true` on `admin_users`.

2. **`PUT /users/me/password` is not wired for admin JWTs**  
   Request may succeed (200) without touching the admin user record the login endpoint reads from.

3. **Login reads `must_change_password` from DB without re-checking**  
   Flag is set at creation/reset but never cleared when password changes.

4. **`POST /auth/refresh` also omits updated flag**  
   If refresh returns stale `user.mustChangePassword`, sessions can flip back to forced-change state.

---

## 4. Required Backend Fix

### A. Clear flag on successful password change

When `PUT /users/me/password` succeeds for an **admin** user (JWT role `ADMIN` / admin user id):

```sql
UPDATE admin_users
SET password_hash = :newHash,
    must_change_password = false
WHERE id = :adminUserId;
```

Or equivalent ORM update on the same entity used by `POST /auth/login`.

### B. Return updated flag in auth responses

After password change, subsequent auth responses must reflect the cleared flag:

**Login (`POST /auth/login`)**

```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "user": {
    "id": "2054e7d2-3a81-4ab8-b77f-1891b4e61771",
    "username": "olamide",
    "mustChangePassword": false
  }
}
```

**Refresh (`POST /auth/refresh`)** — include `user.mustChangePassword: false` when applicable.

### C. Allow password change while flag is set

Ensure `PUT /users/me/password` is **not** blocked by the same guard that returns:

```json
{
  "statusCode": 403,
  "message": ["Password change required before accessing this resource"],
  "error": "Forbidden"
}
```

That guard should exempt the password-change route (and optionally logout).

### D. Document the contract in BACKEND_RBAC_API.md

Add to the RBAC spec:

```markdown
### PUT /users/me/password (admin users)

When called by an authenticated admin with a valid JWT:

**Request:**
{ "currentPassword": "...", "newPassword": "..." }

**Backend should:**
1. Verify current password against admin_users.password_hash
2. Hash and store new password
3. Set admin_users.must_change_password = false
4. Return 200 OK

**Response:** 200 OK (optionally include updated user with mustChangePassword: false)
```

---

## 5. Frontend Behavior (No Change Required)

The admin frontend already implements the intended flow:

| Step | Frontend action |
|------|-----------------|
| Login | Sets `mustChangePassword` from `response.user.mustChangePassword` |
| `mustChangePassword === true` | Redirect to `/change-password` |
| Successful `PUT users/me/password` | Clears local flag and navigates to dashboard |
| Next login | **Re-reads flag from backend** — if backend still sends `true`, user is redirected again |
| 403 `"Password change required"` | Fallback redirect to `/change-password` |

The frontend **must** trust the login response on each new session. It cannot assume the flag is cleared locally after logout/login.

---

## 6. Verification Checklist

Use admin user `olamide` (or any user with prior forced-change flow):

1. **Create / reset admin**  
   Confirm `must_change_password = true` in DB.

2. **Login**  
   Confirm response: `"mustChangePassword": true`.

3. **Change password**  
   `PUT /users/me/password` with temporary + new password → expect `200`.

4. **Check DB**  
   Confirm `admin_users.must_change_password = false` for that user.

5. **Login again with new password**  
   Confirm response: `"mustChangePassword": false`.

6. **Access admin route**  
   e.g. `GET /admin/users?limit=20&offset=0` → expect `200`, not `403`.

7. **Logout and login once more**  
   Confirm flag stays `false` and dashboard loads without redirect.

---

## 7. Related Spec Gaps

| Item | Location | Gap |
|------|----------|-----|
| Login returns `mustChangePassword` | BACKEND_RBAC_API.md | Documented |
| Create/reset sets flag to `true` | BACKEND_RBAC_API.md | Documented |
| Which endpoint clears the flag | BACKEND_RBAC_API.md | **Missing** |
| Admin vs platform user on `/users/me/password` | API.md | **Unclear for admin JWTs** |

---

## 8. Conclusion

The login response proved the backend still had `must_change_password = true` for this admin after a completed password change. The backend fix clears that flag on successful `PUT /users/me/password` and subsequent logins should return `mustChangePassword: false`.

**Owner:** Backend team  
**Backend status:** Fixed (2026-06-23)  
**Frontend status:** Implemented — no frontend changes required

### Post-fix verification

If an admin still loops to `/change-password` after deploy:

1. Log out fully (clears local `mustChangePassword` in localStorage).
2. Change password once more via `/change-password` (updates DB if the prior change ran before the fix).
3. Log in again — login response should show `"mustChangePassword": false`.
4. Confirm `GET /admin/users` returns `200`, not `403`.
