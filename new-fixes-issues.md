# API Gap Report: Missing `username` in Order User Details

This document outlines the required backend updates for the order management system. The frontend has been updated to display the user's **username** instead of their **email** in the Order Management list and Order Details screens. However, the backend endpoints are currently not exposing the `username` property on the user object.

---

## 1. Required API Updates

We require the `username` field of the user to be exposed on the following endpoints:

### A. Order List Endpoint
* **Endpoint**: `GET /admin/orders`
* **JSON Location**: `orders[].user.username`
* **Description**: Each item inside the `orders` list response contains a `user` object. We need this `user` object to include the `username` property.

### B. Order Details Endpoint
* **Endpoint**: `GET /admin/orders/:id`
* **JSON Location**: `user.username`
* **Description**: The detailed order details response contains a `user` object. We need this `user` object to include the `username` property.

---

## 2. Expected Data Structure

### Target `user` Object Schema
Under both endpoints, the `user` property inside the order should have the following schema:

```json
{
  "user": {
    "id": "0b4637fb-12eb-4980-b5e5-4c67381eaa9c",
    "email": "heazyconcept@gmail.com",
    "username": "heazy",         // <--- REQUIRED GAP: Please expose this field
    "referralCode": "YA6FRMC4",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

---

## 3. Frontend Implementation Details

To ensure a seamless user experience while the backend changes are in progress, the frontend has been implemented with a **graceful fallback**:
* If `username` is returned by the backend, it will be displayed in the UI prefixed with an `@` (e.g., `@heazy`).
* If `username` is missing or `null` (current state), the frontend will split the email address at the `@` symbol and use the first part as a temporary fallback username (e.g., `@heazyconcept` for `heazyconcept@gmail.com`).

Once the backend exposes the `username` field on these two endpoints, the frontend will automatically switch to displaying the actual username.

---

# Part 2: Missing `productName` in Merchant Onboarding Items Config

This section outlines another required backend API update identified for the **Merchant Configuration** system. Currently, the category configuration returns a list of onboarding products in `onboardingItems`, but only exposes the `productId` and `quantity`. To display readable product names in the admin and merchant settings, we need the backend to expose the `productName` inside the onboarding items list.

---

## 1. Required API Updates

We require the `productName` of the product to be exposed inside each onboarding item on the following endpoints:

* `GET /admin/merchant-category-config` (list all configurations)
* `GET /admin/merchant-category-config/:type` (single configuration details)
* `PUT /admin/merchant-category-config/:type` (update configuration)

---

## 2. Expected Data Structure

### Target `onboardingItems` Schema
Under the above endpoints, each item in the `onboardingItems` array should have the `productName` exposed:

```json
{
  "id": "aeabf9ea-8d1f-43c8-8016-70a1e78c8c4e",
  "merchantType": "NATIONAL",
  "deliveryCommissionPct": 10,
  "productCommissionPct": 15,
  "registrationFeeUsd": null,
  "registrationFeeNGN": 300000,
  "onboardingProductId": null,
  "onboardingQuantity": null,
  "onboardingItems": [
    {
      "productId": "e6e548f0-c543-4032-ba93-2d1ba3432b3b",
      "productName": "Herbal Supplements",  // <--- REQUIRED GAP: Please expose this field
      "quantity": 10
    }
  ]
}
```

---

## 3. Frontend Usage

The frontend uses this property to render the onboarding package details:
* **Category Config List UI**: `merchant-category-config-list.component.html` – displaying the package list of onboarding products for each merchant tier (e.g., "10 × Herbal Supplements").
* **Merchant Details UI**: `merchant-details.component.ts` – displaying the onboarding allocations in merchant profile pages.
* **Config Edit UI**: `merchant-category-config-edit.component.html` – when editing and selecting onboarding items in the form arrays.

---

# Part 3: Wallet Types Global Summary Endpoint

This section outlines the required backend API endpoint for the newly created **Wallet Types Summary Dashboard**. 

### The Problem
The frontend has introduced a comprehensive management panel listing all four system wallet types (Registration, Autoship, Voucher, and Cash). This dashboard displays:
1. The **total active wallets count** of each type in the system.
2. The **aggregated cash balance** across all wallets of each type.
3. The calculated **average wallet balance** of each type.

Currently, the backend has `GET /admin/wallets/summary` which only returns the aggregate balance per type as a key-value pair (e.g. `{"CASH": 1254000.00, "REGISTRATION": 450000.00}`). It is **missing the total count of wallets** for each type, making it impossible to render real global statistics.

---

## 1. Required API Updates

We require a new endpoint (or an extension of the existing `GET /admin/wallets/summary`) that returns both the count and aggregate balance per type.
 
* **Endpoint Option B (Extension)**: Enhance `GET /admin/wallets/summary` to return the richer array format instead of a simple key-value dictionary.

---

## 2. Expected Data Structure

### Target Response Payload Schema

```json
{
  "summaries": [
    {
      "walletType": "CASH",
      "totalWallets": 1540,
      "totalBalance": 1245000.00,
      "currency": "NGN"
    },
    {
      "walletType": "REGISTRATION",
      "totalWallets": 1210,
      "totalBalance": 450000.00,
      "currency": "NGN"
    },
    {
      "walletType": "AUTOSHIP",
      "totalWallets": 945,
      "totalBalance": 12850.50,
      "currency": "NGN"
    },
    {
      "walletType": "VOUCHER",
      "totalWallets": 880,
      "totalBalance": 7500.00,
      "currency": "NGN"
    }
  ]
}
```

---

## 3. Frontend Implementation Details

To ensure the new dashboard is immediately interactive and fully functional, the frontend has been loaded with a **dynamic mock-integration system**:
* The **aggregated balance values** are fetched **live** using the existing `WalletService.getWalletSummary()` ledger audit calculations.
* The **active wallet counts** are estimated progressively based on local analytics.

Once this new global summary endpoint is deployed by the backend team, the frontend will be updated in `wallet-types-summary.component.ts` to fetch these counts dynamically from the live database.

---

# Part 4: Product List API Pricing Fields returning null for Scheduled/Future Prices

This section outlines the backend API issue identified with the **Product Catalog** pricing fields. Currently, when a product's price is scheduled for a future date (i.e., `effectiveFrom` is in the future), the backend returns `null` for all price-related fields on the product list and details endpoints, instead of returning the scheduled price.

---

## 1. Required API Updates

When a product does not have a currently active price but has an upcoming/future price scheduled, the product endpoints should return the details of the future price rather than returning `null`. This applies to:

* `GET /admin/products` (Product List)
* `GET /admin/products/:id` (Product Details)
* `PUT /admin/products/:id` (Update Product)

---

## 2. Expected Data Structure

Currently, if the price starts in the future, the endpoints return:
```json
{
  "id": "b40217bf-0f0a-4c2d-905d-2d9b7c1910e2",
  "name": "Segulah Herbal Wine",
  ...
  "basePrice": null,
  "nonMemberBasePrice": null,
  "pv": null,
  "directReferralPv": null,
  "cpv": null,
  "effectiveFrom": null,
  "effectiveTo": null
}
```

### Target Response Payload Schema
Instead of returning `null`, it should return the fields of the scheduled future price (or the next upcoming price) so the frontend can display the scheduled price and state:

```json
{
  "id": "b40217bf-0f0a-4c2d-905d-2d9b7c1910e2",
  "name": "Segulah Herbal Wine",
  ...
  "basePrice": 10000,
  "nonMemberBasePrice": 15000,
  "pv": 3,
  "directReferralPv": 0,
  "cpv": 1.5,
  "effectiveFrom": "2026-06-20T11:04:00.000Z",
  "effectiveTo": null
}
```

---

## 3. Frontend Implementation Details

To ensure a seamless user experience while the backend change is in progress, the frontend has been updated with a **graceful fallback**:
* **Memory Preservation**: When saving product edits (`updateProduct`) or updating status, the frontend preserves the set scheduled price in local state instead of letting the PUT response overwrite it to `null`.
* **History Fallback**: When loading the product edit form, if the API returns `null` pricing fields, the frontend automatically extracts the latest scheduled price from `GET /admin/products/:id/price-history` and pre-fills the form and local state.

Once the backend changes are in place to return the upcoming scheduled price, the product list table and initial load will display scheduled prices automatically without needing fallback fetching.


