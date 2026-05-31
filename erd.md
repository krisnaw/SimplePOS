# SimplePOS — Entity Relationship Diagram (ERD)

## Diagram

```
┌─────────────┐       ┌─────────────────┐       ┌─────────────┐
│    users    │       │   work_orders   │       │  customers  │
│─────────────│       │─────────────────│       │─────────────│
│ id (PK)     │──┐    │ id (PK)         │──┐    │ id (PK)     │
│ name        │  │    │ customer_id (FK)│  │    │ name        │
│ email       │  │    │ vehicle_id (FK) │  │    │ phone       │
│ password    │  └───>│ user_id (FK)    │  │    │ email       │
│ role        │       │ status          │  │    │ address     │
│ created_at  │       │ notes           │  │    │ created_at  │
└─────────────┘       │ created_at      │  │    └─────────────┘
                      │ completed_at    │  │           │
                      └─────────────────┘  │           │
                               │           │    ┌──────┴──────┐
                               │           │    │   vehicles  │
                               ▼           │    │─────────────│
                   ┌───────────────────┐   └───>│ id (PK)     │
                   │ work_order_items  │        │ customer_id │
                   │───────────────────│        │ make        │
                   │ id (PK)           │        │ model       │
                   │ work_order_id (FK)│        │ year        │
                   │ item_type         │        │ plate_no    │
                   │ service_id (FK)   │        │ notes       │
                   │ product_id (FK)   │        └─────────────┘
                   │ qty               │
                   │ unit_price        │
                   │ subtotal          │
                   └───────────────────┘
                         │         │
              ┌──────────┘         └──────────┐
              ▼                               ▼
   ┌──────────────────┐           ┌──────────────────┐
   │     services     │           │     products     │
   │──────────────────│           │──────────────────│
   │ id (PK)          │           │ id (PK)          │
   │ name             │           │ name             │
   │ description      │           │ sku              │
   │ price            │           │ description      │
   │ category_id (FK) │           │ unit_price       │
   │ is_active        │           │ stock_qty        │
   └──────────────────┘           │ min_stock        │
              │                   │ unit_of_measure  │
              │                   │ is_sellable      │
              │                   │ category_id (FK) │
              │                   │ is_active        │
              │                   └──────────────────┘
              │                              │
              └──────────┬───────────────────┘
                         ▼
              ┌──────────────────┐
              │    categories    │
              │──────────────────│
              │ id (PK)          │
              │ name             │
              │ type (service /  │
              │       part)      │
              └──────────────────┘

┌─────────────────────────────────────────┐
│              invoices                   │
│─────────────────────────────────────────│
│ id (PK)                                 │
│ work_order_id (FK)                      │
│ subtotal                                │
│ discount                                │
│ tax                                     │
│ grand_total                             │
│ payment_method (cash / transfer / card) │
│ paid_at                                 │
│ created_by (FK → users)                 │
└─────────────────────────────────────────┘
```

## Relationships Summary

| From | To | Cardinality |
|---|---|---|
| customers | vehicles | One to Many |
| customers | work_orders | One to Many |
| vehicles | work_orders | One to Many |
| users | work_orders | One to Many (assigned mechanic/cashier) |
| work_orders | work_order_items | One to Many |
| work_order_items | services | Many to One (nullable) |
| work_order_items | products | Many to One (nullable) |
| services | categories | Many to One |
| products | categories | Many to One |
| work_orders | invoices | One to One |
| users | invoices | One to Many (created_by) |
