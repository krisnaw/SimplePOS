import { desc, eq } from 'drizzle-orm'
import { flushDatabase, getDatabaseClient } from '../db/client'
import { products, stockMovements, users } from '../db/schema/index'
import type { Product, StockMovementType, UnitType } from '../db/schema/index'

type DatabaseClient = NonNullable<ReturnType<typeof getDatabaseClient>>
type DatabaseTransaction = Parameters<Parameters<DatabaseClient['transaction']>[0]>[0]

export type RecordStockMovementInput = {
  productId: number
  movementType: StockMovementType
  quantityDelta: number
  referenceType?: string | null
  referenceId?: number | null
  referenceNumber?: string | null
  reason?: string | null
  createdById?: number | null
  createdByNameSnapshot?: string | null
  createdAt?: string
}

export type StockAdjustmentResult = {
  ok: boolean
  message: string
  balanceAfter?: number
}

export type StockMovementListInput = {
  productId?: unknown
  movementType?: unknown
  dateFrom?: unknown
  dateTo?: unknown
  search?: unknown
  limit?: unknown
  offset?: unknown
}

export type StockMovementSummary = {
  id: number
  productId: number
  sku: string
  productName: string
  unitType: UnitType
  movementType: StockMovementType
  quantityDelta: number
  balanceAfter: number
  referenceNumber: string | null
  reason: string | null
  createdById: number | null
  createdByName: string | null
  createdAt: string
}

export type StockMovementListResult = {
  items: StockMovementSummary[]
  total: number
  totalIn: number
  totalOut: number
}

function assertSafeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`${label} must be a whole number`)
  }
}

function isStockMovementType(value: unknown): value is StockMovementType {
  return value === 'opening' || value === 'purchase' || value === 'sale' || value === 'adjustment'
}

function isDateString(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false

  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function normalizeLimit(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) return 50
  return Math.min(Math.max(value, 1), 100)
}

function normalizeOffset(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) return 0
  return value
}

export function recordStockMovement(
  tx: DatabaseTransaction,
  input: RecordStockMovementInput,
): number {
  assertSafeInteger(input.productId, 'Product ID')
  assertSafeInteger(input.quantityDelta, 'Quantity delta')
  if (input.quantityDelta === 0) throw new Error('Quantity delta cannot be zero')

  const product = tx
    .select()
    .from(products)
    .where(eq(products.id, input.productId))
    .limit(1)
    .get()

  if (!product) throw new Error('Product not found')

  const balanceAfter = product.stockQty + input.quantityDelta
  if (balanceAfter < 0) throw new Error('Stock movement would make stock negative')

  const createdAt = input.createdAt ?? new Date().toISOString()

  tx.update(products)
    .set({
      stockQty: balanceAfter,
      updatedAt: createdAt,
    })
    .where(eq(products.id, product.id))
    .run()

  tx.insert(stockMovements).values({
    productId: product.id,
    skuSnapshot: product.sku,
    productNameSnapshot: product.name,
    unitTypeSnapshot: product.unitType,
    movementType: input.movementType,
    quantityDelta: input.quantityDelta,
    balanceAfter,
    referenceType: input.referenceType ?? null,
    referenceId: input.referenceId ?? null,
    referenceNumber: input.referenceNumber ?? null,
    reason: input.reason ?? null,
    createdById: input.createdById ?? null,
    createdByNameSnapshot: input.createdByNameSnapshot ?? null,
    createdAt,
  }).run()

  return balanceAfter
}

