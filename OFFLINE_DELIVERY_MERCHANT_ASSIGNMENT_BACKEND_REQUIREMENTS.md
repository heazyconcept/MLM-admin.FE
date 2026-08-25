# Offline delivery -> merchant assignment (backend requirements)

## Purpose
When a user creates and pays for an `OFFLINE_DELIVERY` order, the admin must be able to assign that order to an active merchant. After assignment:

1. The merchant must receive a notification (`ORDER_ASSIGNED_TO_MERCHANT`).
2. The merchant must be able to complete the delivery lifecycle using merchant endpoints.
3. The order fields shown in admin UI (`assignedMerchantId`, `sentAt`, `receivedAt`, `completedAt`) must be updated at the right steps.

This document is meant to be consumed by the backend team. The admin frontend currently assumes these behaviors.

## Terminology
- `order.status` values are the `OrderStatus` enum from `API.md`.
- `NotificationType` and `NotificationChannel` are the enums from `API.md`.

## Contract A: Admin assigns merchant
### Endpoint
`POST /admin/orders/{id}/assign-merchant`

### Request
```json
{
  "merchantId": "UUID"
}
```

### Preconditions
Backend must validate:
- Order exists.
- `order.fulfilmentMode === "OFFLINE_DELIVERY"`.
- `order.status` is one of:
  - `PENDING`
  - `PAID`
  - `ASSIGNED_TO_MERCHANT` (reassignment scenario)
- Merchant exists and `merchant.status === "ACTIVE"`.
- Merchant can fulfill all order items (supports all `productId`s present in the order).
- Merchant has sufficient stock/inventory for the order items.

If any precondition fails, return:
- `400` for invalid status/mode/product-support/insufficient stock
- `404` for unknown order/merchant
- `403` for unauthorized access (non-admin)

### Expected state changes
On success the backend must:
- Set `order.assignedMerchantId` to `{ merchantId }`.
- Transition `order.status` to `ASSIGNED_TO_MERCHANT`.

### Stock / ledger side effects
Backend must decrement merchant inventory for all order items.

Additionally, record a stock movement entry using the movement type:
- `ORDER_MERCHANT_ASSIGN`  
(as referenced by `frontend-integration-admin-product-stock.md`)

### Reassignment behavior (important)
The admin endpoint allows reassignment when `order.status === ASSIGNED_TO_MERCHANT`.
Please define (and implement) one of the following behaviors:
1. **Idempotent reassignment (recommended):**
   - If `order.assignedMerchantId` already equals the requested `merchantId`, do nothing (no double stock decrement).
   - If reassignment changes the merchant:
     - Restore stock to the previous merchant (if stock was previously decremented), then decrement the new merchant.
2. **Single-assignment only:**
   - Allow reassignment in response, but do **not** change stock if already assigned (may require additional UI/UX).
   - Or reject reassignment with a clear error.

The frontend currently expects reassignment to be safe; backend must prevent double-decrement.

### Notification requirements
Backend must create a notification for the *merchant user* (the user that owns the assigned merchant), with:
- `NotificationType = ORDER_ASSIGNED_TO_MERCHANT`
- Notification should target the merchant userId (not the admin).
- Include `orderId` and enough metadata for UI routing/drilldown (at minimum `orderId`).

Channels:
- Use the system notification channels/preferences from the existing notification subsystem (`NotificationChannel` in `API.md`).
- At minimum, create an `IN_APP` notification for the merchant user so they can discover the assigned order in the in-app notifications list.

## Notification read expectations (frontend-visible behavior)
The admin frontend does not render merchant notifications directly, but the merchant user must be able to find them.
Backend must ensure:
- Merchant notification for `ORDER_ASSIGNED_TO_MERCHANT` is stored against the merchant userId.
- The merchant can retrieve it using the standard authenticated notifications list:
  - `GET /notifications` (with `type=ORDER_ASSIGNED_TO_MERCHANT` and/or unread filtering, depending on UI)
