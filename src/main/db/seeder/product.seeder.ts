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
  'Oli & Cairan',
  'Filter',
  'Rem',
  'Kelistrikan',
  'Ban & Roda',
  'Aksesoris',
]

const productSeeds: ProductSeed[] = [
  {
    sku: 'ID-OIL-MPX2-10W30-08L',
    barcode: '8991234103008',
    name: 'AHM Oil MPX2 10W-30 0.8L',
    description: 'Oli mesin motor matic harian yang umum dijual di bengkel Indonesia.',
    unitPrice: 62000,
    unitType: 'litre',
    stockQty: 30,
    minStock: 6,
    categoryName: 'Oli & Cairan',
  },
  {
    sku: 'ID-OIL-YAMALUBE-MATIC-08L',
    barcode: '8993456103006',
    name: 'Yamalube Super Matic 10W-40 0.8L',
    description: 'Oli mesin motor matic untuk servis berkala.',
    unitPrice: 68000,
    unitType: 'litre',
    stockQty: 28,
    minStock: 6,
    categoryName: 'Oli & Cairan',
  },
  {
    sku: 'ID-OIL-CASTROL-MAG-10W40-1L',
    barcode: '8997654104012',
    name: 'Castrol Magnatec 10W-40 1L',
    description: 'Oli mesin mobil bensin untuk pemakaian harian.',
    unitPrice: 98000,
    unitType: 'litre',
    stockQty: 18,
    minStock: 5,
    categoryName: 'Oli & Cairan',
  },
  {
    sku: 'ID-FLT-ASPIRA-BEAT',
    barcode: '8998765200014',
    name: 'Filter Udara Aspira Honda BeAT',
    description: 'Filter udara pengganti untuk motor Honda BeAT dan Scoopy tertentu.',
    unitPrice: 35000,
    unitType: 'piece',
    stockQty: 24,
    minStock: 5,
    categoryName: 'Filter',
  },
  {
    sku: 'ID-FLT-OIL-AVANZA',
    barcode: '8998765210013',
    name: 'Filter Oli Toyota Avanza',
    description: 'Filter oli untuk Toyota Avanza, Xenia, dan model mesin sejenis.',
    unitPrice: 45000,
    unitType: 'piece',
    stockQty: 20,
    minStock: 4,
    categoryName: 'Filter',
  },
  {
    sku: 'ID-BRK-KAMPAS-BEAT',
    barcode: '8998765300011',
    name: 'Kampas Rem Depan Honda BeAT',
    description: 'Kampas rem cakram depan untuk motor matic Honda populer.',
    unitPrice: 55000,
    unitType: 'piece',
    stockQty: 22,
    minStock: 5,
    categoryName: 'Rem',
  },
  {
    sku: 'ID-BRK-PAD-AVANZA-FR',
    barcode: '8998765310010',
    name: 'Kampas Rem Depan Toyota Avanza',
    description: 'Set kampas rem depan untuk Toyota Avanza dan Daihatsu Xenia.',
    unitPrice: 185000,
    unitType: 'set',
    stockQty: 12,
    minStock: 3,
    categoryName: 'Rem',
  },
  {
    sku: 'ID-SPARK-NGK-CPR9EA',
    barcode: '8998765400018',
    name: 'Busi NGK CPR9EA-9',
    description: 'Busi motor injeksi yang banyak dipakai pada motor matic dan bebek.',
    unitPrice: 28000,
    unitType: 'piece',
    stockQty: 40,
    minStock: 10,
    categoryName: 'Kelistrikan',
  },
  {
    sku: 'ID-BAT-GS-GTZ5S',
    barcode: '8998765410017',
    name: 'Aki Motor GS Astra GTZ5S',
    description: 'Aki kering untuk motor matic dan bebek populer di Indonesia.',
    unitPrice: 235000,
    unitType: 'piece',
    stockQty: 10,
    minStock: 2,
    categoryName: 'Kelistrikan',
  },
  {
    sku: 'ID-TIRE-FDR-80-90-14',
    barcode: '8998765500015',
    name: 'Ban FDR 80/90-14 Tubeless',
    description: 'Ban tubeless motor matic ukuran 80/90-14.',
    unitPrice: 185000,
    unitType: 'piece',
    stockQty: 16,
    minStock: 4,
    categoryName: 'Ban & Roda',
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
