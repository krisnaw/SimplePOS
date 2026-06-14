import { and, asc, desc, eq } from 'drizzle-orm'
import { flushDatabase } from '../db/client'
import {
  customers,
  invoices,
  products,
  services,
  users,
  vehicles,
  workOrderItems,
  workOrders,
} from '../db/schema/index'
import type {
  PaymentMethod,
  WorkOrder,
  WorkOrderItem,
  WorkOrderItemType,
  WorkOrderPriority,
  WorkOrderStatus,
} from '../db/schema/index'
import { createCheckoutFromPreparedItems } from './checkout.service'
import type { CheckoutResult, PreparedCheckoutLineItem } from './checkout.service'
import { getWorkOrderRepository } from '../repositories/work-order.repository'

export type WorkOrderListInput = {
  search?: unknown
  status?: unknown
  dateFrom?: unknown
  dateTo?: unknown
}

export type WorkOrderItemSummary = {
  id: number
  itemType: WorkOrderItemType
  productId: number | null
  serviceId: number | null
  name: string
  sku: string | null
  quantity: number
  unitPrice: number
  lineTotal: number
  createdAt: string
  updatedAt: string
}

export type WorkOrderSummary = {
  id: number
  orderNumber: string
  customerId: number
  customerName: string
  vehicleId: number
  vehicleName: string
  plateNumber: string
  assignedUserId: number | null
  assignedUserName: string | null
  status: WorkOrderStatus
  priority: WorkOrderPriority
  complaint: string
  notes: string | null
  odometer: number | null
  itemCount: number
  subtotal: number
  discount: number
  tax: number
  total: number
  invoiceId: number | null
  invoiceNumber: string | null
  createdAt: string
  updatedAt: string
  completedAt: string | null
  invoicedAt: string | null
  cancelledAt: string | null
}

export type WorkOrderDetail = WorkOrderSummary & {
  customerPhone: string | null
  customerEmail: string | null
  customerAddress: string | null
  vehicleBrand: string
  vehicleModel: string
  vehicleYear: number | null
  vehicleColor: string | null
  items: WorkOrderItemSummary[]
}

export type WorkOrderMutationResult = {
  ok: boolean
  message: string
  workOrder?: WorkOrderDetail
}

export type WorkOrderCheckoutResult = CheckoutResult & {
  workOrder?: WorkOrderDetail
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function positiveInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null
}

function nonNegativeInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null
}

function isWorkOrderStatus(value: unknown): value is WorkOrderStatus {
  return value === 'draft' ||
    value === 'open' ||
    value === 'in_progress' ||
    value === 'completed' ||
    value === 'invoiced' ||
    value === 'cancelled'
}

function isWorkOrderPriority(value: unknown): value is WorkOrderPriority {
  return value === 'low' || value === 'normal' || value === 'high' || value === 'urgent'
}

function isWorkOrderItemType(value: unknown): value is WorkOrderItemType {
  return value === 'product' || value === 'service'
}

function isPaymentMethod(value: unknown): value is PaymentMethod {
  return value === 'cash' || value === 'transfer' || value === 'card'
}

function canTransition(from: WorkOrderStatus, to: WorkOrderStatus): boolean {
  if (from === to) return true
  if (from === 'invoiced') return false
  if (from === 'cancelled') return false

  const allowed: Record<Exclude<WorkOrderStatus, 'invoiced' | 'cancelled'>, WorkOrderStatus[]> = {
    draft: ['open', 'cancelled'],
    open: ['draft', 'in_progress', 'completed', 'cancelled'],
    in_progress: ['open', 'completed', 'cancelled'],
    completed: ['in_progress', 'invoiced', 'cancelled'],
  }

  return allowed[from].includes(to)
}

function createWorkOrderNumber(date = new Date()): string {
  const timestamp = date
    .toISOString()
    .replace(/[-:TZ.]/g, '')
    .slice(0, 14)
  const suffix = String(date.getMilliseconds()).padStart(3, '0')

  return `WO-${timestamp}-${suffix}`
}

