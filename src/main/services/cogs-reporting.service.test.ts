import fs from 'fs'
import os from 'os'
import path from 'path'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { closeDatabase, initializeDatabase } from '../db/client'
import { saleItems } from '../db/schema/index'
import { getCheckoutRepository } from '../repositories/checkout.repository'
import { createCheckout, createCheckoutFromPreparedItems } from './checkout.service'
import { quickCreateVehicle } from './customer.service'
import { createProduct, createProductCategory } from './product.service'
import { createPurchase } from './purchase.service'
import { getReportSummary } from './report.service'
import { createService } from './service.service'
import { createSupplier } from './supplier.service'

const databaseDirectory = path.join(os.tmpdir(), `simplepos-cogs-reporting-${process.pid}`)

let expectedSalesTotal = 0
let expectedCogsTotal = 0
let plateSequence = 1

async function createTestVehicle() {
  const result = await quickCreateVehicle({
    plateNumber: `COGS ${plateSequence++}`,
    model: 'Test Vehicle',
    customerName: 'COGS Customer',
  })

  expect(result.ok).toBe(true)
  expect(result.vehicle).toBeDefined()

  return result.vehicle!
}

async function createTestProduct(input: {
  name: string
  sku: string
  unitPrice: number
  stockQty: number
}) {
  const category = await createProductCategory({ name: `${input.name} Category` })
  expect(category.ok).toBe(true)
  expect(category.category).toBeDefined()

  const product = await createProduct({
    categoryId: category.category!.id,
    sku: input.sku,
    name: input.name,
    unitPrice: input.unitPrice,
    unitType: 'piece',
    stockQty: input.stockQty,
    minStock: 0,
  })

  expect(product.ok).toBe(true)
  expect(product.product).toBeDefined()

  return product.product!
}

async function addPurchaseCost(productId: number, quantity: number, unitCost: number) {
  const supplier = await createSupplier({ name: `COGS Supplier ${productId}-${unitCost}` })
  expect(supplier.ok).toBe(true)
  expect(supplier.supplier).toBeDefined()

  const purchase = await createPurchase({
    supplierId: supplier.supplier!.id,
    createdById: 1,
    items: [{ productId, quantity, unitCost }],
  })

  expect(purchase.ok).toBe(true)
}

