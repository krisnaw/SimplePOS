import { asc, eq } from 'drizzle-orm'
import { flushDatabase } from '../db/client'
import { productCategories, products } from '../db/schema'
import type { Product, ProductCategory, UnitType } from '../db/schema'
import { getProductRepository } from '../repositories/product.repository'

export type ProductCategorySummary = {
  id: number
  name: string
  description: string | null
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
    description: category.description,
  }
}

function toProductSummary(product: Product): ProductSummary {
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
    .where(eq(productCategories.isActive, true))
    .orderBy(asc(productCategories.name))

  return list.map(toProductCategorySummary)
}

export async function listProducts(): Promise<ProductSummary[]> {
  const repository = getProductRepository()

  if (!repository) return []

  const list = await repository
    .select()
    .from(products)
    .where(eq(products.isActive, true))
    .orderBy(asc(products.name))

  return list.map(toProductSummary)
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
    typeof input.sku !== 'string' ||
    typeof input.name !== 'string' ||
    typeof input.unitPrice !== 'number' ||
    !isValidUnitType(input.unitType)
  ) {
    return { ok: false, message: 'SKU, name, unit price, and unit type are required' }
  }

  const sku = input.sku.trim().toUpperCase()
  const name = input.name.trim()
  const unitPrice = input.unitPrice
  const stockQty = typeof input.stockQty === 'number' ? input.stockQty : 0
  const minStock = typeof input.minStock === 'number' ? input.minStock : 0
  const categoryId = typeof input.categoryId === 'number' ? input.categoryId : null
  const barcode = typeof input.barcode === 'string' && input.barcode.trim() ? input.barcode.trim() : null
  const description = typeof input.description === 'string' && input.description.trim() ? input.description.trim() : null

  if (!sku || !name || unitPrice < 0 || stockQty < 0 || minStock < 0) {
    return { ok: false, message: 'Enter valid product details and non-negative numbers' }
  }

  const existing = await repository.select().from(products).where(eq(products.sku, sku)).limit(1)

  if (existing.length > 0) {
    return { ok: false, message: 'A product with this SKU already exists' }
  }

  const now = new Date().toISOString()
  const [saved] = await repository.insert(products).values({
    categoryId,
    sku,
    barcode,
    name,
    description,
    unitPrice,
    unitType: input.unitType,
    stockQty,
    minStock,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }).returning()

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

  const [updated] = await repository.update(products).set({
    categoryId: typeof input.categoryId === 'number' ? input.categoryId : null,
    sku,
    barcode: typeof input.barcode === 'string' && input.barcode.trim() ? input.barcode.trim() : null,
    name: input.name.trim(),
    description: typeof input.description === 'string' && input.description.trim() ? input.description.trim() : null,
    unitPrice: input.unitPrice,
    unitType: input.unitType,
    stockQty: typeof input.stockQty === 'number' ? input.stockQty : existing.stockQty,
    minStock: typeof input.minStock === 'number' ? input.minStock : existing.minStock,
    isActive: input.isActive,
    updatedAt: new Date().toISOString(),
  }).where(eq(products.id, input.id)).returning()

  await flushDatabase()

  return { ok: true, message: 'Product updated', product: toProductSummary(updated) }
}
