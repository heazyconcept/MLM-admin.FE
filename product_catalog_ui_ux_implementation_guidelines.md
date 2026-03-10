# Product Catalog Management — UI/UX Implementation Guidelines

## Purpose
This document serves as a **practical implementation guide** for developers building the Product Catalog Management admin UI. It translates the product specification into clear UI/UX rules, interaction patterns, and layout decisions to ensure consistency, scalability, and senior-level execution.

This is a **UI-only implementation** using mock data.

---

## Core Design Philosophy

### 1. Admin Velocity First
- Optimize for speed, clarity, and repeat actions
- Reduce context switching
- Prioritize table-first workflows

### 2. Draft-First Mental Model
- Product creation is non-destructive
- All new products start as **Draft**
- Activation is a deliberate, separate action

### 3. Progressive Disclosure
- Simple actions stay close (drawer)
- Complex configuration earns a full page

---

## Primary Route Structure

| Route | Purpose |
|------|--------|
| `/admin/products` | Catalog overview & management |
| `/admin/products/new` | (Optional) Deep create via full page |
| `/admin/products/:id/edit` | Full product configuration |
| `/admin/products/:id` | Product detail (read-first) |

---

## Product Catalog Overview Page (`/admin/products`)

### Page Responsibilities
- Display product inventory
- Enable filtering and discovery
- Support fast product creation
- Allow quick state actions

### Layout Hierarchy
1. Page header (title + Add Product CTA)
2. Filter row (search, category, status)
3. Product table (primary focus)

---

## Product Creation Strategy

### Drawer-Based Creation (Primary Flow)

**Trigger:** `Add Product` button

**Interaction:**
- Opens right-side drawer
- Background table remains visible
- Drawer width: ~420–480px

**Purpose:**
Fast creation → Save as Draft → Continue later

---

## Drawer Content Rules

### Allowed Fields (Only These)
1. Product Name (required)
2. Category (required)
3. Price (optional)
4. Currency (optional)
5. PV / CPV (optional)
6. Primary Image upload
7. Status (default: Draft, read-only)

> ⚠️ No merchant assignment
> ⚠️ No availability rules
> ⚠️ No lifecycle controls

---

### Drawer Layout Structure

- **Header**
  - Title: "Create Product"
  - Status indicator: Draft

- **Body**
  - Vertically stacked form fields
  - No sectioning, rely on spacing
  - Clear labels, subtle helper text

- **Footer (Sticky)**
  - Cancel
  - Save as Draft (primary action)

---

### Drawer Interaction Rules
- ESC closes drawer
- Clicking outside prompts confirmation if dirty
- Successful save:
  - Drawer closes
  - Product appears at top of table
  - Status = Draft
  - Subtle highlight animation

---

## Product Table Guidelines

### Table Role
The table is the **core workspace** — not just a list.

### Recommended Columns
- Product Name (+ SKU)
- Category
- Price + Currency
- PV / CPV
- Status
- Assigned Merchants (count)
- Actions

---

### Row Anatomy

**Product Name Cell:**
- Name (primary)
- SKU (muted, secondary)

**Status Cell:**
- Draft → neutral tone
- Active → clear but not aggressive
- Archived → visually de-emphasized

**Actions:**
- Edit
- Activate / Deactivate
- Archive

---

## Editing Strategy

### Quick Edits
- Open drawer (reuse create component)
- Fields: name, price, image, category

### Deep Configuration
- Route to `/admin/products/:id/edit`
- Full page layout

Use drawers for **speed**, pages for **safety**.

---

## Full Edit Page (`/admin/products/:id/edit`)

### Page Sections
1. Basic Information
2. Pricing & Points
3. Media
4. Availability
5. Merchant Assignment

Each section:
- Clearly separated
- Explicit save actions
- No hidden side effects

---

## Product Status Management

### Allowed States
- Draft
- Active
- Inactive
- Archived

### Rules
- No deletion
- State changes require confirmation
- Live products show warning banner

---

## UX Safeguards

- Confirmation modals for destructive actions
- Inline validation on required fields
- Clear empty states
- No silent failures

---

## Accessibility & Consistency

- Consistent pricing formatting
- Keyboard-navigable drawer
- Accessible image upload
- Clear visual hierarchy

---

## Summary

This approach:
- Aligns with governance-safe admin systems
- Scales cleanly when backend is introduced
- Balances speed with control
- Matches mature admin platforms (Stripe, Shopify, Linear)

Developers should follow this document strictly to maintain UI/UX integrity and avoid feature creep.

---

**Status:** Approved for implementation

