# SimplePOS — Screens / Pages

## 1. Auth

| Screen | Role | Description |
|---|---|---|
| Login | All | Email + password login, role-based redirect |

---

## 2. Dashboard

| Screen | Role | Description |
|---|---|---|
| Admin Dashboard | Admin | Today's revenue, open work orders, low-stock alerts, recent transactions |
| Cashier Dashboard | Cashier | Today's transactions, open work orders assigned to them |

---

## 3. POS / Work Order

| Screen | Role | Description |
|---|---|---|
| New Work Order | Admin, Cashier | Select customer + vehicle, add services and parts, set notes |
| Work Order Detail | Admin, Cashier | View/edit a work order, change status, print invoice |
| Work Order List | Admin, Cashier | List of all work orders, filterable by status and date |
| Invoice / Checkout | Admin, Cashier | Review totals, choose payment method, confirm payment |
| Receipt Preview | Admin, Cashier | Printable receipt after checkout |

Work order statuses: `pending → in_progress → completed → invoiced`

---

## 4. Customers

| Screen | Role | Description |
|---|---|---|
| Customer List | Admin, Cashier | Search and browse customers |
| Customer Detail | Admin, Cashier | Customer info, linked vehicles, work order history |
| Add / Edit Customer | Admin, Cashier | Form to create or update a customer |
| Add / Edit Vehicle | Admin, Cashier | Form to add or edit a vehicle under a customer |

---

## 5. Services

| Screen | Role | Description |
|---|---|---|
| Service List | Admin | All services with price and category, toggle active/inactive |
| Add / Edit Service | Admin | Form to create or update a service |

---

## 6. Inventory (Products)

| Screen | Role | Description |
|---|---|---|
| Product List | Admin | All products with stock level, SKU, price; highlights low-stock items |
| Add / Edit Product | Admin | Form to create or update a product |
| Stock Adjustment | Admin | Manually adjust stock quantity with reason note |

---

## 7. Reports

| Screen | Role | Description |
|---|---|---|
| Sales Report | Admin | Revenue by day/week/month, filterable by date range |
| Work Order Report | Admin | Count by status, average completion time |
| Inventory Report | Admin | Stock levels, parts usage, low-stock summary |

---

## 8. Settings

| Screen | Role | Description |
|---|---|---|
| User Management | Admin | List users, add/edit/deactivate cashier accounts |
| Shop Settings | Admin | Shop name, address, receipt header/footer |
| Category Management | Admin | Add/edit/delete service and part categories |
