# Frontend Integration: Admin profit reports

Cashout charges (`CASHOUT_FEE`) appear in profit summary and transaction feeds when the backend includes that category.

The admin app maps `CASHOUT_FEE` in:

- [src/app/features/reports/reports.service.ts](../src/app/features/reports/reports.service.ts) — `ProfitCategory`
- [src/app/features/reports/profit-reports/profit-reports.component.ts](../src/app/features/reports/profit-reports.component.ts) — labels and filter

Ensure `GET admin/reports/profit/summary` and `GET admin/reports/profit/transactions` return `CASHOUT_FEE` in `byCategory` / transaction `category` when cashout fees are recorded.

See also: [frontend-integration-cashout-charges.md](./frontend-integration-cashout-charges.md).
