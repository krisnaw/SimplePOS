# Sample Data

Sample data for a car repair shop. All prices in IDR (Rp).

---

## Categories

Categories group services and products. The `type` field is either `service` or `product` — a category only holds one type.

| id | name | type | is_active |
|----|------|------|-----------|
| 1 | Engine & Oil | service | true |
| 2 | Brakes | service | true |
| 3 | Electrical | service | true |
| 4 | Body & Exterior | service | true |
| 5 | Tires & Wheels | service | true |
| 6 | Lubricants & Fluids | product | true |
| 7 | Filters | product | true |
| 8 | Brake Parts | product | true |
| 9 | Electrical Parts | product | true |
| 10 | Tires & Wheels Parts | product | true |

---

## Services

Services are labor items billed to a work order. Each service belongs to one category and has a flat `price` charged per job.

| id | category_id | name | description | price | is_active |
|----|-------------|------|-------------|-------|-----------|
| 1 | 1 | Oil Change | Drain old oil, replace oil filter, refill with new engine oil | 75000 | true |
| 2 | 1 | Engine Tune-Up | Inspect and adjust spark plugs, air filter, and fuel system | 350000 | true |
| 3 | 1 | Timing Belt Replacement | Remove and replace timing belt and tensioner | 500000 | true |
| 4 | 2 | Brake Pad Replacement (Front) | Replace front brake pads and inspect rotors | 200000 | true |
| 5 | 2 | Brake Pad Replacement (Rear) | Replace rear brake pads and inspect rotors | 200000 | true |
| 6 | 2 | Brake Disc Replacement | Remove and replace worn brake disc/rotor | 300000 | true |
| 7 | 3 | Battery Replacement | Remove old battery, install new battery, test charging system | 100000 | true |
| 8 | 3 | Alternator Repair | Diagnose and repair or replace alternator | 450000 | true |
| 9 | 3 | AC Service | Recharge refrigerant and check AC system performance | 250000 | true |
| 10 | 4 | Full Body Polish | Machine polish and wax entire exterior | 400000 | true |
| 11 | 4 | Dent Repair (minor) | PDR technique for small dents without repainting | 150000 | true |
| 12 | 5 | Tire Rotation | Rotate all four tires and adjust pressure | 80000 | true |
| 13 | 5 | Wheel Alignment | 4-wheel computerized alignment | 150000 | true |
| 14 | 5 | Tire Balancing | Balance all four wheels with weights | 100000 | true |

---

## Products

Products are physical parts and consumables sold or consumed during a work order. Each product has a unique `sku`, a `unit_type` (e.g. `piece`, `litre`, `set`), and stock tracked against a `min_stock` threshold for low-stock alerts.

