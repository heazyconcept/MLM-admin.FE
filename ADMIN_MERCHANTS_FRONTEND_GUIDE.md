# Admin – Merchants endpoints (frontend integration guide)

This guide focuses **only on Admin – Merchants** endpoints and how frontend should integrate with them.

Base path: `/admin/merchants`  
Auth: `Authorization: Bearer <adminAccessToken>` with admin role.

---

## Summary of endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/admin/merchants` | GET | List merchants with filters/pagination |
| `/admin/merchants/{id}` | GET | Get merchant details |
| `/admin/merchants/{id}/approve` | POST | Approve pending merchant (create allocations) |
| `/admin/merchants/{id}/reject` | POST | Reject pending merchant (refund fee) |
| `/admin/merchants/{id}/suspend` | POST | Suspend active merchant |
| `/admin/merchants/{id}/reactivate` | POST | Reactivate suspended merchant |
| `/admin/merchants/{id}/refill` | POST | Create refill allocations for merchant |
| `/admin/merchants/{id}/products` | POST | Assign product to merchant |
| `/admin/merchants/{id}/products` | GET | List products assigned to merchant |
| `/admin/merchants/{id}/products/{productId}` | DELETE | Unassign product from merchant |
| `/admin/merchants/{id}/orders/{orderId}/mark-sent` | POST | Mark order as sent (admin override) |
| `/admin/merchants/{id}/orders/{orderId}/confirm-delivery` | POST | Confirm order delivery on behalf of merchant |

---

## 1. List merchants – GET /admin/merchants

**Purpose:** Admin list page for merchants, with filters and pagination.

**Request**

- Method: `GET`
- Path: `/admin/merchants`
- Query params (all optional – see `AdminMerchantFiltersDto`):
  - `status`: `PENDING` \| `ACTIVE` \| `SUSPENDED`
  - `type`: merchant type enum (e.g. `REGIONAL`, `NATIONAL`, `GLOBAL`)
  - `userId`: filter by owning user
  - `limit`: page size (default 20)
  - `offset`: offset (default 0)

**Response (200)**

