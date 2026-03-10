## Admin - Merchants API

All endpoints below are **admin-only**, protected by JWT and role-based guards.

- **Auth:** `Authorization: Bearer <adminAccessToken>`
- **Base path:** `/admin/merchants`

---

### GET /admin/merchants

**Purpose:** List merchants with filters and pagination for backoffice views.

**Request**

- **Method:** `GET`
- **Path:** `/admin/merchants`
- **Query params (all optional):**

| Param    | Type           | Description |
|----------|----------------|-------------|
| `status` | `PENDING` \| `ACTIVE` \| `SUSPENDED` | Filter by merchant status. |
| `type`   | `PICKUP_POINT` \| `DELIVERY_PARTNER` \| ... | Filter by merchant type (enum `MerchantType`). |
| `userId` | UUID           | Filter by owning user id. |
| `limit`  | number         | Page size (default 20). |
| `offset` | number         | Offset for pagination (default 0). |

**Response (200)**

```json
{
  "merchants": [
    {
      "id": "merchant-uuid",
      "userId": "user-uuid",
      "type": "PICKUP_POINT",
      "status": "PENDING",
      "serviceAreas": ["Lagos", "Abuja"],
      "user": {
        "id": "user-uuid",
        "email": "merchant@example.com",
        "firstName": "John",
        "lastName": "Doe"
      },
      "products": [
        {
          "id": "merchantProduct-uuid",
          "productId": "product-uuid",
          "productName": "Segulah Herbal Tea",
          "isActive": true
        }
      ],
      "createdAt": "2026-03-01T10:00:00.000Z",
      "updatedAt": "2026-03-02T11:00:00.000Z"
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

Frontend can use this for merchant tables, filters, and detail links.

---

### GET /admin/merchants/{id}

**Purpose:** Get full details of a single merchant (same shape as list item).

**Request**

- **Method:** `GET`
- **Path:** `/admin/merchants/{id}` — `id` = merchant UUID

**Response (200)**

```json
{
  "id": "merchant-uuid",
  "userId": "user-uuid",
  "type": "PICKUP_POINT",
  "status": "ACTIVE",
  "serviceAreas": ["Lagos", "Abuja"],
  "user": {
    "id": "user-uuid",
    "email": "merchant@example.com"
  },
  "products": [
    {
      "id": "merchantProduct-uuid",
      "productId": "product-uuid",
      "productName": "Segulah Herbal Tea",
      "isActive": true
    }
  ],
  "createdAt": "2026-03-01T10:00:00.000Z",
  "updatedAt": "2026-03-02T11:00:00.000Z"
}
```

**Errors:** 404 if merchant not found.

---

### POST /admin/merchants/{id}/approve

**Purpose:** Approve a pending merchant application and optionally allocate onboarding stock.

**Request**

- **Method:** `POST`
- **Path:** `/admin/merchants/{id}/approve`
- **Body:** none

**Behavior**

- Only allowed when merchant `status` is `PENDING`; otherwise 400.
- Sets status to `ACTIVE` and, if configured via `merchantCategoryConfig`, creates an initial `MerchantAllocation` row (onboarding quantity of a product).
- Emits audit and notification events (internal).

**Response (200)**

```json
{
  "message": "Merchant approved successfully"
}
```

**Errors:** 404 merchant not found; 400 if status is not `PENDING`.

---

### POST /admin/merchants/{id}/reject

**Purpose:** Reject a pending merchant application with a reason.

**Request**

- **Method:** `POST`
- **Path:** `/admin/merchants/{id}/reject`
- **Body (JSON):**

```json
{
  "reason": "Insufficient documentation"
}
```

- `reason`: string, minimum length 5.

**Response (200)**

```json
{
  "message": "Merchant rejected"
}
```

**Behavior & errors:**

- Merchant must exist and be `PENDING`; otherwise 400.
- Status is set to `SUSPENDED` and an audit log/notification is emitted.

---

### POST /admin/merchants/{id}/suspend

**Purpose:** Suspend an active merchant (or keep suspended if already suspended).

**Request**

- **Method:** `POST`
- **Path:** `/admin/merchants/{id}/suspend`
- **Body (JSON):**

```json
{
  "reason": "Violation of terms"
}
```

- `reason`: optional string, used for audit/notifications.

**Response (200)**

```json
{
  "message": "Merchant suspended"
}
```

**Behavior & errors:**

- 404 if merchant not found.
- If merchant already `SUSPENDED`, operation is idempotent (no error, keeps suspended).

---

### POST /admin/merchants/{id}/reactivate

**Purpose:** Reactivate a suspended merchant.

**Request**

- **Method:** `POST`
- **Path:** `/admin/merchants/{id}/reactivate`
- **Body:** none

**Response (200)**

```json
{
  "message": "Merchant reactivated"
}
```

**Behavior & errors:**

- Merchant must exist and have status `SUSPENDED`; otherwise 400.
- Status is set back to `ACTIVE` and audit/notification events are emitted.

---

### POST /admin/merchants/{id}/products

**Purpose:** Assign an ACTIVE product to an ACTIVE merchant (make the merchant able to sell it).

**Request**

- **Method:** `POST`
- **Path:** `/admin/merchants/{id}/products`
- **Body (JSON):**

```json
{
  "productId": "product-uuid"
}
```

- `productId`: UUID of an existing product with `status: ACTIVE`.

**Response (201)**

```json
{
  "message": "Product assigned to merchant"
}
```

**Behavior & errors:**

- 404 if merchant or product not found.
- Merchant must be `ACTIVE`; otherwise 400.
- Product must be `ACTIVE`; otherwise 400.
- Assignment is **upserted**: calling multiple times is idempotent (keeps assignment active).

---

### GET /admin/merchants/{id}/products

**Purpose:** List products currently assigned to a merchant (for admin view).

**Request**

- **Method:** `GET`
- **Path:** `/admin/merchants/{id}/products`
- **Body:** none

**Response (200)**

```json
{
  "products": [
    {
      "id": "merchantProduct-uuid",
      "merchantId": "merchant-uuid",
      "productId": "product-uuid",
      "isActive": true,
      "createdAt": "2026-03-01T10:00:00.000Z",
      "updatedAt": "2026-03-02T11:00:00.000Z"
    }
  ]
}
```

**Errors:** 404 if merchant not found.

---

### DELETE /admin/merchants/{id}/products/{productId}

**Purpose:** Unassign a product from a merchant (stop them from selling it).

**Request**

- **Method:** `DELETE`
- **Path:** `/admin/merchants/{id}/products/{productId}`
- **Body:** none

**Response (200)**

```json
{
  "message": "Product unassigned from merchant"
}
```

**Behavior & errors:**

- 404 if assignment does not exist.
- If assignment is already inactive, operation is idempotent (no error, already unassigned).

---

### POST /admin/merchants/{id}/orders/{orderId}/mark-sent

**Purpose:** Admin marks an order as “sent” (dispatched) on behalf of a merchant.

**Request**

- **Method:** `POST`
- **Path:** `/admin/merchants/{id}/orders/{orderId}/mark-sent`
- **Body:** none

**Response (200)**

```json
{
  "message": "Order marked as sent by admin"
}
```

**Behavior & errors:**

- Uses `MerchantFulfillmentService.markOrderSent` with `sentBy = ADMIN`.
- 404 if order not found.
- 403 if order exists but `assignedMerchantId` does not match `{id}` when it is provided.

Frontend can use this for an admin-only control to override merchant fulfillment actions.

---

### POST /admin/merchants/{id}/orders/{orderId}/confirm-delivery

**Purpose:** Admin confirms delivery of an order on behalf of a merchant, optionally attaching proof/notes.

**Request**

- **Method:** `POST`
- **Path:** `/admin/merchants/{id}/orders/{orderId}/confirm-delivery`
- **Body (JSON):**

```json
{
  "proof": "https://link-to-proof-image-or-doc",
  "notes": "Delivered to customer at 3pm"
}
```

- Both `proof` and `notes` are optional strings.

**Response (200)**

```json
{
  "message": "Delivery confirmed by admin"
}
```

**Behavior & errors (from fulfillment service):**

- Merchant must exist and be `ACTIVE`; otherwise 404/400.
- Order must exist and be assigned to that merchant; otherwise 404/403.
- Order status must be one of `READY_FOR_PICKUP`, `OFFLINE_DELIVERY_REQUESTED`, or `PAID`; otherwise 400.
- Creates a delivery confirmation record, updates order status to `DELIVERED`, credits merchant delivery bonus, and emits notifications/audit events.

Frontend can use this endpoint for an admin-only “force confirm delivery” action with optional proof/notes.

