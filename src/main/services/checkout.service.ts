import { eq } from 'drizzle-orm'
import { flushDatabase } from '../db/client'
import { invoices, payments, products, saleItems, sales, services } from '../db/schema/index'
import type { PaymentMethod, SaleItemType } from '../db/schema/index'
import { getCheckoutRepository } from '../repositories/checkout.repository'

export type CheckoutItemInput = {
  itemType?: unknown
  id?: unknown
  quantity?: unknown
}

export type CheckoutInput = {
  customerId?: unknown
  createdById?: unknown
  paymentMethod?: unknown
  amountPaid?: unknown
  discount?: unknown
  tax?: unknown
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
  unitPrice: number
  lineTotal: number
}

export type CheckoutSummary = {
  saleId: number
  invoiceId: number
  invoiceNumber: string
  paymentId: number
  subtotal: number
  discount: number
  tax: number
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

type PreparedCheckoutItem = {
  itemType: SaleItemType
  productId: number | null
  serviceId: number | null
  name: string
  sku: string | null
  quantity: number
  unitPrice: number
  lineTotal: number
  stockQty?: number
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

function createInvoiceNumber(date = new Date()): string {
  const timestamp = date
    .toISOString()
    .replace(/[-:TZ.]/g, '')
    .slice(0, 14)
  const suffix = String(date.getMilliseconds()).padStart(3, '0')

  return `INV-${timestamp}-${suffix}`
}

async function prepareCheckoutItems(inputItems: unknown): Promise<PreparedCheckoutItem[] | string> {
  const repository = getCheckoutRepository()

  if (!repository) return 'Database unavailable'
  if (!Array.isArray(inputItems) || inputItems.length === 0) return 'Add at least one item before checkout'

  const prepared: PreparedCheckoutItem[] = []

  for (const rawItem of inputItems) {
    if (!rawItem || typeof rawItem !== 'object') return 'Invalid checkout item'

    const item = rawItem as CheckoutItemInput
    const itemType = item.itemType
    const itemId = positiveInteger(item.id)
    const quantity = positiveInteger(item.quantity)

    if (!isSaleItemType(itemType) || itemId === null || quantity === null) {
      return 'Invalid checkout item'
    }

    if (itemType === 'product') {
      const [product] = await repository.select().from(products).where(eq(products.id, itemId)).limit(1)

      if (!product || !product.isActive) return 'Product is no longer available'
      if (product.stockQty < quantity) return `Only ${product.stockQty} in stock for ${product.name}`

      prepared.push({
        itemType,
        productId: product.id,
        serviceId: null,
        name: product.name,
        sku: product.sku,
        quantity,
        unitPrice: product.unitPrice,
        lineTotal: product.unitPrice * quantity,
        stockQty: product.stockQty,
      })
    } else {
      const [service] = await repository.select().from(services).where(eq(services.id, itemId)).limit(1)

      if (!service || !service.isActive) return 'Service is no longer available'

      prepared.push({
        itemType,
        productId: null,
        serviceId: service.id,
        name: service.name,
        sku: service.code,
        quantity,
        unitPrice: service.price,
        lineTotal: service.price * quantity,
      })
    }
  }

  return prepared
}

export async function createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  const repository = getCheckoutRepository()

  if (!repository) return { ok: false, message: 'Database unavailable' }

  const paymentMethod = isPaymentMethod(input.paymentMethod) ? input.paymentMethod : 'cash'
  const discount = nonNegativeInteger(input.discount) ?? 0
  const providedTax = nonNegativeInteger(input.tax)
  const customerId = positiveInteger(input.customerId)
  const createdById = positiveInteger(input.createdById)
  const amountPaidInput = nonNegativeInteger(input.amountPaid)
  const notes = typeof input.notes === 'string' && input.notes.trim() ? input.notes.trim() : null
  const preparedItems = await prepareCheckoutItems(input.items)

  if (typeof preparedItems === 'string') {
    return { ok: false, message: preparedItems }
  }

  const subtotal = preparedItems.reduce((total, item) => total + item.lineTotal, 0)

  if (discount > subtotal) {
    return { ok: false, message: 'Discount cannot exceed subtotal' }
  }

  const tax = providedTax ?? Math.round((subtotal - discount) * 0.11)
  const total = subtotal - discount + tax
  const amountPaid = amountPaidInput ?? total

  if (amountPaid < total) {
    return { ok: false, message: 'Amount paid cannot be less than total' }
  }

  const now = new Date().toISOString()
  const invoiceNumber = createInvoiceNumber()

  const checkout = repository.transaction((tx) => {
    const savedSale = tx.insert(sales).values({
      customerId,
      createdById,
      status: 'completed',
      subtotal,
      discount,
      tax,
      total,
      notes,
      createdAt: now,
      updatedAt: now,
    }).returning().get()

    const savedItems = preparedItems.map((item) => {
      const savedItem = tx.insert(saleItems).values({
        saleId: savedSale.id,
        itemType: item.itemType,
        productId: item.productId,
        serviceId: item.serviceId,
        name: item.name,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
        createdAt: now,
      }).returning().get()

      if (item.itemType === 'product' && item.productId !== null && typeof item.stockQty === 'number') {
        tx.update(products).set({
          stockQty: item.stockQty - item.quantity,
          updatedAt: now,
        }).where(eq(products.id, item.productId)).run()
      }

      return {
        id: savedItem.id,
        itemType: savedItem.itemType,
        productId: savedItem.productId,
        serviceId: savedItem.serviceId,
        name: savedItem.name,
        sku: savedItem.sku,
        quantity: savedItem.quantity,
        unitPrice: savedItem.unitPrice,
        lineTotal: savedItem.lineTotal,
      }
    })

    const savedInvoice = tx.insert(invoices).values({
      saleId: savedSale.id,
      invoiceNumber,
      status: 'paid',
      subtotal,
      discount,
      tax,
      total,
      issuedAt: now,
      createdAt: now,
      updatedAt: now,
    }).returning().get()

    const savedPayment = tx.insert(payments).values({
      saleId: savedSale.id,
      invoiceId: savedInvoice.id,
      method: paymentMethod,
      status: 'paid',
      amount: amountPaid,
      paidAt: now,
      createdAt: now,
      updatedAt: now,
    }).returning().get()

    return {
      saleId: savedSale.id,
      invoiceId: savedInvoice.id,
      invoiceNumber: savedInvoice.invoiceNumber,
      paymentId: savedPayment.id,
      subtotal,
      discount,
      tax,
      total,
      amountPaid,
      paymentMethod,
      items: savedItems,
    }
  })

  await flushDatabase()

  return {
    ok: true,
    message: `Sale completed: ${checkout.invoiceNumber}`,
    checkout,
  }
}
