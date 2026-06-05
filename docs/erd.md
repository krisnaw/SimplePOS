# SimplePOS ERD

This document describes the target domain model for the SimplePOS car repair shop POS and inventory app. The current implementation already has authentication/system tables; the wider POS and inventory tables are the planned app model.

## Domain ERD

```mermaid
erDiagram
  USERS ||--o{ WORK_ORDERS : assigns
  USERS ||--o{ INVOICES : creates
  CUSTOMERS ||--o{ VEHICLES : owns
  CUSTOMERS ||--o{ WORK_ORDERS : requests
  VEHICLES ||--o{ WORK_ORDERS : receives
  WORK_ORDERS ||--o{ WORK_ORDER_ITEMS : contains
  WORK_ORDERS ||--o| INVOICES : billed_as
  CATEGORIES ||--o{ SERVICES : groups
  CATEGORIES ||--o{ PRODUCTS : groups
  SERVICES ||--o{ WORK_ORDER_ITEMS : used_as_service
  PRODUCTS ||--o{ WORK_ORDER_ITEMS : used_as_part
  USERS ||--o{ SALES : processes
  CUSTOMERS ||--o{ SALES : makes
  SALES ||--o{ SALE_ITEMS : contains
  PRODUCTS ||--o{ SALE_ITEMS : sold_as
  SERVICES ||--o{ SALE_ITEMS : sold_as

  USERS {
    integer id PK
    text email UK
    text name
    text role
    text password_hash
    text password_salt
    boolean is_active
    text created_at
    text updated_at
    text last_login_at
  }

  CUSTOMERS {
    integer id PK
    text name
    text phone
    text email
    text address
    text created_at
    text updated_at
  }

  VEHICLES {
    integer id PK
    integer customer_id FK
    text make
    text model
    integer year
    text plate_no
    text notes
    text created_at
    text updated_at
  }

  CATEGORIES {
    integer id PK
    text name
    text type
    boolean is_active
    text created_at
    text updated_at
  }

  SERVICES {
    integer id PK
    integer category_id FK
    text name
    text description
    numeric price
    boolean is_active
    text created_at
    text updated_at
  }

  PRODUCTS {
    integer id PK
    integer category_id FK
    text sku UK
    text name
    text description
    numeric unit_price
    text unit_type
    integer stock_qty
    integer min_stock
    boolean is_sellable
    boolean is_active
    text created_at
    text updated_at
  }

  SALES {
    integer id PK
    integer customer_id FK
    integer served_by FK
    numeric subtotal
    numeric discount
    numeric tax
    numeric grand_total
    text payment_method
    text status
    text paid_at
    text created_at
    text updated_at
  }

  SALE_ITEMS {
    integer id PK
    integer sale_id FK
    text item_type
    integer service_id FK
    integer product_id FK
    numeric quantity
    numeric unit_price
    numeric subtotal
    text created_at
    text updated_at
  }

  WORK_ORDERS {
    integer id PK
    integer customer_id FK
    integer vehicle_id FK
    integer assigned_user_id FK
    text status
    text notes
    text created_at
    text updated_at
    text completed_at
  }

  WORK_ORDER_ITEMS {
    integer id PK
    integer work_order_id FK
    text item_type
    integer service_id FK
    integer product_id FK
    numeric quantity
    numeric unit_price
    numeric subtotal
    text created_at
    text updated_at
  }

  INVOICES {
    integer id PK
    integer work_order_id FK
    integer created_by FK
    numeric subtotal
    numeric discount
    numeric tax
    numeric grand_total
    text payment_method
    text status
    text paid_at
    text created_at
    text updated_at
  }
```

## Relationship Summary

| From | To | Cardinality | Notes |
|---|---|---:|---|
| `customers` | `vehicles` | 1:N | A customer can own multiple vehicles. |
| `customers` | `work_orders` | 1:N | Work orders are tied to a customer. |
| `vehicles` | `work_orders` | 1:N | Each work order services one vehicle. |
| `users` | `work_orders` | 1:N | A user can be assigned to many work orders. |
| `work_orders` | `work_order_items` | 1:N | Items can be service lines or product/part lines. |
| `services` | `work_order_items` | 1:N | Used when `item_type = service`. |
| `products` | `work_order_items` | 1:N | Used when `item_type = product`. |
| `categories` | `services` | 1:N | Service category grouping. |
| `categories` | `products` | 1:N | Product/part category grouping. |
| `work_orders` | `invoices` | 1:0..1 | A completed work order can become one invoice. |
| `users` | `invoices` | 1:N | Invoice creator/cashier. |
| `users` | `sales` | 1:N | The staff member who processed the sale. |
| `customers` | `sales` | 1:N | Optional — walk-in sales may have no customer. |
| `sales` | `sale_items` | 1:N | Line items for each product or service sold. |
| `products` | `sale_items` | 1:N | Used when `item_type = product`. |
| `services` | `sale_items` | 1:N | Used when `item_type = service`. |

## Product Units And Pricing

Products are priced and stocked by unit type. For example, engine oil can use `unit_type = litre`, while an oil filter can use `unit_type = piece`.

| Field | Purpose |
|---|---|
| `unit_type` | Unit used for stock and sales quantity, such as `piece`, `litre`, `set`, or `box`. |
| `unit_price` | Sale price for one unit of the selected `unit_type`. |
| `stock_qty` | Current stock amount in the selected `unit_type`. |
| `min_stock` | Low-stock threshold in the selected `unit_type`. |

## System Tables

These tables support the Electron/TypeORM SQL.js implementation and are not part of the POS domain model.

```mermaid
erDiagram
  APP_DATABASE_STATUS {
    integer id PK
    text initialized_at
  }

  MIGRATIONS {
    integer id PK
    integer timestamp
    text name
  }
```
