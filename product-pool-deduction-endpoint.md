# Product Pool Deduction Endpoint

This document outlines the required endpoint to support the new "Deduct" feature in the Admin Pool section of the Product Details page. 

## Endpoint Specification

**URL:** `/admin/products/:id/pool/deduct`  
**Method:** `POST`  
**Description:** Decreases the available pool quantity for a specific product by the specified amount.

### Request

**Parameters:**
- `id` (path parameter, string): The unique identifier of the product.

**Body:**
```json
{
  "quantity": 10
}
```
*Note: `quantity` should be a positive integer representing the amount to deduct from the pool.*

### Response

**Status Code:** `200 OK`

**Body:**
```json
{
  "productId": "string",
  "quantity": 90
}
```
*Note: `quantity` in the response should reflect the **new total pool quantity** after the deduction has been applied.*

### Validation & Errors
- The endpoint should validate that `quantity` is greater than `0`.
- The endpoint should ideally return a `400 Bad Request` if the deduction would result in a negative pool quantity, or gracefully clamp it to `0`.
- If the product is not found, return `404 Not Found`.