export async function adjustStock(input: {
  productId?: unknown
  newStockQty?: unknown
  reason?: unknown
  createdById?: unknown
}): Promise<StockAdjustmentResult> {
  const repository = getDatabaseClient()
  if (!repository) return { ok: false, message: 'Database unavailable' }

  if (
    typeof input.productId !== 'number' ||
    !Number.isSafeInteger(input.productId) ||
    input.productId <= 0 ||
    typeof input.newStockQty !== 'number' ||
    !Number.isSafeInteger(input.newStockQty) ||
    input.newStockQty < 0 ||
    typeof input.createdById !== 'number' ||
    !Number.isSafeInteger(input.createdById) ||
    input.createdById <= 0
  ) {
    return { ok: false, message: 'Invalid stock adjustment request' }
  }

  const reason = typeof input.reason === 'string' ? input.reason.trim() : ''
  if (!reason) return { ok: false, message: 'Adjustment reason is required' }
  const productId = input.productId
  const newStockQty = input.newStockQty
  const createdById = input.createdById

  const [createdBy] = await repository
    .select()
    .from(users)
    .where(eq(users.id, createdById))
    .limit(1)
  if (!createdBy || !createdBy.isActive) return { ok: false, message: 'User is no longer available' }

  try {
    const balanceAfter = repository.transaction((tx) => {
      const product = tx
        .select()
        .from(products)
        .where(eq(products.id, productId))
        .limit(1)
        .get()

      if (!product) throw new Error('Product not found')

      const quantityDelta = newStockQty - product.stockQty
      if (quantityDelta === 0) throw new Error('Stock quantity is unchanged')

      return recordStockMovement(tx, {
        productId: product.id,
        movementType: 'adjustment',
        quantityDelta,
        referenceNumber: 'Manual adjustment',
        reason,
        createdById: createdBy.id,
        createdByNameSnapshot: createdBy.name,
        createdAt: new Date().toISOString(),
      })
    })

    await flushDatabase()
    return { ok: true, message: 'Stock adjusted', balanceAfter }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Unable to adjust stock',
    }
  }
}

export async function listStockMovements(input: StockMovementListInput = {}): Promise<StockMovementListResult> {
  const repository = getDatabaseClient()
  if (!repository) return { items: [], total: 0, totalIn: 0, totalOut: 0 }

  const productId = typeof input.productId === 'number' && Number.isSafeInteger(input.productId) && input.productId > 0
    ? input.productId
    : null
  const movementType = isStockMovementType(input.movementType) ? input.movementType : null
  const dateFrom = isDateString(input.dateFrom) ? input.dateFrom : null
  const dateTo = isDateString(input.dateTo) ? input.dateTo : null
  const search = typeof input.search === 'string' ? input.search.trim().toLocaleLowerCase() : ''
  const limit = normalizeLimit(input.limit)
  const offset = normalizeOffset(input.offset)

  const rows = await repository
    .select()
    .from(stockMovements)
    .orderBy(desc(stockMovements.createdAt), desc(stockMovements.id))

  const filtered = rows.filter((movement) => {
    if (productId !== null && movement.productId !== productId) return false
    if (movementType !== null && movement.movementType !== movementType) return false
    const movementDate = movement.createdAt.slice(0, 10)
    if (dateFrom && movementDate < dateFrom) return false
    if (dateTo && movementDate > dateTo) return false
    if (!search) return true

    return [
      movement.skuSnapshot,
      movement.productNameSnapshot,
      movement.referenceNumber ?? '',
      movement.reason ?? '',
      movement.createdByNameSnapshot ?? '',
    ].some((value) => value.toLocaleLowerCase().includes(search))
  })

  const totalIn = filtered.reduce((sum, movement) => (
    movement.quantityDelta > 0 ? sum + movement.quantityDelta : sum
  ), 0)
  const totalOut = filtered.reduce((sum, movement) => (
    movement.quantityDelta < 0 ? sum + Math.abs(movement.quantityDelta) : sum
  ), 0)

  return {
    items: filtered.slice(offset, offset + limit).map((movement) => ({
      id: movement.id,
      productId: movement.productId,
      sku: movement.skuSnapshot,
      productName: movement.productNameSnapshot,
      unitType: movement.unitTypeSnapshot,
      movementType: movement.movementType,
      quantityDelta: movement.quantityDelta,
      balanceAfter: movement.balanceAfter,
      referenceNumber: movement.referenceNumber,
      reason: movement.reason,
      createdById: movement.createdById,
      createdByName: movement.createdByNameSnapshot,
      createdAt: movement.createdAt,
    })),
    total: filtered.length,
    totalIn,
    totalOut,
  }
}

export async function getLatestProductStock(productId: number): Promise<Product | null> {
  const repository = getDatabaseClient()
  if (!repository) return null

  const [product] = await repository.select().from(products).where(eq(products.id, productId)).limit(1)
  return product ?? null
}
