# UI vs ERD Gap Analysis

This document tracks which ERD tables have corresponding UI implementations and which are missing or incomplete. Updated as features are built.

---

## Status Summary

| Section | ERD Table(s) | UI Status |
|---------|-------------|-----------|
| Login | `users` | Connected |
| Users | `users` | Connected |
| Dashboard | — | Placeholder — no DB queries |
| Sales | `sales`, `sale_items`, `products`, `services` | Partial — UI exists, not connected to DB |
| Inventory | `products`, `categories` | Placeholder |
| Work Orders | `work_orders`, `work_order_items` | Placeholder |
| Customers | `customers`, `vehicles` | Placeholder |
| Invoices | `invoices` | Placeholder |
| Reports | — | Placeholder — no DB queries |
| Settings | — | Placeholder |
| Categories | `categories` | No UI — no navigation section |
| Services | `services` | No UI — no navigation section |
| Vehicles | `vehicles` | No UI — nested under Customers (not built) |

---

## Mismatches

### 1. User Role Model

#### Role values

The ERD originally used `staff` as the non-admin role. The implementation uses `cashier` throughout — in `UserEntity`, the migration's `DEFAULT ('cashier')`, `types.ts`, `global.d.ts`, and `UserManagement.tsx`. The ERD has been updated to match.

Valid values for `users.role`:

| Role | Description |
|------|-------------|
| `admin` | Full access. Manages users, oversees all sections. One admin is seeded at first run (`admin@simplepos.com`). |
| `cashier` | Operational access. Processes sales, views stock and customer records. Cannot manage user accounts. |

#### What each role can do — current implementation

| Capability | `admin` | `cashier` |
|-----------|---------|----------|
| View all navigation sections | Yes | Yes (no section hiding yet — see gap below) |
| Create / edit / deactivate users | Yes | No — form is replaced with a read-only notice |
| See the user list | Yes | Yes (list renders, but actions are blocked) |
| Process sales | Yes | Yes |
| All other sections | Placeholder for both | Placeholder for both |

#### Role-gating gaps

The `canManageUsers` guard in `UserManagement.tsx` (`currentUser.role === 'admin'`) blocks the create/edit form for cashiers, but several gaps remain:

| Gap | Detail |
|-----|--------|
| No section-level navigation filtering | All 9 nav items appear for both roles. Users section should be admin-only in the sidebar. |
| Cashier can see the user list | The list renders for cashiers even though they cannot act on it. It should either be hidden or show a stripped read-only view. |
| No role check at the IPC layer | `users.create` and `users.update` in the main process do not verify the calling user's role — only the UI enforces the restriction. |
| No role-based gating elsewhere | As Inventory, Work Orders, Customers, and Invoices are built out, write access will need to be restricted per role. |

**Action:** Fix ERD role label, add sidebar filtering by role, add IPC-level role guard on `users.create` / `users.update`.

---

### 2. SalesWorkspace — not connected to DB

The Sales section has a working cart UI layout but uses hardcoded mock data throughout.

| Gap | Detail |
|-----|--------|
| Products | Hardcoded array, not loaded from `products` table |
| Services | Faked as products with `stock: 999`, no `item_type` separation |
| Customer | No `customer_id` selection (required for named sales) |
| Payment method | No selector — `payment_method` field not collected |
| Discount | No discount input — `discount` field not collected |
| Tax | Hardcoded at 11% — ERD stores the `tax` amount, not a rate |
| Checkout | Button is present but does nothing — no save to `sales` or `sale_items` |

---

### 3. Placeholder sections with no implementation

These navigation sections render a generic `SectionWorkspace` with no real data or actions:

| Section | Missing Tables |
|---------|---------------|
| Inventory | `products`, `categories` |
| Work Orders | `work_orders`, `work_order_items` |
| Customers | `customers`, `vehicles` |
| Invoices | `invoices` |

---

### 4. No UI for Categories or Services

`categories` and `services` have no dedicated navigation section. They will likely need to be added under Inventory (for product categories) and a separate Catalog or Services section.

---

### 5. Vehicles not in navigation

`vehicles` has no section of its own. It is expected to live nested inside the Customers section, but that section is not yet built.

---

## Priority Order (suggested)

1. Fix ERD role label (`staff` → `cashier`)
2. Connect SalesWorkspace to `products` and `services` from DB
3. Add customer selector and payment method to checkout
4. Persist completed sales to `sales` and `sale_items`
5. Build Inventory section (`products`, `categories`)
6. Build Customers section with nested Vehicles
7. Build Work Orders section
8. Build Invoices section
9. Add Categories and Services management
