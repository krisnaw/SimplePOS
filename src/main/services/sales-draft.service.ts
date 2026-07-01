import { and, eq } from 'drizzle-orm'
import { flushDatabase } from '../db/client'
import { products, saleItems, sales, services, vehicles } from '../db/schema/index'
import { getCheckoutRepository } from '../repositories/checkout.repository'

export const SALES_DRAFT_STALE_AFTER_DAYS = 7
const SALES_DRAFT_STALE_AFTER_MS = SALES_DRAFT_STALE_AFTER_DAYS * 24 * 60 * 60 * 1000

export function isSalesDraftStale(updatedAt: string, now = Date.now()): boolean {
  const updatedAtMs = Date.parse(updatedAt)
  return Number.isFinite(updatedAtMs) && now - updatedAtMs > SALES_DRAFT_STALE_AFTER_MS
}

export async function listSalesDrafts() {
  const db = getCheckoutRepository()
  if (!db) return []
  const rows = await db.select({ sale: sales, vehicle: vehicles })
    .from(sales)
    .innerJoin(vehicles, eq(sales.vehicleId, vehicles.id))
    .where(eq(sales.status, 'in_progress'))
  const items = await db.select().from(saleItems)
  return rows.map(({ sale, vehicle }) => ({
    id: sale.id,
    vehicle,
    createdAt: sale.createdAt,
    updatedAt: sale.updatedAt,
    isStale: isSalesDraftStale(sale.updatedAt),
    lineItems: items.filter((item) => item.saleId === sale.id).map((item) => ({
      key: `${item.itemType}-${item.productId ?? item.serviceId}`,
      id: item.productId ?? item.serviceId!,
      type: item.itemType,
      name: item.name,
      code: item.sku ?? '',
      price: item.unitPrice,
      basePrice: item.basePrice,
      priceOverriddenById: item.priceOverriddenById,
      priceOverriddenAt: item.priceOverriddenAt,
      quantity: item.quantity,
    })),
  }))
}

export async function createSalesDraft(input: Record<string, unknown>) {
  const db = getCheckoutRepository()
  if (!db || typeof input.vehicleId !== 'number') return null
  const [existing] = await db.select().from(sales)
    .where(and(eq(sales.vehicleId, input.vehicleId), eq(sales.status, 'in_progress')))
    .limit(1)
  if (existing) return { ...existing, created: false }
  const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, input.vehicleId)).limit(1)
  if (!vehicle || !vehicle.isActive) return null
  const now = new Date().toISOString()
  let saved
  try {
    saved = db.insert(sales).values({
      vehicleId: vehicle.id,
      customerId: vehicle.customerId,
      customerNameSnapshot: vehicle.customerName,
      customerPhoneSnapshot: vehicle.customerPhone,
      createdById: typeof input.createdById === 'number' ? input.createdById : null,
      status: 'in_progress',
      createdAt: now,
      updatedAt: now,
    }).returning().get()
  } catch (error) {
    const [concurrentDraft] = await db.select().from(sales)
      .where(and(eq(sales.vehicleId, input.vehicleId), eq(sales.status, 'in_progress')))
      .limit(1)
    if (concurrentDraft) return { ...concurrentDraft, created: false }
    throw error
  }
  await flushDatabase()
  return { ...saved, created: true }
}

