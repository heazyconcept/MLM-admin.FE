# Backend Bug Report: Database Conflict on CPV Rules Update

> **Endpoint**: `PUT /admin/cpv-rules` (or `POST /admin/cpv-rules`)  
> **Severity**: High  
> **Status**: Blocked by Backend Database Error  

---

## 1. The Error Response

When attempting to save the milestone configuration in the Admin CPV Configuration panel, the backend returns a **409 Conflict** error with a database constraint violation message:

```json
{
    "statusCode": 409,
    "message": [
        "A record with this field already exists"
    ],
    "error": "Database Error",
    "timestamp": "2026-06-16T13:37:46.176Z",
    "path": "/admin/cpv-rules"
}
```

---

## 2. Payload Sent by Frontend

Below is the structured array payload sent by the frontend component to the API:

```json
{
  "rules": [
    {
      "threshold": 10,
      "rewardType": "CASH",
      "rewardAmount": 400,
      "materialDescription": null
    },
    {
      "threshold": 5000,
      "rewardType": "BOTH",
      "rewardAmount": 100,
      "materialDescription": "Washing Machine worth $300 (₦300,000)"
    }
  ]
}
```

---

## 3. Potential Root Causes

This error indicates that the backend is violating a unique constraint (typically on **`threshold`** or **`name`** columns) in the `cpv_rules` table:

1. **Upsert Logic Issue**: The backend controller may be attempting to run a SQL `INSERT` for all incoming rules instead of updating existing ones. If a row with a matching `threshold` or `name` already exists, the database rejects the operation.
2. **Missing Table Truncate/Reset**: If the `PUT` endpoint is designed to replace the entire rules table, it should safely delete/truncate the existing rules first, or perform a batch `upsert` where duplicates are resolved.
3. **Self-Conflict Check**: The unique validation checks may be conflicting with the record being edited during the update loop.

---

## 4. Recommended Fixes for Backend Team

- **Option A (Overwrite/Replace)**: If `PUT` represents a complete replacement of all active rules, execute the transaction by:
  1. Truncating or deleting all existing records from the `cpv_rules` table.
  2. Inserting the new payload records in batch.
- **Option B (Upsert)**: Update records where `threshold` matches, insert new records, and delete any records that were omitted from the payload array.
- **Option C (Fix Database Unique Constraint validation)**: Ensure that the validation logic does not conflict with the existing record itself during updates.
