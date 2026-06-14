import { sql } from 'drizzle-orm'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { customers } from './customer.schema'
import { products } from './product.schema'
import { services } from './service.schema'
import { users } from './user.schema'
import { vehicles } from './vehicle.schema'

export type WorkOrderStatus = 'draft' | 'open' | 'in_progress' | 'completed' | 'invoiced' | 'cancelled'
export type WorkOrderPriority = 'low' | 'normal' | 'high' | 'urgent'
export type WorkOrderItemType = 'product' | 'service'

export const workOrders = sqliteTable('work_orders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orderNumber: text('order_number').notNull().unique(),
  customerId: integer('customer_id').notNull().references(() => customers.id),
  vehicleId: integer('vehicle_id').notNull().references(() => vehicles.id),
  assignedUserId: integer('assigned_user_id').references(() => users.id),
  status: text('status').notNull().$type<WorkOrderStatus>().default('open'),
  priority: text('priority').notNull().$type<WorkOrderPriority>().default('normal'),
  complaint: text('complaint').notNull(),
  notes: text('notes'),
  odometer: integer('odometer'),
  subtotal: integer('subtotal').notNull().default(0),
  discount: integer('discount').notNull().default(0),
  tax: integer('tax').notNull().default(0),
  total: integer('total').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  completedAt: text('completed_at'),
  invoicedAt: text('invoiced_at'),
  cancelledAt: text('cancelled_at'),
})

export type WorkOrder = typeof workOrders.$inferSelect
export type NewWorkOrder = typeof workOrders.$inferInsert

export const workOrderItems = sqliteTable('work_order_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  workOrderId: integer('work_order_id').notNull().references(() => workOrders.id),
  itemType: text('item_type').notNull().$type<WorkOrderItemType>(),
  productId: integer('product_id').references(() => products.id),
  serviceId: integer('service_id').references(() => services.id),
  name: text('name').notNull(),
  sku: text('sku'),
  quantity: integer('quantity').notNull(),
  unitPrice: integer('unit_price').notNull(),
  lineTotal: integer('line_total').notNull(),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
})

export type WorkOrderItem = typeof workOrderItems.$inferSelect
export type NewWorkOrderItem = typeof workOrderItems.$inferInsert
