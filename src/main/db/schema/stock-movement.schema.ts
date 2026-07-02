import { sql } from 'drizzle-orm'
import { check, index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { products, type UnitType } from './product.schema'
import { users } from './user.schema'

export type StockMovementType = 'opening' | 'purchase' | 'sale' | 'adjustment'

export const stockMovements = sqliteTable('stock_movements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id').notNull().references(() => products.id),
  skuSnapshot: text('sku_snapshot').notNull(),
  productNameSnapshot: text('product_name_snapshot').notNull(),
  unitTypeSnapshot: text('unit_type_snapshot').notNull().$type<UnitType>(),
  movementType: text('movement_type').notNull().$type<StockMovementType>(),
  quantityDelta: integer('quantity_delta').notNull(),
  balanceAfter: integer('balance_after').notNull(),
  referenceType: text('reference_type'),
  referenceId: integer('reference_id'),
  referenceNumber: text('reference_number'),
  reason: text('reason'),
  createdById: integer('created_by_id').references(() => users.id),
  createdByNameSnapshot: text('created_by_name_snapshot'),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
}, (table) => [
  index('stock_movements_product_history_idx').on(table.productId, table.createdAt, table.id),
  index('stock_movements_type_created_at_idx').on(table.movementType, table.createdAt),
  index('stock_movements_created_by_id_idx').on(table.createdById),
  uniqueIndex('stock_movements_reference_unique')
    .on(table.referenceType, table.referenceId)
    .where(sql`${table.referenceType} IS NOT NULL AND ${table.referenceId} IS NOT NULL`),
  check('stock_movements_quantity_delta_non_zero', sql`${table.quantityDelta} <> 0`),
  check('stock_movements_balance_after_non_negative', sql`${table.balanceAfter} >= 0`),
  check(
    'stock_movements_type_valid',
    sql`${table.movementType} IN ('opening', 'purchase', 'sale', 'adjustment')`,
  ),
])

export type StockMovement = typeof stockMovements.$inferSelect
export type NewStockMovement = typeof stockMovements.$inferInsert
