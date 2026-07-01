import { desc, eq, like, sql } from 'drizzle-orm'
import { flushDatabase } from '../db/client'
import {
  products,
  purchaseItems,
  purchases,
  suppliers,
  users,
} from '../db/schema/index'
import type { PurchasePaymentStatus } from '../db/schema/index'
import type { PurchaseInvoiceStatus } from '../db/schema/index'
import { getPurchaseRepository } from '../repositories/purchase.repository'

export type PurchaseItemInput = {
  productId?: unknown
  quantity?: unknown
  unitCost?: unknown
}

export type PurchaseCreateInput = {
  supplierId?: unknown
  supplierInvoiceNumber?: unknown
  invoiceDate?: unknown
  paymentStatus?: unknown
  dueDate?: unknown
  notes?: unknown
  createdById?: unknown
  items?: unknown
}

export type PurchaseInvoiceUpdateInput = {
  id?: unknown
  supplierInvoiceNumber?: unknown
  invoiceDate?: unknown
  paymentStatus?: unknown
  dueDate?: unknown
  paidAt?: unknown
  notes?: unknown
}

export type PurchaseItemSummary = {
  id: number
  productId: number
  sku: string
  productName: string
  quantity: number
  unitCost: number
  lineTotal: number
}

export type PurchaseSummary = {
  id: number
  purchaseNumber: string
  supplierId: number
  supplierName: string
  supplierInvoiceNumber: string | null
  invoiceDate: string | null
  paymentStatus: PurchasePaymentStatus
  invoiceStatus: PurchaseInvoiceStatus
  dueDate: string | null
  paidAt: string | null
  total: number
  itemCount: number
  createdById: number
  createdAt: string
}

export type PurchaseDetail = PurchaseSummary & {
  notes: string | null
  items: PurchaseItemSummary[]
}

export type PurchaseMutationResult = {
  ok: boolean
  message: string
  purchase?: PurchaseDetail
}

type PreparedPurchaseItem = {
  productId: number
  sku: string
  productName: string
  quantity: number
  unitCost: number
  lineTotal: number
}

function positiveInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null
}

function nonNegativeInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function normalizeInvoiceNumber(value: string): string {
  return value.trim().replace(/\s+/g, '').toLocaleLowerCase('en-US')
}

function isPaymentStatus(value: unknown): value is PurchasePaymentStatus {
  return value === 'paid' || value === 'unpaid'
}

function isInvoiceStatus(value: unknown): value is PurchaseInvoiceStatus {
  return value === 'pending' || value === 'received'
}

