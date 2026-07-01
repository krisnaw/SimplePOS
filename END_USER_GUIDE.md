# SimplePOS End User Guide

## Getting Started

1. Launch SimplePOS.
2. Enter your email and password.
3. Select **Sign in**.
4. Confirm the database indicator shows that SimplePOS is connected.

Admin accounts can manage configuration and inventory. Cashier accounts focus
on daily sales and invoice lookup.

## Daily Sales Workflow

SimplePOS uses one customer-sale flow:

```text
Vehicle Intake
-> In Progress sale
-> Products & Services
-> Current Sale
-> Cash checkout
-> Invoice
```

### 1. Find or Add the Vehicle

1. Open **Sales**.
2. Search Vehicle Intake by plate, vehicle, customer, phone, or notes.
3. Select the vehicle to start a sale.
4. If no vehicle matches, add the vehicle from the search results.

Every sale requires a vehicle. A vehicle can have only one open sale. Selecting
a vehicle that already has an open sale activates that sale instead of creating
a duplicate.

### 2. Work With Open Sales

- All open sales remain visible under **In Progress**.
- Select an In Progress entry to continue it without searching again.
- A **Stale** badge means the sale has not been updated for more than seven days.
- Stale sales remain usable.
- Use the trash action to permanently delete an unfinished sale that is no
  longer needed. Deleting a draft does not change stock.

### 3. Add Products and Services

1. Select an open sale.
2. Choose products or services from the catalog.
3. Use plus and minus controls to adjust quantities.
4. Review each line total and the sale total.

Products come from inventory and reduce stock only after checkout. Services do
not affect stock.

### 4. Adjust a Unit Price

1. Select the edit-price action on a Current Sale line.
2. Enter a non-negative whole amount.
3. Confirm the new price.

An adjusted line shows an **Adjusted** badge and its original catalog price.
SimplePOS records who changed the price and when. No reason is required.
Entering the catalog price again clears the adjustment.

### 5. Complete Cash Checkout

1. Confirm the Current Sale quantities, prices, and total.
2. Select **Checkout**.
3. Confirm that cash equal to the exact displayed total was received.
4. Select **Cash received** once.

Checkout:

- completes the sale;
- creates a paid invoice;
- records a paid cash payment equal to the total;
- decreases product stock;
- removes the sale from **In Progress**.

SimplePOS does not handle deposits, partial payments, unpaid completion,
overpayment, change calculation, transfer, card payment, or refunds.
Physical cash handling and cash-drawer balancing occur outside the app.

## Invoices and Receipts

1. Open **Invoices** after checkout.
2. Search by plate, invoice number, customer, or payment information.
3. Select an invoice to review it.

The vehicle plate is the primary invoice identifier. Invoice detail includes:

- plate number and vehicle description;
- customer and phone;
- product and service lines;
- quantities, unit prices, and totals;
- cash payment status and amount.

Use **Preview** to inspect the receipt and **Print** to produce a customer copy.

## Vehicles

Use **Vehicles** to maintain plate, make, model, year, color, customer, phone,
and notes. Accurate vehicle records make Sales search and invoice lookup faster.

## Inventory

### Products

- Maintain SKU, name, selling price, stock, unit type, and minimum stock.
- Keep a product active when it should appear in Sales.
- Low-stock indicators help identify products that need replenishment.

### Services

- Maintain the services offered by the shop and their default catalog prices.
- Service prices can still be adjusted on an individual sale.

### Supplier Purchases

1. Open **Inventory**, then **Purchases**.
2. Select **Record Purchase**.
3. Choose an active supplier.
4. Enter invoice details when available.
5. Add products, received quantities, and unit purchase costs.
6. Review and confirm the purchase.

Posting a purchase immediately increases product stock. Use **Needs Invoice** for
received goods missing supplier invoice details and **Unpaid** for supplier
invoices that still need payment.

## Troubleshooting

- Product missing from Sales: confirm it is active and has stock.
- Service missing from Sales: confirm it is active.
- Vehicle already has an ongoing sale: select it from **In Progress**.
- Invoice missing: confirm checkout showed a success message.
- Stock did not change: confirm checkout completed rather than leaving a draft.
- Login failed: verify your email and password with an administrator.
- Database unavailable: restart SimplePOS and check the database indicator.
