# 12-merchant-center

<a id="12-merchant-centermd"></a>

# 12-merchant-center.md

**User Interface Specification – Merchant Center**

* * *

<a id="1-purpose"></a>

## 1\. Purpose

This document defines the **Merchant Center UI**, which allows **merchant-enabled users** to:

- Manage products and inventory
- View and fulfil orders
- Track merchant-specific earnings
- Handle delivery assignments

> ⚠️ UI-only specification  
> No merchant approvals, no inventory enforcement, no payouts.

* * *

<a id="2-access-rules"></a>

## 2\. Access Rules

- Visible only if `isMerchant = true`
- Appears as **Merchant Center** in sidebar
- Merchant context does **not replace** user context

* * *

<a id="3-entry-points"></a>

## 3\. Entry Points

| Trigger | Route |
| --- | --- |
| Sidebar → Merchant Center | `/merchant` |
| Order Assignment | `/merchant/orders` |

* * *

<a id="4-merchant-dashboard"></a>

## 4\. Merchant Dashboard

<a id="route"></a>

### Route

```
/merchant/dashboard

```

<a id="ui-components"></a>

### UI Components

- Total merchant sales
- Pending fulfilments
- Inventory summary
- Merchant earnings snapshot

* * *

<a id="5-inventory-management"></a>

## 5\. Inventory Management

<a id="route"></a>

### Route

```
/merchant/inventory

```

<a id="ui-components"></a>

### UI Components

- Product list
- Stock quantity
- Status (In Stock / Low / Out)
- Edit stock button

> ⚠️ Stock changes are UI-only

* * *

<a id="6-merchant-orders"></a>

## 6\. Merchant Orders

<a id="route"></a>

### Route

```
/merchant/orders

```

<a id="ui-components"></a>

### UI Components

- Assigned orders list
- Fulfilment type (Pickup / Delivery)
- Order status
- Action buttons

* * *

<a id="7-order-fulfilment-merchant"></a>

## 7\. Order Fulfilment (Merchant)

<a id="route"></a>

### Route

```
/merchant/orders/:id

```

<a id="ui-components"></a>

### UI Components

- Order items
- Pickup / delivery details
- Update status buttons

<a id="status-actions-ui"></a>

### Status Actions (UI)

- Mark as Ready
- Mark as Shipped
- Mark as Completed

* * *

<a id="8-delivery-assignments"></a>

## 8\. Delivery Assignments

<a id="route"></a>

### Route

```
/merchant/deliveries

```

<a id="ui-components"></a>

### UI Components

- Assigned deliveries
- Delivery status
- Customer info

* * *

<a id="9-merchant-earnings"></a>

## 9\. Merchant Earnings

<a id="route"></a>

### Route

```
/merchant/earnings

```

<a id="ui-components"></a>

### UI Components

- Merchant earnings breakdown
- Sales commissions
- Delivery bonuses

* * *

<a id="10-empty-states"></a>

## 10\. Empty States

<a id="scenarios"></a>

### Scenarios

- No inventory
- No assigned orders
- No merchant earnings

<a id="ui-actions"></a>

### UI Actions

- Add Product CTA
- Explore Marketplace CTA

* * *

<a id="11-reusable-components"></a>

## 11\. Reusable Components

- `MerchantStatCard`
- `InventoryRow`
- `OrderCard`
- `StatusBadge`
- `Button`
- `Modal`

* * *

<a id="12-state-management-mock"></a>

## 12\. State Management (Mock)

```
merchant: {
  inventory: []
  orders: []
  deliveries: []
  earnings: {}
}

```

* * *

<a id="13-ux-accessibility-rules"></a>

## 13\. UX & Accessibility Rules

- Clear role distinction
- Status-driven actions
- Mobile-friendly tables
- Visible merchant badges

* * *

<a id="14-ui-flow-summary"></a>

## 14\. UI Flow Summary

```
Merchant Dashboard
   → Inventory
   → Orders
       → Fulfil Order
   → Deliveries
   → Earnings

```

* * *

<a id="15-future-backend-integration-notes"></a>

## 15\. Future Backend Integration Notes

When backend is introduced:

- Inventory syncing
- Order assignment logic
- Merchant payouts
- Delivery validation

* * *

<a id="16-status"></a>

## 16\. Status

✅ Merchant UI defined  
✅ Role-aware  
✅ Backend-independent