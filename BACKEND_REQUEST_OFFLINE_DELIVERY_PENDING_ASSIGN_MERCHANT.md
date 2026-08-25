# Backend Request — Allow Assign Merchant on `PENDING` Offline Delivery Orders

**Date:** 2026-08-24  
**From:** Admin FE (`mlm-admin.fe`)  
**Scope:** `POST /admin/orders/{id}/assign-merchant` must accept `PENDING` for `OFFLINE_DELIVERY` orders  
**Related:** [ADMIN_ORDERS_API.md](./ADMIN_ORDERS_API.md), [OFFLINE_DELIVERY_MERCHANT_ASSIGNMENT_BACKEND_REQUIREMENTS.md](./OFFLINE_DELIVERY_MERCHANT_ASSIGNMENT_BACKEND_REQUIREMENTS.md)  
**Priority:** High — admins cannot assign merchants on live Pending offline-delivery orders  
**Status:** Done / shipped (backend accepts `PENDING`; FE `canShowAssign` includes `PENDING`)

---

## 1. Problem

Admin order detail for **Offline Delivery** shows **Assigned Merchant: Not assigned**, but **Assign Merchant** is hidden when `status === PENDING`.

### Example (production)

| Field | Value |
|-------|--------|
| Order ID | `300e5e3a-532d-41f3-b3e3-c302676d440f` |
| Fulfilment | `OFFLINE_DELIVERY` |
| Status | `PENDING` (UI: Pending) |
| Payment method | `WALLET` |
| Assigned merchant | null / “Not assigned” |
| Placed | Aug 23, 2026 |

**Product requirement:** Admins must be able to **assign a merchant while the order is still `PENDING`.**

---

## 2. Current contract (blocks the requirement)

Today, assign is documented and enforced as:

- `fulfilmentMode === OFFLINE_DELIVERY`
- `status` is only `PAID` or `ASSIGNED_TO_MERCHANT` (reassign)
- Otherwise → **400**

Admin FE mirrors that:

```ts
// canShowAssign — current
status === 'PAID' || status === 'ASSIGNED_TO_MERCHANT'
```

So `PENDING` offline-delivery orders never get the Assign Merchant UI, and calling the API would fail anyway.

---

## 3. Required backend change

Update `POST /admin/orders/{id}/assign-merchant` so **`PENDING` is a valid status** for assignment.

### Preconditions (updated)

Backend must allow assign when:

- Order exists
- `order.fulfilmentMode === "OFFLINE_DELIVERY"`
- `order.status` is one of:
  - **`PENDING`** ← **new / required**
  - `PAID`
  - `ASSIGNED_TO_MERCHANT` (reassignment)
- Merchant exists and `merchant.status === "ACTIVE"`
- Merchant supports all products in the order
- Merchant has sufficient stock

### Expected state changes (unchanged success path)

On success:

1. Set `order.assignedMerchantId` to the requested `merchantId`
2. Transition `order.status` to `ASSIGNED_TO_MERCHANT`
3. Apply existing stock / notification side effects (same as assign from `PAID`)

### Errors

- Still return **400** for invalid mode, unsupported products, inactive merchant, insufficient stock, etc.
- Do **not** reject solely because status is `PENDING`

---

## 4. Docs to update

Please update:

- `ADMIN_ORDERS_API.md` — assign-merchant allowed statuses include `PENDING`
- `OFFLINE_DELIVERY_MERCHANT_ASSIGNMENT_BACKEND_REQUIREMENTS.md` — same precondition list

---

## 5. FE follow-up (once backend ships)

Admin FE will update `canShowAssign` to:

```ts
status === 'PENDING' || status === 'PAID' || status === 'ASSIGNED_TO_MERCHANT'
```

so Pending offline-delivery orders show the Assign Merchant picker.

---

## 6. Acceptance checklist

- [x] `POST /admin/orders/{id}/assign-merchant` succeeds for `OFFLINE_DELIVERY` + `PENDING`
- [x] Order becomes `ASSIGNED_TO_MERCHANT` with `assignedMerchantId` set
- [x] Existing `PAID` / reassign (`ASSIGNED_TO_MERCHANT`) paths still work
- [ ] Example order `300e5e3a-532d-41f3-b3e3-c302676d440f` (or equivalent Pending offline-delivery) can be assigned — verify in env after deploy
- [x] API docs updated with `PENDING` in allowed statuses
- [x] FE shows Assign Merchant for `PENDING` offline-delivery orders (`canShowAssign`)
