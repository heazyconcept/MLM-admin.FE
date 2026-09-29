# Merchant restock / refill — operations guide

**Audience:** Admin / operations team  
**Scope:** Recording physical stock handover for **existing** merchants  
**Not in scope:** Category Config (onboarding defaults for **new** merchants only)  
**Status:** Implemented — **Restock** on merchant details (Admin → Merchants → merchant)

---

## Two different flows

| Flow | When | Adjustable? |
|------|------|-------------|
| **Category Config** | New merchant approval | No — fixed per merchant type (Regional / National / Global) |
| **Restock (Refill)** | Existing ACTIVE merchant needs more stock | **Yes** — pick products and set qty per line |

Category Config values (e.g. 10–10) apply when a merchant is **first approved**. They do **not** change allocations already created for existing merchants.

Restock is how you record what was **actually** sent — e.g. Coach Speaker Oshogbo received **20–20** each instead of the config default.

---

## Restock workflow

### 1. Open merchant

**Admin → Merchants →** select the merchant (must be **ACTIVE**).

### 2. Restock

Click **Restock** (header action).

In the modal:

1. **Select** the onboarding products to restock (checkbox per product).
2. **Adjust quantity** per product — e.g. set **20** instead of config default **10**.
3. Use quick actions if helpful:
   - **Select all** — include every onboarding product.
   - **Use config quantities** — select all and reset qty to category defaults.
   - **Reset to config defaults** — restore default qty without changing selection.
4. Confirm pool stock is sufficient (amber warning if admin pool is short).
5. Click **Create restock**.

Success creates new **Stock Allocations** at your chosen quantities.

### 3. Dispatch (separate step)

Restock **records** allocations; it does **not** ship stock.

1. Scroll to **Stock Allocations** on the same merchant page.
2. Find the new **PENDING** allocation(s).
3. Click **Dispatch** — use the same qty as recorded (e.g. 20).
4. Complete **In transit** / **Delivered** as usual until the merchant receives goods.

```text
Physical delivery → Restock (record qty) → Dispatch → Merchant receipt
```

---

## Example: Coach Speaker, Oshogbo (20–20)

Config may still show **10** per product as the default hint. Operations sent **20** of each product physically.

1. **Restock** → select both onboarding products → set qty **20** each → **Create restock**.
2. **Stock Allocations** → **Dispatch** each new allocation at qty 20.
3. Merchant confirms receipt in their app when delivered.

---

## Limitations

- Restock only lists products in the merchant type’s **onboardingItems** (Category Config).
- Products **not** in onboarding use **Assign Product** + stock request (separate flow).
- Insufficient **admin pool** blocks restock for that product until pool is topped up.

---

## Category Config — leave unchanged for restock cases

Do **not** change Category Config to “fix” a one-off restock (e.g. changing 10→20 globally). That would affect **future** merchant approvals only, not past allocations.

For existing merchants, always use **Restock** with custom quantities.

---

## API reference (for support / dev)

```http
POST /admin/merchants/{merchantId}/refill
Content-Type: application/json

{
  "items": [
    { "productId": "<uuid>", "quantity": 20 }
  ]
}
```

**Response:** `{ "message": "...", "allocationIds": ["..."] }`

See [ADMIN_MERCHANTS_FRONTEND_GUIDE.md](./ADMIN_MERCHANTS_FRONTEND_GUIDE.md) §7 for full contract.
