import { eq, like } from 'drizzle-orm'
import { flushDatabase } from '../db/client'
import { invoices, payments, products, purchaseItems, saleItems, sales, services, users, vehicles } from '../db/schema/index'
import type { PaymentMethod, SaleItemType } from '../db/schema/index'
import { getCheckoutRepository } from '../repositories/checkout.repository'
import { recordStockMovement } from './stock-movement.service'

export type CheckoutItemInput = {
  itemType?: unknown
  id?: unknown
  quantity?: unknown
  unitPrice?: unknown
}

export type CheckoutInput = {
  saleId?: unknown
  workOrderId?: unknown
  vehicleId?: unknown
  customerId?: unknown
  createdById?: unknown
  paymentMethod?: unknown
  amountPaid?: unknown
  notes?: unknown
  items?: unknown
}

export type CheckoutLineItemSummary = {
  id: number
  itemType: SaleItemType
  productId: number | null
  serviceId: number | null
  name: string
  sku: string | null
  quantity: number
  basePrice: number
  unitPrice: number
  priceOverriddenById: number | null
  priceOverriddenAt: string | null
  lineTotal: number
  unitCostSnapshot: number
  costTotalSnapshot: number
}

export type CheckoutSummary = {
  saleId: number
  vehicleId: number | null
  invoiceId: number
  invoiceNumber: string
  paymentId: number
  subtotal: number
  total: number
  amountPaid: number
  paymentMethod: PaymentMethod
  items: CheckoutLineItemSummary[]
}

export type CheckoutResult = {
  ok: boolean
  message: string
  checkout?: CheckoutSummary
}

export type PreparedCheckoutLineItem = {
  itemType: SaleItemType
  productId: number | null
  serviceId: number | null
  name: string
  sku: string | null
  quantity: number
  basePrice: number
  unitPrice: number
  priceOverriddenById: number | null
  priceOverriddenAt: string | null
  lineTotal: number
  unitCostSnapshot?: number
  costTotalSnapshot?: number
  stockQty?: number
}

type PersistCheckoutInput = {
  saleId?: number | null
  sourceWorkOrderId?: number | null
  vehicleId?: number | null
  customerId: number | null
  customerNameSnapshot?: string | null
  customerPhoneSnapshot?: string | null
  createdById: number | null
  paymentMethod: PaymentMethod
  amountPaid: number
  notes: string | null
  items: PreparedCheckoutLineItem[]
}

function isPaymentMethod(value: unknown): value is PaymentMethod {
  return value === 'cash' || value === 'transfer' || value === 'card'
}

function isSaleItemType(value: unknown): value is SaleItemType {
  return value === 'product' || value === 'service'
}

function positiveInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null
}

function nonNegativeInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null
}

function invoiceDateStamp(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('')
}

export function createInvoiceNumber(date: Date, existingInvoiceNumbers: string[]): string {
  const prefix = `INV-${invoiceDateStamp(date)}-`
  const highestSequence = existingInvoiceNumbers.reduce((highest, invoiceNumber) => {
    if (!invoiceNumber.startsWith(prefix)) return highest

    const sequence = Number(invoiceNumber.slice(prefix.length))
    return Number.isInteger(sequence) && sequence > highest ? sequence : highest
  }, 0)

  return `${prefix}${String(highestSequence + 1).padStart(2, '0')}`
}

async function hasPurchaseHistory(productId: number): Promise<boolean> {
  const repository = getCheckoutRepository()

  if (!repository) return false

  const [purchaseHistory] = await repository
    .select({ id: purchaseItems.id })
    .from(purchaseItems)
    .where(eq(purchaseItems.productId, productId))
    .limit(1)

  return Boolean(purchaseHistory)
}

async function costSnapshotForProduct(product: typeof products.$inferSelect, quantity: number) {
  const isCostTracked = product.lastPurchaseCost > 0 || await hasPurchaseHistory(product.id)
  const unitCostSnapshot = isCostTracked ? product.lastPurchaseCost : 0

  return {
    unitCostSnapshot,
    costTotalSnapshot: unitCostSnapshot * quantity,
  }
}

function minimumSaleUnitPriceForProduct(product: typeof products.$inferSelect) {
  return product.lastPurchaseCost > 0 ? product.lastPurchaseCost : 0
}

function zeroCostSnapshot() {
  return {
    unitCostSnapshot: 0,
    costTotalSnapshot: 0,
  }
}