| id | category_id | sku | name | description | unit_price | unit_type | stock_qty | min_stock | is_sellable | is_active |
|----|-------------|-----|------|-------------|------------|-----------|-----------|-----------|-------------|-----------|
| 1 | 6 | LUB-OIL-5W30-1L | Engine Oil 5W-30 | Semi-synthetic engine oil | 65000 | litre | 50 | 10 | true | true |
| 2 | 6 | LUB-OIL-10W40-1L | Engine Oil 10W-40 | Mineral engine oil | 45000 | litre | 60 | 10 | true | true |
| 3 | 6 | LUB-GREASE-500G | Multipurpose Grease | White lithium grease for joints and bearings | 35000 | piece | 20 | 5 | true | true |
| 4 | 6 | LUB-BRAKE-FL-500ML | Brake Fluid DOT 4 | Brake fluid 500ml bottle | 40000 | piece | 30 | 5 | true | true |
| 5 | 6 | LUB-COOL-1L | Coolant/Radiator Fluid | Ready-mix engine coolant | 30000 | litre | 40 | 8 | true | true |
| 6 | 7 | FLT-OIL-UNIV | Oil Filter Universal | Universal spin-on oil filter | 35000 | piece | 40 | 10 | true | true |
| 7 | 7 | FLT-AIR-STD | Air Filter Standard | Panel air filter for standard cars | 55000 | piece | 25 | 5 | true | true |
| 8 | 7 | FLT-FUEL-STD | Fuel Filter Standard | Inline fuel filter | 45000 | piece | 20 | 5 | true | true |
| 9 | 7 | FLT-CABIN-STD | Cabin Air Filter | Activated carbon cabin filter | 75000 | piece | 15 | 5 | true | true |
| 10 | 8 | BRK-PAD-FRONT-STD | Brake Pad Front (Standard) | Front brake pads, set of 4 | 120000 | set | 20 | 4 | true | true |
| 11 | 8 | BRK-PAD-REAR-STD | Brake Pad Rear (Standard) | Rear brake pads, set of 4 | 110000 | set | 20 | 4 | true | true |
| 12 | 8 | BRK-DISC-FRONT | Brake Disc Front | Front brake rotor/disc | 250000 | piece | 10 | 2 | true | true |
| 13 | 8 | BRK-DISC-REAR | Brake Disc Rear | Rear brake rotor/disc | 220000 | piece | 10 | 2 | true | true |
| 14 | 9 | ELC-BATT-45AH | Car Battery 45Ah | Maintenance-free lead-acid battery | 550000 | piece | 8 | 2 | true | true |
| 15 | 9 | ELC-BATT-60AH | Car Battery 60Ah | Maintenance-free lead-acid battery | 700000 | piece | 6 | 2 | true | true |
| 16 | 9 | ELC-FUSE-BOX | Fuse Assortment Box | Assorted mini blade fuses 5–30A | 45000 | box | 15 | 3 | true | true |
| 17 | 9 | ELC-SPARK-SET | Spark Plug Set | Iridium spark plugs, set of 4 | 180000 | set | 12 | 3 | true | true |
| 18 | 10 | TRE-185-65R15 | Tire 185/65 R15 | Standard passenger tire | 650000 | piece | 16 | 4 | true | true |
| 19 | 10 | TRE-205-55R16 | Tire 205/55 R16 | Performance passenger tire | 850000 | piece | 12 | 4 | true | true |
| 20 | 10 | TRE-VALVE-STD | Tire Valve Stem | Standard rubber valve stem | 8000 | piece | 50 | 10 | true | true |

---

## Customers

Customers are the vehicle owners who bring their cars in for service. Each customer can own multiple vehicles and have multiple work orders over time.

| id | name | phone | email | address | created_at |
|----|------|-------|-------|---------|------------|
| 1 | Budi Santoso | 081234567890 | budi.santoso@gmail.com | Jl. Mawar No. 12, Jakarta Selatan | 2026-01-05 08:00:00 |
| 2 | Dewi Rahayu | 082345678901 | dewi.rahayu@yahoo.com | Jl. Melati No. 5, Bekasi | 2026-01-10 09:30:00 |
| 3 | Agus Wijaya | 083456789012 | agus.wijaya@gmail.com | Jl. Kenanga No. 8, Depok | 2026-02-03 10:00:00 |
| 4 | Siti Nurhaliza | 084567890123 | siti.nurhaliza@hotmail.com | Jl. Anggrek No. 21, Tangerang | 2026-02-15 11:15:00 |
| 5 | Rian Pratama | 085678901234 | rian.pratama@gmail.com | Jl. Dahlia No. 3, Bogor | 2026-03-01 13:00:00 |

---

## Vehicles

Vehicles belong to customers and are the subject of each work order. A single customer may have more than one vehicle registered.

