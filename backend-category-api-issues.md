# Backend API Issues - Admin Endpoints

**Date:** March 2, 2026  
**Reporter:** Frontend Team  
**Endpoints Affected:** 
- `GET /admin/categories` (Blocking)
- `POST /admin/categories` (Blocking)
- `GET /admin/products` (Blocking)
- `POST /admin/products` (Blocking)  
**Severity:** Critical - Multiple admin features blocked

---

## Pattern Identified

**Critical System-Wide Issue:** Validation layer is rejecting core documented fields across multiple admin endpoints. This indicates a fundamental problem with the backend validation configuration, not isolated bugs.

---

## Issue 1: POST /admin/categories

### Issue Summary

The `POST /admin/categories` endpoint is returning validation errors that prevent category creation. The endpoint appears to reject all field properties regardless of what is sent.

---

## Expected Behavior (Per API Documentation)

**Endpoint:** `POST /admin/categories`  
**Source:** `c:\Users\HP\segulah-api\docs\api\ADMIN_PRODUCTS_CATEGORIES_API.md`

### Documented Request Body

```json
{
  "name": "Health & Wellness",
  "slug": "health-wellness",
  "description": "Supplements and wellness products",
  "isActive": true
}
```

### Field Specifications

| Field         | Type    | Required | Description                    |
|---------------|---------|----------|--------------------------------|
| `name`        | string  | yes      | Display name                   |
| `slug`        | string  | yes      | Unique URL-friendly identifier |
| `description` | string  | no       | Optional description           |
| `isActive`    | boolean | no       | Default `true`                 |

### Expected Response (201)

```json
{
  "id": "uuid",
  "name": "Health & Wellness",
  "slug": "health-wellness",
  "description": "Supplements and wellness products",
  "isActive": true,
  "createdAt": "2026-02-27T12:00:00.000Z",
  "updatedAt": "2026-02-27T12:00:00.000Z"
}
```

---

## Actual Behavior

### Test Case 1: Sending All Fields (As Documented)

**Request Payload:**
```json
{
  "name": "Health & Wellness",
  "slug": "health-wellness",
  "description": "Supplements and wellness products",
  "isActive": true
}
```

**Response (400):**
```json
{
  "statusCode": 400,
  "message": [
    "property slug should not exist",
    "property description should not exist",
    "property isActive should not exist"
  ],
  "error": "Bad Request",
  "timestamp": "2026-03-02T22:22:40.738Z",
  "path": "/admin/categories"
}
```

### Test Case 2: Sending Only Required Field (name)

**Request Payload:**
```json
{
  "name": "Health & Wellness"
}
```

**Response (400):**
```json
{
  "statusCode": 400,
  "error": "Validation Error",
  "message": ["Validation error occurred"],
  "path": "/admin/categories",
  "timestamp": "2026-03-02T22:27:09.089Z"
}
```

---

## Analysis

### Problems Identified

1. **Field Rejection:** Backend rejects `slug`, `description`, and `isActive` fields that are documented as required/optional fields
2. **Generic Error Message:** When sending only `name`, backend returns a generic "Validation error occurred" without specifying what validation failed
3. **Documentation Mismatch:** API documentation does not match actual backend validation implementation

### Possible Root Causes

- **DTO Validation Issue:** Backend DTO/validator may not be configured to accept documented fields
- **Missing DTO Properties:** Backend DTO may not include `slug`, `description`, `isActive` properties
- **Incorrect Validation Decorator:** Backend may have `@IsEmpty()` instead of `@IsOptional()` on optional fields
- **Database Schema Mismatch:** Database table may not have columns for these fields
- **Transformer/Mapper Issue:** Backend may be using wrong DTO for request body validation

---

## Required Fixes

### Backend Changes Needed

1. **Update Category DTO** to accept all documented fields:
   ```typescript
   // CreateCategoryDto
   class CreateCategoryDto {
     @IsString()
     @IsNotEmpty()
     name: string;

     @IsString()
     @IsNotEmpty()
     slug: string;

     @IsString()
     @IsOptional()
     description?: string;

     @IsBoolean()
     @IsOptional()
     isActive?: boolean;
   }
   ```

2. **Verify Database Schema** includes all fields:
   - `name` (string, required)
   - `slug` (string, unique, required)
   - `description` (text, nullable)
   - `isActive` (boolean, default true)

3. **Fix Validation Error Messages** to be specific:
   - Return field-level errors (e.g., "name is required", "slug must be unique")
   - Avoid generic "Validation error occurred" messages

4. **Test Cases** to verify:
   - Creating category with all fields works
   - Creating category with only required fields (name, slug) works
   - Creating category with duplicate slug returns 409 error
   - Creating category without name returns specific validation error

