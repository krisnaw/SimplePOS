import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { closeDatabase, initializeDatabase } from '../db/client'
import {
  createProduct,
  createProductCategory,
  deleteProductCategory,
  listProductCategories,
  listProducts,
  updateProductCategory,
  updateProduct,
} from './product.service'

const databaseDirectory = path.join(os.tmpdir(), `simplepos-product-categories-${process.pid}`)

describe('product category service', () => {
  beforeAll(async () => {
    fs.rmSync(databaseDirectory, { recursive: true, force: true })
    await initializeDatabase(databaseDirectory)
  })

  afterAll(async () => {
    await closeDatabase()
    fs.rmSync(databaseDirectory, { recursive: true, force: true })
  })

  it('seeds the default categories', async () => {
    const categories = await listProductCategories()
    expect(categories).toEqual([
      { id: expect.any(Number), name: 'Bengkel' },
      { id: expect.any(Number), name: 'Cuci' },
      { id: expect.any(Number), name: 'Mesin' },
      { id: expect.any(Number), name: 'Minuman' },
    ])

    const categoryNames = new Map(categories.map((category) => [category.id, category.name]))
    const counts = (await listProducts()).reduce<Record<string, number>>((result, product) => {
      const categoryName = product.categoryId ? categoryNames.get(product.categoryId) : undefined
      if (categoryName) result[categoryName] = (result[categoryName] ?? 0) + 1
      return result
    }, {})

    expect(counts).toEqual({
      Bengkel: 5,
      Cuci: 5,
      Mesin: 5,
      Minuman: 5,
    })
  })

  it('creates a category containing only id and name', async () => {
    const result = await createProductCategory({ name: '  Engine   Parts  ' })

    expect(result).toEqual({
      ok: true,
      message: 'Category created',
      category: {
        id: expect.any(Number),
        name: 'Engine Parts',
      },
    })
    expect(Object.keys(result.category ?? {})).toEqual(['id', 'name'])
  })

  it('rejects empty and case-insensitive duplicate category names', async () => {
    await expect(createProductCategory({ name: '   ' })).resolves.toEqual({
      ok: false,
      message: 'Category name is required',
    })
    await expect(createProductCategory({ name: 'engine parts' })).resolves.toEqual({
      ok: false,
      message: 'A category with this name already exists',
    })
  })

  it('lists categories with only id and name', async () => {
    const categories = await listProductCategories()
    const category = categories.find((item) => item.name === 'Engine Parts')

    expect(category).toEqual({
      id: expect.any(Number),
      name: 'Engine Parts',
    })
    expect(Object.keys(category ?? {})).toEqual(['id', 'name'])
  })

  it('updates category names and rejects duplicate renames', async () => {
    const created = await createProductCategory({ name: 'Body Parts' })
    expect(created.ok).toBe(true)

    await expect(updateProductCategory({
      id: created.category!.id,
      name: '  Exterior   Parts ',
    })).resolves.toEqual({
      ok: true,
      message: 'Category updated',
      category: {
        id: created.category!.id,
        name: 'Exterior Parts',
      },
    })

    await expect(updateProductCategory({
      id: created.category!.id,
      name: 'mesin',
    })).resolves.toEqual({
      ok: false,
      message: 'A category with this name already exists',
    })
  })

  it('deletes unused categories and rejects categories assigned to products', async () => {
    const unused = await createProductCategory({ name: 'Unused Category' })
    expect(unused.ok).toBe(true)

    await expect(deleteProductCategory({ id: unused.category!.id })).resolves.toMatchObject({
      ok: true,
      message: 'Category deleted',
      category: {
        id: unused.category!.id,
        name: 'Unused Category',
      },
    })

    const assigned = (await listProductCategories()).find((item) => item.name === 'Mesin')
    expect(assigned).toBeDefined()

    await expect(deleteProductCategory({ id: assigned!.id })).resolves.toEqual({
      ok: false,
      message: 'Move products out of this category before deleting it',
    })
  })

  it('creates and updates a product with a valid category', async () => {
    const category = (await listProductCategories()).find((item) => item.name === 'Engine Parts')
    const nextCategory = (await listProductCategories()).find((item) => item.name === 'Cuci')
    expect(category).toBeDefined()
    expect(nextCategory).toBeDefined()

    const created = await createProduct({
      categoryId: category!.id,
      barcode: '8990000000001',
      name: 'Category Test Product',
      unitPrice: 10000,
      unitType: 'piece',
      stockQty: 2,
      minStock: 1,
    })

    expect(created).toMatchObject({
      ok: true,
      product: { categoryId: category!.id },
    })
    expect(created.product?.sku).toMatch(/^P-[A-F0-9]{8}$/)

    const updated = await updateProduct({
      id: created.product!.id,
      categoryId: nextCategory!.id,
      name: created.product!.name,
      description: created.product!.description,
      unitPrice: created.product!.unitPrice,
      unitType: created.product!.unitType,
      minStock: created.product!.minStock,
      isActive: created.product!.isActive,
    })

    expect(updated).toMatchObject({
      ok: true,
      product: {
        categoryId: nextCategory!.id,
        sku: created.product!.sku,
        barcode: created.product!.barcode,
      },
    })
  })

  it('creates a product with the service unit type', async () => {
    const category = (await listProductCategories()).find((item) => item.name === 'Mesin')

    const created = await createProduct({
      categoryId: category!.id,
      name: 'Installation Service',
      unitPrice: 50000,
      unitType: 'service',
    })

    expect(created).toMatchObject({
      ok: true,
      product: {unitType: 'service'},
    })
  })

  it('rejects a missing or unknown category when creating or updating a product', async () => {
    await expect(createProduct({
      categoryId: null,
      sku: 'CATEGORY-TEST-2',
      name: 'Missing Category Product',
      unitPrice: 10000,
      unitType: 'piece',
    })).resolves.toEqual({
      ok: false,
      message: 'Product category is required',
    })

    await expect(createProduct({
      categoryId: 999999,
      sku: 'CATEGORY-TEST-3',
      name: 'Unknown Category Product',
      unitPrice: 10000,
      unitType: 'piece',
    })).resolves.toEqual({
      ok: false,
      message: 'Product category not found',
    })

    const category = (await listProductCategories()).find((item) => item.name === 'Mesin')
    const categorized = await createProduct({
      categoryId: category!.id,
      sku: 'CATEGORY-TEST-4',
      name: 'Categorized Product',
      unitPrice: 10000,
      unitType: 'piece',
    })

    expect(categorized).toMatchObject({
      ok: true,
      product: { categoryId: category!.id },
    })

    await expect(updateProduct({
      ...categorized.product,
      categoryId: null,
    })).resolves.toEqual({
      ok: false,
      message: 'Product category is required',
    })

    await expect(updateProduct({
      ...categorized.product,
      categoryId: 999999,
    })).resolves.toEqual({
      ok: false,
      message: 'Product category not found',
    })
  })
})