| id | customer_id | make | model | year | plate_no | notes | created_at |
|----|-------------|------|-------|------|----------|-------|------------|
| 1 | 1 | Toyota | Avanza | 2019 | B 1234 ABC | Regular customer, prefers 5W-30 oil | 2026-01-05 08:05:00 |
| 2 | 2 | Honda | Brio | 2021 | D 5678 XYZ | AC unit frequently needs recharging | 2026-01-10 09:35:00 |
| 3 | 3 | Suzuki | Ertiga | 2018 | F 9012 DEF | Timing belt due for replacement | 2026-02-03 10:05:00 |
| 4 | 4 | Daihatsu | Xenia | 2020 | T 3456 GHI | Front brake pads worn down | 2026-02-15 11:20:00 |
| 5 | 5 | Mitsubishi | Pajero Sport | 2022 | F 7890 JKL | Four-wheel drive, uses 10W-40 oil | 2026-03-01 13:05:00 |

---

## Work Orders

Work orders track the repair or service job for a specific vehicle. Each work order is assigned to a staff member and progresses through statuses: `open`, `in_progress`, `completed`, `cancelled`.

| id | customer_id | vehicle_id | assigned_user_id | status | notes | created_at | completed_at |
|----|-------------|------------|------------------|--------|-------|------------|--------------|
| 1 | 1 | 1 | 1 | completed | Routine oil change and filter replacement | 2026-04-01 08:30:00 | 2026-04-01 09:15:00 |
| 2 | 2 | 2 | 1 | completed | AC recharge and cabin filter replacement | 2026-04-03 10:00:00 | 2026-04-03 11:30:00 |
| 3 | 3 | 3 | 1 | completed | Timing belt replacement, full tune-up | 2026-04-10 09:00:00 | 2026-04-10 12:00:00 |
| 4 | 4 | 4 | 1 | in_progress | Front and rear brake pad replacement | 2026-05-02 08:00:00 | null |
| 5 | 5 | 5 | 1 | open | Wheel alignment and tire rotation requested | 2026-05-15 14:00:00 | null |

---

## Work Order Items

Work order items are the individual service or product lines within a work order. `item_type` is either `service` or `product`; exactly one of `service_id` or `product_id` is set per row.

| id | work_order_id | item_type | service_id | product_id | quantity | unit_price | subtotal | created_at |
|----|---------------|-----------|------------|------------|----------|------------|----------|------------|
| 1 | 1 | service | 1 | null | 1 | 75000 | 75000 | 2026-04-01 08:35:00 |
| 2 | 1 | product | null | 1 | 4 | 65000 | 260000 | 2026-04-01 08:35:00 |
| 3 | 1 | product | null | 6 | 1 | 35000 | 35000 | 2026-04-01 08:35:00 |
| 4 | 2 | service | 9 | null | 1 | 250000 | 250000 | 2026-04-03 10:05:00 |
| 5 | 2 | product | null | 9 | 1 | 75000 | 75000 | 2026-04-03 10:05:00 |
| 6 | 3 | service | 3 | null | 1 | 500000 | 500000 | 2026-04-10 09:05:00 |
| 7 | 3 | service | 2 | null | 1 | 350000 | 350000 | 2026-04-10 09:05:00 |
| 8 | 3 | product | null | 17 | 1 | 180000 | 180000 | 2026-04-10 09:05:00 |
| 9 | 4 | service | 4 | null | 1 | 200000 | 200000 | 2026-05-02 08:05:00 |
| 10 | 4 | product | null | 10 | 1 | 120000 | 120000 | 2026-05-02 08:05:00 |

---

## Invoices

Invoices are generated from completed work orders. Each work order produces at most one invoice. `status` is either `paid` or `unpaid`.