export async function saveSalesDraftItems(input: Record<string, unknown>) {
  const db = getCheckoutRepository()
  if (!db || typeof input.saleId !== 'number' || !Array.isArray(input.items)) return { ok: false }
  const [sale] = await db.select().from(sales).where(eq(sales.id, input.saleId)).limit(1)
  if (!sale || sale.status !== 'in_progress') return { ok: false }
  const existingItems = await db.select().from(saleItems).where(eq(saleItems.saleId, sale.id))
  const overriddenById = typeof input.updatedById === 'number' && Number.isInteger(input.updatedById) && input.updatedById > 0
    ? input.updatedById
    : null
  const now = new Date().toISOString()
  const prepared: Array<{
    itemType: 'product' | 'service'
    productId: number | null
    serviceId: number | null
    name: string
    sku: string | null
    quantity: number
    basePrice: number
    unitPrice: number
    priceOverriddenById: number | null
    priceOverriddenAt: string | null
  }> = []
  for (const raw of input.items as Array<Record<string, unknown>>) {
    if (typeof raw.id !== 'number' || typeof raw.quantity !== 'number') return { ok: false }
    if (
      raw.unitPrice !== undefined &&
      (typeof raw.unitPrice !== 'number' || !Number.isInteger(raw.unitPrice) || raw.unitPrice < 0)
    ) return { ok: false }

    const existing = existingItems.find((item) =>
      item.itemType === raw.itemType &&
      (item.productId ?? item.serviceId) === raw.id
    )
    if (raw.itemType === 'product') {
      const [item] = await db.select().from(products).where(eq(products.id, raw.id)).limit(1)
      if (!item) return { ok: false }
      const basePrice = existing?.basePrice ?? item.unitPrice
      const unitPrice = typeof raw.unitPrice === 'number' ? raw.unitPrice : existing?.unitPrice ?? basePrice
      const isOverride = unitPrice !== basePrice
      if (isOverride && !overriddenById) return { ok: false }
      const unchangedOverride = isOverride && existing?.unitPrice === unitPrice
      prepared.push({
        itemType: 'product',
        productId: item.id,
        serviceId: null,
        name: item.name,
        sku: item.sku,
        quantity: raw.quantity,
        basePrice,
        unitPrice,
        priceOverriddenById: isOverride
          ? unchangedOverride ? existing.priceOverriddenById ?? overriddenById : overriddenById
          : null,
        priceOverriddenAt: unchangedOverride
          ? existing.priceOverriddenAt ?? now
          : isOverride ? now : null,
      })
    } else {
      const [item] = await db.select().from(services).where(eq(services.id, raw.id)).limit(1)
      if (!item) return { ok: false }
      const basePrice = existing?.basePrice ?? item.price
      const unitPrice = typeof raw.unitPrice === 'number' ? raw.unitPrice : existing?.unitPrice ?? basePrice
      const isOverride = unitPrice !== basePrice
      if (isOverride && !overriddenById) return { ok: false }
      const unchangedOverride = isOverride && existing?.unitPrice === unitPrice
      prepared.push({
        itemType: 'service',
        productId: null,
        serviceId: item.id,
        name: item.name,
        sku: item.code,
        quantity: raw.quantity,
        basePrice,
        unitPrice,
        priceOverriddenById: isOverride
          ? unchangedOverride ? existing.priceOverriddenById ?? overriddenById : overriddenById
          : null,
        priceOverriddenAt: unchangedOverride
          ? existing.priceOverriddenAt ?? now
          : isOverride ? now : null,
      })
    }
  }
  db.transaction((tx) => {
    tx.delete(saleItems).where(eq(saleItems.saleId, sale.id)).run()
    for (const item of prepared) tx.insert(saleItems).values({ ...item, saleId: sale.id, lineTotal: item.unitPrice * item.quantity }).run()
    const total = prepared.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    tx.update(sales).set({ subtotal: total, total, updatedAt: now }).where(eq(sales.id, sale.id)).run()
  })
  await flushDatabase()
  return { ok: true }
}

export async function deleteSalesDraft(input: Record<string, unknown>) {
  const db = getCheckoutRepository()
  if (!db || typeof input.saleId !== 'number') return { ok: false, message: 'Invalid sales draft' }
  const [sale] = await db.select().from(sales).where(eq(sales.id, input.saleId)).limit(1)
  if (!sale || sale.status !== 'in_progress') {
    return { ok: false, message: 'Only an in-progress sale can be deleted' }
  }

  db.transaction((tx) => {
    tx.delete(saleItems).where(eq(saleItems.saleId, sale.id)).run()
    tx.delete(sales).where(and(eq(sales.id, sale.id), eq(sales.status, 'in_progress'))).run()
  })
  await flushDatabase()
  return { ok: true, message: 'Draft deleted' }
}
