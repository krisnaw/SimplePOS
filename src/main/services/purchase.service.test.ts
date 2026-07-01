import fs from 'fs'
import os from 'os'
import path from 'path'
import { eq, sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { closeDatabase, initializeDatabase } from '../db/client'
import { products, purchaseItems, purchases } from '../db/schema/index'
import { getPurchaseRepository } from '../repositories/purchase.repository'
import { createSupplier } from './supplier.service'
import {
  createPurchase,
  getPurchaseDetail,
  listPurchases,
  markPurchasePaid,
  updatePurchaseInvoice,
} from './purchase.service'

const databaseDirectory = path.join(os.tmpdir(), `simplepos-purchase-service-${process.pid}`)

describe('purchase service', () => {
  beforeAll(async () => {
    fs.rmSync(databaseDirectory, { recursive: true, force: true })
    await initializeDatabase(databaseDirectory)
  })

  afterAll(async () => {
    await closeDatabase()
    fs.rmSync(databaseDirectory, { recursive: true, force: true })
  })

  it('records an unpaid supplier invoice and updates stock atomically', async () => {
    const repository = getPurchaseRepository()!
    const supplier = (await createSupplier({ name: 'Purchase Supplier A' })).supplier!
    const catalog = await repository.select().from(products).limit(2)
    const before = new Map(catalog.map((product) => [product.id, product.stockQty]))

    const result = await createPurchase({
      supplierId: supplier.id,
      supplierInvoiceNumber: 'SUP-INV-001',
      invoiceDate: '2026-06-29',
      paymentStatus: 'unpaid',
      dueDate: '2026-07-06',
      createdById: 1,
      items: [
        { productId: catalog[0].id, quantity: 3, unitCost: 12000 },
        { productId: catalog[1].id, quantity: 2, unitCost: 25000 },
      ],
    })

    expect(result).toMatchObject({
      ok: true,
      purchase: {
        purchaseNumber: 'PUR-202606-0001',
        supplierInvoiceNumber: 'SUP-INV-001',
        paymentStatus: 'unpaid',
        paidAt: null,
        total: 86000,
        itemCount: 2,
      },
    })

    const updated = await repository.select().from(products)
    const first = updated.find((product) => product.id === catalog[0].id)!
    const second = updated.find((product) => product.id === catalog[1].id)!
    expect(first).toMatchObject({
      stockQty: before.get(first.id)! + 3,
      lastPurchaseCost: 12000,
    })
    expect(second).toMatchObject({
      stockQty: before.get(second.id)! + 2,
      lastPurchaseCost: 25000,
    })

    await expect(listPurchases({ paymentStatus: 'unpaid' })).resolves.toMatchObject([
      { id: result.purchase!.id, itemCount: 2 },
    ])
    await expect(getPurchaseDetail({ id: result.purchase!.id })).resolves.toMatchObject({
      items: [
        { productId: catalog[0].id, quantity: 3 },
        { productId: catalog[1].id, quantity: 2 },
      ],
    })
  })

  it('rejects a duplicate invoice for the same supplier without adding stock', async () => {
    const repository = getPurchaseRepository()!
    const [existing] = await listPurchases()
    const [productBefore] = await repository.select().from(products).limit(1)

    const result = await createPurchase({
      supplierId: existing.supplierId,
      supplierInvoiceNumber: ' sup - inv - 001 ',
      invoiceDate: '2026-06-29',
      paymentStatus: 'paid',
      createdById: 1,
      items: [{ productId: productBefore.id, quantity: 10, unitCost: 1 }],
    })

    expect(result).toEqual({
      ok: false,
      message: 'This supplier invoice has already been recorded',
    })
    const [productAfter] = await repository.select().from(products).where(eq(products.id, productBefore.id))
    expect(productAfter.stockQty).toBe(productBefore.stockQty)
  })

  it('allows the same invoice number for a different supplier and marks it paid immediately', async () => {
    const repository = getPurchaseRepository()!
    const supplier = (await createSupplier({ name: 'Purchase Supplier B' })).supplier!
    const [product] = await repository.select().from(products).limit(1)

    const result = await createPurchase({
      supplierId: supplier.id,
      supplierInvoiceNumber: 'SUP-INV-001',
      invoiceDate: '2026-06-29',
      paymentStatus: 'paid',
      createdById: 1,
      items: [{ productId: product.id, quantity: 1, unitCost: 14000 }],
    })

    expect(result).toMatchObject({
      ok: true,
      purchase: {
        purchaseNumber: 'PUR-202606-0002',
        paymentStatus: 'paid',
      },
    })
    expect(result.purchase!.paidAt).toBeTruthy()
  })

  it('records goods received with pending invoice details', async () => {
    const repository = getPurchaseRepository()!
    const supplier = (await createSupplier({ name: 'Pending Invoice Supplier' })).supplier!
    const [product] = await repository.select().from(products).limit(1)
    const stockBefore = product.stockQty

    const result = await createPurchase({
      supplierId: supplier.id,
      createdById: 1,
      items: [{ productId: product.id, quantity: 4, unitCost: 9000 }],
    })

    expect(result).toMatchObject({
      ok: true,
      purchase: {
        supplierInvoiceNumber: null,
        invoiceDate: null,
        invoiceStatus: 'pending',
        paymentStatus: 'unpaid',
        paidAt: null,
        total: 36000,
      },
    })

    const [updatedProduct] = await repository.select().from(products).where(eq(products.id, product.id))
    expect(updatedProduct.stockQty).toBe(stockBefore + 4)

    await expect(listPurchases({ invoiceStatus: 'pending' })).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: result.purchase!.id, invoiceStatus: 'pending' }),
      ]),
    )
  })

  it('keeps a purchase paid when invoice details will be added later', async () => {
    const repository = getPurchaseRepository()!
    const supplier = (await createSupplier({ name: 'Paid Pending Invoice Supplier' })).supplier!
    const [product] = await repository.select().from(products).limit(1)

    const result = await createPurchase({
      supplierId: supplier.id,
      createdById: 1,
      paymentStatus: 'paid',
      items: [{ productId: product.id, quantity: 1, unitCost: 15000 }],
    })

    expect(result).toMatchObject({
      ok: true,
      purchase: {
        supplierInvoiceNumber: null,
        invoiceDate: null,
        invoiceStatus: 'pending',
        paymentStatus: 'paid',
        total: 15000,
      },
    })
    expect(result.purchase!.paidAt).toBeTruthy()
  })

  it('completes pending invoice details without changing stock or line items', async () => {
    const repository = getPurchaseRepository()!
    const supplier = (await createSupplier({ name: 'Invoice Completion Supplier' })).supplier!
    const [product] = await repository.select().from(products).limit(1)

    const first = await createPurchase({
      supplierId: supplier.id,
      createdById: 1,
      items: [{ productId: product.id, quantity: 2, unitCost: 11000 }],
    })
    const second = await createPurchase({
      supplierId: supplier.id,
      createdById: 1,
      items: [{ productId: product.id, quantity: 1, unitCost: 12000 }],
    })
    expect(first.ok).toBe(true)
    expect(second.ok).toBe(true)

    const stockBefore = await repository.select({
      id: products.id,
      stockQty: products.stockQty,
      lastPurchaseCost: products.lastPurchaseCost,
    }).from(products)
    const itemsBefore = await repository.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, first.purchase!.id))

    const updated = await updatePurchaseInvoice({
      id: first.purchase!.id,
      supplierInvoiceNumber: 'COMPLETE-001',
      invoiceDate: '2026-06-30',
      paymentStatus: 'unpaid',
      dueDate: '2026-07-15',
      notes: 'Invoice arrived after goods receipt',
    })

    expect(updated).toMatchObject({
      ok: true,
      purchase: {
        id: first.purchase!.id,
        supplierInvoiceNumber: 'COMPLETE-001',
        invoiceDate: '2026-06-30',
        invoiceStatus: 'received',
        paymentStatus: 'unpaid',
        dueDate: '2026-07-15',
        total: first.purchase!.total,
      },
    })

    await expect(repository.select({
      id: products.id,
      stockQty: products.stockQty,
      lastPurchaseCost: products.lastPurchaseCost,
    }).from(products)).resolves.toEqual(stockBefore)
    await expect(repository.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, first.purchase!.id))).resolves.toEqual(itemsBefore)

    await expect(updatePurchaseInvoice({
      id: second.purchase!.id,
      supplierInvoiceNumber: ' complete - 001 ',
      invoiceDate: '2026-06-30',
      paymentStatus: 'unpaid',
    })).resolves.toEqual({
      ok: false,
      message: 'This supplier invoice has already been recorded',
    })
  })

  it('rejects invoice metadata updates that include posted purchase fields', async () => {
    const [purchase] = await listPurchases({ invoiceStatus: 'pending' })

    await expect(updatePurchaseInvoice({
      id: purchase.id,
      supplierId: purchase.supplierId,
      supplierInvoiceNumber: 'BLOCKED-001',
      invoiceDate: '2026-06-30',
    } as Record<string, unknown>)).resolves.toEqual({
      ok: false,
      message: 'Posted purchase fields cannot be changed: supplierId',
    })
  })

  it('marks an unpaid purchase paid without changing stock', async () => {
    const repository = getPurchaseRepository()!
    const [unpaid] = await listPurchases({ paymentStatus: 'unpaid' })
    const stockBefore = await repository.select({
      id: products.id,
      stockQty: products.stockQty,
    }).from(products)

    const result = await markPurchasePaid({ id: unpaid.id })
    expect(result).toMatchObject({
      ok: true,
      purchase: { paymentStatus: 'paid' },
    })
    expect(result.purchase!.paidAt).toBeTruthy()

    const stockAfter = await repository.select({
      id: products.id,
      stockQty: products.stockQty,
    }).from(products)
    expect(stockAfter).toEqual(stockBefore)
    await expect(markPurchasePaid({ id: unpaid.id })).resolves.toEqual({
      ok: false,
      message: 'Purchase is already paid',
    })
  })

  it('rolls back the purchase and stock if a line insert fails', async () => {
    const repository = getPurchaseRepository()!
    const supplier = (await createSupplier({ name: 'Rollback Supplier' })).supplier!
    const catalog = await repository.select().from(products).limit(2)
    const purchasesBefore = await repository.select().from(purchases)
    const itemsBefore = await repository.select().from(purchaseItems)
    const stockBefore = await repository.select({
      id: products.id,
      stockQty: products.stockQty,
    }).from(products)

    repository.run(sql.raw(`
      CREATE TRIGGER fail_second_purchase_line
      BEFORE INSERT ON purchase_items
      WHEN NEW.product_id = ${catalog[1].id}
      BEGIN
        SELECT RAISE(ABORT, 'forced purchase line failure');
      END
    `))

    const result = await createPurchase({
      supplierId: supplier.id,
      supplierInvoiceNumber: 'ROLLBACK-001',
      invoiceDate: '2026-06-29',
      paymentStatus: 'unpaid',
      createdById: 1,
      items: [
        { productId: catalog[0].id, quantity: 8, unitCost: 100 },
        { productId: catalog[1].id, quantity: 9, unitCost: 200 },
      ],
    })
    repository.run(sql`DROP TRIGGER fail_second_purchase_line`)

    expect(result).toEqual({
      ok: false,
      message: 'Unable to record purchase. No stock was changed.',
    })
    await expect(repository.select().from(purchases)).resolves.toHaveLength(purchasesBefore.length)
    await expect(repository.select().from(purchaseItems)).resolves.toHaveLength(itemsBefore.length)
    await expect(repository.select({
      id: products.id,
      stockQty: products.stockQty,
    }).from(products)).resolves.toEqual(stockBefore)
  })
})