function toItemSummary(item: WorkOrderItem): WorkOrderItemSummary {
  return {
    id: item.id,
    itemType: item.itemType,
    productId: item.productId,
    serviceId: item.serviceId,
    name: item.name,
    sku: item.sku,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    lineTotal: item.lineTotal,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }
}

function calculateTotals(items: Array<{ lineTotal: number }>, discount = 0): { subtotal: number; tax: number; total: number } {
  const subtotal = items.reduce((total, item) => total + item.lineTotal, 0)
  const safeDiscount = Math.min(discount, subtotal)
  const tax = Math.round((subtotal - safeDiscount) * 0.11)

  return {
    subtotal,
    tax,
    total: subtotal - safeDiscount + tax,
  }
}

async function updateWorkOrderTotals(workOrderId: number, discount?: number): Promise<void> {
  const repository = getWorkOrderRepository()
  if (!repository) return

  const [workOrder] = await repository.select().from(workOrders).where(eq(workOrders.id, workOrderId)).limit(1)
  if (!workOrder) return

  const items = await repository.select().from(workOrderItems).where(eq(workOrderItems.workOrderId, workOrderId))
  const appliedDiscount = typeof discount === 'number' ? discount : workOrder.discount
  const totals = calculateTotals(items, appliedDiscount)

  await repository.update(workOrders).set({
    subtotal: totals.subtotal,
    discount: Math.min(appliedDiscount, totals.subtotal),
    tax: totals.tax,
    total: totals.total,
    updatedAt: new Date().toISOString(),
  }).where(eq(workOrders.id, workOrderId))
}

async function getInvoiceByWorkOrderId(workOrderId: number): Promise<{ id: number; invoiceNumber: string } | null> {
  const repository = getWorkOrderRepository()
  if (!repository) return null

  const [invoice] = await repository
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
    })
    .from(invoices)
    .where(eq(invoices.workOrderId, workOrderId))
    .limit(1)

  return invoice ?? null
}

async function toWorkOrderDetail(workOrder: WorkOrder): Promise<WorkOrderDetail | null> {
  const repository = getWorkOrderRepository()
  if (!repository) return null

  const [row] = await repository
    .select({
      customerName: customers.name,
      customerPhone: customers.phone,
      customerEmail: customers.email,
      customerAddress: customers.address,
      vehicleBrand: vehicles.brand,
      vehicleModel: vehicles.model,
      vehicleYear: vehicles.year,
      vehicleColor: vehicles.color,
      plateNumber: vehicles.plateNumber,
      assignedUserName: users.name,
    })
    .from(workOrders)
    .innerJoin(customers, eq(workOrders.customerId, customers.id))
    .innerJoin(vehicles, eq(workOrders.vehicleId, vehicles.id))
    .leftJoin(users, eq(workOrders.assignedUserId, users.id))
    .where(eq(workOrders.id, workOrder.id))
    .limit(1)

  if (!row) return null

  const items = await repository
    .select()
    .from(workOrderItems)
    .where(eq(workOrderItems.workOrderId, workOrder.id))
    .orderBy(asc(workOrderItems.createdAt))

  const invoice = await getInvoiceByWorkOrderId(workOrder.id)

  return {
    id: workOrder.id,
    orderNumber: workOrder.orderNumber,
    customerId: workOrder.customerId,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    customerEmail: row.customerEmail,
    customerAddress: row.customerAddress,
    vehicleId: workOrder.vehicleId,
    vehicleName: `${row.vehicleBrand} ${row.vehicleModel}`,
    vehicleBrand: row.vehicleBrand,
    vehicleModel: row.vehicleModel,
    vehicleYear: row.vehicleYear,
    vehicleColor: row.vehicleColor,
    plateNumber: row.plateNumber,
    assignedUserId: workOrder.assignedUserId,
    assignedUserName: row.assignedUserName,
    status: workOrder.status,
    priority: workOrder.priority,
    complaint: workOrder.complaint,
    notes: workOrder.notes,
    odometer: workOrder.odometer,
    itemCount: items.length,
    subtotal: workOrder.subtotal,
    discount: workOrder.discount,
    tax: workOrder.tax,
    total: workOrder.total,
    invoiceId: invoice?.id ?? null,
    invoiceNumber: invoice?.invoiceNumber ?? null,
    createdAt: workOrder.createdAt,
    updatedAt: workOrder.updatedAt,
    completedAt: workOrder.completedAt,
    invoicedAt: workOrder.invoicedAt,
    cancelledAt: workOrder.cancelledAt,
    items: items.map(toItemSummary),
  }
}

