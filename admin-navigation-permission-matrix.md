# admin-navigation-permission-matrix

<a id="admin-navigation-permission-matrixmd"></a>

# admin-navigation-permission-matrix.md

**Admin Navigation Structure & Permission Matrix**

* * *

<a id="1-purpose"></a>

## 1\. Purpose

This document defines:

- Admin navigation hierarchy
- Route visibility rules
- Permission-based access matrix
- Action-level safeguards

It serves as the **single source of truth** for:

- Admin sidebar rendering
- Route guards
- Action enable/disable logic

> ⚠️ UI-first specification  
> Permissions are represented conceptually (mock).

* * *

<a id="2-admin-roles-logical"></a>

## 2\. Admin Roles (Logical)

| Role | Description |
| --- | --- |
| Super Admin | Full system access |
| Finance Admin | Financial operations |
| Operations Admin | Orders, logistics, merchants |
| Support Admin | Users, tickets, notifications |
| Read-Only Admin | View-only access |

> Roles are illustrative; final roles may differ.

* * *

<a id="3-admin-navigation-hierarchy"></a>

## 3\. Admin Navigation Hierarchy

```
Dashboard
Users
Earnings
Wallets
Withdrawals
Payments
Products
Orders & Logistics
Merchants
Notifications
Reports & Audit
System Configuration

```

* * *

<a id="4-navigation-route-mapping"></a>

## 4\. Navigation → Route Mapping

| Menu | Base Route |
| --- | --- |
| Dashboard | `/admin/dashboard` |
| Users | `/admin/users` |
| Earnings | `/admin/earnings` |
| Wallets | `/admin/wallets` |
| Withdrawals | `/admin/withdrawals` |
| Payments | `/admin/payments` |
| Products | `/admin/products` |
| Orders & Logistics | `/admin/orders` |
| Merchants | `/admin/merchants` |
| Notifications | `/admin/notifications` |
| Reports & Audit | `/admin/reports` |
| System Configuration | `/admin/system` |

* * *

<a id="5-role-based-navigation-visibility"></a>

## 5\. Role-Based Navigation Visibility

| Feature | Super | Finance | Ops | Support | Read-Only |
| --- | --- | --- | --- | --- | --- |
| Dashboard | ✅   | ✅   | ✅   | ✅   | ✅   |
| Users | ✅   | ❌   | ❌   | ✅   | 👁️ |
| Earnings | ✅   | 👁️ | ❌   | ❌   | 👁️ |
| Wallets | ✅   | ✅   | ❌   | ❌   | 👁️ |
| Withdrawals | ✅   | ✅   | ❌   | ❌   | 👁️ |
| Payments | ✅   | ✅   | ❌   | ❌   | 👁️ |
| Products | ✅   | ❌   | ❌   | ❌   | 👁️ |
| Orders & Logistics | ✅   | ❌   | ✅   | ❌   | 👁️ |
| Merchants | ✅   | ❌   | ✅   | ❌   | 👁️ |
| Notifications | ✅   | ❌   | ❌   | ✅   | 👁️ |
| Reports & Audit | ✅   | 👁️ | 👁️ | 👁️ | 👁️ |
| System Configuration | ✅   | ❌   | ❌   | ❌   | 👁️ |

Legend:

- ✅ Full access
- 👁️ View only
- ❌ No access

* * *

<a id="6-action-level-permission-matrix"></a>

## 6\. Action-Level Permission Matrix

<a id="financial-actions"></a>

### Financial Actions

| Action | Super | Finance | Ops | Support | Read-Only |
| --- | --- | --- | --- | --- | --- |
| Approve Withdrawal | ✅   | ✅   | ❌   | ❌   | ❌   |
| Manual Wallet Adjustment | ✅   | ✅   | ❌   | ❌   | ❌   |
| Mark Payment Successful | ✅   | ✅   | ❌   | ❌   | ❌   |

* * *

<a id="operational-actions"></a>

### Operational Actions

| Action | Super | Finance | Ops | Support | Read-Only |
| --- | --- | --- | --- | --- | --- |
| Update Order Status | ✅   | ❌   | ✅   | ❌   | ❌   |
| Assign Merchant | ✅   | ❌   | ✅   | ❌   | ❌   |
| Approve Merchant | ✅   | ❌   | ✅   | ❌   | ❌   |

* * *

<a id="user-actions"></a>

### User Actions

| Action | Super | Finance | Ops | Support | Read-Only |
| --- | --- | --- | --- | --- | --- |
| Suspend User | ✅   | ❌   | ❌   | ✅   | ❌   |
| Reset User Password | ✅   | ❌   | ❌   | ✅   | ❌   |

* * *

<a id="system-actions"></a>

### System Actions

| Action | Super | Finance | Ops | Support | Read-Only |
| --- | --- | --- | --- | --- | --- |
| Change System Config | ✅   | ❌   | ❌   | ❌   | ❌   |
| Toggle Features | ✅   | ❌   | ❌   | ❌   | ❌   |

* * *

<a id="7-ui-guard-rules"></a>

## 7\. UI Guard Rules

- Sidebar items hidden if ❌
- Routes blocked if ❌
- Buttons disabled if 👁️
- All destructive actions require confirmation

* * *

<a id="8-empty-restricted-states"></a>

## 8\. Empty & Restricted States

If user lacks permission:

- Show “Access Restricted” page
- Hide action buttons
- Display read-only banners

* * *

<a id="9-future-backend-enforcement-notes"></a>

## 9\. Future Backend Enforcement Notes

When backend is introduced:

- Map roles to claims
- Enforce route guards server-side
- Log all admin actions
- Introduce approval workflows

* * *

<a id="10-status"></a>

## 10\. Status

✅ Admin navigation defined  
✅ Permission matrix complete  
✅ Frontend & backend aligned