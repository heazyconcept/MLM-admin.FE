# Admin RBAC — Backend API Specification

> **For**: Backend developer  
> **Status**: Frontend implementation complete — awaiting backend endpoints  
> **Date**: June 2026

---

## Overview

The admin panel now has a dynamic Role-Based Access Control (RBAC) system. The frontend is built and ready; the backend needs to implement the following endpoints.

### Architecture Summary

```
Permissions (seeded, ~60 atomic actions)
    → Roles (named bundles of permissions)
        → User Groups (named bundles of roles)
            → Admin Users (assigned to groups, inherit all permissions)
```

**Key decisions:**
- Admin users can belong to **multiple groups** (permissions merge)
- **No approval workflow** — SuperAdmin creates users directly
- New admin users get a **temporary password** and must change it on first login
- The `SuperAdmin` group is **system-protected** and cannot be deleted

---

## Authentication Changes

### Login Response Enhancement

The `POST /auth/login` response should include the admin user's effective permissions:

```json
{
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG...",
  "user": {
    "id": "admin-uuid",
    "username": "johndoe",
    "fullName": "John Doe",
    "email": "john@segulah.com",
    "mustChangePassword": false,
    "groups": ["Super Admins"],
    "effectivePermissions": [
      "dashboard.view",
      "users.view",
      "users.suspend",
      "wallets.view",
      "wallets.adjust_funds"
    ]
  }
}
```

### `GET /api/admin/me/permissions`

Returns the current logged-in admin's permissions (for runtime checks).

**Response:**
```json
{
  "userId": "admin-uuid",
  "username": "johndoe",
  "groups": ["Super Admins"],
  "permissions": [
    "dashboard.view",
    "users.view",
    "users.view_details",
    "users.activate_registration",
    "..."
  ]
}
```

---

## Permissions API

### `GET /api/admin/permissions`

Returns all seeded permissions. These are **read-only** — the backend seeds them on deployment.

**Response:**
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

### Permission Seed Data

The backend should seed the following 60 permissions on first deployment. Full list:

| ID | Key | Label | Module | Type |
|----|-----|-------|--------|------|
| p-01 | `dashboard.view` | View Dashboard | Dashboard | view |
| p-02 | `users.view` | View User List | Users | view |
| p-03 | `users.view_details` | View User Details | Users | view |
| p-04 | `users.activate_registration` | Activate Registration | Users | action |
| p-05 | `users.upgrade_package` | Upgrade Package | Users | action |
| p-06 | `users.fund_cash` | Fund CASH Wallet | Users | action |
| p-07 | `users.credit_volume` | Credit Volume | Users | action |
| p-08 | `users.lock_wallet` | Lock/Unlock Wallet | Users | action |
| p-09 | `users.suspend` | Suspend/Reactivate User | Users | action |
| p-10 | `users.reset_password` | Reset User Password | Users | action |
| p-11 | `users.wallet_adjust` | Manual Wallet Adjustment | Users | action |
| p-12 | `users.impersonate` | Impersonate User | Users | action |
| p-13 | `earnings.view` | View Earnings Overview | Earnings | view |
| p-14 | `earnings.configure_packages` | Configure Packages | Earnings | action |
| p-15 | `earnings.configure_bonuses` | Configure Bonuses | Earnings | action |
| p-16 | `earnings.configure_ranking` | Configure Ranking | Earnings | action |
| p-17 | `earnings.configure_cpv` | Configure CPV Milestones | Earnings | action |
| p-18 | `wallets.view` | View Wallet List | Wallets | view |
| p-19 | `wallets.view_details` | View Wallet Details | Wallets | view |
| p-20 | `wallets.adjust_funds` | Adjust Wallet Funds | Wallets | action |
| p-21 | `withdrawals.view` | View Withdrawals | Withdrawals | view |
| p-22 | `withdrawals.approve` | Approve/Reject Withdrawal | Withdrawals | action |
| p-23 | `withdrawals.process` | Process Withdrawal | Withdrawals | action |
| p-24 | `payments.view` | View Payments | Payments | view |
| p-25 | `payments.view_details` | View Payment Details | Payments | view |
| p-26 | `payments.mark_successful` | Mark Payment Successful | Payments | action |
| p-27 | `products.view` | View Product Catalog | Products | view |
| p-28 | `products.create` | Create Product | Products | action |
| p-29 | `products.edit` | Edit Product | Products | action |
| p-30 | `products.manage_stock` | Manage Stock | Products | action |
| p-31 | `products.manage_categories` | Manage Categories | Products | action |
| p-32 | `orders.view` | View Orders | Orders | view |
| p-33 | `orders.view_details` | View Order Details | Orders | view |
| p-34 | `orders.update_status` | Update Order Status | Orders | action |
| p-35 | `orders.configure_logistics` | Configure Logistics | Orders | action |
| p-36 | `merchants.view` | View Merchants | Merchants | view |
| p-37 | `merchants.view_details` | View Merchant Details | Merchants | view |
| p-38 | `merchants.approve` | Approve Merchant | Merchants | action |
| p-39 | `merchants.assign` | Assign Merchant | Merchants | action |
| p-40 | `merchants.configure_categories` | Configure Categories | Merchants | action |
| p-41 | `notifications.view` | View Announcements | Notifications | view |
| p-42 | `notifications.create` | Create Announcement | Notifications | action |
| p-43 | `notifications.broadcast` | Broadcast Notification | Notifications | action |
| p-44 | `reports.view` | View Reports Overview | Reports | view |
| p-45 | `reports.profit` | View Profit Reports | Reports | view |
| p-46 | `reports.earnings_payouts` | View Earnings Payouts | Reports | view |
| p-47 | `reports.cpv` | View CPV Reports | Reports | view |
| p-48 | `reports.export` | Export Reports | Reports | action |
| p-49 | `audit.view_logs` | View Audit Logs | Audit | view |
| p-50 | `system.view` | View System Settings | System | view |
| p-51 | `system.edit_general` | Edit General Settings | System | action |
| p-52 | `system.edit_financial` | Edit Financial Rules | System | action |
| p-53 | `system.edit_currency` | Edit Currency Settings | System | action |
| p-54 | `system.toggle_features` | Toggle Features | System | action |
| p-55 | `system.edit_thresholds` | Edit Thresholds | System | action |
| p-56 | `system.edit_api` | Edit API Settings | System | action |
| p-57 | `admin_management.view` | View Admin Management | Admin Management | view |
| p-58 | `admin_management.manage_roles` | Manage Roles | Admin Management | action |
| p-59 | `admin_management.manage_groups` | Manage User Groups | Admin Management | action |
| p-60 | `admin_management.manage_users` | Manage Admin Users | Admin Management | action |

