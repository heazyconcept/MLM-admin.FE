  <!-- # Backend Update Required: User Management — Referrer & Upline Fields

  > **Date**: June 11, 2026
  > **Priority**: High
  > **Frontend Status**: Ready — will render automatically once backend is updated

  ---

  ## Summary

  The admin frontend User Management table now displays **Referrer** (who referred the user) and **Upline** (direct upline in MLM tree) columns. These fields are **not currently returned** by the backend API and need to be added.

  ---

  ## Affected Endpoints

  ### 1. `GET /admin/users`

  **Current response** (per user in `users[]` array):

  ```json
  {
    "id": "abc123",
    "email": "john@example.com",
    "fullName": "John Doe",
    "firstName": "John",
    "lastName": "Doe",
    "username": "johndoe",
    "referralCode": "JOHN2024",
    "role": "USER",
    "registrationPackage": "GOLD",
    "registrationCurrency": "USD",
    "isActive": true,
    "isRegistrationPaid": true,
    "createdAt": "2024-08-15T10:30:00Z",
    "totalCpv": 150,
    "wallets": {}
  }
  ```

  **Required additions:**

  ```json
  {
    "referrerUsername": "janedoe",
    "uplineUsername": "janedoe"
  }
  ```

  ---

  ### 2. `GET /admin/users/:id`

  Same two fields should be added to the single-user detail response.

  ---

  ## New Fields Specification

  | Field              | Type              | Required | Description                                                                 |
  |--------------------|-------------------|----------|-----------------------------------------------------------------------------|
  | `referrerUsername`  | `string \| null`  | Yes      | Username of the person who referred this user (whose referral code was used) |
  | `uplineUsername`    | `string \| null`  | Yes      | Username of this user's direct upline/sponsor in the MLM tree               |

  ---

  ## Expected Full Response Shape

  ```json
  {
    "id": "abc123",
    "email": "john@example.com",
    "fullName": "John Doe",
    "firstName": "John",
    "lastName": "Doe",
    "username": "johndoe",
    "referralCode": "JOHN2024",
    "referrerUsername": "janedoe",
    "uplineUsername": "janedoe",
    "role": "USER",
    "registrationPackage": "GOLD",
    "registrationCurrency": "USD",
    "isActive": true,
    "isRegistrationPaid": true,
    "createdAt": "2024-08-15T10:30:00Z",
    "totalCpv": 150,
    "wallets": {}
  }
  ```

  ---

  ## Edge Cases

  | Scenario                              | Expected Value                      |
  |---------------------------------------|-------------------------------------|
  | User signed up without a referral code | `referrerUsername: null`            |
  | User is a root node (no upline)       | `uplineUsername: null`              |
  | Referrer account was deleted          | `referrerUsername: null` or last known username |
  | Upline was changed (tree restructure) | Return **current** upline username  |

  ---

  ## Notes

  - The frontend already handles `null`/`undefined` gracefully — it shows a dash (`—`) placeholder.
  - No frontend redeployment is needed after the backend update. The fields will render automatically.
  - Both fields should use the **username** (not full name or user ID) for display purposes. -->

---

# Part 2: User Status Expansion — directReferralsCount

To support the updated user status classifications on the frontend, we need the backend to return the count of direct referrals for each user, and support filtering by status.

---

## 1. Required Fields & Endpoint Additions

### `GET /admin/users` & `GET /admin/users/:id`
 
Add `directReferralsCount` to the user response object:

```json
{
  "directReferralsCount": 5
}
```

---

## 2. Updated User Status Classification Logic

A user's visual status is calculated dynamically based on three fields (`isActive`, `isRegistrationPaid`, and `directReferralsCount`):

| Status | Condition | Meaning |
|---|---|---|
| **Suspended** | `isActive === false` | Account has been manually suspended by admin. |
| **Registered** | `isActive === true && isRegistrationPaid === false` | Sign up is complete, but the registration package is unpaid. |
| **Activated** | `isActive === true && isRegistrationPaid === true && directReferralsCount === null/undefined` | Paid, but referral count is missing (temporary migration state). |
| **Active** | `isActive === true && isRegistrationPaid === true && directReferralsCount >= 3` | Paid AND has successfully referred 3 or more direct users. |
| **Inactive** | `isActive === true && isRegistrationPaid === true && directReferralsCount < 3` | Paid BUT has referred fewer than 3 direct users. |

---

## 3. Query Parameter Filtering Enhancements

To avoid page size discrepancies due to client-side filtering on server-paginated data, we require support for a `status` filter query parameter:

`GET /admin/users?status=REGISTERED|ACTIVATED|ACTIVE|INACTIVE|SUSPENDED`

This will allow administrators to filter users by their precise MLM classification on the server.

