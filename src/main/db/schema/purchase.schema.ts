import { sql } from 'drizzle-orm'
import { check, index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { products } from './product.schema'
import { suppliers } from './supplier.schema'
import { users } from './user.schema'

export type PurchasePaymentStatus = 'paid' | 'unpaid'
export type PurchaseInvoiceStatus = 'pending' | 'received'

export const purchases = sqliteTable('purchases', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  purchaseNumber: text('purchase_number').notNull(),
  supplierId: integer('supplier_id').notNull().references(() => suppliers.id),
  supplierInvoiceNumber: text('supplier_invoice_number'),
  normalizedInvoiceNumber: text('normalized_invoice_number'),
  invoiceDate: text('invoice_date'),
  paymentStatus: text('payment_status').notNull().$type<PurchasePaymentStatus>().default('unpaid'),
  invoiceStatus: text('invoice_status').notNull().$type<PurchaseInvoiceStatus>().default('received'),
  dueDate: text('due_date'),
  paidAt: text('paid_at'),
  notes: text('notes'),
  total: integer('total').notNull().default(0),
  createdById: integer('created_by_id').notNull().references(() => users.id),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
}, (table) => [
  uniqueIndex('purchases_purchase_number_unique').on(table.purchaseNumber),
  uniqueIndex('purchases_supplier_invoice_unique')
    .on(table.supplierId, table.normalizedInvoiceNumber)
    .where(sql`${table.normalizedInvoiceNumber} IS NOT NULL AND ${table.normalizedInvoiceNumber} <> ''`),
  index('purchases_supplier_id_idx').on(table.supplierId),
  index('purchases_invoice_date_idx').on(table.invoiceDate),
  index('purchases_payment_status_idx').on(table.paymentStatus),
  index('purchases_invoice_status_idx').on(table.invoiceStatus),
  check('purchases_total_non_negative', sql`${table.total} >= 0`),
])

export type Purchase = typeof purchases.$inferSelect
export type NewPurchase = typeof purchases.$inferInsert

export const purchaseItems = sqliteTable('purchase_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  purchaseId: integer('purchase_id').notNull().references(() => purchases.id),
  productId: integer('product_id').notNull().references(() => products.id),
  skuSnapshot: text('sku_snapshot').notNull(),
  productNameSnapshot: text('product_name_snapshot').notNull(),
  quantity: integer('quantity').notNull(),
  unitCost: integer('unit_cost').notNull(),
  lineTotal: integer('line_total').notNull(),
}, (table) => [
  uniqueIndex('purchase_items_purchase_product_unique').on(table.purchaseId, table.productId),
  index('purchase_items_purchase_id_idx').on(table.purchaseId),
  index('purchase_items_product_id_idx').on(table.productId),
  check('purchase_items_quantity_positive', sql`${table.quantity} > 0`),
  check('purchase_items_unit_cost_non_negative', sql`${table.unitCost} >= 0`),
  check('purchase_items_line_total_non_negative', sql`${table.lineTotal} >= 0`),
])

export type PurchaseItem = typeof purchaseItems.$inferSelect
export type NewPurchaseItem = typeof purchaseItems.$inferInsert
