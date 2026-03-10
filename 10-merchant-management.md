# 10-merchant-management

<a id="10-merchant-managementmd"></a>

# 10-merchant-management.md

**Admin Interface Specification – Merchant Management**

* * *

<a id="1-purpose"></a>

## 1\. Purpose

This document defines the **Merchant Management UI**, enabling administrators to:

- Approve and manage merchants
- Assign merchant types and regions
- Monitor merchant performance
- Enforce merchant-related rules

> ⚠️ UI-only specification  
> No payout execution, no contract enforcement.

* * *

<a id="2-entry-points"></a>

## 2\. Entry Points

| Trigger | Route |
| --- | --- |
| Admin Sidebar → Merchants | `/admin/merchants` |
| Dashboard → Merchant Alerts | `/admin/merchants?status=pending` |

* * *

<a id="3-merchant-overview"></a>

## 3\. Merchant Overview

<a id="route"></a>

### Route

```
/admin/merchants

```

<a id="ui-components"></a>

### UI Components

- Merchants table
- Status filters
- Merchant type filter
- Search bar

* * *

<a id="4-merchant-types-ui"></a>

## 4\. Merchant Types (UI)

- Regional Merchant
- National Merchant
- Global Merchant

> Types affect visibility only (UI)

* * *

<a id="5-merchant-list-table"></a>

## 5\. Merchant List Table

<a id="columns"></a>

### Columns

- Merchant ID
- Business Name
- Owner (User)
- Merchant Type
- Region
- Status
- Assigned Products
- Actions

<a id="statuses"></a>

### Statuses

- Pending
- Approved
- Suspended

* * *

<a id="6-merchant-detail-view"></a>

## 6\. Merchant Detail View

<a id="route"></a>

### Route

```
/admin/merchants/:id

```

<a id="ui-components"></a>

### UI Components

- Merchant profile
- Owner details
- Assigned products
- Coverage regions
- Performance summary

* * *

<a id="7-merchant-actions-ui"></a>

## 7\. Merchant Actions (UI)

<a id="allowed-actions"></a>

### Allowed Actions

- Approve merchant
- Suspend merchant
- Reactivate merchant
- Change merchant type
- Assign regions

> ⚠️ Confirmation required for all actions

* * *

<a id="8-merchant-performance-read-only"></a>

## 8\. Merchant Performance (Read-Only)

<a id="metrics-displayed"></a>

### Metrics Displayed

- Orders fulfilled
- Delivery success rate
- Merchant earnings
- Customer ratings (if any)

* * *

<a id="9-safeguards"></a>

## 9\. Safeguards

- No deletion (suspension only)
- Status change history visible
- Reason required for suspension

* * *

<a id="10-reusable-components"></a>

## 10\. Reusable Components

- `AdminMerchantTable`
- `StatusBadge`
- `RegionSelector`
- `ConfirmationModal`
- `PerformanceCard`

* * *

<a id="11-state-management-mock"></a>

## 11\. State Management (Mock)

```
adminMerchants: {
  list: []
  selectedMerchant: {}
  regions: []
}

```

* * *

<a id="12-ux-accessibility-rules"></a>

## 12\. UX & Accessibility Rules

- Clear status indicators
- Warning banners for suspension
- Read-only financial metrics
- Accessible action menus

* * *

<a id="13-ui-flow-summary"></a>

## 13\. UI Flow Summary

```
Admin Dashboard
   → Merchants
       → Merchant Detail
           → Approve / Suspend

```

* * *

<a id="14-future-backend-integration-notes"></a>

## 14\. Future Backend Integration Notes

When backend is introduced:

- Contract enforcement
- Merchant payout rules
- Region validation
- SLA tracking

* * *

<a id="15-status"></a>

## 15\. Status

✅ Merchant admin UI defined  
✅ Governance-ready  
✅ Backend-independent