export async function listWorkOrders(input: WorkOrderListInput = {}): Promise<WorkOrderSummary[]> {
  const repository = getWorkOrderRepository()
  if (!repository) return []

  const rows = await repository
    .select({
      id: workOrders.id,
      orderNumber: workOrders.orderNumber,
      customerId: workOrders.customerId,
      customerName: customers.name,
      vehicleId: workOrders.vehicleId,
      vehicleBrand: vehicles.brand,
      vehicleModel: vehicles.model,
      plateNumber: vehicles.plateNumber,
      assignedUserId: workOrders.assignedUserId,
      assignedUserName: users.name,
      status: workOrders.status,
      priority: workOrders.priority,
      complaint: workOrders.complaint,
      notes: workOrders.notes,
      odometer: workOrders.odometer,
      subtotal: workOrders.subtotal,
      discount: workOrders.discount,
      tax: workOrders.tax,
      total: workOrders.total,
      createdAt: workOrders.createdAt,
      updatedAt: workOrders.updatedAt,
      completedAt: workOrders.completedAt,
      invoicedAt: workOrders.invoicedAt,
      cancelledAt: workOrders.cancelledAt,
    })
    .from(workOrders)
    .innerJoin(customers, eq(workOrders.customerId, customers.id))
    .innerJoin(vehicles, eq(workOrders.vehicleId, vehicles.id))
    .leftJoin(users, eq(workOrders.assignedUserId, users.id))
    .orderBy(desc(workOrders.updatedAt))

  const items = await repository.select().from(workOrderItems)
  const itemCountByWorkOrderId = new Map<number, number>()
  for (const item of items) {
    itemCountByWorkOrderId.set(item.workOrderId, (itemCountByWorkOrderId.get(item.workOrderId) ?? 0) + 1)
  }

  const invoiceRows = await repository.select({
    workOrderId: invoices.workOrderId,
    id: invoices.id,
    invoiceNumber: invoices.invoiceNumber,
  }).from(invoices)

  const invoiceByWorkOrderId = new Map<number, { id: number; invoiceNumber: string }>()
  for (const invoice of invoiceRows) {
    if (invoice.workOrderId) invoiceByWorkOrderId.set(invoice.workOrderId, invoice)
  }

  const search = optionalString(input.search)?.toLowerCase()
  const status = isWorkOrderStatus(input.status) ? input.status : null
  const dateFrom = optionalString(input.dateFrom)
  const dateTo = optionalString(input.dateTo)

  return rows
    .map<WorkOrderSummary>((row) => {
      const invoice = invoiceByWorkOrderId.get(row.id)

      return {
        id: row.id,
        orderNumber: row.orderNumber,
        customerId: row.customerId,
        customerName: row.customerName,
        vehicleId: row.vehicleId,
        vehicleName: `${row.vehicleBrand} ${row.vehicleModel}`,
        plateNumber: row.plateNumber,
        assignedUserId: row.assignedUserId,
        assignedUserName: row.assignedUserName,
        status: row.status,
        priority: row.priority,
        complaint: row.complaint,
        notes: row.notes,
        odometer: row.odometer,
        itemCount: itemCountByWorkOrderId.get(row.id) ?? 0,
        subtotal: row.subtotal,
        discount: row.discount,
        tax: row.tax,
        total: row.total,
        invoiceId: invoice?.id ?? null,
        invoiceNumber: invoice?.invoiceNumber ?? null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        completedAt: row.completedAt,
        invoicedAt: row.invoicedAt,
        cancelledAt: row.cancelledAt,
      }
    })
    .filter((workOrder) => {
      if (status && workOrder.status !== status) return false
      if (dateFrom && workOrder.createdAt.slice(0, 10) < dateFrom) return false
      if (dateTo && workOrder.createdAt.slice(0, 10) > dateTo) return false
      if (!search) return true

      return [
        workOrder.orderNumber,
        workOrder.customerName,
        workOrder.vehicleName,
        workOrder.plateNumber,
        workOrder.complaint,
        workOrder.assignedUserName ?? '',
      ].some((value) => value.toLowerCase().includes(search))
    })
}