async function normalizePreparedCostSnapshots(
  items: PreparedCheckoutLineItem[],
): Promise<PreparedCheckoutLineItem[]> {
  const repository = getCheckoutRepository()

  if (!repository) throw new Error('Database unavailable')

  const normalized: PreparedCheckoutLineItem[] = []

  for (const item of items) {
    const unitCostSnapshot = item.unitCostSnapshot
    const costTotalSnapshot = item.costTotalSnapshot

    if (
      typeof unitCostSnapshot === 'number' &&
      Number.isInteger(unitCostSnapshot) &&
      unitCostSnapshot >= 0 &&
      typeof costTotalSnapshot === 'number' &&
      Number.isInteger(costTotalSnapshot) &&
      costTotalSnapshot >= 0
    ) {
      normalized.push({ ...item, unitCostSnapshot, costTotalSnapshot })
      continue
    }

    if (item.itemType === 'service') {
      normalized.push({ ...item, ...zeroCostSnapshot() })
      continue
    }

    if (item.productId === null) throw new Error('Product line is missing product id')

    const [product] = await repository.select().from(products).where(eq(products.id, item.productId)).limit(1)
    if (!product) throw new Error('Product is no longer available')

    normalized.push({ ...item, ...(await costSnapshotForProduct(product, item.quantity)) })
  }

  return normalized
}

async function prepareCheckoutItems(
  inputItems: unknown,
  overriddenById: number | null,
  existingItems: Array<typeof saleItems.$inferSelect> = [],
): Promise<PreparedCheckoutLineItem[] | string> {
  const repository = getCheckoutRepository()

  if (!repository) return 'Database unavailable'
  if (!Array.isArray(inputItems) || inputItems.length === 0) return 'Add at least one item before checkout'

  const prepared: PreparedCheckoutLineItem[] = []

  for (const rawItem of inputItems) {
    if (!rawItem || typeof rawItem !== 'object') return 'Invalid checkout item'

    const item = rawItem as CheckoutItemInput
    const itemType = item.itemType
    const itemId = positiveInteger(item.id)
    const quantity = positiveInteger(item.quantity)
    const requestedUnitPrice = nonNegativeInteger(item.unitPrice)

    if (!isSaleItemType(itemType) || itemId === null || quantity === null) {
      return 'Invalid checkout item'
    }
    if (item.unitPrice !== undefined && requestedUnitPrice === null) return 'Price must be a non-negative whole number'

    const existing = existingItems.find((savedItem) =>
      savedItem.itemType === itemType &&
      (savedItem.productId ?? savedItem.serviceId) === itemId
    )

    if (itemType === 'product') {
      const [product] = await repository.select().from(products).where(eq(products.id, itemId)).limit(1)

      if (!product || !product.isActive) return 'Product is no longer available'
      if (product.stockQty < quantity) return `Only ${product.stockQty} in stock for ${product.name}`
      const basePrice = existing?.basePrice ?? product.unitPrice
      const unitPrice = requestedUnitPrice ?? existing?.unitPrice ?? basePrice
      const isOverride = unitPrice !== basePrice
      if (isOverride && !overriddenById) return 'A user is required to override a price'
      if (unitPrice < minimumSaleUnitPriceForProduct(product)) {
        return 'Product sale price cannot be lower than inventory cost'
      }
      const unchangedOverride = isOverride && existing?.unitPrice === unitPrice
      const costSnapshot = await costSnapshotForProduct(product, quantity)

      prepared.push({
        itemType,
        productId: product.id,
        serviceId: null,
        name: product.name,
        sku: product.sku,
        quantity,
        basePrice,
        unitPrice,
        priceOverriddenById: isOverride
          ? unchangedOverride ? existing.priceOverriddenById ?? overriddenById : overriddenById
          : null,
        priceOverriddenAt: isOverride
          ? unchangedOverride ? existing.priceOverriddenAt ?? new Date().toISOString() : new Date().toISOString()
          : null,
        lineTotal: unitPrice * quantity,
        ...costSnapshot,
        stockQty: product.stockQty,
      })
    } else {
      const [service] = await repository.select().from(services).where(eq(services.id, itemId)).limit(1)

      if (!service || !service.isActive) return 'Service is no longer available'
      const basePrice = existing?.basePrice ?? service.price
      const unitPrice = requestedUnitPrice ?? existing?.unitPrice ?? basePrice
      const isOverride = unitPrice !== basePrice
      if (isOverride && !overriddenById) return 'A user is required to override a price'
      const unchangedOverride = isOverride && existing?.unitPrice === unitPrice

      prepared.push({
        itemType,
        productId: null,
        serviceId: service.id,
        name: service.name,
        sku: service.code,
        quantity,
        basePrice,
        unitPrice,
        priceOverriddenById: isOverride
          ? unchangedOverride ? existing.priceOverriddenById ?? overriddenById : overriddenById
          : null,
        priceOverriddenAt: isOverride
          ? unchangedOverride ? existing.priceOverriddenAt ?? new Date().toISOString() : new Date().toISOString()
          : null,
        lineTotal: unitPrice * quantity,
        ...zeroCostSnapshot(),
      })
    }
  }

  return prepared
}

