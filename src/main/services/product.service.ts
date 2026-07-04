import { randomUUID } from 'crypto'
import { asc, eq, sql } from 'drizzle-orm'
import { flushDatabase } from '../db/client'
import { productCategories, products, purchaseItems } from '../db/schema/index'
import type { Product, ProductCategory, UnitType } from '../db/schema/index'
import { getProductRepository } from '../repositories/product.repository'
import { recordStockMovement } from './stock-movement.service'

export type ProductCategorySummary = {
  id: number
  name: string
}

export type ProductCategoryMutationResult = {
  ok: boolean
  message: string
  category?: ProductCategorySummary
}

export type ProductSummary = {
  id: number
  categoryId: number | null
  sku: string
  barcode: string | null
  name: string
  description: string | null
  unitPrice: number
  unitType: UnitType
  stockQty: number
  minStock: number
  lastPurchaseCost: number
  hasPurchaseHistory: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type ProductMutationResult = {
  ok: boolean
  message: string
  product?: ProductSummary
}

function toProductCategorySummary(category: ProductCategory): ProductCategorySummary {
  return {
    id: category.id,
    name: category.name,
  }
}

function toProductSummary(product: Product, hasPurchaseHistory = false): ProductSummary {
  return {
    id: product.id,
    categoryId: product.categoryId,
    sku: product.sku,
    barcode: product.barcode,
    name: product.name,
    description: product.description,
    unitPrice: product.unitPrice,
    unitType: product.unitType,
    stockQty: product.stockQty,
    minStock: product.minStock,
    lastPurchaseCost: product.lastPurchaseCost,
    hasPurchaseHistory,
    isActive: product.isActive,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  }
}

function isValidUnitType(value: unknown): value is UnitType {
  return value === 'piece' || value === 'litre' || value === 'set' || value === 'box'
}

export async function listProductCategories(): Promise<ProductCategorySummary[]> {
  const repository = getProductRepository()

  if (!repository) return []

  const list = await repository
    .select()
    .from(productCategories)
    .orderBy(asc(productCategories.name))

  return list.map(toProductCategorySummary)
}

export async function createProductCategory(input: {
  name?: unknown
}): Promise<ProductCategoryMutationResult> {
  const repository = getProductRepository()

  if (!repository) return { ok: false, message: 'Database unavailable' }
  if (typeof input.name !== 'string') return { ok: false, message: 'Category name is required' }

  const name = input.name.trim().replace(/\s+/g, ' ')
  if (!name) return { ok: false, message: 'Category name is required' }

  const duplicate = await repository
    .select({ id: productCategories.id })
    .from(productCategories)
    .where(sql`lower(${productCategories.name}) = lower(${name})`)
    .limit(1)

  if (duplicate.length > 0) {
    return { ok: false, message: 'A category with this name already exists' }
  }

  const [saved] = await repository.insert(productCategories).values({ name }).returning()
  await flushDatabase()

  return {
    ok: true,
    message: 'Category created',
    category: toProductCategorySummary(saved),
  }
}

async function resolveCategoryId(
  categoryId: unknown,
): Promise<{ ok: true; categoryId: number } | { ok: false; message: string }> {
  if (categoryId === null || categoryId === undefined) {
    return { ok: false, message: 'Product category is required' }
  }
  if (typeof categoryId !== 'number' || !Number.isInteger(categoryId) || categoryId <= 0) {
    return { ok: false, message: 'Invalid product category' }
  }

  const repository = getProductRepository()
  if (!repository) return { ok: false, message: 'Database unavailable' }

  const [category] = await repository
    .select({ id: productCategories.id })
    .from(productCategories)
    .where(eq(productCategories.id, categoryId))
    .limit(1)

  return category
    ? { ok: true, categoryId: category.id }
    : { ok: false, message: 'Product category not found' }
}

export async function listProducts(): Promise<ProductSummary[]> {
  const repository = getProductRepository()

  if (!repository) return []

  const list = await repository
    .select()
    .from(products)
    .where(eq(products.isActive, true))
    .orderBy(asc(products.name))
  const purchasedProductIds = new Set(
    (await repository.select({ productId: purchaseItems.productId }).from(purchaseItems))
      .map((item) => item.productId),
  )

  return list.map((product) => toProductSummary(product, purchasedProductIds.has(product.id)))
}

export async function createProduct(input: {
  categoryId?: unknown
  sku?: unknown
  barcode?: unknown
  name?: unknown
  description?: unknown
  unitPrice?: unknown
  unitType?: unknown
  stockQty?: unknown
  minStock?: unknown
}): Promise<ProductMutationResult> {
  const repository = getProductRepository()

  if (!repository) return { ok: false, message: 'Database unavailable' }

  if (
    typeof input.name !== 'string' ||
    typeof input.unitPrice !== 'number' ||
    !isValidUnitType(input.unitType)
  ) {
    return { ok: false, message: 'Name, unit price, and unit type are required' }
  }

  const requestedSku = typeof input.sku === 'string' ? input.sku.trim().toUpperCase() : ''
  const sku = requestedSku || `P-${randomUUID().slice(0, 8).toUpperCase()}`
  const name = input.name.trim()
  const unitPrice = input.unitPrice
  const unitType = input.unitType
  const stockQty = typeof input.stockQty === 'number' ? input.stockQty : 0
  const minStock = typeof input.minStock === 'number' ? input.minStock : 0
  const categoryResult = await resolveCategoryId(input.categoryId)
  if (!categoryResult.ok) return categoryResult

  const categoryId = categoryResult.categoryId
  const barcode = typeof input.barcode === 'string' && input.barcode.trim() ? input.barcode.trim() : null
  const description = typeof input.description === 'string' && input.description.trim() ? input.description.trim() : null

  if (!name || unitPrice < 0 || stockQty < 0 || minStock < 0) {
    return { ok: false, message: 'Enter valid product details and non-negative numbers' }
  }

  const existing = await repository.select().from(products).where(eq(products.sku, sku)).limit(1)

  if (existing.length > 0) {
    return { ok: false, message: 'A product with this SKU already exists' }
  }

  const now = new Date().toISOString()
  const saved = repository.transaction((tx) => {
    const inserted = tx.insert(products).values({
      categoryId,
      sku,
      barcode,
      name,
      description,
      unitPrice,
      unitType,
      stockQty: 0,
      minStock,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }).returning().get()

    if (stockQty > 0) {
      recordStockMovement(tx, {
        productId: inserted.id,
        movementType: 'opening',
        quantityDelta: stockQty,
        referenceType: 'product',
        referenceId: inserted.id,
        referenceNumber: 'Opening balance',
        reason: 'Initial stock entered when product was created',
        createdByNameSnapshot: 'System',
        createdAt: now,
      })
    }

    const updated = tx.select().from(products).where(eq(products.id, inserted.id)).limit(1).get()
    if (!updated) throw new Error('Product was created but could not be reloaded')

    return updated
  })

  await flushDatabase()

  return { ok: true, message: 'Product created', product: toProductSummary(saved) }
}

export async function updateProduct(input: {
  id?: unknown
  categoryId?: unknown
  sku?: unknown
  barcode?: unknown
  name?: unknown
  description?: unknown
  unitPrice?: unknown
  unitType?: unknown
  stockQty?: unknown
  minStock?: unknown
  isActive?: unknown
}): Promise<ProductMutationResult> {
  const repository = getProductRepository()

  if (!repository) return { ok: false, message: 'Database unavailable' }

  if (
    typeof input.id !== 'number' ||
    typeof input.sku !== 'string' ||
    typeof input.name !== 'string' ||
    typeof input.unitPrice !== 'number' ||
    !isValidUnitType(input.unitType) ||
    typeof input.isActive !== 'boolean'
  ) {
    return { ok: false, message: 'Invalid product request' }
  }

  const [existing] = await repository.select().from(products).where(eq(products.id, input.id)).limit(1)

  if (!existing) return { ok: false, message: 'Product not found' }

  const sku = input.sku.trim().toUpperCase()
  const skuConflict = await repository.select().from(products).where(eq(products.sku, sku)).limit(1)

  if (skuConflict[0] && skuConflict[0].id !== input.id) {
    return { ok: false, message: 'A product with this SKU already exists' }
  }

  const categoryResult = await resolveCategoryId(input.categoryId)
  if (!categoryResult.ok) return categoryResult

  const [updated] = await repository.update(products).set({
    categoryId: categoryResult.categoryId,
    sku,
    barcode: typeof input.barcode === 'string' && input.barcode.trim() ? input.barcode.trim() : null,
    name: input.name.trim(),
    description: typeof input.description === 'string' && input.description.trim() ? input.description.trim() : null,
    unitPrice: input.unitPrice,
    unitType: input.unitType,
    minStock: typeof input.minStock === 'number' ? input.minStock : existing.minStock,
    isActive: input.isActive,
    updatedAt: new Date().toISOString(),
  }).where(eq(products.id, input.id)).returning()

  await flushDatabase()

  const [purchaseHistory] = await repository
    .select({ id: purchaseItems.id })
    .from(purchaseItems)
    .where(eq(purchaseItems.productId, updated.id))
    .limit(1)

  return { ok: true, message: 'Product updated', product: toProductSummary(updated, Boolean(purchaseHistory)) }
}
