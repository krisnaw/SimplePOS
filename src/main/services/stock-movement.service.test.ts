import fs from 'fs'
import os from 'os'
import path from 'path'
import { asc, eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { closeDatabase, initializeDatabase } from '../db/client'
import { products, stockMovements } from '../db/schema/index'
import { getProductRepository } from '../repositories/product.repository'
import { createProduct, createProductCategory, updateProduct } from './product.service'
import { adjustStock, listStockMovements } from './stock-movement.service'

const databaseDirectory = path.join(os.tmpdir(), `simplepos-stock-movements-${process.pid}`)

describe('stock movement service', () => {
  beforeAll(async () => {
    fs.rmSync(databaseDirectory, { recursive: true, force: true })
    await initializeDatabase(databaseDirectory)
  })

  afterAll(async () => {
    await closeDatabase()
    fs.rmSync(databaseDirectory, { recursive: true, force: true })
  })

  it('creates one opening movement for each seeded product with stock', async () => {
    const repository = getProductRepository()!
    const productRows = await repository.select().from(products)
    const movementRows = await repository.select().from(stockMovements)
    const stockedProducts = productRows.filter((product) => product.stockQty > 0)

    expect(movementRows).toHaveLength(stockedProducts.length)
    for (const product of stockedProducts) {
      expect(movementRows).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            productId: product.id,
            skuSnapshot: product.sku,
            productNameSnapshot: product.name,
            unitTypeSnapshot: product.unitType,
            movementType: 'opening',
            quantityDelta: product.stockQty,
            balanceAfter: product.stockQty,
            referenceType: 'product',
            referenceId: product.id,
            referenceNumber: 'Opening balance',
            createdByNameSnapshot: 'System',
          }),
        ]),
      )
    }
  })

  it('does not create duplicate opening movements when initialization runs again', async () => {
    const repository = getProductRepository()!
    const before = await repository.select().from(stockMovements)

    await closeDatabase()
    await initializeDatabase(databaseDirectory)

    const after = await getProductRepository()!.select().from(stockMovements)
    expect(after).toHaveLength(before.length)
  })

  it('records opening stock when a product is created', async () => {
    const category = (await createProductCategory({ name: 'Ledger Test Category' })).category!
    const created = await createProduct({
      categoryId: category.id,
      sku: 'LEDGER-OPENING-001',
      name: 'Ledger Opening Product',
      unitPrice: 1000,
      unitType: 'piece',
      stockQty: 7,
      minStock: 1,
    })

    expect(created).toMatchObject({
      ok: true,
      product: {
        stockQty: 7,
      },
    })

    const movements = await getProductRepository()!
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.productId, created.product!.id))

    expect(movements).toEqual([
      expect.objectContaining({
        movementType: 'opening',
        quantityDelta: 7,
        balanceAfter: 7,
        referenceType: 'product',
        referenceId: created.product!.id,
      }),
    ])
  })

  it('does not treat product edits as stock adjustments', async () => {
    const product = (await createProduct({
      categoryId: (await createProductCategory({ name: 'No Stock Edit Category' })).category!.id,
      sku: 'NO-STOCK-EDIT-001',
      name: 'No Stock Edit Product',
      unitPrice: 1000,
      unitType: 'piece',
      stockQty: 4,
      minStock: 1,
    })).product!

    const updated = await updateProduct({
      ...product,
      name: 'No Stock Edit Product Updated',
      stockQty: 99,
    })

    expect(updated).toMatchObject({
      ok: true,
      product: {
        name: 'No Stock Edit Product Updated',
        stockQty: 4,
      },
    })

    const movements = await getProductRepository()!
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.productId, product.id))
      .orderBy(asc(stockMovements.id))
    expect(movements).toHaveLength(1)
  })

  it('records positive and negative manual adjustments with required reasons', async () => {
    const product = (await createProduct({
      categoryId: (await createProductCategory({ name: 'Adjustment Category' })).category!.id,
      sku: 'ADJUSTMENT-001',
      name: 'Adjustment Product',
      unitPrice: 1000,
      unitType: 'piece',
      stockQty: 5,
      minStock: 1,
    })).product!

    await expect(adjustStock({
      productId: product.id,
      newStockQty: 8,
      createdById: 1,
      reason: 'Counted shelf stock',
    })).resolves.toEqual({
      ok: true,
      message: 'Stock adjusted',
      balanceAfter: 8,
    })

    await expect(adjustStock({
      productId: product.id,
      newStockQty: 3,
      createdById: 1,
      reason: 'Damaged stock removed',
    })).resolves.toEqual({
      ok: true,
      message: 'Stock adjusted',
      balanceAfter: 3,
    })

    const movements = await getProductRepository()!
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.productId, product.id))
      .orderBy(asc(stockMovements.id))

    expect(movements).toEqual([
      expect.objectContaining({ movementType: 'opening', quantityDelta: 5, balanceAfter: 5 }),
      expect.objectContaining({
        movementType: 'adjustment',
        quantityDelta: 3,
        balanceAfter: 8,
        referenceNumber: 'Manual adjustment',
        reason: 'Counted shelf stock',
        createdById: 1,
        createdByNameSnapshot: 'Administrator',
      }),
      expect.objectContaining({
        movementType: 'adjustment',
        quantityDelta: -5,
        balanceAfter: 3,
        reason: 'Damaged stock removed',
      }),
    ])

    const [updatedProduct] = await getProductRepository()!
      .select()
      .from(products)
      .where(eq(products.id, product.id))
    expect(updatedProduct.stockQty).toBe(3)
  })

  it('rejects empty, unchanged, and negative adjustment requests', async () => {
    const product = (await createProduct({
      categoryId: (await createProductCategory({ name: 'Rejected Adjustment Category' })).category!.id,
      sku: 'ADJUSTMENT-REJECTED-001',
      name: 'Rejected Adjustment Product',
      unitPrice: 1000,
      unitType: 'piece',
      stockQty: 2,
      minStock: 1,
    })).product!

    await expect(adjustStock({
      productId: product.id,
      newStockQty: 3,
      createdById: 1,
      reason: '   ',
    })).resolves.toEqual({
      ok: false,
      message: 'Adjustment reason is required',
    })

    await expect(adjustStock({
      productId: product.id,
      newStockQty: 2,
      createdById: 1,
      reason: 'Counted stock',
    })).resolves.toEqual({
      ok: false,
      message: 'Stock quantity is unchanged',
    })

    await expect(adjustStock({
      productId: product.id,
      newStockQty: -1,
      createdById: 1,
      reason: 'Invalid count',
    })).resolves.toEqual({
      ok: false,
      message: 'Invalid stock adjustment request',
    })

    const [updatedProduct] = await getProductRepository()!
      .select()
      .from(products)
      .where(eq(products.id, product.id))
    expect(updatedProduct.stockQty).toBe(2)
  })

  it('lists movements with product, type, date, search, pagination, and totals', async () => {
    const product = (await createProduct({
      categoryId: (await createProductCategory({ name: 'Movement Query Category' })).category!.id,
      sku: 'MOVEMENT-QUERY-001',
      name: 'Movement Query Product',
      unitPrice: 1000,
      unitType: 'piece',
      stockQty: 10,
      minStock: 1,
    })).product!

    await adjustStock({
      productId: product.id,
      newStockQty: 14,
      createdById: 1,
      reason: 'Query counted shelf stock',
    })
    await adjustStock({
      productId: product.id,
      newStockQty: 9,
      createdById: 1,
      reason: 'Query damaged stock removed',
    })

    const allForProduct = await listStockMovements({ productId: product.id, limit: 2 })
    expect(allForProduct).toMatchObject({
      total: 3,
      totalIn: 14,
      totalOut: 5,
    })
    expect(allForProduct.items).toHaveLength(2)
    expect(allForProduct.items[0].id).toBeGreaterThan(allForProduct.items[1].id)

    await expect(listStockMovements({
      productId: product.id,
      movementType: 'adjustment',
      search: 'damaged',
    })).resolves.toMatchObject({
      total: 1,
      totalIn: 0,
      totalOut: 5,
      items: [
        expect.objectContaining({
          productId: product.id,
          sku: 'MOVEMENT-QUERY-001',
          productName: 'Movement Query Product',
          movementType: 'adjustment',
          quantityDelta: -5,
          balanceAfter: 9,
          reason: 'Query damaged stock removed',
          createdByName: 'Administrator',
        }),
      ],
    })

    const today = new Date().toISOString().slice(0, 10)
    await expect(listStockMovements({
      productId: product.id,
      dateFrom: today,
      dateTo: today,
      limit: 1000,
      offset: 1,
    })).resolves.toMatchObject({
      total: 3,
      items: expect.arrayContaining([
        expect.objectContaining({ productId: product.id }),
      ]),
    })
  })
})