export async function createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  const repository = getCheckoutRepository()

  if (!repository) return { ok: false, message: 'Database unavailable' }

  const sourceWorkOrderId = positiveInteger(input.workOrderId)
  const saleId = positiveInteger(input.saleId)
  const vehicleId = positiveInteger(input.vehicleId)
  const paymentMethod = isPaymentMethod(input.paymentMethod) ? input.paymentMethod : 'cash'
  let customerId = positiveInteger(input.customerId)
  let customerNameSnapshot: string | null = null
  let customerPhoneSnapshot: string | null = null
  const createdById = positiveInteger(input.createdById)
  const amountPaidInput = nonNegativeInteger(input.amountPaid)
  const notes = typeof input.notes === 'string' && input.notes.trim() ? input.notes.trim() : null
  let existingItems: Array<typeof saleItems.$inferSelect> = []

  if (!sourceWorkOrderId) {
    if (!vehicleId) return { ok: false, message: 'Select a vehicle before checkout' }
    const [vehicle] = await repository.select().from(vehicles).where(eq(vehicles.id, vehicleId)).limit(1)
    if (!vehicle || !vehicle.isActive) return { ok: false, message: 'Vehicle is no longer available' }
    if (saleId) {
      const [draft] = await repository.select().from(sales).where(eq(sales.id, saleId)).limit(1)
      if (!draft || draft.status !== 'in_progress' || draft.vehicleId !== vehicleId) {
        return { ok: false, message: 'Sales draft is no longer available' }
      }
      existingItems = await repository.select().from(saleItems).where(eq(saleItems.saleId, saleId))
    }
    customerId = vehicle.customerId
    customerNameSnapshot = vehicle.customerName
    customerPhoneSnapshot = vehicle.customerPhone
  }

  const preparedItems = await prepareCheckoutItems(input.items, createdById, existingItems)

  if (typeof preparedItems === 'string') {
    return { ok: false, message: preparedItems }
  }

  const subtotal = preparedItems.reduce((total, item) => total + item.lineTotal, 0)
  const total = subtotal
  const amountPaid = amountPaidInput ?? total

  if (!sourceWorkOrderId && paymentMethod !== 'cash') {
    return { ok: false, message: 'Direct sales accept cash payment only' }
  }
  if (!sourceWorkOrderId && amountPaid !== total) {
    return { ok: false, message: 'Cash payment must equal the sale total' }
  }
  if (sourceWorkOrderId && amountPaid < total) {
    return { ok: false, message: 'Amount paid cannot be less than total' }
  }

  return persistCheckout({
    sourceWorkOrderId,
    saleId,
    vehicleId,
    customerId,
    customerNameSnapshot,
    customerPhoneSnapshot,
    createdById,
    paymentMethod,
    amountPaid,
    notes,
    items: preparedItems,
  })
}

export async function createCheckoutFromPreparedItems(input: PersistCheckoutInput): Promise<CheckoutResult> {
  if (input.items.length === 0) {
    return { ok: false, message: 'Add at least one item before checkout' }
  }

  const subtotal = input.items.reduce((total, item) => total + item.lineTotal, 0)
  const total = subtotal

  if (input.amountPaid < total) {
    return { ok: false, message: 'Amount paid cannot be less than total' }
  }

  try {
    return persistCheckout({
      ...input,
      items: await normalizePreparedCostSnapshots(input.items),
    })
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Unable to prepare sale item costs',
    }
  }
}

