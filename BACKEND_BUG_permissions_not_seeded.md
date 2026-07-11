# Backend Bug: Admin Permissions Not Seeded (Empty Response)

> **Endpoint**: `GET /api/admin/permissions` (or `/admin/permissions`)  
> **Severity**: Blocker / High  
> **Status**: Pending Backend Seed Implementation & Data Seeding  

---

## 1. Description of the Issue

When the frontend calls the permissions listing API to display the available permissions for Role and Group configuration, the backend returns an empty array:

```json
[]
```

As a result, the admin management panel is blocked because there are no permissions available to select, assign, or display when creating or updating Roles and User Groups.

---

## 2. No Frontend Fallback Policy

To ensure data integrity and avoid synchronization drift between the frontend and the database, **the frontend intentionally has no hardcoded fallback permissions list**. All permissions must be dynamically provided by the backend database. 

The API must return the full, structured list of permissions as defined in the API specification.

---

## 3. Required Action: Database Seeding

The backend database needs to be seeded with the **60 atomic permissions** specified in the design. These permissions must be loaded during database migration or system startup.

For the full list of 60 permission records including their `id`, `key`, `label`, `module`, and `type`, please refer to the **Permissions API** and **Permission Seed Data** sections in:
* [BACKEND_RBAC_API.md](file:///c:/Users/HP/mlm-admin.fe/mlm-admin.fe/BACKEND_RBAC_API.md#L80-L173)

### Expected Schema & Fields (from `BACKEND_RBAC_API.md`):
```sql
CREATE TABLE admin_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,        -- e.g. 'dashboard.view'
    label VARCHAR(200) NOT NULL,
    description TEXT,
    module VARCHAR(50) NOT NULL,             -- e.g. 'Dashboard'
    type VARCHAR(10) NOT NULL CHECK (type IN ('view', 'action')),
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Response Format Example:
```json
[
  {
    "id": "p-01",
    "key": "dashboard.view",
    "label": "View Dashboard",
    "description": "Access to the main dashboard overview and statistics",
    "module": "Dashboard",
    "type": "view"
  },
  {
    "id": "p-02",
    "key": "users.view",
    "label": "View User List",
    "module": "Users",
    "type": "view"
  }
]
```

---

## 4. Verification

To verify that the issue has been resolved:
1. Ensure the DB seeding script runs successfully on database setup/migration.
2. Query `GET /api/admin/permissions` (or equivalent backend path mapped to the API client) and verify it returns all 60 permissions listed in the seed data table.
3. Refresh the Admin Role Management screen in the admin dashboard and confirm that the permissions list is populated.
