# SimplePOS End User Guide

Welcome to the **SimplePOS** user guide. This document will help you navigate and use the application effectively to manage your car repair shop.

## 🔑 Getting Started

### Logging In
1.  Launch the SimplePOS application.
2.  Enter your **Email** and **Password** on the login screen.
3.  Click **Login**. Your access level (Admin or Cashier) will determine which features you can see and use.

---

## 📊 Dashboard
The Dashboard is your command center.
-   **Admin View**: Monitor today's total revenue, active work orders, and items that are running low in stock.
-   **Cashier View**: See today's transactions and work orders you are currently managing.

---

## Sales vs Work Orders

SimplePOS has two related but separate workflows:

```txt
Direct Sale
Sales / POS -> Checkout -> Sale + Invoice + Payment
```

```txt
Repair Job
Work Order -> Add services/products -> Complete -> Checkout -> Sale + Invoice + Payment
```

Use **Sales / POS** when the customer pays immediately. This is best for quick product sales, simple service charges, or any transaction where the items and payment are known right away.

Use **Work Orders** when a vehicle or repair job needs to be tracked before payment. A work order records the customer, vehicle, complaint, notes, assigned staff, job status, services, and products while the repair is still being handled.

The records have different purposes:

| Record | Purpose |
|---|---|
| **Work Order** | Tracks the repair job before checkout. |
| **Sale** | Records the financial transaction at checkout. |
| **Invoice** | Provides the final bill or receipt from the sale. |
| **Payment** | Records how the customer paid. |

When a completed Work Order is checked out, SimplePOS creates a normal **Sale**, **Sale Items**, **Invoice**, and **Payment**. The sale and invoice are linked back to the original work order, so the job history and financial record stay connected.

---

## 🚗 Managing Customers & Vehicles
Before creating a work order, you need a customer and their vehicle in the system.

### Adding a New Customer
1.  Navigate to the **Customers** section.
2.  Click **Add Customer**.
3.  Fill in the name, phone number, email, and address.
4.  Click **Save**.

### Adding a Vehicle
1.  Open a customer's profile.
2.  Click **Add Vehicle**.
3.  Enter the vehicle details (Make, Model, Year, Plate Number).
4.  Click **Save**.

---

## 🛠 Work Orders (POS)
The Work Order system is where you record repair jobs. A work order is the parent record for one customer visit: it connects the customer, their vehicle, the reported problem, the services performed, and the products used.

### Work Order Workflow
The normal repair shop flow is:

1.  **Customer arrives**: Select or create the customer record.
2.  **Vehicle is selected**: Link the customer's vehicle to the job.
3.  **Work order is created**: Record the complaint, notes, odometer, and job status.
4.  **Services are added**: Add labor/task items such as inspection, oil change, or brake replacement.
5.  **Products are added**: Add physical inventory items used for the repair, such as oil, filters, brake pads, or fluids.
6.  **Work is completed**: Update the work order status to **Completed**.
7.  **Checkout happens**: Convert the completed work order into a sale/invoice.
8.  **Payment is recorded**: Confirm payment and mark the work order as **Invoiced**.

Relationship example:

```txt
Customer
  Vehicle
    Work Order
      Service item
      Service item
      Product item
      Product item
```

In this structure, services and products are both line items inside the work order. The difference is that products come from inventory and may reduce stock, while services are labor/task charges.

### Sample Work Order Data
This is an example of how one repair job can be stored and checked out.

Customer:

| Field | Value |
|---|---|
| Name | Budi Santoso |
| Phone | 0812-3456-7890 |
| Email | budi@example.com |
| Address | Jl. Gatot Subroto No. 10 |

Vehicle:

| Field | Value |
|---|---|
| Plate Number | DK 1234 AB |
| Brand | Toyota |
| Model | Avanza |
| Year | 2020 |
| Color | Silver |

Work order:

