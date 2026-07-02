import fs from 'fs'
import path from 'path'
import os from 'os'
import { and, eq, sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { closeDatabase, initializeDatabase } from '../db/client'
import { saleItems, stockMovements } from '../db/schema/index'
import { getProductRepository } from '../repositories/product.repository'
import { quickCreateVehicle } from './customer.service'
import { createCheckout } from './checkout.service'
import { getInvoiceDetail } from './invoice.service'
import { listProducts } from './product.service'
import { listServices } from './service.service'
import {
  createSalesDraft,
  deleteSalesDraft,
  isSalesDraftStale,
  listSalesDrafts,
  SALES_DRAFT_STALE_AFTER_DAYS,
  saveSalesDraftItems,
} from './sales-draft.service'

const databaseDirectory = path.join(os.tmpdir(), `simplepos-sales-draft-${process.pid}`)

describe('persisted sales drafts', () => {
  beforeAll(async () => {
    fs.rmSync(databaseDirectory, { recursive: true, force: true })
    await initializeDatabase(databaseDirectory)
  })

  afterAll(async () => {
    await closeDatabase()
    fs.rmSync(databaseDirectory, { recursive: true, force: true })
  })

  it('creates, reuses, restores, and checks out the same sale', async () => {
    const vehicleResult = await quickCreateVehicle({
      plateNumber: 'DK 42 AB',
      model: 'Avanza',
      customerName: 'Test Customer',
    })
    const vehicle = vehicleResult.vehicle
    expect(vehicle).toBeDefined()

    const product = (await listProducts())[0]
    expect(product).toBeDefined()

    const draft = await createSalesDraft({
      vehicleId: vehicle!.id,
      createdById: 1,
    })
    const existing = await createSalesDraft({
      vehicleId: vehicle!.id,
      createdById: 1,
    })
    expect(existing?.id).toBe(draft?.id)
    expect(existing?.created).toBe(false)
    expect(draft?.created).toBe(true)
    expect(draft?.status).toBe('in_progress')

    await expect(saveSalesDraftItems({
      saleId: draft!.id,
      items: [{ itemType: 'product', id: product.id, quantity: 2 }],
    })).resolves.toEqual({ ok: true })

    const restored = await listSalesDrafts()
    expect(restored).toHaveLength(1)
    expect(restored[0].lineItems).toMatchObject([
      { type: 'product', id: product.id, quantity: 2 },
    ])

    const checkout = await createCheckout({
      saleId: draft!.id,
      vehicleId: vehicle!.id,
      createdById: 1,
      paymentMethod: 'cash',
      items: [{ itemType: 'product', id: product.id, quantity: 2 }],
    })

    expect(checkout.ok).toBe(true)
    expect(checkout.checkout).toMatchObject({
      saleId: draft!.id,
      vehicleId: vehicle!.id,
      amountPaid: product.unitPrice * 2,
      paymentMethod: 'cash',
    })
    const invoice = await getInvoiceDetail({ id: checkout.checkout!.invoiceId })
    expect(invoice).toMatchObject({
      status: 'paid',
      total: product.unitPrice * 2,
      vehiclePlateNumber: vehicle!.plateNumber,
      vehicleModel: vehicle!.model,
      payment: {
        method: 'cash',
        status: 'paid',
        amount: product.unitPrice * 2,
      },
    })
    const updatedProduct = (await listProducts()).find((candidate) => candidate.id === product.id)
    expect(updatedProduct?.stockQty).toBe(product.stockQty - 2)
    const [savedSaleItem] = await getProductRepository()!
      .select()
      .from(saleItems)
      .where(eq(saleItems.saleId, checkout.checkout!.saleId))
    const movements = await getProductRepository()!
      .select()
      .from(stockMovements)
      .where(and(
        eq(stockMovements.referenceType, 'sale_item'),
        eq(stockMovements.referenceId, savedSaleItem.id),
      ))
    expect(movements).toEqual([
      expect.objectContaining({
        productId: product.id,
        movementType: 'sale',
        quantityDelta: -2,
        balanceAfter: product.stockQty - 2,
        referenceType: 'sale_item',
        referenceNumber: checkout.checkout!.invoiceNumber,
        createdById: 1,
        createdByNameSnapshot: 'Administrator',
      }),
    ])
    await expect(listSalesDrafts()).resolves.toEqual([])
  })

  it('returns one open draft when creation is requested concurrently', async () => {
    const vehicleResult = await quickCreateVehicle({
      plateNumber: 'DK 43 AB',
      model: 'Xenia',
      customerName: 'Concurrent Customer',
    })
    expect(vehicleResult.vehicle).toBeDefined()

    const drafts = await Promise.all([
      createSalesDraft({ vehicleId: vehicleResult.vehicle!.id, createdById: 1 }),
      createSalesDraft({ vehicleId: vehicleResult.vehicle!.id, createdById: 1 }),
    ])

    expect(new Set(drafts.map((draft) => draft?.id)).size).toBe(1)
    expect((await listSalesDrafts()).filter((draft) => draft.vehicle.id === vehicleResult.vehicle!.id)).toHaveLength(1)
  })

  it('permanently deletes only an in-progress draft and its items', async () => {
    const vehicleResult = await quickCreateVehicle({
      plateNumber: 'DK 44 AB',
      model: 'Brio',
      customerName: 'Delete Customer',
    })
    const product = (await listProducts())[0]
    const draft = await createSalesDraft({ vehicleId: vehicleResult.vehicle!.id, createdById: 1 })
    await saveSalesDraftItems({
      saleId: draft!.id,
      items: [{ itemType: 'product', id: product.id, quantity: 1 }],
    })

    await expect(deleteSalesDraft({ saleId: draft!.id })).resolves.toEqual({
      ok: true,
      message: 'Draft deleted',
    })
    expect((await listSalesDrafts()).some((candidate) => candidate.id === draft!.id)).toBe(false)
    await expect(deleteSalesDraft({ saleId: draft!.id })).resolves.toEqual({
      ok: false,
      message: 'Only an in-progress sale can be deleted',
    })
  })

  it('marks drafts stale only after seven full days', () => {
    const now = Date.parse('2026-07-01T00:00:00.000Z')
    const threshold = SALES_DRAFT_STALE_AFTER_DAYS * 24 * 60 * 60 * 1000

    expect(isSalesDraftStale(new Date(now - threshold).toISOString(), now)).toBe(false)
    expect(isSalesDraftStale(new Date(now - threshold - 1).toISOString(), now)).toBe(true)
    expect(isSalesDraftStale('invalid date', now)).toBe(false)
  })

  it('stores and checks out product and service price overrides with audit metadata', async () => {
    const vehicleResult = await quickCreateVehicle({
      plateNumber: 'DK 45 AB',
      model: 'Jazz',
      customerName: 'Override Customer',
    })
    const product = (await listProducts())[0]
    const service = (await listServices())[0]
    const draft = await createSalesDraft({ vehicleId: vehicleResult.vehicle!.id, createdById: 1 })
    const productPrice = product.unitPrice + 1_000
    const servicePrice = service.price + 2_000

    await expect(saveSalesDraftItems({
      saleId: draft!.id,
      updatedById: 1,
      items: [
        { itemType: 'product', id: product.id, quantity: 1, unitPrice: productPrice },
        { itemType: 'service', id: service.id, quantity: 1, unitPrice: servicePrice },
      ],
    })).resolves.toEqual({ ok: true })

    const [savedDraft] = (await listSalesDrafts()).filter((candidate) => candidate.id === draft!.id)
    expect(savedDraft.lineItems).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'product',
        basePrice: product.unitPrice,
        price: productPrice,
        priceOverriddenById: 1,
        priceOverriddenAt: expect.any(String),
      }),
      expect.objectContaining({
        type: 'service',
        basePrice: service.price,
        price: servicePrice,
        priceOverriddenById: 1,
        priceOverriddenAt: expect.any(String),
      }),
    ]))
    const firstOverrideTime = savedDraft.lineItems[0].priceOverriddenAt

    await saveSalesDraftItems({
      saleId: draft!.id,
      updatedById: 1,
      items: savedDraft.lineItems.map((item) => ({
        itemType: item.type,
        id: item.id,
        quantity: 2,
        unitPrice: item.price,
      })),
    })
    const [resavedDraft] = (await listSalesDrafts()).filter((candidate) => candidate.id === draft!.id)
    expect(resavedDraft.lineItems[0].priceOverriddenAt).toBe(firstOverrideTime)

    const checkout = await createCheckout({
      saleId: draft!.id,
      vehicleId: vehicleResult.vehicle!.id,
      createdById: 1,
      paymentMethod: 'cash',
      amountPaid: (productPrice + servicePrice) * 2,
      items: resavedDraft.lineItems.map((item) => ({
        itemType: item.type,
        id: item.id,
        quantity: item.quantity,
        unitPrice: item.price,
      })),
    })
    expect(checkout.ok).toBe(true)
    expect(checkout.checkout?.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ basePrice: product.unitPrice, unitPrice: productPrice, priceOverriddenById: 1 }),
      expect.objectContaining({ basePrice: service.price, unitPrice: servicePrice, priceOverriddenById: 1 }),
    ]))
    const productMovementCount = (await getProductRepository()!
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.referenceNumber, checkout.checkout!.invoiceNumber))).length
    expect(productMovementCount).toBe(1)
  })

  it('rejects invalid prices and clears audit metadata when restored to catalog price', async () => {
    const vehicleResult = await quickCreateVehicle({
      plateNumber: 'DK 46 AB',
      model: 'Yaris',
      customerName: 'Reset Customer',
    })
    const product = (await listProducts())[0]
    const draft = await createSalesDraft({ vehicleId: vehicleResult.vehicle!.id, createdById: 1 })

    await expect(saveSalesDraftItems({
      saleId: draft!.id,
      updatedById: 1,
      items: [{ itemType: 'product', id: product.id, quantity: 1, unitPrice: -1 }],
    })).resolves.toEqual({ ok: false })

    await saveSalesDraftItems({
      saleId: draft!.id,
      updatedById: 1,
      items: [{ itemType: 'product', id: product.id, quantity: 1, unitPrice: product.unitPrice + 500 }],
    })
    await saveSalesDraftItems({
      saleId: draft!.id,
      updatedById: 1,
      items: [{ itemType: 'product', id: product.id, quantity: 1, unitPrice: product.unitPrice }],
    })

    const [savedDraft] = (await listSalesDrafts()).filter((candidate) => candidate.id === draft!.id)
    expect(savedDraft.lineItems[0]).toMatchObject({
      basePrice: product.unitPrice,
      price: product.unitPrice,
      priceOverriddenById: null,
      priceOverriddenAt: null,
    })
  })

  it('rejects non-cash, partial, and overpaid direct-sale checkout', async () => {
    const vehicleResult = await quickCreateVehicle({
      plateNumber: 'DK 47 AB',
      model: 'Mobilio',
      customerName: 'Cash Customer',
    })
    const product = (await listProducts())[0]
    const draft = await createSalesDraft({ vehicleId: vehicleResult.vehicle!.id, createdById: 1 })
    await saveSalesDraftItems({
      saleId: draft!.id,
      updatedById: 1,
      items: [{ itemType: 'product', id: product.id, quantity: 1, unitPrice: product.unitPrice }],
    })
    const checkoutInput = {
      saleId: draft!.id,
      vehicleId: vehicleResult.vehicle!.id,
      createdById: 1,
      items: [{ itemType: 'product' as const, id: product.id, quantity: 1, unitPrice: product.unitPrice }],
    }

    await expect(createCheckout({
      ...checkoutInput,
      paymentMethod: 'transfer',
      amountPaid: product.unitPrice,
    })).resolves.toEqual({
      ok: false,
      message: 'Direct sales accept cash payment only',
    })
    await expect(createCheckout({
      ...checkoutInput,
      paymentMethod: 'cash',
      amountPaid: product.unitPrice - 1,
    })).resolves.toEqual({
      ok: false,
      message: 'Cash payment must equal the sale total',
    })
    await expect(createCheckout({
      ...checkoutInput,
      paymentMethod: 'cash',
      amountPaid: product.unitPrice + 1,
    })).resolves.toEqual({
      ok: false,
      message: 'Cash payment must equal the sale total',
    })
    expect((await listSalesDrafts()).some((candidate) => candidate.id === draft!.id)).toBe(true)
  })

  it('rolls back checkout when sale movement recording fails', async () => {
    const repository = getProductRepository()!
    const vehicleResult = await quickCreateVehicle({
      plateNumber: 'DK 48 AB',
      model: 'Ertiga',
      customerName: 'Rollback Customer',
    })
    const product = (await listProducts())[0]
    const draft = await createSalesDraft({ vehicleId: vehicleResult.vehicle!.id, createdById: 1 })
    const movementsBefore = await repository.select().from(stockMovements)
    await saveSalesDraftItems({
      saleId: draft!.id,
      updatedById: 1,
      items: [{ itemType: 'product', id: product.id, quantity: 1, unitPrice: product.unitPrice }],
    })

    repository.run(sql.raw(`
      CREATE TRIGGER fail_sale_movement
      BEFORE INSERT ON stock_movements
      WHEN NEW.movement_type = 'sale'
      BEGIN
        SELECT RAISE(ABORT, 'forced sale movement failure');
      END
    `))

    const result = await createCheckout({
      saleId: draft!.id,
      vehicleId: vehicleResult.vehicle!.id,
      createdById: 1,
      paymentMethod: 'cash',
      amountPaid: product.unitPrice,
      items: [{ itemType: 'product', id: product.id, quantity: 1, unitPrice: product.unitPrice }],
    })
    repository.run(sql`DROP TRIGGER fail_sale_movement`)

    expect(result).toEqual({
      ok: false,
      message: 'Unable to complete sale. No stock was changed.',
    })
    const updatedProduct = (await listProducts()).find((candidate) => candidate.id === product.id)
    expect(updatedProduct?.stockQty).toBe(product.stockQty)
    expect((await listSalesDrafts()).some((candidate) => candidate.id === draft!.id)).toBe(true)
    await expect(repository.select().from(stockMovements)).resolves.toHaveLength(movementsBefore.length)
  })
})
