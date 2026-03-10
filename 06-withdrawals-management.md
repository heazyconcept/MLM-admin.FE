# 06-withdrawals-management

<a id="06-withdrawals-managementmd"></a>

# 06-withdrawals-management.md

**Admin Interface Specification – Withdrawals Management**

* * *

<a id="1-purpose"></a>

## 1\. Purpose

This document defines the **Withdrawals Management UI**, enabling administrators to:

- Review withdrawal requests
- Approve or reject withdrawals
- Track payout statuses
- Maintain compliance visibility

> ⚠️ UI-only specification  
> No real approvals, no payout execution.

* * *

<a id="2-entry-points"></a>

## 2\. Entry Points

| Trigger | Route |
| --- | --- |
| Admin Sidebar → Withdrawals | `/admin/withdrawals` |
| Dashboard → Pending Withdrawals | `/admin/withdrawals/pending` |

* * *

<a id="3-withdrawals-overview"></a>

## 3\. Withdrawals Overview

<a id="route"></a>

### Route

```
/admin/withdrawals

```

<a id="ui-components"></a>

### UI Components

- Withdrawals table
- Status filters
- Search by user / reference

* * *

<a id="4-withdrawal-request-list"></a>

## 4\. Withdrawal Request List

<a id="columns"></a>

### Columns

- Request ID
- User
- Amount
- Currency
- Destination
- Status
- Request Date
- Actions

<a id="statuses-ui"></a>

### Statuses (UI)

- Pending
- Approved
- Rejected
- Processing
- Paid

* * *

<a id="5-withdrawal-detail-view"></a>

## 5\. Withdrawal Detail View

<a id="route"></a>

### Route

```
/admin/withdrawals/:id

```

<a id="ui-components"></a>

### UI Components

- User information
- Wallet snapshot
- Withdrawal amount
- Fees (if any – mocked)
- Net payout
- Supporting notes

* * *

<a id="6-admin-actions-ui"></a>

## 6\. Admin Actions (UI)

<a id="allowed-actions"></a>

### Allowed Actions

- Approve withdrawal
- Reject withdrawal
- Mark as Processing
- Mark as Paid

> ⚠️ All actions are simulated  
> Confirmation required

* * *

<a id="7-rejection-flow"></a>

## 7\. Rejection Flow

<a id="ui-components"></a>

### UI Components

- Reason input (required)
- Confirmation button

* * *

<a id="8-safeguards"></a>

## 8\. Safeguards

- Confirmation modal on every action
- Clear warnings on irreversible actions
- Status change log (read-only)

* * *

<a id="9-reusable-components"></a>

## 9\. Reusable Components

- `AdminTable`
- `StatusBadge`
- `ConfirmationModal`
- `ReasonInput`
- `DetailPanel`

* * *

<a id="10-state-management-mock"></a>

## 10\. State Management (Mock)

```
adminWithdrawals: {
  list: []
  selectedRequest: {}
  statusHistory: []
}

```

* * *

<a id="11-ux-accessibility-rules"></a>

## 11\. UX & Accessibility Rules

- High visibility for pending items
- Clear rejection reasons
- Keyboard navigation
- Consistent status colors

* * *

<a id="12-ui-flow-summary"></a>

## 12\. UI Flow Summary

```
Admin Dashboard
   → Withdrawals
       → Withdrawal Detail
           → Approve / Reject

```

* * *

<a id="13-future-backend-integration-notes"></a>

## 13\. Future Backend Integration Notes

When backend is introduced:

- Dual approval workflows
- AML checks
- Wallet locking
- Payout reconciliation

* * *

<a id="14-status"></a>

## 14\. Status

✅ Withdrawals admin UI defined  
✅ Compliance-focused  
✅ Backend-independent