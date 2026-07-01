import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { closeDatabase, flushDatabase, initializeDatabase } from '../db/client'
import { products, purchaseItems, purchases } from '../db/schema/index'
import { createSupplier } from '../services/supplier.service'
import { getPurchaseRepository } from './purchase.repository'

const databaseDirectory = path.join(os.tmpdir(), `simplepos-purchase-storage-${process.pid}`)

describe('purchase storage', () => {
  beforeAll(async () => {
    fs.rmSync(databaseDirectory, { recursive: true, force: true })
    await initializeDatabase(databaseDirectory)
  })

  afterAll(async () => {
    await closeDatabase()
    fs.rmSync(databaseDirectory, { recursive: true, force: true })
  })

  it('persists a purchase and its product lines', async () => {
    const repository = getPurchaseRepository()
    expect(repository).not.toBeNull()

    const supplierResult = await createSupplier({ name: 'Storage Test Supplier' })
    const supplier = supplierResult.supplier
    const [product] = await repository!.select().from(products).limit(1)
    expect(supplier).toBeDefined()
    expect(product).toBeDefined()

    const [purchase] = await repository!.insert(purchases).values({
      purchaseNumber: 'PUR-TEST-0001',
      supplierId: supplier!.id,
      supplierInvoiceNumber: 'INV-001',
      normalizedInvoiceNumber: 'inv-001',
      invoiceDate: '2026-06-29',
      paymentStatus: 'unpaid',
      dueDate: null,
      paidAt: null,
      notes: null,
      total: 25000,
      createdById: 1,
    }).returning()

    await repository!.insert(purchaseItems).values({
      purchaseId: purchase.id,
      productId: product.id,
      skuSnapshot: product.sku,
      productNameSnapshot: product.name,
      quantity: 5,
      unitCost: 5000,
      lineTotal: 25000,
    })
    await flushDatabase()

    await closeDatabase()
    await initializeDatabase(databaseDirectory)

    const reopened = getPurchaseRepository()
    await expect(reopened!.select().from(purchases)).resolves.toHaveLength(1)
    await expect(reopened!.select().from(purchaseItems)).resolves.toMatchObject([
      {
        purchaseId: purchase.id,
        productId: product.id,
        quantity: 5,
        unitCost: 5000,
      },
    ])
  })

  it('enforces one invoice number per supplier', async () => {
    const repository = getPurchaseRepository()
    const [existing] = await repository!.select().from(purchases).limit(1)

    await expect(repository!.insert(purchases).values({
      purchaseNumber: 'PUR-TEST-0002',
      supplierId: existing.supplierId,
      supplierInvoiceNumber: ' inv-001 ',
      normalizedInvoiceNumber: 'inv-001',
      invoiceDate: '2026-06-29',
      paymentStatus: 'paid',
      total: 0,
      createdById: 1,
    })).rejects.toThrow()
  })
})
