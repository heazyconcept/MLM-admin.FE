# Backend Request — Selective Merchant Refill

**Date:** 2026-09-02  
**From:** Admin FE (`mlm-admin.fe`)  
**Scope:** Extend `POST /admin/merchants/{id}/refill` so admins can refill **selected** onboarding products (with quantities), not the full category-config set  
**Related:** [ADMIN_MERCHANTS_FRONTEND_GUIDE.md](./ADMIN_MERCHANTS_FRONTEND_GUIDE.md) §7, [MERCHANT_INTEGRATION_AND_TESTING.md](./MERCHANT_INTEGRATION_AND_TESTING.md)  
**Priority:** High — management must refill specific products without creating allocations for every onboarding item  
**Status:** Waiting on backend

---

## 1. Problem

Today refill is all-or-nothing:

- Admin clicks **Refill** on an ACTIVE merchant.
- FE calls `POST /admin/merchants/{id}/refill` with an **empty body**.
- Backend creates a new `MerchantAllocation` for **every** entry in that merchant type’s category-config `onboardingItems`.

Management needs to choose **which products** to refill (and how many), instead of always refilling the full onboarding set.

---

## 2. Current contract

| Item | Today |
|------|--------|
| Endpoint | `POST /admin/merchants/{id}/refill` |
| Body | none / `{}` |
| Behavior | Create allocations for all `onboardingItems` for the merchant’s type |
| Response | `{ message, allocationIds }` |

---

## 3. Required backend change

### Endpoint (extend existing)

```http
POST /admin/merchants/{id}/refill
Content-Type: application/json
```

### Request body (required)

```json
{
  "items": [
    { "productId": "uuid", "quantity": 10 },
    { "productId": "uuid-2", "quantity": 5 }
  ]
}
```

| Field | Type | Required | Rules |
|-------|------|----------|--------|
| `items` | array | Yes | Non-empty |
| `items[].productId` | UUID | Yes | Must exist in the merchant type’s category-config `onboardingItems` |
| `items[].quantity` | integer | Yes | ≥ 1 (FE always sends quantity; do not fall back to config if omitted) |

### Preconditions

- Merchant exists and `status === ACTIVE` (else 400/404 as today).
- `items` is present and non-empty (else **400**).
- Each `productId` is in that merchant type’s `onboardingItems` (else **400** — reject unknown products).
- Admin pool has sufficient stock for each selected item’s quantity (else **400** with a clear message).

### Expected behavior

1. Create **one** `MerchantAllocation` per requested item (quantity as provided).
2. Do **not** create allocations for onboarding products that were not selected.
3. Same post-create lifecycle as today (merchant accepts after physical receipt; same notifications / stock movements as existing refill).
4. Response shape unchanged:

```json
{
  "message": "Refill allocations created. Merchant must accept each after receiving stock.",
  "allocationIds": ["alloc-uuid-1", "alloc-uuid-2"]
}
```

### Breaking note

Empty body / missing `items` must **not** silently refill all products. Require explicit `items`. Admin FE will always send a non-empty selection.

---

## 4. Errors

| Case | Status |
|------|--------|
| Merchant not found | 404 |
| Merchant not ACTIVE | 400 |
| Missing / empty `items` | 400 |
| `productId` not in type’s `onboardingItems` | 400 |
| `quantity` missing or &lt; 1 | 400 |
| Insufficient admin pool for any item | 400 |

---

## 5. FE follow-up (in progress / after backend)

Admin merchant detail **Refill** UI will:

1. List category-config `onboardingItems` for the merchant type.
2. Let admin select products and edit quantity (defaults from config).
3. Call `POST /admin/merchants/{id}/refill` with `{ items: [...] }`.
4. Run pool shortage checks only against **selected** items.

---

## 6. Acceptance checklist

- [ ] `POST /admin/merchants/{id}/refill` with `{ items }` creates allocations **only** for those products
- [ ] Quantities match request body
- [ ] Product not in `onboardingItems` → 400
- [ ] Empty / missing `items` → 400 (no “refill all” fallback)
- [ ] Insufficient pool → 400 with clear message
- [ ] Response still returns `message` + `allocationIds`
- [ ] Docs updated (`ADMIN_MERCHANTS_FRONTEND_GUIDE.md` §7)