---

## Issue 2: POST /admin/products

### Issue Summary

The `POST /admin/products` endpoint is returning validation errors rejecting multiple core fields documented in the API specification.

**Endpoint URL:** `https://segulah-api.onrender.com/admin/products`

### Test Results

**Request Payload:**
```json
{
  "name": "Sample Product",
  "categoryId": "uuid-123",
  "description": "Product description",
  "sku": "PROD-001",
  "status": "active",
  "visibleToAll": true,
  "visibleToPackages": ["pkg-1"],
  "merchantOnly": false
}
```

**Response (400):**
```json
{
  "statusCode": 400,
  "message": [
    "property categoryId should not exist",
    "property description should not exist",
    "property sku should not exist",
    "property status should not exist",
    "property visibleToAll should not exist",
    "property visibleToPackages should not exist",
    "property merchantOnly should not exist"
  ],
  "error": "Bad Request",
  "timestamp": "2026-03-02T22:34:16.979Z",
  "path": "/admin/products"
}
```

### Fields Being Rejected

| Field                 | Expected Type | Status   |
|----------------------|---------------|----------|
| `categoryId`         | uuid/string   | ❌ Rejected |
| `description`        | string        | ❌ Rejected |
| `sku`                | string        | ❌ Rejected |
| `status`             | enum          | ❌ Rejected |
| `visibleToAll`       | boolean       | ❌ Rejected |
| `visibleToPackages`  | string[]      | ❌ Rejected |
| `merchantOnly`       | boolean       | ❌ Rejected |

---

## Issue 3: GET /admin/categories and GET /admin/products

### Issue Summary

GET endpoints for both categories and products are also returning validation errors and failing to retrieve data.

**Endpoints Affected:**
- `GET /admin/categories` - Listing categories blocked
- `GET /admin/products` - Listing products blocked

**Status:** ⚠️ Same validation layer issue as POST endpoints

### Impact

Data retrieval is completely blocked, preventing:
- Category listing in dropdown selectors
- Product listing in admin dashboard
- Product detail page loading
- Category management views

---

## Root Cause Analysis

### System-Wide Pattern

The validation errors ("property X should not exist") indicate a fundamental issue with how the backend validation is configured:

1. **DTO Validators Use `@IsEmpty()`:** Backend validators are likely checking that fields should NOT exist, instead of validating their content
2. **Validation Configuration Override:** All DTOs may have been configured with restrictive validation that rejects documented fields
3. **Incomplete DTO Implementation:** DTOs may not be properly mapped to their actual validation schema
4. **Validation Decorator Mismatch:** Validators may have been copied/pasted incorrectly, inverting the validation logic

### Evidence

- **Consistent pattern:** Same validation error format across multiple endpoints ("property X should not exist")
- **Multiple fields affected:** Not isolated to one or two fields, but entire request structures
- **Documented vs actual:** Clear mismatch between API documentation and actual validation

---

## Alternative Solutions (If Backend Cannot Be Fixed Immediately)

If the backend team cannot implement the documented API, please provide:

1. **Updated API Documentation** reflecting the actual implementation
2. **Actual Field Requirements** - what fields the endpoint currently accepts
3. **Temporary Workaround** - alternative endpoint or payload structure to use

---

## Frontend Impact

**Status:** Blocked - Multiple Critical Features  
**Endpoints Affected:**
- `POST /admin/categories` - Category creation blocked
- `POST /admin/products` - Product creation blocked
- GET endpoints - Data retrieval blocked

**Components Affected:**
- `src/app/features/products/categories/product-categories.component.ts`
- `src/app/features/products/list/product-list.component.ts`
- `src/app/features/products/services/admin-products.service.ts`
- Multiple list/detail components depending on GET endpoints

**User Impact:**
- ❌ Admins cannot create product categories
- ❌ Admins cannot create products
- ❌ Admins cannot view product listings (if GET affected)
- ❌ Product catalog features completely blocked
- ❌ Cannot organize products without categories
- ❌ Cannot configure product visibility and merchant assignment

---

## Contact

**Frontend Team**  
**Date Reported:** March 2, 2026  
**Priority:** High - Blocking core functionality

---

## Notes

- **System-wide issue:** Not isolated to one endpoint; affects multiple validation layers
- Tested with Bearer token authentication (verified working on other endpoints)
- Network requests confirmed successful (reaching backend)
- Issue is isolated to validation layer, not authentication or authorization
- Both curl and frontend application produce same errors
- Pattern suggests validation configuration was inverted across multiple DTOs
- **Recommendation:** Review entire validation layer for `@IsEmpty()` vs `@IsOptional()` vs `@IsNotEmpty()` usage
