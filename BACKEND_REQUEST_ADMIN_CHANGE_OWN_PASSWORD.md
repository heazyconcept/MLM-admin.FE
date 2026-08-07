# Backend Request — Admin Change Own Login Password

**Date:** 2026-08-04  
**From:** Admin FE (`mlm-admin.fe`)  
**Scope:** The **logged-in admin** changing **their own** admin-console login password  
**Not in scope:** Setting / resetting a **platform member** password (`POST /admin/users/:id/reset-password`), or SuperAdmin resetting another admin (`POST /admin/admin-users/:id/reset-password`)  
**Priority:** Medium–High  
**Status:** Backend shipped — FE integrated (`PUT /admin/me/password`)

> Canonical copy: [BACKEND_REQUEST_ADMIN_SET_USER_PASSWORD.md](./BACKEND_REQUEST_ADMIN_SET_USER_PASSWORD.md) (same content; keep both in sync or delete this duplicate).

See that file for the full contract and FE integration notes.
