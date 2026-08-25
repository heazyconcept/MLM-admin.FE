# Offline delivery assignment - backend integration test plan

## Scope
Test the end-to-end flow:
1. User creates + pays an `OFFLINE_DELIVERY` order.
2. Admin assigns the order to an `ACTIVE` merchant.
3. Merchant receives notification and completes delivery via merchant endpoints.
4. Notifications, stock/ledger side effects, and order status fields are correct.

## Prerequisites / test data
- At least:
  - 1 admin user with `ADMIN` role
  - 1 paid customer user (registration paid) who can create and pay orders
  - 1 `ACTIVE` merchant whose allocated/inventory stock is sufficient for at least one order product
- At least one `ACTIVE` product with price and onboarding/config so the merchant has stock/inventory for assignment.
- Ensure `notifications` subsystem is enabled (so `GET /notifications` returns in-app items).

## Test group A: Admin assignment (`POST /admin/orders/:id/assign-merchant`)

### A1. Happy path assignment (PAID -> ASSIGNED_TO_MERCHANT)
**Given**
- An order with:
  - `fulfilmentMode = OFFLINE_DELIVERY`
  - `status = PAID`
  - `assignedMerchantId = null`
- A merchant:
  - `status = ACTIVE`
  - supports all order item `productId`s
  - has sufficient merchant inventory/stock for quantities in the order

**When**
- Admin calls `POST /admin/orders/:orderId/assign-merchant` with `{ "merchantId": "<active-merchant-id>" }`

**Then**
- Response `200`
- Order updates:
  - `assignedMerchantId` set to the merchant id
  - `status = ASSIGNED_TO_MERCHANT`
- Stock / ledger:
  - Merchant inventory decreased by ordered quantities
  - A stock movement entry exists for `ORDER_MERCHANT_ASSIGN` referencing the order (and the merchant).
- Notifications:
  - A notification exists for the *merchant userId* with:
    - `type = ORDER_ASSIGNED_TO_MERCHANT`
    - metadata includes `orderId`
  - Merchant can discover it via `GET /notifications` (at least in-app).

### A1b. Happy path assignment (PENDING -> ASSIGNED_TO_MERCHANT)
**Given**
- An order with:
  - `fulfilmentMode = OFFLINE_DELIVERY`
  - `status = PENDING`
  - `assignedMerchantId = null`
- Same ACTIVE merchant preconditions as A1

**When**
- Admin calls `POST /admin/orders/:orderId/assign-merchant` with `{ "merchantId": "<active-merchant-id>" }`

**Then**
- Same success outcomes as A1 (`200`, `assignedMerchantId` set, `status = ASSIGNED_TO_MERCHANT`, stock movement, merchant notification)

### A2. Merchant not active
**Then**
- Response `400`
- Order status and `assignedMerchantId` unchanged
- No stock movement recorded
- No notification created

### A3. Merchant does not support one or more products
**Then**
- Response `400`
- No stock movement / no notification / no order state change

### A4. Insufficient merchant stock
**Then**
- Response `400`
- No partial stock decrement
- No order state update
- No notification created

### A5. Invalid order status
Try each invalid status:
- `status` is not one of `PENDING`, `PAID`, or `ASSIGNED_TO_MERCHANT`

**Then**
- Response `400`
- No stock movement / no notification / no order state change
### A6. Reassignment idempotency (same merchant)
**Given**
- Order already `assignedMerchantId = merchantId`

**When**
- Admin calls assign-merchant again with the same `merchantId`

**Then**
- Response `200`
- No double-decrement of merchant stock
- `status` remains `ASSIGNED_TO_MERCHANT` (or idempotently set)
- No duplicate notification (or duplicates are safely idempotent; backend should define the expected behavior)

### A7. Reassignment to different merchant (define expected behavior)
Decide one of the following and test it explicitly:
1. Backend restores previous merchant stock then decrements new merchant stock
2. Backend rejects reassignment after the first assignment

**Then**
- Confirm the chosen behavior and ensure stock/notifications are consistent with it.

## Test group B: Merchant delivery lifecycle

### B1. Mark delivery requested
**Given**
- Order belongs to merchant
- Order `status = ASSIGNED_TO_MERCHANT` (or whatever the backend allows)
- `sentAt` is null/empty

**When**
- Merchant calls `POST /merchants/orders/:id/mark-delivery-requested`

**Then**
- Order updates:
  - `status = OFFLINE_DELIVERY_REQUESTED`
  - `sentAt` set
  - `sentBy` set if the field exists/expected
- Notification:
  - Customer gets `ORDER_DELIVERY_REQUESTED` notification with `orderId`
- No duplicate sentAt (calling again should be idempotent or return a clear error per backend definition)

### B2. Confirm delivery
**Given**
- Order `status = OFFLINE_DELIVERY_REQUESTED`
- `receivedAt` is null/empty

**When**
- Merchant calls `POST /merchants/orders/:id/confirm-delivery` (optionally include `proof`/`notes`)

**Then**
- Order updates:
  - `status = DELIVERED`
  - `receivedAt` set
  - `completedAt` set if system requires it for the UI timeline
- Side effects:
  - Merchant delivery bonus credited
  - PV/CPV processing performed (customer-side crediting as per existing confirmation flow)
- Notifications:
  - Customer gets the expected completion notification type (expected `ORDER_COMPLETED`) with `orderId`
- No double crediting if the endpoint is called twice (idempotency or proper error)

### B3. Confirm delivery invalid status
Try:
- `status != OFFLINE_DELIVERY_REQUESTED`

**Then**
- `400`
- No crediting / no duplicate notifications

## Test group C: Notifications retrieval
### C1. Merchant reads the assignment notification
**Then**
- Merchant calls `GET /notifications` and can filter by:
  - unread
  - `type=ORDER_ASSIGNED_TO_MERCHANT`
- Notification appears and is marked unread until `PUT /notifications/read-all` or `PUT /notifications/:id/read`

### C2. Customer reads delivery request / completion notifications
**Then**
- Customer sees:
  - `ORDER_DELIVERY_REQUESTED`
  - `ORDER_COMPLETED`
in the same notifications list API.

## Observability / audit (optional but recommended)
- Validate an audit log entry exists for admin assignment and delivery steps (if the backend emits audit rows for these actions).