describe('COGS checkout and reporting', () => {
  beforeAll(async () => {
    fs.rmSync(databaseDirectory, { recursive: true, force: true })
    await initializeDatabase(databaseDirectory)
  })

  afterAll(async () => {
    await closeDatabase()
    fs.rmSync(databaseDirectory, { recursive: true, force: true })
  })

  it('snapshots latest purchase cost for cost-tracked product checkout items', async () => {
    const product = await createTestProduct({
      name: 'COGS Costed Product',
      sku: 'COGS-COSTED',
      unitPrice: 50_000,
      stockQty: 2,
    })
    await addPurchaseCost(product.id, 3, 12_000)
    const vehicle = await createTestVehicle()

    const checkout = await createCheckout({
      vehicleId: vehicle.id,
      createdById: 1,
      paymentMethod: 'cash',
      items: [{ itemType: 'product', id: product.id, quantity: 2 }],
    })

    expect(checkout.ok).toBe(true)
    expect(checkout.checkout!.items).toEqual([
      expect.objectContaining({
        productId: product.id,
        quantity: 2,
        unitCostSnapshot: 12_000,
        costTotalSnapshot: 24_000,
      }),
    ])
    expectedSalesTotal += product.unitPrice * 2
    expectedCogsTotal += 24_000
  })

  it('keeps product-table service-like items at zero COGS until they have purchase history', async () => {
    const carWashProduct = await createTestProduct({
      name: 'Car Wash Product Row',
      sku: 'COGS-CAR-WASH',
      unitPrice: 35_000,
      stockQty: 3,
    })
    const vehicle = await createTestVehicle()

    const checkout = await createCheckout({
      vehicleId: vehicle.id,
      createdById: 1,
      paymentMethod: 'cash',
      items: [{ itemType: 'product', id: carWashProduct.id, quantity: 1 }],
    })

    expect(checkout.ok).toBe(true)
    expect(checkout.checkout!.items[0]).toMatchObject({
      productId: carWashProduct.id,
      unitCostSnapshot: 0,
      costTotalSnapshot: 0,
    })
    expectedSalesTotal += carWashProduct.unitPrice
  })

  it('stores zero COGS for service sale items', async () => {
    const service = await createService({
      code: 'COGS-SVC',
      name: 'COGS Service',
      category: '  bengkel  ',
      price: 80_000,
    })
    expect(service.ok).toBe(true)
    expect(service.service).toBeDefined()
    const vehicle = await createTestVehicle()

    const checkout = await createCheckout({
      vehicleId: vehicle.id,
      createdById: 1,
      paymentMethod: 'cash',
      items: [{ itemType: 'service', id: service.service!.id, quantity: 1 }],
    })

    expect(checkout.ok).toBe(true)
    expect(checkout.checkout!.items[0]).toMatchObject({
      serviceId: service.service!.id,
      unitCostSnapshot: 0,
      costTotalSnapshot: 0,
    })
    expectedSalesTotal += service.service!.price
  })

  it('normalizes prepared checkout items so work-order callers cannot skip cost snapshots', async () => {
    const product = await createTestProduct({
      name: 'COGS Prepared Product',
      sku: 'COGS-PREPARED',
      unitPrice: 70_000,
      stockQty: 1,
    })
    await addPurchaseCost(product.id, 2, 22_000)

    const checkout = await createCheckoutFromPreparedItems({
      customerId: null,
      createdById: 1,
      paymentMethod: 'cash',
      amountPaid: product.unitPrice,
      notes: null,
      items: [{
        itemType: 'product',
        productId: product.id,
        serviceId: null,
        name: product.name,
        sku: product.sku,
        quantity: 1,
        basePrice: product.unitPrice,
        unitPrice: product.unitPrice,
        priceOverriddenById: null,
        priceOverriddenAt: null,
        lineTotal: product.unitPrice,
      }],
    })

    expect(checkout.ok).toBe(true)
    expect(checkout.checkout!.items[0]).toMatchObject({
      productId: product.id,
      unitCostSnapshot: 22_000,
      costTotalSnapshot: 22_000,
    })
    expectedSalesTotal += product.unitPrice
    expectedCogsTotal += 22_000
  })

  it('allows below-cost product sales to report negative gross profit and margin', async () => {
    const product = await createTestProduct({
      name: 'COGS Below Cost Product',
      sku: 'COGS-BELOW-COST',
      unitPrice: 90_000,
      stockQty: 1,
    })
    await addPurchaseCost(product.id, 1, 80_000)
    const vehicle = await createTestVehicle()

    const checkout = await createCheckout({
      vehicleId: vehicle.id,
      createdById: 1,
      paymentMethod: 'cash',
      amountPaid: 50_000,
      items: [{ itemType: 'product', id: product.id, quantity: 1, unitPrice: 50_000 }],
    })

    expect(checkout.ok).toBe(true)
    expect(checkout.checkout!.items[0]).toMatchObject({
      productId: product.id,
      unitPrice: 50_000,
      unitCostSnapshot: 80_000,
      costTotalSnapshot: 80_000,
    })

    const report = await getReportSummary({ period: 'today' })
    expect(report.topSellingItems).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: 'COGS Below Cost Product',
        cogsTotal: 80_000,
        grossProfit: -30_000,
        grossMarginPercent: -60,
      }),
    ]))
    expectedSalesTotal += 50_000
    expectedCogsTotal += 80_000
  })

  it('reports COGS, gross profit, margin, and top-selling product profitability', async () => {
    const report = await getReportSummary({ period: 'today' })

    expect(report.salesTotal).toBe(expectedSalesTotal)
    expect(report.vehicleCount).toBe(4)
    expect(report.categorySales).toEqual([
      { category: 'Bengkel', total: 80_000 },
      { category: 'Cuci', total: 0 },
      { category: 'Mesin', total: 0 },
      { category: 'Minuman', total: 0 },
    ])
    expect(report.cogsTotal).toBe(expectedCogsTotal)
    expect(report.grossProfit).toBe(expectedSalesTotal - expectedCogsTotal)
    expect(report.grossMarginPercent).toBe(Math.round(((expectedSalesTotal - expectedCogsTotal) / expectedSalesTotal) * 1000) / 10)
    expect(report.topSellingItems).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: 'COGS Costed Product',
        cogsTotal: 24_000,
        grossProfit: 76_000,
        grossMarginPercent: 76,
      }),
    ]))
  })

  it('flags legacy product sale items with missing cost snapshots only when the product is cost-tracked', async () => {
    const product = await createTestProduct({
      name: 'COGS Legacy Product',
      sku: 'COGS-LEGACY',
      unitPrice: 60_000,
      stockQty: 1,
    })
    await addPurchaseCost(product.id, 1, 30_000)
    const vehicle = await createTestVehicle()
    const checkout = await createCheckout({
      vehicleId: vehicle.id,
      createdById: 1,
      paymentMethod: 'cash',
      items: [{ itemType: 'product', id: product.id, quantity: 1 }],
    })
    expect(checkout.ok).toBe(true)

    const repository = getCheckoutRepository()!
    await repository
      .update(saleItems)
      .set({ unitCostSnapshot: null, costTotalSnapshot: null })
      .where(eq(saleItems.saleId, checkout.checkout!.saleId))

    const nonCostedProduct = await createTestProduct({
      name: 'COGS Legacy Car Wash',
      sku: 'COGS-LEGACY-CAR-WASH',
      unitPrice: 40_000,
      stockQty: 1,
    })
    const nonCostedVehicle = await createTestVehicle()
    const nonCostedCheckout = await createCheckout({
      vehicleId: nonCostedVehicle.id,
      createdById: 1,
      paymentMethod: 'cash',
      items: [{ itemType: 'product', id: nonCostedProduct.id, quantity: 1 }],
    })
    expect(nonCostedCheckout.ok).toBe(true)
    await repository
      .update(saleItems)
      .set({ unitCostSnapshot: null, costTotalSnapshot: null })
      .where(eq(saleItems.saleId, nonCostedCheckout.checkout!.saleId))

    const report = await getReportSummary({ period: 'today' })
    expect(report.hasLegacyCostGaps).toBe(true)
    expect(report.legacyCostMissingCount).toBe(1)
  })
})