export async function getWorkOrderDetail(input: { id?: unknown }): Promise<WorkOrderDetail | null> {
  const repository = getWorkOrderRepository()
  const id = positiveInteger(input.id)

  if (!repository || id === null) return null

  const [workOrder] = await repository.select().from(workOrders).where(eq(workOrders.id, id)).limit(1)

  return workOrder ? toWorkOrderDetail(workOrder) : null
}

export async function createWorkOrder(input: Record<string, unknown>): Promise<WorkOrderMutationResult> {
  const repository = getWorkOrderRepository()
  if (!repository) return { ok: false, message: 'Database unavailable' }

  const customerId = positiveInteger(input.customerId)
  const vehicleId = positiveInteger(input.vehicleId)
  const assignedUserId = positiveInteger(input.assignedUserId)
  const complaint = optionalString(input.complaint)
  const status = isWorkOrderStatus(input.status) ? input.status : 'open'
  const priority = isWorkOrderPriority(input.priority) ? input.priority : 'normal'
  const odometer = nonNegativeInteger(input.odometer)

  if (customerId === null || vehicleId === null || !complaint) {
    return { ok: false, message: 'Customer, vehicle, and complaint are required' }
  }

  const [customer] = await repository.select().from(customers).where(eq(customers.id, customerId)).limit(1)
  const [vehicle] = await repository
    .select()
    .from(vehicles)
    .where(and(eq(vehicles.id, vehicleId), eq(vehicles.customerId, customerId)))
    .limit(1)

  if (!customer || !customer.isActive) return { ok: false, message: 'Customer not found' }
  if (!vehicle || !vehicle.isActive) return { ok: false, message: 'Vehicle not found for this customer' }

  const now = new Date().toISOString()
  const [saved] = await repository.insert(workOrders).values({
    orderNumber: createWorkOrderNumber(),
    customerId,
    vehicleId,
    assignedUserId,
    status,
    priority,
    complaint,
    notes: optionalString(input.notes),
    odometer,
    subtotal: 0,
    discount: 0,
    tax: 0,
    total: 0,
    createdAt: now,
    updatedAt: now,
    completedAt: status === 'completed' ? now : null,
    invoicedAt: status === 'invoiced' ? now : null,
    cancelledAt: status === 'cancelled' ? now : null,
  }).returning()

  await flushDatabase()

  const workOrder = await toWorkOrderDetail(saved)
  return workOrder
    ? { ok: true, message: `Work order created: ${workOrder.orderNumber}`, workOrder }
    : { ok: false, message: 'Work order created but could not be loaded' }
}