---

## Roles API

### `GET /api/admin/roles`

List all roles.

**Query params:** `page`, `limit`, `search`

**Response:**
```json
{
  "data": [
    {
      "id": "role-uuid",
      "name": "Financial Officer",
      "description": "Manage wallets, withdrawals, and payments",
      "isSystemRole": false,
      "userCount": 3,
      "permissions": [
        { "id": "p-18", "key": "wallets.view", "label": "View Wallet List", "module": "Wallets", "type": "view" }
      ],
      "createdAt": "2024-02-15T10:00:00Z",
      "updatedAt": "2024-05-20T14:30:00Z"
    }
  ],
  "total": 5,
  "page": 1,
  "limit": 100
}
```

### `GET /api/admin/roles/:id`

Get a single role with full permission list.

### `POST /api/admin/roles`

Create a new role.

**Request Body:**
```json
{
  "name": "Financial Officer",
  "description": "Manage wallets, withdrawals, and payments",
  "permissionIds": ["p-18", "p-19", "p-20", "p-21", "p-22", "p-24", "p-26"]
}
```

**Validation:**
- `name`: required, unique, max 100 chars
- `permissionIds`: required, non-empty, must reference valid permission IDs

**Response:** `201 Created` — returns the created role

### `PUT /api/admin/roles/:id`

Update a role.

**Request Body:**
```json
{
  "name": "Senior Financial Officer",
  "description": "Updated description",
  "permissionIds": ["p-18", "p-19", "p-20", "p-21", "p-22", "p-23", "p-24", "p-26"]
}
```

**Validation:**
- Cannot update `isSystemRole` roles' name
- `permissionIds` fully replaces the existing set

**Response:** `200 OK` — returns the updated role

### `DELETE /api/admin/roles/:id`

Delete a role.

**Validation:**
- Cannot delete system roles (`isSystemRole: true`)
- Should fail if role is referenced by any user group (or cascade remove from groups)

**Response:** `204 No Content`

---

## User Groups API

### `GET /api/admin/user-groups`

List all user groups.

**Query params:** `page`, `limit`, `search`

**Response:**
```json
{
  "data": [
    {
      "id": "grp-uuid",
      "name": "Finance Team",
      "description": "Handle wallets, withdrawals, payments, and financial reporting",
      "isSystemGroup": false,
      "memberCount": 3,
      "roles": [
        {
          "id": "role-uuid",
          "name": "Financial Officer",
          "description": "...",
          "permissions": [ ... ],
          "isSystemRole": false,
          "userCount": 3,
          "createdAt": "...",
          "updatedAt": "..."
        }
      ],
      "createdAt": "2024-02-01T10:00:00Z",
      "updatedAt": "2024-02-01T10:00:00Z"
    }
  ],
  "total": 4,
  "page": 1,
  "limit": 100
}
```

### `GET /api/admin/user-groups/:id`

Get a single group with members and roles.

### `POST /api/admin/user-groups`

Create a new user group.

**Request Body:**
```json
{
  "name": "Finance Team",
  "description": "Handle wallets, withdrawals, and payments",
  "roleIds": ["role-uuid-1", "role-uuid-2"]
}
```

**Validation:**
- `name`: required, unique, max 100 chars
- `roleIds`: required, non-empty

**Response:** `201 Created`

