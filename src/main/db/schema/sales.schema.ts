import { sql } from 'drizzle-orm'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { customers } from './customer.schema'
import { products } from './product.schema'
import { services } from './service.schema'
import { users } from './user.schema'

export type SaleStatus = 'completed' | 'void'
export type SaleItemType = 'product' | 'service'
export type InvoiceStatus = 'paid' | 'void'
export type PaymentMethod = 'cash' | 'transfer' | 'card'
export type PaymentStatus = 'paid' | 'refunded' | 'void'

export const sales = sqliteTable('sales', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  customerId: integer('customer_id').references(() => customers.id),
  createdById: integer('created_by_id').references(() => users.id),
  status: text('status').notNull().$type<SaleStatus>().default('completed'),
  subtotal: integer('subtotal').notNull().default(0),
  discount: integer('discount').notNull().default(0),
  tax: integer('tax').notNull().default(0),
  total: integer('total').notNull().default(0),
  notes: text('notes'),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
})

export type Sale = typeof sales.$inferSelect
export type NewSale = typeof sales.$inferInsert

export const saleItems = sqliteTable('sale_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  saleId: integer('sale_id').notNull().references(() => sales.id),
  itemType: text('item_type').notNull().$type<SaleItemType>(),
  productId: integer('product_id').references(() => products.id),
  serviceId: integer('service_id').references(() => services.id),
  name: text('name').notNull(),
  sku: text('sku'),
  quantity: integer('quantity').notNull(),
  unitPrice: integer('unit_price').notNull(),
  lineTotal: integer('line_total').notNull(),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
})

export type SaleItem = typeof saleItems.$inferSelect
export type NewSaleItem = typeof saleItems.$inferInsert

export const invoices = sqliteTable('invoices', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  saleId: integer('sale_id').notNull().references(() => sales.id),
  invoiceNumber: text('invoice_number').notNull().unique(),
  status: text('status').notNull().$type<InvoiceStatus>().default('paid'),
  subtotal: integer('subtotal').notNull().default(0),
  discount: integer('discount').notNull().default(0),
  tax: integer('tax').notNull().default(0),
  total: integer('total').notNull().default(0),
  issuedAt: text('issued_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
})

export type Invoice = typeof invoices.$inferSelect
export type NewInvoice = typeof invoices.$inferInsert

export const payments = sqliteTable('payments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  saleId: integer('sale_id').notNull().references(() => sales.id),
  invoiceId: integer('invoice_id').notNull().references(() => invoices.id),
  method: text('method').notNull().$type<PaymentMethod>(),
  status: text('status').notNull().$type<PaymentStatus>().default('paid'),
  amount: integer('amount').notNull(),
  paidAt: text('paid_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
})

export type Payment = typeof payments.$inferSelect
export type NewPayment = typeof payments.$inferInsert