| id | work_order_id | created_by | subtotal | discount | tax | grand_total | payment_method | status | paid_at | created_at |
|----|---------------|------------|----------|----------|-----|-------------|----------------|--------|---------|------------|
| 1 | 1 | 1 | 370000 | 0 | 0 | 370000 | cash | paid | 2026-04-01 09:15:00 | 2026-04-01 09:15:00 |
| 2 | 2 | 1 | 325000 | 25000 | 0 | 300000 | cash | paid | 2026-04-03 11:30:00 | 2026-04-03 11:30:00 |
| 3 | 3 | 1 | 1030000 | 0 | 0 | 1030000 | transfer | paid | 2026-04-10 12:00:00 | 2026-04-10 12:00:00 |
| 4 | 4 | 1 | 320000 | 0 | 0 | 320000 | cash | unpaid | null | 2026-05-02 08:05:00 |
| 5 | 5 | 1 | 230000 | 0 | 0 | 230000 | cash | unpaid | null | 2026-05-15 14:05:00 |

---

## Sales

Sales are direct over-the-counter transactions — selling spare parts or services without a work order. `customer_id` is nullable for anonymous walk-in customers.

### Sale #1 — 2026-04-05 10:00

| Field | Value |
|-------|-------|
| Customer | Budi Santoso (id: 1) |
| Served by | Administrator (id: 1) |
| Payment | Cash |
| Status | Paid |

| # | Type | Item | Qty | Unit | Unit Price | Subtotal |
|---|------|------|-----|------|------------|----------|
| 1 | Service | Oil Change | 1 | job | Rp 75,000 | Rp 75,000 |
| 2 | Product | Engine Oil 5W-30 | 4 | litre | Rp 65,000 | Rp 260,000 |
| 3 | Product | Oil Filter Universal | 1 | piece | Rp 35,000 | Rp 35,000 |

| | |
|---|---|
| Subtotal | Rp 370,000 |
| Discount | Rp 0 |
| Tax | Rp 0 |
| **Grand Total** | **Rp 370,000** |

---

### Sale #2 — 2026-04-08 14:30

| Field | Value |
|-------|-------|
| Customer | Walk-in (anonymous) |
| Served by | Administrator (id: 1) |
| Payment | Transfer |
| Status | Paid |

| # | Type | Item | Qty | Unit | Unit Price | Subtotal |
|---|------|------|-----|------|------------|----------|
| 1 | Service | Tire Rotation | 1 | job | Rp 80,000 | Rp 80,000 |
| 2 | Service | Wheel Alignment | 1 | job | Rp 150,000 | Rp 150,000 |
| 3 | Product | Tire 185/65 R15 | 2 | piece | Rp 650,000 | Rp 1,300,000 |
| 4 | Product | Tire Valve Stem | 4 | piece | Rp 8,000 | Rp 32,000 |

| | |
|---|---|
| Subtotal | Rp 1,562,000 |
| Discount | Rp 62,000 |
| Tax | Rp 0 |
| **Grand Total** | **Rp 1,500,000** |

---

## Sale Items

Sale items are the individual product or service lines within a sale. Mirrors `work_order_items` but linked to `sales` instead of `work_orders`.

| id | sale_id | item_type | service_id | product_id | name | quantity | unit_price | subtotal | created_at |
|----|---------|-----------|------------|------------|------|----------|------------|----------|------------|
| 1 | 1 | service | 1 | null | Oil Change | 1 | 75000 | 75000 | 2026-04-05 10:00:00 |
| 2 | 1 | product | null | 1 | Engine Oil 5W-30 | 4 | 65000 | 260000 | 2026-04-05 10:00:00 |
| 3 | 1 | product | null | 6 | Oil Filter Universal | 1 | 35000 | 35000 | 2026-04-05 10:00:00 |
| 4 | 2 | service | 12 | null | Tire Rotation | 1 | 80000 | 80000 | 2026-04-08 14:30:00 |
| 5 | 2 | service | 13 | null | Wheel Alignment | 1 | 150000 | 150000 | 2026-04-08 14:30:00 |
| 6 | 2 | product | null | 18 | Tire 185/65 R15 | 2 | 650000 | 1300000 | 2026-04-08 14:30:00 |
| 7 | 2 | product | null | 20 | Tire Valve Stem | 4 | 8000 | 32000 | 2026-04-08 14:30:00 |
