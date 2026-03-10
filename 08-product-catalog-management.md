# 08-product-catalog-management

<a id="08-product-catalog-managementmd"></a>

# 08-product-catalog-management.md

**Admin Interface Specification – Product Catalog Management**

* * *

<a id="1-purpose"></a>

## 1\. Purpose

This document defines the **Product Catalog Management UI**, enabling administrators to:

- Create and manage products
- Control pricing, PV/CPV visibility, and availability
- Assign products to merchants
- Control product lifecycle states

> ⚠️ UI-only specification  
> No inventory enforcement, no pricing calculations, no live publishing.

* * *

<a id="2-entry-points"></a>

## 2\. Entry Points

| Trigger | Route |
| --- | --- |
| Admin Sidebar → Products | `/admin/products` |
| Dashboard → Product Metrics | `/admin/products/overview` |

* * *

<a id="3-product-catalog-overview"></a>

## 3\. Product Catalog Overview

<a id="route"></a>

### Route

```
/admin/products

```

<a id="ui-components"></a>

### UI Components

- Product list table
- Category filter
- Status filter
- Search bar
- Add Product button

* * *

<a id="4-product-list-table"></a>

## 4\. Product List Table

<a id="columns"></a>

### Columns

- Product ID
- Product Name
- Category
- Price
- Currency
- PV / CPV
- Status
- Assigned Merchants
- Actions

<a id="statuses-ui"></a>

### Statuses (UI)

- Draft
- Active
- Inactive
- Archived

* * *

<a id="5-create-edit-product"></a>

## 5\. Create / Edit Product

<a id="route"></a>

### Route

```
/admin/products/new
/admin/products/:id/edit

```

<a id="ui-sections"></a>

### UI Sections

1. Basic Information
2. Pricing & Points
3. Media
4. Availability
5. Merchant Assignment

* * *

<a id="51-basic-information"></a>

### 5.1 Basic Information

- Product Name
- SKU
- Category
- Short Description
- Full Description

* * *

<a id="52-pricing-points"></a>

### 5.2 Pricing & Points

- Price (base)
- Currency
- PV value
- CPV value
- Discount flag (UI-only)

* * *

<a id="53-media"></a>

### 5.3 Media

- Product images upload
- Thumbnail selection

* * *

<a id="54-availability"></a>

### 5.4 Availability

- Visibility toggle
- Purchase eligibility (Cash / Voucher / Autoship)
- Package restrictions (if any)

* * *

<a id="55-merchant-assignment"></a>

### 5.5 Merchant Assignment

- Merchant list
- Assignment toggle per merchant
- Default pickup location flag

> ⚠️ Assignment is logical only

* * *

<a id="6-product-detail-view-admin"></a>

## 6\. Product Detail View (Admin)

<a id="route"></a>

### Route

```
/admin/products/:id

```

<a id="ui-components"></a>

### UI Components

- Product summary
- Assigned merchants
- Product status controls
- Audit info (created by, updated date)

* * *

<a id="7-product-actions-ui"></a>

## 7\. Product Actions (UI)

<a id="allowed-actions"></a>

### Allowed Actions

- Activate / Deactivate
- Archive
- Duplicate product
- Edit product

> ⚠️ Confirmation required for state changes

* * *

<a id="8-safeguards"></a>

## 8\. Safeguards

- No deletion (archive only)
- Confirmation modals for critical actions
- Warning banner for live products

* * *

<a id="9-reusable-components"></a>

## 9\. Reusable Components

- `AdminProductTable`
- `ImageUploader`
- `StatusToggle`
- `ConfirmationModal`
- `CategorySelector`

* * *

<a id="10-state-management-mock"></a>

## 10\. State Management (Mock)

```
adminProducts: {
  list: []
  selectedProduct: {}
  categories: []
  merchants: []
}

```

* * *

<a id="11-ux-accessibility-rules"></a>

## 11\. UX & Accessibility Rules

- Clear product state labels
- Inline validation
- Accessible media uploads
- Consistent pricing formatting

* * *

<a id="12-ui-flow-summary"></a>

## 12\. UI Flow Summary

```
Admin Dashboard
   → Products
       → Create / Edit Product
       → Assign Merchants
       → Activate

```

* * *

<a id="13-future-backend-integration-notes"></a>

## 13\. Future Backend Integration Notes

When backend is introduced:

- Inventory sync
- Price validation
- PV/CPV enforcement
- Change auditing

* * *

<a id="14-status"></a>

## 14\. Status

✅ Product catalog admin UI defined  
✅ Governance-safe  
✅ Backend-independent