### `PUT /api/admin/user-groups/:id`

Update a user group.

**Validation:**
- Cannot update system groups' name
- `roleIds` fully replaces the existing set

**Response:** `200 OK`

### `DELETE /api/admin/user-groups/:id`

**Validation:**
- Cannot delete system groups (`isSystemGroup: true`)
- Should remove group assignment from admin users (don't delete users)

**Response:** `204 No Content`

---

## Admin Users API

### `GET /api/admin/admin-users`

List admin users.

**Query params:** `page`, `limit`, `search`, `isActive`

**Response:**
```json
{
  "data": [
    {
      "id": "admin-uuid",
      "fullName": "Jane Smith",
      "email": "jane@segulah.com",
      "username": "janesmith",
      "isActive": true,
      "mustChangePassword": false,
      "groups": [
        {
          "id": "grp-uuid",
          "name": "Finance Team"
        }
      ],
      "effectivePermissions": ["wallets.view", "wallets.adjust_funds", "..."],
      "createdAt": "2024-02-20T10:00:00Z",
      "lastLogin": "2024-06-19T09:15:00Z"
    }
  ],
  "total": 4,
  "page": 1,
  "limit": 100
}
```

### `GET /api/admin/admin-users/:id`

Get admin user with effective permissions.

### `POST /api/admin/admin-users`

Create a new admin user.

**Request Body:**
```json
{
  "fullName": "Jane Smith",
  "email": "jane@segulah.com",
  "username": "janesmith",
  "temporaryPassword": "TempPass123!",
  "groupIds": ["grp-uuid-1"]
}
```

**Backend should:**
1. Hash the temporary password
2. Set `mustChangePassword: true`
3. Calculate `effectivePermissions` from the assigned groups' roles
4. Return the created user

**Validation:**
- `username`: required, unique, alphanumeric + underscore, 3-50 chars
- `email`: required, unique, valid email format
- `temporaryPassword`: required, min 8 chars
- `groupIds`: required, non-empty

**Response:** `201 Created`

### `PUT /api/admin/admin-users/:id`

Update admin user info and group assignments.

**Request Body:**
```json
{
  "fullName": "Jane Smith-Doe",
  "email": "jane.doe@segulah.com",
  "groupIds": ["grp-uuid-1", "grp-uuid-2"]
}
```

**Response:** `200 OK`

### `PATCH /api/admin/admin-users/:id/status`

Activate or deactivate an admin user.

**Request Body:**
```json
{
  "isActive": false
}
```

**Validation:**
- Cannot deactivate the last SuperAdmin user
- Should log the action in audit trail

**Response:** `200 OK`

### `POST /api/admin/admin-users/:id/reset-password`

Reset an admin user's password.

**Request Body:**
```json
{
  "temporaryPassword": "NewTemp456!"
}
```

**Backend should:**
1. Hash the new temporary password
2. Set `mustChangePassword: true`
3. Invalidate existing sessions/tokens for this user

**Validation:**
- `temporaryPassword`: min 8 chars

**Response:**
```json
{
  "message": "Password reset successfully"
}
```

---

## Database Schema Suggestion

```sql
-- Permissions (seeded)
CREATE TABLE admin_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,        -- e.g. 'users.suspend'
    label VARCHAR(200) NOT NULL,
    description TEXT,
    module VARCHAR(50) NOT NULL,             -- e.g. 'Users'
    type VARCHAR(10) NOT NULL CHECK (type IN ('view', 'action')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Roles
CREATE TABLE admin_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Role → Permission (many-to-many)
CREATE TABLE admin_role_permissions (
    role_id UUID REFERENCES admin_roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES admin_permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- User Groups
CREATE TABLE admin_user_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_system_group BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- User Group → Role (many-to-many)
CREATE TABLE admin_user_group_roles (
    group_id UUID REFERENCES admin_user_groups(id) ON DELETE CASCADE,
    role_id UUID REFERENCES admin_roles(id) ON DELETE CASCADE,
    PRIMARY KEY (group_id, role_id)
);

-- Admin Users
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(200) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    must_change_password BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP
);

-- Admin User → User Group (many-to-many)
CREATE TABLE admin_user_memberships (
    user_id UUID REFERENCES admin_users(id) ON DELETE CASCADE,
    group_id UUID REFERENCES admin_user_groups(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, group_id)
);
```

---

## Seed Data

On first deployment, create:

1. **All 60 permissions** (from the table above)
2. **One system role**: "Super Administrator" with all permissions (`isSystemRole: true`)
3. **One system group**: "Super Admins" with the Super Administrator role (`isSystemGroup: true`)
4. **One admin user**: Default super admin with credentials from environment variables

---

## Security Notes

1. All endpoints require a valid JWT with admin permissions
2. The `admin_management.*` permissions guard the RBAC management endpoints themselves
3. Audit all CRUD operations on roles, groups, and users
4. Rate-limit password reset endpoint
5. Never return `password_hash` in API responses
6. When calculating `effectivePermissions`, aggregate all permissions from all groups' roles (union/merge)
