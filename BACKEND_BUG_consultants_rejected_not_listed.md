# Backend Bug: Rejected Business Consultants Not Returned in Admin List

> **Endpoints**: `GET /admin/consultants`, `GET /admin/consultants/:id`  
> **Related**: `POST /admin/consultants/:id/reject`  
> **Severity**: High  
> **Status**: Pending Backend Fix  
> **Reported from**: Admin frontend — Business Consultants list (`/admin/consultants`)

---

## 1. Description

After an admin successfully rejects a business consultant application via `POST /admin/consultants/:id/reject`, the record is no longer visible in the admin list when filtering by **Rejected** or **All Statuses**. Only **Pending** and **Approved** applications appear to be returned.

The reject action itself succeeds (200/201 with updated record), but subsequent list queries do not include `REJECTED` records.

---

## 2. Expected Behavior (per business-consultant-flow-frontend.md)

| Status | Meaning |
|--------|---------|
| `PENDING` | Awaiting admin review |
| `APPROVED` | Active consultant |
| `REJECTED` | Declined — user may re-apply |
| `REVOKED` | Admin removed active status |

Admin list should support:

```
GET /admin/consultants?status=REJECTED&limit=20&offset=0
```

Response:

```json
{
  "items": [
    {
      "id": "uuid",
      "userId": "uuid",
      "status": "REJECTED",
      "seminarCentreName": "...",
      "appliedAt": "2026-07-11T15:00:00.000Z",
      "reviewedAt": "2026-07-11T16:00:00.000Z",
      "rejectionReason": "Seminar centre could not be verified at listed address.",
      "user": { "id": "...", "username": "...", "email": "..." },
      "isStage1Complete": true,
      "effectiveRankingLevel": 4
    }
  ],
  "total": 1
}
```

When **no** `status` query param is sent (`GET /admin/consultants?limit=20&offset=0`), all statuses including `REJECTED` and `REVOKED` should be included (subject to pagination).

`GET /admin/consultants/:id` should also return the full rejected record including `rejectionReason` and `reviewedAt`.

---

## 3. Observed Behavior

1. Admin rejects a `PENDING` application → success toast, record disappears from Pending queue (expected).
2. Admin switches list filter to **Rejected** → empty list.
3. Admin switches to **All Statuses** → only Pending and Approved records appear; rejected records missing.
4. Same likely applies to **Revoked** if revoke is implemented but excluded from list query.

---

## 4. Frontend Verification (not a frontend bug)

The admin frontend sends the correct query params:

| UI filter | Request |
|-----------|---------|
| Pending | `GET admin/consultants?status=PENDING&limit=20&offset=0` |
| Approved | `GET admin/consultants?status=APPROVED&limit=20&offset=0` |
| Rejected | `GET admin/consultants?status=REJECTED&limit=20&offset=0` |
| All | `GET admin/consultants?limit=20&offset=0` (no status param) |

Reject payload:

```json
POST /admin/consultants/:id/reject
{ "reason": "Seminar centre could not be verified at listed address." }
```

No frontend filtering removes rejected rows after fetch — the table renders whatever `items` the API returns.

---

## 5. Likely Root Causes (backend)

Please check:

1. **List query default filter** — repository/service may implicitly filter `status IN ('PENDING', 'APPROVED')` and omit `REJECTED` / `REVOKED`.
2. **Reject handler** — may soft-delete the row, hard-delete it, or fail to persist `status = 'REJECTED'`.
3. **Status enum mismatch** — reject may write a different value (e.g. lowercase `rejected`, or reverts to null).
4. **`status=REJECTED` query param** — may be ignored or mapped incorrectly in the controller/DTO.
5. **Detail endpoint** — confirm `GET /admin/consultants/:id` returns rejected records if list excludes them.

---

## 6. Suggested Backend Fix

1. Ensure `POST /admin/consultants/:id/reject` sets:
   - `status = 'REJECTED'`
   - `rejectionReason = body.reason`
   - `reviewedAt = now()`
   - Record remains in DB (not deleted).

2. Ensure `GET /admin/consultants`:
   - When `status=REJECTED`, returns only rejected records.
   - When `status` is omitted, returns all statuses.
   - `total` reflects the filtered count correctly.

3. Add integration test:
   - Apply → reject → `GET ?status=REJECTED` returns 1 item with matching `id` and `rejectionReason`.

---

## 7. How to Reproduce

1. User submits consultant application (`POST /consultants/apply`) → `PENDING`.
2. Admin calls `POST /admin/consultants/:id/reject` with `{ "reason": "Test rejection reason" }`.
3. Admin calls `GET /admin/consultants?status=REJECTED`.
4. **Expected**: rejected application in `items`. **Actual**: empty `items` (reported).

---

## 8. Frontend Follow-up (after backend fix)

No frontend API contract changes required. Once backend returns rejected records, the existing Rejected filter and detail page will work without changes.

**Note:** List stat cards (Pending / Approved / Rejected / Revoked counts) currently reflect the **current filtered page** only, not global totals. If backend later exposes aggregate counts, we can wire those separately.
