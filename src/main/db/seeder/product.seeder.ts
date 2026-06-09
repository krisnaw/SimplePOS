import type { Database as SqlJsDatabase, SqlValue } from 'sql.js'

type ProductSeed = {
  sku: string
  barcode: string | null
  name: string
  description: string | null
  unitPrice: number
  unitType: string
  stockQty: number
  minStock: number
  categoryName: string
}

const productCategorySeeds = [
  'Lubricants & Fluids',
  'Filters',
  'Brake Parts',
  'Electrical Parts',
  'Tires & Wheels',
]

const productSeeds: ProductSeed[] = [
  {
    sku: 'LUB-OIL-10W40-1L',
    barcode: '8991001104011',
    name: 'Engine Oil 10W-40 1L',
    description: 'Semi-synthetic engine oil for daily service jobs.',
    unitPrice: 85000,
    unitType: 'litre',
    stockQty: 24,
    minStock: 6,
    categoryName: 'Lubricants & Fluids',
  },
  {
    sku: 'LUB-ATF-DEX3-1L',
    barcode: '8991001200311',
    name: 'Automatic Transmission Fluid Dexron III',
    description: 'ATF fluid for compatible automatic transmissions.',
    unitPrice: 78000,
    unitType: 'litre',
    stockQty: 16,
    minStock: 4,
    categoryName: 'Lubricants & Fluids',
  },
  {
    sku: 'LUB-COOLANT-1L',
    barcode: '8991001300010',
    name: 'Radiator Coolant 1L',
    description: 'Ready-to-use coolant for radiator service.',
    unitPrice: 42000,
    unitType: 'litre',
    stockQty: 20,
    minStock: 5,
    categoryName: 'Lubricants & Fluids',
  },
  {
    sku: 'FLT-OIL-UNIV',
    barcode: '8992002100001',
    name: 'Oil Filter Universal',
    description: 'Common replacement oil filter for standard service.',
    unitPrice: 45000,
    unitType: 'piece',
    stockQty: 18,
    minStock: 5,
    categoryName: 'Filters',
  },
  {
    sku: 'FLT-AIR-COMPACT',
    barcode: '8992002200008',
    name: 'Compact Air Filter',
    description: 'Replacement air filter for compact passenger cars.',
    unitPrice: 65000,
    unitType: 'piece',
    stockQty: 14,
    minStock: 4,
    categoryName: 'Filters',
  },
  {
    sku: 'FLT-CABIN-CARBON',
    barcode: '8992002300005',
    name: 'Carbon Cabin Filter',
    description: 'Cabin filter with activated carbon layer.',
    unitPrice: 95000,
    unitType: 'piece',
    stockQty: 10,
    minStock: 3,
    categoryName: 'Filters',
  },
  {
    sku: 'BRK-PAD-FRONT-STD',
    barcode: '8993003100001',
    name: 'Brake Pad Front Standard',
    description: 'Front brake pad set for common passenger vehicles.',
    unitPrice: 320000,
    unitType: 'set',
    stockQty: 8,
    minStock: 3,
    categoryName: 'Brake Parts',
  },
  {
    sku: 'BRK-FLUID-DOT4-500ML',
    barcode: '8993003405007',
    name: 'Brake Fluid DOT 4 500ml',
    description: 'DOT 4 brake fluid for hydraulic brake systems.',
    unitPrice: 56000,
    unitType: 'piece',
    stockQty: 12,
    minStock: 4,
    categoryName: 'Brake Parts',
  },
  {
    sku: 'ELEC-BAT-NS40ZL',
    barcode: '8994004100402',
    name: 'Battery NS40ZL',
    description: 'Maintenance-free battery for compact vehicles.',
    unitPrice: 720000,
    unitType: 'piece',
    stockQty: 5,
    minStock: 2,
    categoryName: 'Electrical Parts',
  },
  {
    sku: 'TIRE-185-65-R15',
    barcode: '8995005186515',
    name: 'Tire 185/65 R15',
    description: 'All-season passenger tire, 185/65 R15 size.',
    unitPrice: 650000,
    unitType: 'piece',
    stockQty: 12,
    minStock: 4,
    categoryName: 'Tires & Wheels',
  },
]

export function seedProductCatalog(database: SqlJsDatabase): void {
  for (const categoryName of productCategorySeeds) {
    database.run(
      'INSERT INTO product_categories (name) SELECT ? WHERE NOT EXISTS (SELECT 1 FROM product_categories WHERE name = ?)',
      [categoryName, categoryName],
    )
  }

  for (const product of productSeeds) {
    const params: SqlValue[] = [
      product.sku,
      product.barcode,
      product.name,
      product.description,
      product.unitPrice,
      product.unitType,
      product.stockQty,
      product.minStock,
      product.categoryName,
      product.sku,
    ]

    database.run(
      `
        INSERT INTO products (
          sku,
          barcode,
          name,
          description,
          unit_price,
          unit_type,
          stock_qty,
          min_stock,
          category_id
        )
        SELECT ?, ?, ?, ?, ?, ?, ?, ?, (
          SELECT id FROM product_categories WHERE name = ?
        )
        WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = ?)
      `,
      params,
    )
  }
}
