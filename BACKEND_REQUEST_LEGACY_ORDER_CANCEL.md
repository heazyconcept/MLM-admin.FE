# Backend Request — Cancel Legacy Orders

**Date:** 2026-10-01  
**From:** Admin app (`mlm-admin.fe`)  
**To:** HerbApi / orders + Legacy Club wallets  
**Status:** Open — admin cancel fails on Legacy orders in production  
**Priority:** High  
**Area:** `POST /admin/orders/:id/cancel`  
**Reported:** 1 Oct 2026 — admin tried to cancel a client’s mistaken Legacy marketplace order  
**Admin screen:** Order details → **Cancel order**

---

## 1. What admin needs

Cancel already works for **network** orders. The same action must work for **Legacy** orders (`channel: LEGACY`, paid with `LEGACY_VOUCHER`).

When an admin cancels a Legacy order, the backend must:

1. Set the order to `CANCELLED` and store the reason.
2. Restore any reserved stock (same as network cancel).
3. **Refund the wallet payment back to Legacy product voucher** (`LEGACY_VOUCHER`), not to the network Product Voucher.
4. Unwind earnings that this order created (PV and any commission), the same way a network wallet order is unwound.
5. Leave a ledger credit on Legacy product voucher so the member can see the refund.

Members still cannot cancel their own order. This stays an admin action.

---

## 2. What happens today

Admin calls the existing endpoint. The body is unchanged:

```http
POST /admin/orders/{orderId}/cancel
Content-Type: application/json
```

```json
{
  "reason": "Customer requested cancellation / stock correction / duplicate order"
}
```

For a Legacy order paid with Legacy product voucher, the call fails and the order stays open:

```text
Credits to Legacy voucher wallet are not allowed from source: REVERSAL
```

The admin UI shows that message as **Cancel Failed**. Stock is not restored and the member is not refunded.

Network cancel is already allowed to credit the network Product Voucher from `LedgerSource.REVERSAL`. Legacy voucher rejects that same source.

---

## 3. Required backend change

Allow `LedgerSource.REVERSAL` to credit `LEGACY_VOUCHER` when the credit is the refund from `POST /admin/orders/:id/cancel`.

| Rule | Detail |
|------|--------|
| Refund destination | The wallet that paid the order. Legacy checkout pays with `LEGACY_VOUCHER`, so the refund credits `LEGACY_VOUCHER`. |
| Do not | Credit network `VOUCHER`, `CASH`, or `LEGACY_CASHOUT` for a Legacy voucher payment. |
| Amount | The amount that was debited from Legacy product voucher for this order. One cancel → one refund. |
| Idempotent | Cancelling an order that is already `CANCELLED` must not refund again. |
| Stock | Restore reserved stock, same as network cancel. |
| Earnings | Reverse PV and any commission this order created, same rules as network cancel. If a join/upgrade Instant was credited to `LEGACY_CASHOUT` because of this order, reverse that Instant on `LEGACY_CASHOUT` as well (debit / reversal), not by blocking the cancel. |
| Ledger | Credit row the member can see on Legacy product voucher: `type: "Credit"`, description `Order cancellation refund`. |
| Cashout ledger | If Instant or another Legacy cashout credit is reversed, append a **Debit** on `GET /legacy/cashout` → `items[]` with a clear description such as `Order cancellation reversal`. |
| Reason | Persist the admin `reason` on the order (`cancelReason`), same as network. |
| Not a commission | The voucher refund is the member’s money returned. Do not pay a new commission, PV, Successline bonus, or voucher fee on the refund. |

No new admin endpoint and no change to the request body. The member app does not call this route.

---

## 4. Errors that must stop

| Case | Expected |
|------|----------|
| Legacy order, paid with `LEGACY_VOUCHER`, admin sends a reason of at least 5 characters | **200.** Order `CANCELLED`, stock restored, Legacy voucher balance increased by the refund. |
| Same order cancelled twice | Second call does not credit the voucher again. |
| Order was not paid by wallet | Cancel and stock restore still succeed. No wallet credit. |
| `REVERSAL` into `LEGACY_VOUCHER` from this cancel | **Allowed.** Do not return `Credits to Legacy voucher wallet are not allowed from source: REVERSAL`. |

---

## 5. Acceptance checks

- [ ] Admin can cancel a Legacy marketplace order that was paid with `LEGACY_VOUCHER`.
- [ ] The error `Credits to Legacy voucher wallet are not allowed from source: REVERSAL` no longer occurs on that cancel.
- [ ] Legacy product voucher balance increases by the refunded amount. Network Product Voucher balance does not change.
- [ ] Reserved stock is restored.
- [ ] PV and commissions created by that order are unwound, including any Instant that was credited to `LEGACY_CASHOUT`.
- [ ] A second cancel does not refund again.
- [ ] Network order cancel still refunds network Product Voucher and is unchanged.