```json
{
  "merchants": [
    {
      "id": "merchant-uuid",
      "userId": "user-uuid",
      "type": "REGIONAL",
      "status": "PENDING",
      "serviceAreas": ["Lagos", "Abuja"],
      "user": {
        "id": "user-uuid",
        "email": "merchant@example.com"
      },
      "products": [
        {
          "id": "merchantProduct-uuid",
          "productId": "product-uuid",
          "productName": "Segulah Herbal Tea",
          "isActive": true
        }
      ],
      "createdAt": "2026-03-01T10:00:00.000Z",
      "updatedAt": "2026-03-02T11:00:00.000Z"
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

**Frontend usage**

- Main merchant listing table.
- Use filters for status/type (PENDING review queue vs ACTIVE pool) and pagination controls (`limit`, `offset`).
- Each row links to `/admin/merchants/{id}` detail screen.

---

## 2. Merchant detail – GET /admin/merchants/{id}

**Purpose:** Admin detail page for a single merchant.

**Request**

- Method: `GET`
- Path: `/admin/merchants/{id}` – `id` = merchant UUID

**Response (200)**

Same shape as a single `merchants[]` entry from the list (mapped via `mapMerchantToResponse`):

```json
{
  "id": "merchant-uuid",
  "userId": "user-uuid",
  "type": "REGIONAL",
  "status": "PENDING",
  "serviceAreas": ["Lagos", "Abuja"],
  "user": {
    "id": "user-uuid",
    "email": "merchant@example.com"
  },
  "products": [
    {
      "id": "merchantProduct-uuid",
      "productId": "product-uuid",
      "productName": "Segulah Herbal Tea",
      "isActive": true
    }
  ],
  "createdAt": "2026-03-01T10:00:00.000Z",
  "updatedAt": "2026-03-02T11:00:00.000Z"
}
```

**Frontend usage**

- Merchant detail page: show status, type, service areas, owner info (`user`), assigned products.
- Buttons for **Approve**, **Reject**, **Suspend**, **Reactivate**, **Refill**, and manage products for this merchant.

---

## 3. Approve merchant – POST /admin/merchants/{id}/approve

**Purpose:** Approve a **PENDING** merchant application. On success, the merchant becomes ACTIVE and receives onboarding allocations based on category config.

**Request**

- Method: `POST`
- Path: `/admin/merchants/{id}/approve`
- Body: none

**Response (200)**

```json
{ "message": "Merchant approved successfully" }
```

**Backend behavior**

- Merchant must exist and have `status = PENDING` or the request fails (400).
- Uses the merchant’s `type` and corresponding category config `onboardingItems` to create **MerchantAllocation** records (one per item).

**Frontend usage**

- On merchant review/approval screen, show **Approve** button when status is `PENDING` and fee is paid (if your UI tracks it).
- After success, refetch `GET /admin/merchants/{id}` (status should be `ACTIVE`), and merchant can now see allocations via their own `/merchants/me/allocations` endpoint.

---

## 4. Reject merchant – POST /admin/merchants/{id}/reject

**Purpose:** Reject a **PENDING** merchant application and (when applicable) refund the merchant fee to the user’s CASH/withdrawal wallet.

**Request**

- Method: `POST`
- Path: `/admin/merchants/{id}/reject`
- Body:

```json
{
  "reason": "Insufficient documentation"
}
```

**Response (200)**

```json
{ "message": "Merchant rejected" }
```

**Backend behavior**

- Merchant must be `PENDING`; if not, API returns 400.
- Sets merchant status to `SUSPENDED` and emits audit/notification events.
- If a merchant fee has been paid, refunds that amount to the user’s CASH wallet.

**Frontend usage**

- On review screen, show **Reject** with a required reason field.
- After success, show confirmation like “Application rejected. Fee has been refunded to withdrawal wallet.”
- Optionally, move merchant out of the PENDING list in the UI.

---

## 5. Suspend merchant – POST /admin/merchants/{id}/suspend

**Purpose:** Temporarily disable an ACTIVE merchant so they cannot operate.

**Request**

- Method: `POST`
- Path: `/admin/merchants/{id}/suspend`
- Body:

```json
{
  "reason": "Violation of terms"
}
```

`reason` is optional but recommended for audits/notifications.

**Response (200)**

```json
{ "message": "Merchant suspended" }
```

**Backend behavior**

- If merchant already `SUSPENDED`, operation is idempotent; returns success without change.

**Frontend usage**

- On ACTIVE merchant detail, show **Suspend** action (with optional reason textarea).
- After success, update status in UI to `SUSPENDED` and hide actions that require ACTIVE status (e.g. refill, assign orders).

---

## 6. Reactivate merchant – POST /admin/merchants/{id}/reactivate

**Purpose:** Reactivate a **SUSPENDED** merchant.

**Request**

- Method: `POST`
- Path: `/admin/merchants/{id}/reactivate`
- Body: none

**Response (200)**

```json
{ "message": "Merchant reactivated" }
```

**Backend behavior**

- Merchant must be `SUSPENDED`; otherwise 400.
- Sets status back to `ACTIVE` and emits audit/notifications.

**Frontend usage**

- Show **Reactivate** button only when status is `SUSPENDED`.
- After success, update status to `ACTIVE` and re-enable merchant operations (e.g. refill, assignment).

---

## 7. Refill merchant – POST /admin/merchants/{id}/refill

**Purpose:** Create additional allocations for an **ACTIVE** merchant, using the same `onboardingItems` from their merchant type’s category config.

**Request**

- Method: `POST`
- Path: `/admin/merchants/{id}/refill`
- Body: none

**Response (200)** (example)

```json
{
  "message": "Refill allocations created. Merchant must accept each after receiving stock.",
  "allocationIds": ["alloc-uuid-1", "alloc-uuid-2"]
}
```

**Backend behavior**

- Merchant must be `ACTIVE`; otherwise 400.
- Uses category config `onboardingItems` for merchant’s type to create new `MerchantAllocation`s.

**Frontend usage**

- On ACTIVE merchant detail, show **Refill stock** button.
- After success, show a notice like “Refill created; merchant must accept each allocation after receiving stock.”
- There is no direct admin UI for allocations here, but `allocationIds` can be logged or shown for reference.

---

## 8. Assign product to merchant – POST /admin/merchants/{id}/products

**Purpose:** Assign an ACTIVE product to an ACTIVE merchant so they can sell it.

**Request**

- Method: `POST`
- Path: `/admin/merchants/{id}/products`
- Body:

```json
{
  "productId": "product-uuid"
}
```

**Response (201)**

```json
{ "message": "Product assigned to merchant" }
```

**Backend behavior**

- Merchant must exist and be `ACTIVE`; otherwise 400/404.
- Product must exist and be `ACTIVE`; otherwise 400/404.
- Upserts assignment; calling with the same product multiple times is idempotent.

**Frontend usage**

- On a “Merchant products” tab, offer a product picker (existing ACTIVE products from admin products list) and call this endpoint to add them.
- After success, refetch `GET /admin/merchants/{id}/products` to reflect the assignment.

---

## 9. List merchant products – GET /admin/merchants/{id}/products

**Purpose:** Get all products assigned to a specific merchant (for admin view).

**Request**

- Method: `GET`
- Path: `/admin/merchants/{id}/products`

**Response (200)**

```json
{
  "products": [
    {
      "id": "merchantProduct-uuid",
      "merchantId": "merchant-uuid",
      "productId": "product-uuid",
      "isActive": true,
      "createdAt": "2026-03-01T10:00:00.000Z",
      "updatedAt": "2026-03-02T11:00:00.000Z"
    }
  ]
}
```

**Frontend usage**

- Display as a table inside merchant detail page (“Assigned products”). Each row can have a toggle or delete button, using the DELETE endpoint below.

---

## 10. Unassign product – DELETE /admin/merchants/{id}/products/{productId}

**Purpose:** Unassign a product from a merchant (stop them from selling it).

**Request**

- Method: `DELETE`
- Path: `/admin/merchants/{id}/products/{productId}`
- Body: none

**Response (200)**

```json
{ "message": "Product unassigned from merchant" }
```

**Backend behavior**

- If assignment does not exist, returns 404.
- If assignment exists but `isActive` is already false, operation is idempotent (no error).

**Frontend usage**

- In “Assigned products” table, show a **Remove** action per row.
- After success, refetch `GET /admin/merchants/{id}/products` and/or the parent merchant detail.

---

## 11. Mark order sent – POST /admin/merchants/{id}/orders/{orderId}/mark-sent

**Purpose:** Admin marks an order as sent (dispatched) on behalf of a merchant (override for merchant action).

**Request**

- Method: `POST`
- Path: `/admin/merchants/{id}/orders/{orderId}/mark-sent`
- Body: none

**Response (200)**

```json
{ "message": "Order marked as sent by admin" }
```

**Backend behavior**

- Checks that the order exists; if `merchantId` is provided, ensures order’s `assignedMerchantId` matches.
- Calls `MerchantFulfillmentService.markOrderSent` with `sentBy = ADMIN`.

**Frontend usage**

- On an admin **order detail** page (or a “Merchant orders” tab), provide a button “Mark sent (admin override)” when:\n  - The order is assigned to this merchant and not yet marked sent.\n- After success, refetch order to show updated sent timestamp/status if your API exposes it.\n\n---\n\n## 12. Confirm delivery – POST /admin/merchants/{id}/orders/{orderId}/confirm-delivery\n\n**Purpose:** Admin confirms delivery on behalf of the merchant, optionally attaching proof and notes. This is the admin-side equivalent of the merchant `confirm-delivery` endpoint and can trigger merchant delivery bonus.\n\n**Request**\n\n- Method: `POST`\n- Path: `/admin/merchants/{id}/orders/{orderId}/confirm-delivery`\n- Body:\n\n```json\n{\n  \"proof\": \"https://example.com/proof.jpg\",\n  \"notes\": \"Delivered to customer at 3pm by admin override\"\n}\n```\n\nBoth `proof` and `notes` are optional strings.\n\n**Response (200)**\n\n```json\n{ \"message\": \"Delivery confirmed by admin\" }\n```\n\n**Backend behavior**\n\n- Validates merchant and order and ensures order is assigned to this merchant.\n- Calls `adminConfirmDelivery` on `MerchantFulfillmentService` (which reuses generic `confirmDelivery` with `confirmedBy = ADMIN`).\n- Allowed statuses: `READY_FOR_PICKUP`, `OFFLINE_DELIVERY_REQUESTED`, or `PAID` (for backward compatibility).\n- Creates a delivery confirmation record, sets order status to `DELIVERED`, triggers merchant delivery bonus, emits audit/notification events.\n\n**Frontend usage**\n\n- On admin order detail page for orders assigned to this merchant, show **“Confirm delivery (admin)”** button.\n- Show inputs for optional `proof` (URL/text) and `notes`.\n- After success, refetch the order to display `DELIVERED` status and (if surfaced) delivery confirmation details.\n\n---\n\n## 13. UI flow recommendations\n\n- **Merchant review page**\n  - Use `GET /admin/merchants/{id}` to show status and details.\n  - Show actions based on `status`:\n    - `PENDING` → **Approve**, **Reject**.\n    - `ACTIVE` → **Suspend**, **Refill**, manage products.\n    - `SUSPENDED` → **Reactivate**.\n\n- **Merchant list page**\n  - Use `GET /admin/merchants` with filters:\n    - `status=PENDING` for review queue.\n    - `status=ACTIVE` for operational pool.\n\n- **Merchant products tab**\n  - Use `GET /admin/merchants/{id}/products` to list assignments.\n  - Use `POST /admin/merchants/{id}/products` to add products.\n  - Use `DELETE /admin/merchants/{id}/products/{productId}` to remove.\n\n- **Refill flow**\n  - On ACTIVE merchant detail, show **Refill stock** button.\n  - Call `POST /admin/merchants/{id}/refill`, then communicate to merchant that they must accept allocations after they receive stock (via `GET /merchants/me/allocations` + POST accept).\n\n- **Admin order tools**\n  - For orders assigned to merchants, surface **“Mark sent (admin)”** and **“Confirm delivery (admin)”** buttons, calling the two order-related admin merchant endpoints.\n  - Use them sparingly as override tools when merchant cannot act themselves.\n+\n*** End Patch】"}]} >>
