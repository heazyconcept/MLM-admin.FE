# Frontend Integration: Admin Product Stock

Date: 2026-05-29

Product Catalog → **Stock** submenu: company-wide inventory visibility per product, movement history, and links to existing pool / merchant / order flows.

All routes require **Bearer token** with role `ADMIN`.

Related: [Admin product pool](./admin-product-pool.md), [Merchant flow](./merchant-flow-frontend.md), [Product catalog (feature 12)](../features/12-product-catalog.md).

---

## API summary

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/admin/stock` | Paginated stock summary (six metrics per product) |
| `GET` | `/admin/stock/:productId` | Single-product stock detail |
| `GET` | `/admin/stock/:productId/movements` | Movement ledger for a product |
| `GET` | `/admin/products/:id/pool` | Warehouse quantity (existing) |
| `PUT` | `/admin/products/:id/pool` | Set warehouse quantity (existing; records movement) |
| `GET` | `/admin/merchants/:id/products` | Per-merchant stock (existing) |
| `POST` | `/admin/orders/:id/approve` | Approve admin home delivery — **decrements warehouse** |
| `POST` | `/admin/orders/:id/assign-merchant` | Assign merchant to offline order — decrements **merchant** stock |

---

## Metric definitions

Each product row exposes six numbers plus `onHandTotal`:

| Field | Meaning |
|-------|---------|
| `warehouseRemaining` | Units in admin pool (warehouse) |
| `merchantStockRemaining` | Sum of `stockQuantity` across **active** merchant assignments |
| `onHandTotal` | `warehouseRemaining + merchantStockRemaining` |
| `deliveredToMerchants` | Cumulative units on **accepted** allocations (onboarding + refill) |
| `totalOrdered` | Units on order lines where order status is **not** `CREATED`, `PENDING`, `CANCELLED`, or `FAILED` |
| `deliveredToUsers` | Units on order lines where order status is `DELIVERED` or `COMPLETED` |

**Historical note:** `deliveredToMerchants`, `totalOrdered`, and `deliveredToUsers` are computed from existing allocation and order data. The **movement ledger** only contains events recorded **after** this feature ships (no backfill).

---

## A. Stock list (`GET /admin/stock`)

**Query**

| Param | Type | Notes |
|-------|------|--------|
| `categoryId` | UUID | Optional filter |
| `search` | string | Matches product name or SKU (case-insensitive) |
| `limit` | number | Default 50, max 100 |
| `offset` | number | Default 0 |

**Response `200`**

```json
{
  "items": [
    {
      "productId": "uuid",
      "productName": "Product A",
      "sku": "SKU-001",
      "onHandTotal": 80,
      "deliveredToMerchants": 100,
      "totalOrdered": 45,
      "deliveredToUsers": 20,
      "merchantStockRemaining": 30,
      "warehouseRemaining": 50
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

**UI:** Table with columns for all six metrics + `onHandTotal`. Row click → product stock detail.

---

## B. Product stock detail (`GET /admin/stock/:productId`)

**Response `200`**

Same metrics as list row, plus:

```json
{
  "productId": "uuid",
  "productName": "Product A",
  "sku": "SKU-001",
  "categoryId": "uuid",
  "categoryName": "Category name",
  "onHandTotal": 80,
  "deliveredToMerchants": 100,
  "totalOrdered": 45,
  "deliveredToUsers": 20,
  "merchantStockRemaining": 30,
  "warehouseRemaining": 50
}
```

**UI suggestions**

- KPI cards for the six metrics (and highlight `onHandTotal`).
- Tab **Movements** → `GET /admin/stock/:productId/movements`.
- Action **Adjust warehouse** → `PUT /admin/products/:id/pool` (or link to product edit).
- Link **View merchants** → merchant list filtered / drill-down to `GET /admin/merchants/:id/products`.
- Link **View orders** → admin orders with `productId` filter if supported.

---

## C. Movement history (`GET /admin/stock/:productId/movements`)

**Query**

| Param | Type | Notes |
|-------|------|--------|
| `type` | enum | Optional; see `StockMovementType` below |
| `limit` | number | Default 50, max 100 |
| `offset` | number | Default 0 |

**Response `200`**

```json
{
  "items": [
    {
      "id": "uuid",
      "productId": "uuid",
      "quantity": 10,
      "type": "ALLOCATION_ACCEPT",
      "fromLocation": "WAREHOUSE",
      "toLocation": "MERCHANT",
      "merchantId": "uuid",
      "orderId": null,
      "allocationId": "uuid",
      "actorType": "USER",
      "actorId": "uuid",
      "metadata": null,
      "createdAt": "2026-05-29T10:00:00.000Z"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

### `StockMovementType`

| Type | When recorded |
|------|----------------|
| `ALLOCATION_ACCEPT` | Merchant accepts onboarding/refill allocation |
| `ORDER_PICKUP` | PICKUP order created with `selectedMerchantId` |
| `ORDER_MERCHANT_ASSIGN` | Admin assigns merchant to `OFFLINE_DELIVERY` order |
| `ADMIN_HOME_DELIVERY_APPROVE` | Admin approves home delivery without merchant (`POST /admin/orders/:id/approve`) |
| `MANUAL_POOL_SET` | Admin sets pool via `PUT /admin/products/:id/pool` |
| `MANUAL_MERCHANT_ADJUST` | Merchant updates inventory via `PUT /merchants/inventory/:productId/stock` |

### `StockLocation`

`WAREHOUSE` | `MERCHANT` | `CUSTOMER` (logical destination for outbound units).

**UI:** Badge per `type`; link `orderId` / `merchantId` / `allocationId` when present.

---

## TypeScript interfaces

```ts
interface AdminStockProductRow {
  productId: string;
  productName: string;
  sku: string | null;
  onHandTotal: number;
  deliveredToMerchants: number;
  totalOrdered: number;
  deliveredToUsers: number;
  merchantStockRemaining: number;
  warehouseRemaining: number;
}

interface AdminStockListResponse {
  items: AdminStockProductRow[];
  total: number;
  limit: number;
  offset: number;
}

interface AdminStockDetailResponse extends AdminStockProductRow {
  categoryId: string;
  categoryName: string | null;
}

type StockMovementType =
  | 'ALLOCATION_ACCEPT'
  | 'ORDER_PICKUP'
  | 'ORDER_MERCHANT_ASSIGN'
  | 'ADMIN_HOME_DELIVERY_APPROVE'
  | 'MANUAL_POOL_SET'
  | 'MANUAL_MERCHANT_ADJUST';

type StockLocation = 'WAREHOUSE' | 'MERCHANT' | 'CUSTOMER';
type StockActorType = 'ADMIN' | 'USER' | 'SYSTEM';

interface AdminStockMovementRow {
  id: string;
  productId: string;
  quantity: number;
  type: StockMovementType;
  fromLocation: StockLocation;
  toLocation: StockLocation;
  merchantId?: string | null;
  orderId?: string | null;
  allocationId?: string | null;
  actorType: StockActorType;
  actorId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}
```

---

## Operational flows (when stock changes)

| Scenario | Stock effect | Movement type |
|----------|--------------|---------------|
| Merchant **accepts** allocation | Warehouse ↓, merchant ↑ | `ALLOCATION_ACCEPT` |
| **PICKUP** order created | Merchant ↓ (at order create, status `PENDING`) | `ORDER_PICKUP` |
| Admin **assigns** merchant to offline order | Merchant ↓ | `ORDER_MERCHANT_ASSIGN` |
| Admin **approves** home delivery (no merchant) | Warehouse ↓ | `ADMIN_HOME_DELIVERY_APPROVE` |
| Admin **sets** pool quantity | Pool set to value | `MANUAL_POOL_SET` |

### Admin home delivery approve

`POST /admin/orders/:id/approve`

- Order must be `OFFLINE_DELIVERY`, status `PAID`, no `assignedMerchantId`.
- Backend validates **warehouse** stock for every line item; on success status → `APPROVED` and pool decremented.
- **400** if insufficient warehouse stock, e.g. `Insufficient admin pool for product {id}: have 0, need 2`.

### Merchant inventory (merchant app)

- Merchants should treat inventory as **read-only** in normal operation; stock changes come from allocations and orders.
- `PUT /merchants/inventory/:productId/stock` remains for corrections and logs `MANUAL_MERCHANT_ADJUST`.

---

## Error handling

| Case | HTTP | Action |
|------|------|--------|
| Insufficient warehouse on home delivery approve | 400 | Show message; link to adjust pool or cancel approve |
| Insufficient merchant stock on assign | 400 | Choose another merchant or wait for refill |
| Product not found (detail/movements) | 404 | Return to stock list |

---

## Known limitations (document for support)

1. **PICKUP** reserves merchant stock at **order creation** (`PENDING`), not only after payment. Unpaid orders still hold merchant stock until cancelled.
2. **Cancel unpaid order** does not automatically restore merchant stock (existing behaviour).
3. Movement ledger has **no historical backfill**; use aggregate metrics for pre-launch totals.

---

## Modification summary (frontend checklist)

| Area | Action |
|------|--------|
| Product Catalog nav | Add **Stock** submenu |
| Stock list page | New — `GET /admin/stock` |
| Stock detail page | New — detail + movements tabs |
| Product detail | Optional link to Stock detail; pool edit unchanged |
| Orders (admin home delivery) | On approve success, refresh stock if user has Stock open |
| Merchant app | Prefer read-only inventory; hide manual stock edit if desired |

---

## Example: fetch stock list

```typescript
const res = await fetch(`${API_BASE}/admin/stock?limit=50&offset=0`, {
  headers: { Authorization: `Bearer ${adminToken}` },
});
const data: AdminStockListResponse = await res.json();
```