| Field | Value |
|---|---|
| Work Order Number | WO-00028 |
| Customer | Budi Santoso |
| Vehicle | Toyota Avanza - DK 1234 AB |
| Status | Completed |
| Odometer | 42,500 km |
| Complaint | Brake noise when stopping |
| Notes | Inspect front brake system and replace worn parts if needed. |

Line items:

| Type | Item | Qty | Unit Price | Line Total |
|---|---|---:|---:|---:|
| Service | Brake Inspection | 1 | 75,000 | 75,000 |
| Service | Front Brake Pad Replacement | 1 | 150,000 | 150,000 |
| Product | Front Brake Pad Set | 1 | 450,000 | 450,000 |
| Product | Brake Fluid DOT 4 | 1 | 85,000 | 85,000 |

Checkout:

| Field | Value |
|---|---:|
| Subtotal | 760,000 |
| Discount | 0 |
| Total | 760,000 |
| Payment Method | Cash |
| Amount Paid | 760,000 |

After checkout, the work order status becomes **Invoiced**.

### Creating a Work Order
1.  Go to the **Sales/POS** workspace.
2.  Click **New Work Order**.
3.  Select a **Customer** and then select the **Vehicle** to be serviced.
4.  **Add Services**: Select labor items or standard services (e.g., "Oil Change").
5.  **Add Parts**: Select any parts used from the inventory (e.g., "Oil Filter").
6.  Set the initial status to **Pending** or **In Progress**.
7.  Click **Create Work Order**.

### Progressing a Work Order
Work orders follow a simple lifecycle:
`Pending` → `In Progress` → `Completed` → `Invoiced`

Update the status as the work moves through your shop. Once the work is done, set it to **Completed**.

### Checkout & Invoicing
1.  Open a **Completed** work order.
2.  Click **Checkout**.
3.  Review the totals, apply any discounts or tax adjustments.
4.  Select a **Payment Method** (Cash, Transfer, or Card).
5.  Click **Confirm Payment**.
6.  The work order status will change to **Invoiced**, and you can now print or save the **Receipt**.

### Sample Sale With Products
A sale can contain product line items from inventory. In a repair shop, this usually means the final checkout includes both service work and physical parts used during the repair.

Example:

| Type | Item | Qty | Unit Price | Line Total |
|---|---|---:|---:|---:|
| Service | Brake Inspection | 1 | 75,000 | 75,000 |
| Service | Front Brake Pad Replacement | 1 | 150,000 | 150,000 |
| Product | Front Brake Pad Set | 1 | 450,000 | 450,000 |
| Product | Brake Fluid DOT 4 | 1 | 85,000 | 85,000 |

Sale summary:

| Field | Value |
|---|---:|
| Subtotal | 760,000 |
| Discount | 0 |
| Total | 760,000 |
| Payment Method | Cash |
| Amount Paid | 760,000 |

In this example, the product items come from inventory and can reduce stock when the sale is completed.

---

## 📦 Inventory Management (Admin Only)
Keep track of the parts and supplies in your shop.

-   **Product List**: View all items, their current stock, and SKU. Items below their minimum stock level will be highlighted.
-   **Adding Stock**: Edit a product to update its quantity when new shipments arrive.
-   **Services**: Manage the list of services you offer and their standard pricing.

---

## 📈 Reports (Admin Only)
Use the **Reports** section to analyze your business performance:
-   **Sales Report**: View revenue trends over days, weeks, or months.
-   **Work Order Report**: Track how many jobs are being completed and average turnaround times.
-   **Inventory Report**: See which parts are used most often and what needs reordering.

---

## ⚙️ Settings (Admin Only)
-   **User Management**: Create and manage accounts for your staff.
-   **Shop Settings**: Configure your shop's name, address, and receipt branding.
-   **Categories**: Organize your parts and services into logical categories.

---

## ❓ Need Help?
If you encounter any issues or have questions not covered in this guide, please contact your system administrator.
