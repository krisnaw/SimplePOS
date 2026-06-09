import { sql } from 'drizzle-orm'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export type UnitType = 'piece' | 'litre' | 'set' | 'box'

export const productCategories = sqliteTable('product_categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  description: text('description'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
})

export type ProductCategory = typeof productCategories.$inferSelect
export type NewProductCategory = typeof productCategories.$inferInsert

export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  categoryId: integer('category_id').references(() => productCategories.id),
  sku: text('sku').notNull().unique(),
  barcode: text('barcode').unique(),
  name: text('name').notNull(),
  description: text('description'),
  unitPrice: integer('unit_price').notNull().default(0),
  unitType: text('unit_type').notNull().$type<UnitType>().default('piece'),
  stockQty: integer('stock_qty').notNull().default(0),
  minStock: integer('min_stock').notNull().default(0),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
})

export type Product = typeof products.$inferSelect
export type NewProduct = typeof products.$inferInsert