export async function updateWorkOrder(input: Record<string, unknown>): Promise<WorkOrderMutationResult> {
  const repository = getWorkOrderRepository()
  if (!repository) return { ok: false, message: 'Database unavailable' }

  const id = positiveInteger(input.id)
  const customerId = positiveInteger(input.customerId)
  const vehicleId = positiveInteger(input.vehicleId)
  const assignedUserId = positiveInteger(input.assignedUserId)
  const complaint = optionalString(input.complaint)
  const priority = isWorkOrderPriority(input.priority) ? input.priority : 'normal'
  const odometer = nonNegativeInteger(input.odometer)

  if (id === null || customerId === null || vehicleId === null || !complaint) {
    return { ok: false, message: 'Invalid work order request' }
  }

  const [existing] = await repository.select().from(workOrders).where(eq(workOrders.id, id)).limit(1)
  if (!existing) return { ok: false, message: 'Work order not found' }
  if (existing.status === 'invoiced') return { ok: false, message: 'Invoiced work orders cannot be edited' }
  if (existing.status === 'cancelled') return { ok: false, message: 'Cancelled work orders cannot be edited' }

  const [vehicle] = await repository
    .select()
    .from(vehicles)
    .where(and(eq(vehicles.id, vehicleId), eq(vehicles.customerId, customerId)))
    .limit(1)

  if (!vehicle || !vehicle.isActive) return { ok: false, message: 'Vehicle not found for this customer' }

  const [updated] = await repository.update(workOrders).set({
    customerId,
    vehicleId,
    assignedUserId,
    priority,
    complaint,
    notes: optionalString(input.notes),
    odometer,
    discount: nonNegativeInteger(input.discount) ?? existing.discount,
    updatedAt: new Date().toISOString(),
  }).where(eq(workOrders.id, id)).returning()

  await updateWorkOrderTotals(id, updated.discount)
  await flushDatabase()

  const workOrder = await getWorkOrderDetail({ id })
  return workOrder
    ? { ok: true, message: 'Work order updated', workOrder }
    : { ok: false, message: 'Work order updated but could not be loaded' }
}

export async function updateWorkOrderStatus(input: Record<string, unknown>): Promise<WorkOrderMutationResult> {
  const repository = getWorkOrderRepository()
  const id = positiveInteger(input.id)
  const nextStatus = isWorkOrderStatus(input.status) ? input.status : null

  if (!repository) return { ok: false, message: 'Database unavailable' }
  if (id === null || nextStatus === null) return { ok: false, message: 'Invalid status request' }

  const [existing] = await repository.select().from(workOrders).where(eq(workOrders.id, id)).limit(1)
  if (!existing) return { ok: false, message: 'Work order not found' }
  if (!canTransition(existing.status, nextStatus)) {
    return { ok: false, message: `Cannot change status from ${existing.status} to ${nextStatus}` }
  }

  const now = new Date().toISOString()
  const [updated] = await repository.update(workOrders).set({
    status: nextStatus,
    updatedAt: now,
    completedAt: nextStatus === 'completed' ? now : existing.completedAt,
    invoicedAt: nextStatus === 'invoiced' ? now : existing.invoicedAt,
    cancelledAt: nextStatus === 'cancelled' ? now : existing.cancelledAt,
  }).where(eq(workOrders.id, id)).returning()

  await flushDatabase()

  const workOrder = await toWorkOrderDetail(updated)
  return workOrder
    ? { ok: true, message: `Work order marked ${nextStatus.replace('_', ' ')}`, workOrder }
    : { ok: false, message: 'Work order updated but could not be loaded' }
}

