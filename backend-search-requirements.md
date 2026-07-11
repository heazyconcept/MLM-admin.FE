# Backend Search Requirements for Admin Panel

This document outlines the requirements for implementing **server-side search** across the Admin Panel list endpoints. 

Currently, search inputs on the frontend only filter the active, client-side dataset (e.g., page-level results). To enable searching across the entire database, the backend list endpoints need to accept a `search` query parameter.

---

## General Design Conventions

- **Parameter Name**: `search` (string, optional)
- **Matching Behavior**: 
  - Case-insensitive (e.g., `ILIKE` in PostgreSQL, `regex` with `i` flag in MongoDB).
  - Partial matching (matches if the search term is a substring of any of the targeted fields).
- **Pagination Integration**: The `limit` and `offset` parameters must apply to the filtered results, and the `total` count returned in the response must represent the total number of matching records in the database.

---

## Required Endpoints & Target Fields

### 1. User Management
- **Endpoint**: `GET /admin/users`
- **Fields to Search**:
  - `username` (exact or partial)
  - `fullName` (partial)
  - `email` (partial)
  - `id` (exact UUID/string match)

### 2. Merchant Management
- **Endpoint**: `GET /admin/merchants`
- **Fields to Search**:
  - `user.username` (partial)
  - `user.email` (partial)
  - `phoneNumber` (partial)
  - `id` (exact)

### 3. Order Management
- **Endpoint**: `GET /admin/orders`
- **Fields to Search**:
  - `id` (exact or prefix match)
  - `user.username` (partial)
  - `user.email` (partial)
  - `guestFullName` (partial)
  - `guestEmail` (partial)
  - `items.productName` (partial matching on any ordered product item)

### 5. Withdrawal Management
- **Endpoint**: `GET /admin/withdrawals` (or current payouts list path)
- **Fields to Search**:
  - `id` (exact or prefix match)
  - `userName` (partial)
  - `userEmail` (partial)

### 6. Payment Management
- **Endpoint**: `GET /admin/payments` (or transaction log path)
- **Fields to Search**:
  - `id` (exact or prefix match)
  - `userName` (partial)
  - `userEmail` (partial)

### 7. Product Catalog
- **Endpoint**: `GET /admin/products` (or product list path)
- **Fields to Search**:
  - `name` (partial)
  - `sku` (partial or exact)

---

## Example Usage

**Request:**
```http
GET /admin/users?search=oluwa&limit=10&offset=0
```

**Response (200 OK):**
```json
{
  "users": [
    {
      "id": "user-uuid-1",
      "username": "Oluwapelumi",
      "fullName": "Oluwapelumi Adewole",
      "email": "oluwa@example.com",
      "role": "USER"
    }
  ],
  "total": 1
}
```
