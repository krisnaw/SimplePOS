import { and, eq } from 'drizzle-orm'
import { flushDatabase } from '../db/client'
import { products, saleItems, sales, services, vehicles } from '../db/schema/index'
import { getCheckoutRepository } from '../repositories/checkout.repository'

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
    lineItems: items.filter((item) => item.saleId === sale.id).map((item) => ({
      key: `${item.itemType}-${item.productId ?? item.serviceId}`,
      id: item.productId ?? item.serviceId!,
      type: item.itemType,
      name: item.name,
      code: item.sku ?? '',
      price: item.unitPrice,
      quantity: item.quantity,
    })),
  }))
}

export async function createOrResumeSalesDraft(input: Record<string, unknown>) {
  const db = getCheckoutRepository()
  if (!db || typeof input.vehicleId !== 'number') return null
  const [existing] = await db.select().from(sales)
    .where(and(eq(sales.vehicleId, input.vehicleId), eq(sales.status, 'in_progress')))
    .limit(1)
  if (existing) return existing
  const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, input.vehicleId)).limit(1)
  if (!vehicle || !vehicle.isActive) return null
  const now = new Date().toISOString()
  const saved = db.insert(sales).values({
    vehicleId: vehicle.id,
    customerId: vehicle.customerId,
    customerNameSnapshot: vehicle.customerName,
    customerPhoneSnapshot: vehicle.customerPhone,
    createdById: typeof input.createdById === 'number' ? input.createdById : null,
    status: 'in_progress',
    createdAt: now,
    updatedAt: now,
  }).returning().get()
  await flushDatabase()
  return saved
}

export async function saveSalesDraftItems(input: Record<string, unknown>) {
  const db = getCheckoutRepository()
  if (!db || typeof input.saleId !== 'number' || !Array.isArray(input.items)) return { ok: false }
  const [sale] = await db.select().from(sales).where(eq(sales.id, input.saleId)).limit(1)
  if (!sale || sale.status !== 'in_progress') return { ok: false }
  const prepared: Array<{
    itemType: 'product' | 'service'
    productId: number | null
    serviceId: number | null
    name: string
    sku: string | null
    quantity: number
    unitPrice: number
  }> = []
  for (const raw of input.items as Array<Record<string, unknown>>) {
    if (typeof raw.id !== 'number' || typeof raw.quantity !== 'number') return { ok: false }
    if (raw.itemType === 'product') {
      const [item] = await db.select().from(products).where(eq(products.id, raw.id)).limit(1)
      if (!item) return { ok: false }
      prepared.push({ itemType: 'product' as const, productId: item.id, serviceId: null, name: item.name, sku: item.sku, quantity: raw.quantity, unitPrice: item.unitPrice })
    } else {
      const [item] = await db.select().from(services).where(eq(services.id, raw.id)).limit(1)
      if (!item) return { ok: false }
      prepared.push({ itemType: 'service' as const, productId: null, serviceId: item.id, name: item.name, sku: item.code, quantity: raw.quantity, unitPrice: item.price })
    }
  }
  db.transaction((tx) => {
    tx.delete(saleItems).where(eq(saleItems.saleId, sale.id)).run()
    for (const item of prepared) tx.insert(saleItems).values({ ...item, saleId: sale.id, lineTotal: item.unitPrice * item.quantity }).run()
    const total = prepared.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    tx.update(sales).set({ subtotal: total, total, updatedAt: new Date().toISOString() }).where(eq(sales.id, sale.id)).run()
  })
  await flushDatabase()
  return { ok: true }
}