export async function addWorkOrderItem(input: Record<string, unknown>): Promise<WorkOrderMutationResult> {
  const repository = getWorkOrderRepository()
  if (!repository) return { ok: false, message: 'Database unavailable' }

  const workOrderId = positiveInteger(input.workOrderId)
  const itemId = positiveInteger(input.id)
  const quantity = positiveInteger(input.quantity)
  const itemType = isWorkOrderItemType(input.itemType) ? input.itemType : null

  if (workOrderId === null || itemId === null || quantity === null || itemType === null) {
    return { ok: false, message: 'Invalid work order item' }
  }

  const [workOrder] = await repository.select().from(workOrders).where(eq(workOrders.id, workOrderId)).limit(1)
  if (!workOrder) return { ok: false, message: 'Work order not found' }
  if (workOrder.status === 'invoiced' || workOrder.status === 'cancelled') {
    return { ok: false, message: 'Cannot change items after invoice or cancellation' }
  }

  const now = new Date().toISOString()

  if (itemType === 'product') {
    const [product] = await repository.select().from(products).where(eq(products.id, itemId)).limit(1)
    if (!product || !product.isActive) return { ok: false, message: 'Product is no longer available' }

    await repository.insert(workOrderItems).values({
      workOrderId,
      itemType,
      productId: product.id,
      serviceId: null,
      name: product.name,
      sku: product.sku,
      quantity,
      unitPrice: product.unitPrice,
      lineTotal: product.unitPrice * quantity,
      createdAt: now,
      updatedAt: now,
    })
  } else {
    const [service] = await repository.select().from(services).where(eq(services.id, itemId)).limit(1)
    if (!service || !service.isActive) return { ok: false, message: 'Service is no longer available' }

    await repository.insert(workOrderItems).values({
      workOrderId,
      itemType,
      productId: null,
      serviceId: service.id,
      name: service.name,
      sku: service.code,
      quantity,
      unitPrice: service.price,
      lineTotal: service.price * quantity,
      createdAt: now,
      updatedAt: now,
    })
  }

  await updateWorkOrderTotals(workOrderId)
  await flushDatabase()

  const updated = await getWorkOrderDetail({ id: workOrderId })
  return updated
    ? { ok: true, message: 'Line item added', workOrder: updated }
    : { ok: false, message: 'Item added but work order could not be loaded' }
}

export async function updateWorkOrderItem(input: Record<string, unknown>): Promise<WorkOrderMutationResult> {
  const repository = getWorkOrderRepository()
  const id = positiveInteger(input.id)
  const quantity = positiveInteger(input.quantity)

  if (!repository) return { ok: false, message: 'Database unavailable' }
  if (id === null || quantity === null) return { ok: false, message: 'Invalid item request' }

  const [item] = await repository.select().from(workOrderItems).where(eq(workOrderItems.id, id)).limit(1)
  if (!item) return { ok: false, message: 'Line item not found' }

  const [workOrder] = await repository.select().from(workOrders).where(eq(workOrders.id, item.workOrderId)).limit(1)
  if (!workOrder) return { ok: false, message: 'Work order not found' }
  if (workOrder.status === 'invoiced' || workOrder.status === 'cancelled') {
    return { ok: false, message: 'Cannot change items after invoice or cancellation' }
  }

  await repository.update(workOrderItems).set({
    quantity,
    lineTotal: item.unitPrice * quantity,
    updatedAt: new Date().toISOString(),
  }).where(eq(workOrderItems.id, id))

  await updateWorkOrderTotals(item.workOrderId)
  await flushDatabase()

  const updated = await getWorkOrderDetail({ id: item.workOrderId })
  return updated
    ? { ok: true, message: 'Line item updated', workOrder: updated }
    : { ok: false, message: 'Item updated but work order could not be loaded' }
}

