# Admin - Orders API

Endpoints for backoffice order management: list orders with filters, get order details, and assign a merchant to an **OFFLINE_DELIVERY** order. All require **Admin** role.

**Auth:** `Authorization: Bearer <adminAccessToken>`  
**Base path:** `/admin/orders`

---

## Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/admin/orders` | GET | List orders with filters and pagination |
| `/admin/orders/{id}` | GET | Get single order details (with user, payment) |
| `/admin/orders/{id}/assign-merchant` | POST | Assign merchant to OFFLINE_DELIVERY order |

---

## GET /admin/orders

**Purpose:** List all orders with optional filters and pagination for admin dashboards and reports.

**Request**

- **Method:** `GET`
- **Path:** `/admin/orders`
- **Query (all optional):**

| Param | Type | Description |
|-------|------|-------------|
| `userId` | UUID | Filter by customer user id |
| `status` | OrderStatus | Filter by order status (e.g. `PAID`, `ASSIGNED_TO_MERCHANT`, `DELIVERED`) |
| `fulfilmentMode` | FulfilmentMode | Filter by fulfilment mode (e.g. `PICKUP`, `OFFLINE_DELIVERY`) |
| `selectedMerchantId` | UUID | Filter by selected merchant id (e.g. for PICKUP) |
| `customerType` | string | `MEMBER` \| `NON_MEMBER` |
| `merchantRoute` | string | `CLOSEST` \| `OTHER` |
| `productId` | UUID | Orders that contain this product |
| `fromDate` | ISO date string | Orders created on or after this date |
| `toDate` | ISO date string | Orders created on or before this date |
| `limit` | number | Page size (default 20) |
| `offset` | number | Offset for pagination (default 0) |

**Response (200)**

```json
{
  "orders": [
    {
      "id": "order-uuid",
      "status": "PAID",
      "totalAmount": 99.99,
      "baseAmount": 89.99,
      "currency": "USD",
      "paymentMethod": "REGISTRATION_WALLET",
      "fulfilmentMode": "OFFLINE_DELIVERY",
      "customerType": "MEMBER",
      "merchantRoute": null,
      "selectedMerchantId": null,
      "deliveryAddress": "123 Main St, Lagos",
      "deliveryDisclaimerAccepted": true,
      "sentAt": null,
      "sentBy": null,
      "receivedAt": null,
      "items": [
        {
          "id": "order-item-uuid",
          "productId": "product-uuid",
          "productName": "Segulah Herbal Tea",
          "quantity": 2,
          "unitPrice": 29.99,
          "pv": 10,
          "cpv": 5,
          "lineTotal": 59.98
        }
      ],
      "createdAt": "2026-03-04T10:00:00.000Z",
      "user": {
        "id": "user-uuid",
        "email": "customer@example.com",
        "referralCode": "ABC123"
      }
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

**Order statuses (examples):** `PENDING`, `CREATED`, `PAID`, `ASSIGNED_TO_MERCHANT`, `READY_FOR_PICKUP`, `OFFLINE_DELIVERY_REQUESTED`, `FULFILLED`, `DELIVERED`.  
**FulfilmentMode:** `PICKUP`, `OFFLINE_DELIVERY`, etc.

**Frontend:** Use for order list table; filter by status/fulfilment/date; link each row to order detail.

---

## GET /admin/orders/{id}

**Purpose:** Get full details of a single order, including user and payment, for admin view.

**Request**

- **Method:** `GET`
- **Path:** `/admin/orders/{id}` — `id` = order UUID
- **Body:** none

**Response (200)**

Same order shape as in the list (from `mapOrderToResponse`), plus:

- **`user`** — Full user object (id, email, etc. as returned by Prisma).
- **`payment`** — Payment record linked to the order (if any).

Example:

```json
{
  "id": "order-uuid",
  "status": "PAID",
  "totalAmount": 99.99,
  "baseAmount": 89.99,
  "currency": "USD",
  "paymentMethod": "REGISTRATION_WALLET",
  "fulfilmentMode": "OFFLINE_DELIVERY",
  "customerType": "MEMBER",
  "guestFullName": null,
  "guestEmail": null,
  "guestPhone": null,
  "guestCity": null,
  "guestCountry": null,
  "merchantRoute": null,
  "selectedMerchantId": null,
  "deliveryAddress": "123 Main St, Lagos",
  "deliveryDisclaimerAccepted": true,
  "sentAt": null,
  "sentBy": null,
  "receivedAt": null,
  "items": [
    {
      "id": "order-item-uuid",
      "productId": "product-uuid",
      "productName": "Segulah Herbal Tea",
      "quantity": 2,
      "unitPrice": 29.99,
      "pv": 10,
      "cpv": 5,
      "lineTotal": 59.98
    }
  ],
  "createdAt": "2026-03-04T10:00:00.000Z",
  "user": { "id": "user-uuid", "email": "customer@example.com", ... },
  "payment": { "id": "payment-uuid", "status": "COMPLETED", ... }
}
```

**Errors:** 404 if order not found.

**Frontend:** Order detail page; show items, customer (user), payment, and for OFFLINE_DELIVERY show “Assign merchant” when status is PENDING, PAID, or ASSIGNED_TO_MERCHANT.

---

## POST /admin/orders/{id}/assign-merchant

**Purpose:** Assign a merchant to an **OFFLINE_DELIVERY** order. Order must be in status `PENDING`, `PAID`, or `ASSIGNED_TO_MERCHANT` (for reassignment). The merchant must be ACTIVE and must support all products in the order. Sets `assignedMerchantId` and order status to `ASSIGNED_TO_MERCHANT`.

**Request**

- **Method:** `POST`
- **Path:** `/admin/orders/{id}/assign-merchant` — `id` = order UUID
- **Headers:** `Content-Type: application/json`
- **Body:**

```json
{
  "merchantId": "merchant-uuid"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `merchantId` | UUID | Yes | Merchant to assign (must be ACTIVE and have all order products assigned) |

**Response (200)**

```json
{
  "message": "Merchant assigned to order successfully"
}
```

**Errors**

- **404** — Order not found.
- **400** — Order status is not `PENDING`, `PAID`, or `ASSIGNED_TO_MERCHANT`; or order is not `OFFLINE_DELIVERY`; or order has no items; or merchant does not support one or more products in the order; or merchant not ACTIVE.

**Frontend:** On order detail for OFFLINE_DELIVERY orders in PENDING/PAID/ASSIGNED_TO_MERCHANT, show a control to pick a merchant (e.g. from `GET /admin/merchants` or a dedicated picker) and POST `{ "merchantId": "..." }`. Then refresh order to show assigned merchant and status.

---

## Guidelines for frontend

1. **List:** Use `GET /admin/orders` with query params for status, fulfilmentMode, date range, userId, productId, etc. Paginate with `limit` and `offset`; use `total` for total count.
2. **Detail:** Use `GET /admin/orders/{id}` for the full order, user, and payment. Use `status` and `fulfilmentMode` to decide which actions to show.
3. **Assign merchant:** Only for `fulfilmentMode === OFFLINE_DELIVERY` and status `PENDING`, `PAID`, or `ASSIGNED_TO_MERCHANT`. Send `POST /admin/orders/{id}/assign-merchant` with `{ "merchantId": "uuid" }`. Ensure the chosen merchant is ACTIVE and has the order’s products assigned (e.g. from `GET /admin/merchants/{id}/products`).