function isDateString(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false

  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function optionalDate(value: unknown, message: string): { ok: true; value: string | null } | { ok: false; message: string } {
  if (value == null || value === '') return { ok: true, value: null }
  return isDateString(value) ? { ok: true, value } : { ok: false, message }
}

function rejectImmutablePurchaseFields(input: Record<string, unknown>): string | null {
  const allowedKeys = new Set([
    'id',
    'supplierInvoiceNumber',
    'invoiceDate',
    'paymentStatus',
    'dueDate',
    'paidAt',
    'notes',
  ])
  const immutableKeys = Object.keys(input).filter((key) => !allowedKeys.has(key))
  return immutableKeys.length ? `Posted purchase fields cannot be changed: ${immutableKeys.join(', ')}` : null
}

async function nextPurchaseNumber(invoiceDate: string): Promise<string | null> {
  const repository = getPurchaseRepository()
  if (!repository) return null

  const period = invoiceDate.slice(0, 7).replace('-', '')
  const prefix = `PUR-${period}-`
  const [latest] = await repository
    .select({ purchaseNumber: purchases.purchaseNumber })
    .from(purchases)
    .where(like(purchases.purchaseNumber, `${prefix}%`))
    .orderBy(desc(purchases.purchaseNumber))
    .limit(1)
  const latestSequence = latest ? Number(latest.purchaseNumber.slice(prefix.length)) : 0
  const nextSequence = Number.isSafeInteger(latestSequence) ? latestSequence + 1 : 1

  return `${prefix}${String(nextSequence).padStart(4, '0')}`
}

export async function listPurchases(input: Record<string, unknown> = {}): Promise<PurchaseSummary[]> {
  const repository = getPurchaseRepository()
  if (!repository) return []

  const paymentStatus = isPaymentStatus(input.paymentStatus) ? input.paymentStatus : null
  const invoiceStatus = isInvoiceStatus(input.invoiceStatus) ? input.invoiceStatus : null
  const search = typeof input.search === 'string' ? input.search.trim().toLocaleLowerCase() : ''
  const rows = await repository
    .select({
      id: purchases.id,
      purchaseNumber: purchases.purchaseNumber,
      supplierId: purchases.supplierId,
      supplierName: suppliers.name,
      supplierInvoiceNumber: purchases.supplierInvoiceNumber,
      invoiceDate: purchases.invoiceDate,
      paymentStatus: purchases.paymentStatus,
      invoiceStatus: purchases.invoiceStatus,
      dueDate: purchases.dueDate,
      paidAt: purchases.paidAt,
      total: purchases.total,
      createdById: purchases.createdById,
      createdAt: purchases.createdAt,
    })
    .from(purchases)
    .innerJoin(suppliers, eq(purchases.supplierId, suppliers.id))
    .orderBy(desc(purchases.invoiceDate), desc(purchases.id))

  const summaries = await Promise.all(rows.map(async (row) => {
    const items = await repository
      .select({ id: purchaseItems.id })
      .from(purchaseItems)
      .where(eq(purchaseItems.purchaseId, row.id))

    return { ...row, itemCount: items.length }
  }))

  return summaries.filter((purchase) => {
    if (paymentStatus && purchase.paymentStatus !== paymentStatus) return false
    if (invoiceStatus && purchase.invoiceStatus !== invoiceStatus) return false
    if (!search) return true

    return [
      purchase.purchaseNumber,
      purchase.supplierName,
      purchase.supplierInvoiceNumber ?? '',
    ].some((value) => value.toLocaleLowerCase().includes(search))
  })
}

export async function getPurchaseDetail(input: { id?: unknown }): Promise<PurchaseDetail | null> {
  const repository = getPurchaseRepository()
  const id = positiveInteger(input.id)
  if (!repository || id === null) return null

  const [row] = await repository
    .select({
      id: purchases.id,
      purchaseNumber: purchases.purchaseNumber,
      supplierId: purchases.supplierId,
      supplierName: suppliers.name,
      supplierInvoiceNumber: purchases.supplierInvoiceNumber,
      invoiceDate: purchases.invoiceDate,
      paymentStatus: purchases.paymentStatus,
      invoiceStatus: purchases.invoiceStatus,
      dueDate: purchases.dueDate,
      paidAt: purchases.paidAt,
      notes: purchases.notes,
      total: purchases.total,
      createdById: purchases.createdById,
      createdAt: purchases.createdAt,
    })
    .from(purchases)
    .innerJoin(suppliers, eq(purchases.supplierId, suppliers.id))
    .where(eq(purchases.id, id))
    .limit(1)
  if (!row) return null

  const items = await repository
    .select({
      id: purchaseItems.id,
      productId: purchaseItems.productId,
      sku: purchaseItems.skuSnapshot,
      productName: purchaseItems.productNameSnapshot,
      quantity: purchaseItems.quantity,
      unitCost: purchaseItems.unitCost,
      lineTotal: purchaseItems.lineTotal,
    })
    .from(purchaseItems)
    .where(eq(purchaseItems.purchaseId, id))
    .orderBy(purchaseItems.id)

  return { ...row, itemCount: items.length, items }
}

export async function createPurchase(input: PurchaseCreateInput): Promise<PurchaseMutationResult> {
  const repository = getPurchaseRepository()
  if (!repository) return { ok: false, message: 'Database unavailable' }

  const supplierId = positiveInteger(input.supplierId)
  const createdById = positiveInteger(input.createdById)
  const invoiceNumber = optionalString(input.supplierInvoiceNumber)
  const normalizedInvoiceNumber = invoiceNumber ? normalizeInvoiceNumber(invoiceNumber) : null
  const requestedPaymentStatus = isPaymentStatus(input.paymentStatus) ? input.paymentStatus : 'unpaid'
  const invoiceDate = isDateString(input.invoiceDate) ? input.invoiceDate : null
  const invoiceStatus: PurchaseInvoiceStatus = invoiceNumber && invoiceDate ? 'received' : 'pending'
  const paymentStatus: PurchasePaymentStatus = requestedPaymentStatus
  const dueDate = input.dueDate == null || input.dueDate === ''
    ? null
    : isDateString(input.dueDate) ? input.dueDate : undefined
  const notes = optionalString(input.notes)

  if (!supplierId || !createdById) {
    return { ok: false, message: 'Supplier and user are required' }
  }
  if (dueDate === undefined) return { ok: false, message: 'Enter a valid due date' }
  if (dueDate && invoiceDate && dueDate < invoiceDate) return { ok: false, message: 'Due date cannot be before invoice date' }
  if (!Array.isArray(input.items) || input.items.length === 0) {
    return { ok: false, message: 'Add at least one product' }
  }

  const [supplier] = await repository.select().from(suppliers).where(eq(suppliers.id, supplierId)).limit(1)
  if (!supplier || !supplier.isActive) return { ok: false, message: 'Supplier is no longer available' }

  const [createdBy] = await repository.select().from(users).where(eq(users.id, createdById)).limit(1)
  if (!createdBy || !createdBy.isActive) return { ok: false, message: 'User is no longer available' }

  if (normalizedInvoiceNumber) {
    const [duplicateInvoice] = await repository
      .select({ id: purchases.id })
      .from(purchases)
      .where(sql`${purchases.supplierId} = ${supplierId} AND ${purchases.normalizedInvoiceNumber} = ${normalizedInvoiceNumber}`)
      .limit(1)
    if (duplicateInvoice) return { ok: false, message: 'This supplier invoice has already been recorded' }
  }

  const preparedItems: PreparedPurchaseItem[] = []
  const productIds = new Set<number>()

  for (const rawItem of input.items) {
    if (!rawItem || typeof rawItem !== 'object') return { ok: false, message: 'Invalid purchase item' }

    const item = rawItem as PurchaseItemInput
    const productId = positiveInteger(item.productId)
    const quantity = positiveInteger(item.quantity)
    const unitCost = nonNegativeInteger(item.unitCost)
    if (!productId || !quantity || unitCost === null) {
      return { ok: false, message: 'Each item needs a product, positive quantity, and non-negative unit cost' }
    }
    if (productIds.has(productId)) return { ok: false, message: 'A product can only appear once per purchase' }
    productIds.add(productId)

    const [product] = await repository.select().from(products).where(eq(products.id, productId)).limit(1)
    if (!product || !product.isActive) return { ok: false, message: 'A selected product is no longer available' }

    const lineTotal = quantity * unitCost
    if (!Number.isSafeInteger(lineTotal)) return { ok: false, message: 'Purchase item total is too large' }

    preparedItems.push({
      productId: product.id,
      sku: product.sku,
      productName: product.name,
      quantity,
      unitCost,
      lineTotal,
    })
  }

  const total = preparedItems.reduce((sum, item) => sum + item.lineTotal, 0)
  if (!Number.isSafeInteger(total)) return { ok: false, message: 'Purchase total is too large' }

  const purchaseNumberDate = invoiceDate ?? new Date().toISOString().slice(0, 10)
  const purchaseNumber = await nextPurchaseNumber(purchaseNumberDate)
  if (!purchaseNumber) return { ok: false, message: 'Unable to generate purchase number' }

  const now = new Date().toISOString()
  let purchaseId: number

  try {
    purchaseId = repository.transaction((tx) => {
      const saved = tx.insert(purchases).values({
        purchaseNumber,
        supplierId,
        supplierInvoiceNumber: invoiceNumber,
        normalizedInvoiceNumber,
        invoiceDate,
        paymentStatus,
        invoiceStatus,
        dueDate,
        paidAt: paymentStatus === 'paid' ? now : null,
        notes,
        total,
        createdById,
        createdAt: now,
      }).returning().get()

      for (const item of preparedItems) {
        tx.insert(purchaseItems).values({
          purchaseId: saved.id,
          productId: item.productId,
          skuSnapshot: item.sku,
          productNameSnapshot: item.productName,
          quantity: item.quantity,
          unitCost: item.unitCost,
          lineTotal: item.lineTotal,
        }).run()

        tx.update(products).set({
          stockQty: sql`${products.stockQty} + ${item.quantity}`,
          lastPurchaseCost: item.unitCost,
          updatedAt: now,
        }).where(eq(products.id, item.productId)).run()
      }

      return saved.id
    })
  } catch {
    return { ok: false, message: 'Unable to record purchase. No stock was changed.' }
  }

  await flushDatabase()
  const purchase = await getPurchaseDetail({ id: purchaseId })
  return purchase
    ? { ok: true, message: 'Purchase recorded and stock updated', purchase }
    : { ok: false, message: 'Purchase was saved but could not be reloaded' }
}

export async function markPurchasePaid(input: { id?: unknown }): Promise<PurchaseMutationResult> {
  const repository = getPurchaseRepository()
  const id = positiveInteger(input.id)
  if (!repository) return { ok: false, message: 'Database unavailable' }
  if (!id) return { ok: false, message: 'Invalid purchase request' }

  const [existing] = await repository.select().from(purchases).where(eq(purchases.id, id)).limit(1)
  if (!existing) return { ok: false, message: 'Purchase not found' }
  if (existing.paymentStatus === 'paid') return { ok: false, message: 'Purchase is already paid' }

  await repository.update(purchases).set({
    paymentStatus: 'paid',
    paidAt: new Date().toISOString(),
  }).where(eq(purchases.id, id))
  await flushDatabase()

  const purchase = await getPurchaseDetail({ id })
  return purchase
    ? { ok: true, message: 'Purchase marked as paid', purchase }
    : { ok: false, message: 'Purchase was updated but could not be reloaded' }
}

export async function updatePurchaseInvoice(input: PurchaseInvoiceUpdateInput): Promise<PurchaseMutationResult> {
  const repository = getPurchaseRepository()
  if (!repository) return { ok: false, message: 'Database unavailable' }
  if (!input || typeof input !== 'object') return { ok: false, message: 'Invalid purchase request' }

  const immutableFieldMessage = rejectImmutablePurchaseFields(input as Record<string, unknown>)
  if (immutableFieldMessage) return { ok: false, message: immutableFieldMessage }

  const id = positiveInteger(input.id)
  if (!id) return { ok: false, message: 'Invalid purchase request' }

  const [existing] = await repository.select().from(purchases).where(eq(purchases.id, id)).limit(1)
  if (!existing) return { ok: false, message: 'Purchase not found' }

  const invoiceNumber = optionalString(input.supplierInvoiceNumber)
  const normalizedInvoiceNumber = invoiceNumber ? normalizeInvoiceNumber(invoiceNumber) : null
  const invoiceDateResult = optionalDate(input.invoiceDate, 'Enter a valid invoice date')
  const dueDateResult = optionalDate(input.dueDate, 'Enter a valid due date')
  const paidAtResult = optionalDate(input.paidAt, 'Enter a valid paid date')
  if (!invoiceDateResult.ok) return invoiceDateResult
  if (!dueDateResult.ok) return dueDateResult
  if (!paidAtResult.ok) return paidAtResult

  const invoiceDate = invoiceDateResult.value
  const dueDate = dueDateResult.value
  const invoiceStatus: PurchaseInvoiceStatus = invoiceNumber && invoiceDate ? 'received' : 'pending'
  const requestedPaymentStatus = isPaymentStatus(input.paymentStatus) ? input.paymentStatus : existing.paymentStatus
  const paymentStatus: PurchasePaymentStatus = requestedPaymentStatus
  const paidAt: string | null = paymentStatus === 'paid'
    ? paidAtResult.value ?? existing.paidAt ?? new Date().toISOString()
    : null
  const notes = optionalString(input.notes)

  if (dueDate && invoiceDate && dueDate < invoiceDate) return { ok: false, message: 'Due date cannot be before invoice date' }
  if (paymentStatus === 'paid' && dueDate && paidAt && paidAt.slice(0, 10) < dueDate) {
    return { ok: false, message: 'Paid date cannot be before due date' }
  }

  if (normalizedInvoiceNumber) {
    const [duplicateInvoice] = await repository
      .select({ id: purchases.id })
      .from(purchases)
      .where(sql`${purchases.supplierId} = ${existing.supplierId} AND ${purchases.normalizedInvoiceNumber} = ${normalizedInvoiceNumber} AND ${purchases.id} <> ${id}`)
      .limit(1)
    if (duplicateInvoice) return { ok: false, message: 'This supplier invoice has already been recorded' }
  }

  await repository.update(purchases).set({
    supplierInvoiceNumber: invoiceNumber,
    normalizedInvoiceNumber,
    invoiceDate,
    invoiceStatus,
    paymentStatus,
    dueDate,
    paidAt,
    notes,
  }).where(eq(purchases.id, id))
  await flushDatabase()

  const purchase = await getPurchaseDetail({ id })
  return purchase
    ? { ok: true, message: invoiceStatus === 'received' ? 'Invoice details updated' : 'Purchase kept as pending invoice', purchase }
    : { ok: false, message: 'Purchase was updated but could not be reloaded' }
}