export async function deleteWorkOrderItem(input: Record<string, unknown>): Promise<WorkOrderMutationResult> {
  const repository = getWorkOrderRepository()
  const id = positiveInteger(input.id)

  if (!repository) return { ok: false, message: 'Database unavailable' }
  if (id === null) return { ok: false, message: 'Invalid item request' }

  const [item] = await repository.select().from(workOrderItems).where(eq(workOrderItems.id, id)).limit(1)
  if (!item) return { ok: false, message: 'Line item not found' }

  const [workOrder] = await repository.select().from(workOrders).where(eq(workOrders.id, item.workOrderId)).limit(1)
  if (!workOrder) return { ok: false, message: 'Work order not found' }
  if (workOrder.status === 'invoiced' || workOrder.status === 'cancelled') {
    return { ok: false, message: 'Cannot change items after invoice or cancellation' }
  }

  await repository.delete(workOrderItems).where(eq(workOrderItems.id, id))
  await updateWorkOrderTotals(item.workOrderId)
  await flushDatabase()

  const updated = await getWorkOrderDetail({ id: item.workOrderId })
  return updated
    ? { ok: true, message: 'Line item removed', workOrder: updated }
    : { ok: false, message: 'Item removed but work order could not be loaded' }
}

export async function checkoutWorkOrder(input: Record<string, unknown>): Promise<WorkOrderCheckoutResult> {
  const repository = getWorkOrderRepository()
  const id = positiveInteger(input.id)

  if (!repository) return { ok: false, message: 'Database unavailable' }
  if (id === null) return { ok: false, message: 'Invalid work order checkout request' }

  const [workOrder] = await repository.select().from(workOrders).where(eq(workOrders.id, id)).limit(1)
  if (!workOrder) return { ok: false, message: 'Work order not found' }
  if (workOrder.status !== 'completed') return { ok: false, message: 'Only completed work orders can be checked out' }

  const existingInvoice = await getInvoiceByWorkOrderId(id)
  if (existingInvoice) return { ok: false, message: 'Work order has already been invoiced' }

  const items = await repository.select().from(workOrderItems).where(eq(workOrderItems.workOrderId, id))
  if (items.length === 0) return { ok: false, message: 'Add at least one item before checkout' }

  const preparedItems: PreparedCheckoutLineItem[] = []

  for (const item of items) {
    if (item.itemType === 'product') {
      if (item.productId === null) return { ok: false, message: `Invalid product line: ${item.name}` }
      const [product] = await repository.select().from(products).where(eq(products.id, item.productId)).limit(1)
      if (!product || !product.isActive) return { ok: false, message: `${item.name} is no longer available` }
      if (product.stockQty < item.quantity) return { ok: false, message: `Only ${product.stockQty} in stock for ${product.name}` }

      preparedItems.push({
        itemType: 'product',
        productId: product.id,
        serviceId: null,
        name: item.name,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
        stockQty: product.stockQty,
      })
    } else {
      preparedItems.push({
        itemType: 'service',
        productId: null,
        serviceId: item.serviceId,
        name: item.name,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })
    }
  }

  const paymentMethod = isPaymentMethod(input.paymentMethod) ? input.paymentMethod : 'cash'
  const discount = nonNegativeInteger(input.discount) ?? workOrder.discount
  const subtotal = preparedItems.reduce((total, item) => total + item.lineTotal, 0)
  const tax = nonNegativeInteger(input.tax) ?? Math.round((subtotal - discount) * 0.11)
  const amountPaid = nonNegativeInteger(input.amountPaid) ?? subtotal - discount + tax
  const notes = optionalString(input.notes) ?? workOrder.notes

  const checkout = await createCheckoutFromPreparedItems({
    sourceWorkOrderId: id,
    customerId: workOrder.customerId,
    createdById: positiveInteger(input.createdById),
    paymentMethod,
    amountPaid,
    discount,
    tax,
    notes,
    items: preparedItems,
  })

  if (!checkout.ok) return checkout

  const now = new Date().toISOString()
  await repository.update(workOrders).set({
    status: 'invoiced',
    discount,
    tax,
    total: subtotal - discount + tax,
    updatedAt: now,
    invoicedAt: now,
  }).where(eq(workOrders.id, id))

  await flushDatabase()

  const updated = await getWorkOrderDetail({ id })

  return {
    ...checkout,
    message: updated?.invoiceNumber ? `Work order invoiced: ${updated.invoiceNumber}` : checkout.message,
    workOrder: updated ?? undefined,
  }
}
