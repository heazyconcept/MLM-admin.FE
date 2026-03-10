# Merchant category config (admin & frontend)

Configures **per–merchant-type** settings: commissions, registration (merchant) fee, and **onboarding products** — the list of products (and quantities) transferred to a merchant when they are approved.

---

## Overview

- **Merchant types:** `REGIONAL`, `NATIONAL`, `GLOBAL`.
- **Admin** can read and update config per type.
- **Frontend** (e.g. merchant application flow) can read config to show registration fee and onboarding product list; the same config is returned by the admin GET and by the public/merchant-facing config endpoint.

When a merchant is **approved**, the backend creates one **allocation** per onboarding item (e.g. 40 Bibles, 50 books, 30 writing pads). The merchant then accepts each allocation to receive stock.

---

## Admin endpoints

**Auth:** Admin only (`Authorization: Bearer <token>`, role `ADMIN`).

### Get all configs

- **`GET /admin/merchant-category-config`**

**Response:** `200 OK` — array of configs, one per merchant type.

```json
[
  {
    "id": "uuid",
    "merchantType": "REGIONAL",
    "deliveryCommissionPct": 4,
    "productCommissionPct": 3.5,
    "registrationFeeUsd": 600,
    "onboardingProductId": null,
    "onboardingQuantity": null,
    "onboardingItems": [
      { "productId": "uuid-bible", "quantity": 40 },
      { "productId": "uuid-books", "quantity": 50 },
      { "productId": "uuid-pads", "quantity": 30 }
    ]
  },
  {
    "id": "uuid",
    "merchantType": "NATIONAL",
    "deliveryCommissionPct": 6,
    "productCommissionPct": 4.5,
    "registrationFeeUsd": 3000,
    "onboardingProductId": null,
    "onboardingQuantity": null,
    "onboardingItems": []
  }
]
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Config row id. |
| `merchantType` | `REGIONAL` \| `NATIONAL` \| `GLOBAL` | Merchant tier. |
| `deliveryCommissionPct` | number | Delivery commission % (e.g. 4, 6, 10). |
| `productCommissionPct` | number | Product commission % (e.g. 3, 4.5, 7.5). |
| `registrationFeeUsd` | number \| null | Merchant/registration fee in **USD**. `null` = use system default for that type. |
| `onboardingProductId` | string \| null | Deprecated; prefer `onboardingItems`. |
| `onboardingQuantity` | number \| null | Deprecated; prefer `onboardingItems`. |
| `onboardingItems` | array | **Preferred.** List of `{ productId, quantity }`. Products transferred to merchant on approval. Empty array = no onboarding products. |

---

### Update config for one type

- **`PUT /admin/merchant-category-config/:type`**

**:type** — one of: `REGIONAL`, `NATIONAL`, `GLOBAL`.

**Request body:**

```json
{
  "deliveryCommissionPct": 4,
  "productCommissionPct": 3.5,
  "registrationFeeUsd": 600,
  "onboardingItems": [
    { "productId": "uuid-bible", "quantity": 40 },
    { "productId": "uuid-books", "quantity": 50 },
    { "productId": "uuid-pads", "quantity": 30 }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `deliveryCommissionPct` | number | Yes | Delivery commission %. |
| `productCommissionPct` | number | Yes | Product commission %. |
| `registrationFeeUsd` | number \| null | No | Merchant/registration fee in **USD**. Omit to leave unchanged; send `null` to clear (backend will use default for that type when displaying). |
| `onboardingItems` | array | No | List of `{ productId: string, quantity: number }`. Replaces the onboarding list for this type. Each `productId` must exist and be **ACTIVE**. Each `quantity` must be > 0. Omit to leave unchanged; send `[]` to set no onboarding products. |
| `onboardingProductId` | string \| null | No | Legacy: single product id. Used only if `onboardingItems` is not sent. |
| `onboardingQuantity` | number \| null | No | Legacy: single quantity. Used only if `onboardingItems` is not sent. |

**Validation:**

- If `onboardingItems` is provided and non-empty, every `productId` must be an existing **ACTIVE** product; otherwise the API returns **400** with a message like: `Products not found or not ACTIVE: <id>, ...`.
- Each item must have `productId` (string) and `quantity` (positive number).

**Response:** `200 OK`

```json
{ "message": "Merchant category config updated" }
```

**Backward compatibility:** If you send only `onboardingProductId` and `onboardingQuantity` (and not `onboardingItems`), the backend converts them to `onboardingItems: [{ productId, quantity }]` for that type.

---

## Merchant / public config (for application flow)

The same structure is returned by the endpoint used in the merchant application flow (e.g. to show registration fee and onboarding products per type):

- **`GET /merchants/category-config`** (or the path your app uses for “get merchant tier config”).

Response shape matches the admin GET: array of configs with `merchantType`, `deliveryCommissionPct`, `productCommissionPct`, `registrationFeeUsd`, and **`onboardingItems`**. When `registrationFeeUsd` is `null`, the backend uses the default fee for that type (e.g. from constants). Frontend can show `registrationFeeUsd` (or the resolved default) and use `onboardingItems` to display “You will receive: 40× Bible, 50× Books, 30× Writing pads” (resolve product names from product ids if needed).

---

## Behaviour summary

| Action | Result |
|--------|--------|
| Admin updates config with `onboardingItems` | Stored per merchant type. Replaces previous onboarding list for that type. |
| Admin updates config with `registrationFeeUsd` | Stored per type. Used when displaying or charging the merchant fee; `null` falls back to system default. |
| Merchant approved | Backend creates one **MerchantAllocation** per entry in `onboardingItems` for that merchant’s type (or one allocation from legacy `onboardingProductId`/`onboardingQuantity` if `onboardingItems` is empty). |
| Frontend displays config | Use `registrationFeeUsd` (or default when null) and `onboardingItems` for fee and “products you will receive” per tier. |

---

## TypeScript (frontend)

```ts
type MerchantType = 'REGIONAL' | 'NATIONAL' | 'GLOBAL';

interface OnboardingItem {
  productId: string;
  quantity: number;
}

interface MerchantCategoryConfig {
  id: string;
  merchantType: MerchantType;
  deliveryCommissionPct: number;
  productCommissionPct: number;
  registrationFeeUsd: number | null;
  onboardingProductId: string | null;
  onboardingQuantity: number | null;
  onboardingItems: OnboardingItem[];
}

// PUT body (all fields except the two commissions are optional)
interface UpdateMerchantCategoryConfigBody {
  deliveryCommissionPct: number;
  productCommissionPct: number;
  registrationFeeUsd?: number | null;
  onboardingItems?: OnboardingItem[] | null;
  onboardingProductId?: string | null;
  onboardingQuantity?: number | null;
}
```
