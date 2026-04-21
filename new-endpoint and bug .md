# Home Delivery Order — Required Backend Endpoints

> **Context**: The admin panel needs to approve and manage home delivery (`OFFLINE_DELIVERY`) orders
> **without** assigning them to a merchant first. The current API only supports merchant-scoped
> delivery actions. These new endpoints allow the admin to handle the full delivery lifecycle directly.

---

## 1. Approve Order (New)

### `POST /admin/orders/:id/approve`

Approves a home delivery order directly without assigning a merchant.

**When to use**: Admin reviews a `PAID` + `OFFLINE_DELIVERY` order and decides to handle delivery
without involving a merchant (e.g., company handles delivery internally).

#### Request

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| _(none)_ | — | — | No request body needed |

#### Path Parameters

| Param | Type | Description |
|-------|------|-------------|
| `id` | `string (UUID)` | The order ID |

#### Preconditions

- Order must exist
- Order `status` must be `PAID`
- Order `fulfilmentMode` must be `OFFLINE_DELIVERY`
- Caller must be an admin with `UpdateOrderStatus` permission

#### Expected Behavior

1. Validate preconditions
2. Transition order status from `PAID` → `APPROVED`
3. Optionally trigger a notification to the customer (e.g., "Your order has been approved and is being prepared for delivery")
4. Return success response

#### Response — `200 OK`

```json
{
  "message": "Order approved successfully"
}
```

#### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| `400` | `INVALID_ORDER_STATUS` | Order is not in `PAID` status |
| `400` | `INVALID_FULFILMENT_MODE` | Order is not `OFFLINE_DELIVERY` |
| `404` | `ORDER_NOT_FOUND` | Order does not exist |
| `403` | `FORBIDDEN` | Admin does not have permission |

#### New Order Status: `APPROVED`

This is a **new status** that must be added to the `OrderStatus` enum:

```
PENDING → CREATED → PAID → APPROVED → (delivery tracking) → DELIVERED
                         ↘ ASSIGNED_TO_MERCHANT → ... (existing flow)
```

---

## 2. Admin Mark Order Sent (New)

### `POST /admin/orders/:id/mark-sent`

Marks an order as sent/shipped — admin-level endpoint that does **not** require a merchant ID.

**When to use**: After an admin-approved home delivery order is dispatched.

> **Note**: This is the admin-level equivalent of the existing
> `POST /admin/merchants/:merchantId/orders/:orderId/mark-sent`

#### Request

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| _(none)_ | — | — | No request body needed |

#### Path Parameters

| Param | Type | Description |
|-------|------|-------------|
| `id` | `string (UUID)` | The order ID |

#### Preconditions

- Order must exist
- Order `status` must be `APPROVED` (or `ASSIGNED_TO_MERCHANT` if also supporting merchant-assigned orders)
- Order must NOT already have `sentAt` set
- Caller must be an admin with `UpdateOrderStatus` permission

#### Expected Behavior

1. Set `sentAt` to current timestamp
2. Set `sentBy` to the admin's user ID or email
3. Optionally notify the customer that their order has been dispatched
4. Return success response

#### Response — `200 OK`

```json
{
  "message": "Order marked as sent"
}
```

#### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| `400` | `ALREADY_SENT` | Order already has `sentAt` |
| `400` | `INVALID_ORDER_STATUS` | Order is not in a valid status |
| `404` | `ORDER_NOT_FOUND` | Order does not exist |
| `403` | `FORBIDDEN` | Admin does not have permission |

---

## 3. Admin Confirm Delivery (New)

### `POST /admin/orders/:id/confirm-delivery`

Confirms that a home delivery order has been received by the customer — admin-level endpoint.

**When to use**: After the customer confirms receipt, or admin verifies delivery.

> **Note**: This is the admin-level equivalent of the existing
> `POST /admin/merchants/:merchantId/orders/:orderId/confirm-delivery`

#### Request

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `proof` | `string` | No | Proof of delivery (tracking ID, photo URL, etc.) |
| `notes` | `string` | No | Additional delivery notes |

#### Path Parameters

| Param | Type | Description |
|-------|------|-------------|
| `id` | `string (UUID)` | The order ID |

#### Preconditions

- Order must exist
- Order must have `sentAt` set (i.e., it was already marked as sent)
- Order must NOT already have `receivedAt` set
- Caller must be an admin with `UpdateOrderStatus` permission

#### Expected Behavior

1. Set `receivedAt` to current timestamp
2. Store `proof` and `notes` if provided
3. Transition order status to `DELIVERED`
4. Trigger PV/CPV credit processing (same as existing delivery confirmation)
5. Optionally notify the customer
6. Return success response

#### Response — `200 OK`

```json
{
  "message": "Delivery confirmed successfully"
}
```

#### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| `400` | `NOT_SENT` | Order has not been marked as sent yet |
| `400` | `ALREADY_DELIVERED` | Order already has `receivedAt` |
| `404` | `ORDER_NOT_FOUND` | Order does not exist |
| `403` | `FORBIDDEN` | Admin does not have permission |

---

## Status Flow Diagram

```
┌─────────┐     ┌─────────┐     ┌──────┐
│ PENDING │────▶│ CREATED │────▶│ PAID │
└─────────┘     └─────────┘     └──┬───┘
                                   │
                    ┌──────────────┤
                    │              │
                    ▼              ▼
           ┌────────────┐   ┌───────────────────────┐
           │  APPROVED  │   │ ASSIGNED_TO_MERCHANT  │
           │ (admin-    │   │ (merchant flow)       │
           │  direct)   │   └───────────┬───────────┘
           └─────┬──────┘               │
                 │                      ▼
                 │              ┌────────────────┐
                 │              │READY_FOR_PICKUP│
                 │              └───────┬────────┘
                 │                      │
                 ▼                      ▼
           ┌──────────┐         ┌───────────┐
           │ sentAt   │         │ FULFILLED │
           │ set      │         └─────┬─────┘
           └────┬─────┘               │
                │                     │
                ▼                     ▼
           ┌───────────┐       ┌───────────┐
           │ DELIVERED │       │ DELIVERED │
           └───────────┘       └───────────┘
```

### Key Differences from Existing Flow

| Aspect | Existing (Merchant) Flow | New (Admin Direct) Flow |
|--------|--------------------------|------------------------|
| After PAID | Assign merchant → `ASSIGNED_TO_MERCHANT` | Approve → `APPROVED` |
| Mark Sent | Via `/admin/merchants/:mid/orders/:oid/mark-sent` | Via `/admin/orders/:id/mark-sent` |
| Confirm Delivery | Via `/admin/merchants/:mid/orders/:oid/confirm-delivery` | Via `/admin/orders/:id/confirm-delivery` |
| Merchant required? | Yes | No |
| PV/CPV processing | On delivery confirmation | On delivery confirmation (same) |

---

## Database Changes

### OrderStatus Enum

Add `APPROVED` to the order status enum:

```sql
ALTER TYPE order_status ADD VALUE 'APPROVED' AFTER 'PAID';
```

### No New Tables Required

The existing `orders` table already has `sentAt`, `sentBy`, and `receivedAt` columns which will be reused for the admin-direct flow.

---

## Order Details Example

### `GET /admin/orders/:id`

Current response structure (returning incorrect currency scaling):

```json
{
    "id": "bead5563-3b4a-4291-a39a-eeaf81b30c1e",
    "status": "PAID",
    "totalAmount": 3000,
    "baseAmount": 3,
    "currency": "NGN",
    "paymentMethod": "WALLET",
    "fulfilmentMode": "OFFLINE_DELIVERY",
    "customerType": "MEMBER",
    "deliveryAddress": "12 Marina Street, Lagos Island, Lagos",
    "deliveryDisclaimerAccepted": true,
    "receivedAt": "2026-04-21T15:24:02.430Z",
    "items": [
        {
            "id": "e7e55ed5-2efc-4a99-b907-345991ec6eef",
            "productId": "8bab6844-7c51-4c6e-ac05-8f9eed97baf7",
            "productName": "Herbal Supplements",
            "quantity": 1,
            "unitPrice": 3,
            "pv": 10,
            "cpv": 20,
            "lineTotal": 3
        }
    ],
    "createdAt": "2026-04-21T15:23:19.504Z",
    "user": {
        "id": "0b4637fb-12eb-4980-b5e5-4c67381eaa9c",
        "email": "heazyconcept@gmail.com",
        "phone": null,
        "role": "USER",
        "referralCode": "YA6FRMC4",
        "referredById": "eff41032-7849-4bf5-ad34-eee78b748ec3",
        "registrationPackage": "SILVER",
        "registrationCurrency": "NGN",
        "isActive": true,
        "isRegistrationPaid": true,
        "username": "heazy",
        "createdAt": "2026-04-21T15:03:40.186Z",
        "updatedAt": "2026-04-21T15:04:02.323Z"
    },
    "payment": null
}
```

---

## Known Bugs / Issues to Fix

### 1. Currency Unit / Amount Values

**Issue**: As seen in the example above, `totalAmount` is 3000 (likely correct NGN value) but `unitPrice` and `lineTotal` are 3. This indicates a scaling inconsistency where some fields are in "major" units and others are in "minor" units or just incorrect.

**Resolution needed**: Ensure all currency fields (`totalAmount`, `baseAmount`, `unitPrice`, `lineTotal`) return consistent, properly scaled values for the given currency (NGN). Standardize whether values are returned in minor units (kobo) or decimal major units.