async function persistCheckout(input: PersistCheckoutInput): Promise<CheckoutResult> {
  const repository = getCheckoutRepository()

  if (!repository) return { ok: false, message: 'Database unavailable' }

  const subtotal = input.items.reduce((total, item) => total + item.lineTotal, 0)
  const total = subtotal

  const checkoutDate = new Date()
  const now = checkoutDate.toISOString()

  let checkout: CheckoutSummary

  try {
    checkout = repository.transaction((tx) => {
    const existingInvoiceNumbers = tx
      .select({invoiceNumber: invoices.invoiceNumber})
      .from(invoices)
      .where(like(invoices.invoiceNumber, `INV-${invoiceDateStamp(checkoutDate)}-%`))
      .all()
      .map((invoice) => invoice.invoiceNumber)
    const invoiceNumber = createInvoiceNumber(checkoutDate, existingInvoiceNumbers)

    const createdBy = input.createdById
      ? tx.select().from(users).where(eq(users.id, input.createdById)).limit(1).get()
      : null

    const saleValues = {
      workOrderId: input.sourceWorkOrderId,
      vehicleId: input.vehicleId,
      customerId: input.customerId,
      customerNameSnapshot: input.customerNameSnapshot,
      customerPhoneSnapshot: input.customerPhoneSnapshot,
      createdById: input.createdById,
      status: 'completed' as const,
      subtotal,
      discount: 0,
      tax: 0,
      total,
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
    }
    const savedSale = input.saleId
      ? tx.update(sales).set(saleValues).where(eq(sales.id, input.saleId)).returning().get()
      : tx.insert(sales).values(saleValues).returning().get()

    if (input.saleId) tx.delete(saleItems).where(eq(saleItems.saleId, input.saleId)).run()

    const savedItems = input.items.map((item) => {
      const unitCostSnapshot = item.unitCostSnapshot
      const costTotalSnapshot = item.costTotalSnapshot

      if (
        typeof unitCostSnapshot !== 'number' ||
        !Number.isInteger(unitCostSnapshot) ||
        unitCostSnapshot < 0 ||
        typeof costTotalSnapshot !== 'number' ||
        !Number.isInteger(costTotalSnapshot) ||
        costTotalSnapshot < 0
      ) {
        throw new Error('Missing cost snapshot')
      }

      const savedItem = tx.insert(saleItems).values({
        saleId: savedSale.id,
        itemType: item.itemType,
        productId: item.productId,
        serviceId: item.serviceId,
        name: item.name,
        sku: item.sku,
        quantity: item.quantity,
        basePrice: item.basePrice,
        unitPrice: item.unitPrice,
        priceOverriddenById: item.priceOverriddenById,
        priceOverriddenAt: item.priceOverriddenAt,
        lineTotal: item.lineTotal,
        unitCostSnapshot,
        costTotalSnapshot,
        createdAt: now,
      }).returning().get()

      if (item.itemType === 'product' && item.productId !== null) {
        recordStockMovement(tx, {
          productId: item.productId,
          movementType: 'sale',
          quantityDelta: -item.quantity,
          referenceType: 'sale_item',
          referenceId: savedItem.id,
          referenceNumber: invoiceNumber,
          createdById: createdBy?.id ?? null,
          createdByNameSnapshot: createdBy?.name ?? null,
          createdAt: now,
        })
      }

      return {
        id: savedItem.id,
        itemType: savedItem.itemType,
        productId: savedItem.productId,
        serviceId: savedItem.serviceId,
        name: savedItem.name,
        sku: savedItem.sku,
        quantity: savedItem.quantity,
        basePrice: savedItem.basePrice,
        unitPrice: savedItem.unitPrice,
        priceOverriddenById: savedItem.priceOverriddenById,
        priceOverriddenAt: savedItem.priceOverriddenAt,
        lineTotal: savedItem.lineTotal,
        unitCostSnapshot: savedItem.unitCostSnapshot ?? 0,
        costTotalSnapshot: savedItem.costTotalSnapshot ?? 0,
      }
    })

    const savedInvoice = tx.insert(invoices).values({
      saleId: savedSale.id,
      workOrderId: input.sourceWorkOrderId,
      invoiceNumber,
      status: 'paid',
      subtotal,
      discount: 0,
      tax: 0,
      total,
      issuedAt: now,
      createdAt: now,
      updatedAt: now,
    }).returning().get()

    const savedPayment = tx.insert(payments).values({
      saleId: savedSale.id,
      invoiceId: savedInvoice.id,
      method: input.paymentMethod,
      status: 'paid',
      amount: input.amountPaid,
      paidAt: now,
      createdAt: now,
      updatedAt: now,
    }).returning().get()

    return {
      saleId: savedSale.id,
      vehicleId: savedSale.vehicleId,
      invoiceId: savedInvoice.id,
      invoiceNumber: savedInvoice.invoiceNumber,
      paymentId: savedPayment.id,
      subtotal,
      total,
      amountPaid: input.amountPaid,
      paymentMethod: input.paymentMethod,
      items: savedItems,
    }
    })
  } catch {
    return { ok: false, message: 'Unable to complete sale. No stock was changed.' }
  }

  await flushDatabase()

  return {
    ok: true,
    message: `Sale completed: ${checkout.invoiceNumber}`,
    checkout,
  }
}
