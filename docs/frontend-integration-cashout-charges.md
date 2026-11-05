# Frontend Integration: Cashout charge and voucher gate

Date: 2026-10-25

Member app implements policy, charge preview, and voucher gate on all cashout flows. Admin withdrawal queue shows wallet amount, fee, and bank amount.

See the full contract (API fields and examples) in the member repo copy:

`MLM-User.FE/mlm-user.fe/docs/frontend-integration-cashout-charges.md`

## Admin UI

- **Withdrawal list / detail:** `amount` (wallet), `feeAmount` (omit when null), `netAmount` or `amount` as bank payout.
- **Mark paid:** Transfer net/bank amount; helper text on the modal.
- **Profit reports:** Display `CASHOUT_FEE` category when returned by `GET admin/reports/profit/*`.

Related: [frontend-integration-admin-profit-reports.md](./frontend-integration-admin-profit-reports.md) (when available from backend team).