- If the system supports push/email/SMS, delivery should be triggered according to each user’s notification preferences for that channel.

## Contract B: Merchant lifecycle for offline delivery
### Endpoint 1
`POST /merchants/orders/{id}/mark-delivery-requested`

#### Preconditions
- Merchant is the owner of the order (`order.assignedMerchantId` matches the authenticated merchant).
- Order is in a valid state to be marked as dispatched for offline delivery (likely `ASSIGNED_TO_MERCHANT`; may also allow `PAID` depending on backend implementation).
- Should not be already marked as sent (`sentAt` should be null/empty).

#### Expected state changes
- Set `order.status = OFFLINE_DELIVERY_REQUESTED`
- Set:
  - `order.sentAt` to current timestamp
  - `order.sentBy` to merchant actor (if the field exists/expected)

#### Notification requirements
- Create notification for the *order customer user* with:
  - `NotificationType = ORDER_DELIVERY_REQUESTED`
- Include `orderId` metadata.

### Endpoint 2
`POST /merchants/orders/{id}/confirm-delivery`

#### Preconditions
- Merchant is the owner of the order.
- Order is in a valid state for confirmation (likely `OFFLINE_DELIVERY_REQUESTED`).
- Should not already have `receivedAt`.

#### Expected state changes
- Set `order.receivedAt` to current timestamp.
- Transition `order.status` to a delivery-complete value consistent with the existing system:
  - Admin confirm-delivery spec updates `order.status` to `DELIVERED` (see `ADMIN_MERCHANTS_API.md`).
- Ensure `completedAt` is set if the system uses it for final completion display (admin UI shows `completedAt` when present).

#### Side effects
- Credit merchant delivery bonus (same mechanism as existing confirm-delivery behavior).
- Ensure the customer gets whatever PV/CPV credit processing the system already performs on delivery confirmation.

#### Notification requirements
- Notify the *order customer* that the order is completed.
  - Expected `NotificationType`: `ORDER_COMPLETED` (see `API.md`).
- Include `orderId` metadata.

## Contract C: Admin UI field mapping (frontend expectations)
The admin order details UI uses these fields:
- `assignedMerchantId` (display “Assigned Merchant” for `OFFLINE_DELIVERY`)
- `sentAt` / `receivedAt` / `completedAt` (timeline fields for offline delivery)

Therefore backend must set:
- `sentAt` when delivery is marked requested (`mark-delivery-requested`)
- `receivedAt` when delivery is confirmed (`confirm-delivery`)
- `completedAt` if used by the system after credits are processed

## Confirmed bug (observed 2026-08-20)
`POST /admin/orders/:id/assign-merchant` returns success and order `status` becomes `ASSIGNED_TO_MERCHANT`, but **`GET /admin/orders/:id` does not include `assignedMerchantId`**.

Example observed response shape after assignment:
- `status: "ASSIGNED_TO_MERCHANT"`
- no `assignedMerchantId` (and no alternate merchant id field)

### Required fix
`GET /admin/orders` and `GET /admin/orders/:id` **must always return**:
```json
"assignedMerchantId": "merchant-uuid-or-null"
```
when a merchant has been assigned. Without this field, admin UI cannot show the merchant name and cannot correctly drive merchant-scoped delivery override actions.

## Reference links (spec sources)
- `[ADMIN_ORDERS_API.md](ADMIN_ORDERS_API.md)` - `POST /admin/orders/{id}/assign-merchant`
- `[API.md](API.md)` - `NotificationType`, `NotificationChannel`, and order/merchant endpoints list
- `[frontend-integration-admin-product-stock.md](frontend-integration-admin-product-stock.md)` - stock movement type `ORDER_MERCHANT_ASSIGN`
- `[ADMIN_MERCHANTS_API.md](ADMIN_MERCHANTS_API.md)` - admin confirm delivery preconditions/status updates

