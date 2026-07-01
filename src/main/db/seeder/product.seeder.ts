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
  'Cuci',
  'Mesin',
  'Bengkel',
  'Minuman',
]

const legacyCategoryMappings = [
  { from: 'Oli & Cairan', to: 'Mesin' },
  { from: 'Filter', to: 'Mesin' },
  { from: 'Rem', to: 'Bengkel' },
  { from: 'Kelistrikan', to: 'Bengkel' },
  { from: 'Ban & Roda', to: 'Bengkel' },
  { from: 'Aksesoris', to: 'Bengkel' },
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
    categoryName: 'Mesin',
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
    categoryName: 'Mesin',
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
    categoryName: 'Mesin',
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
    categoryName: 'Mesin',
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
    categoryName: 'Mesin',
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
    categoryName: 'Bengkel',
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
    categoryName: 'Bengkel',
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
    categoryName: 'Bengkel',
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
    categoryName: 'Bengkel',
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
    categoryName: 'Bengkel',
  },
  {
    sku: 'ID-WASH-SHAMPOO-1L',
    barcode: '8998765600012',
    name: 'Shampo Mobil 1L',
    description: 'Shampo kendaraan untuk pencucian rutin.',
    unitPrice: 35000,
    unitType: 'piece',
    stockQty: 20,
    minStock: 5,
    categoryName: 'Cuci',
  },
  {
    sku: 'ID-WASH-MICROFIBER',
    barcode: '8998765610011',
    name: 'Kain Microfiber',
    description: 'Kain lembut untuk mengeringkan dan membersihkan kendaraan.',
    unitPrice: 18000,
    unitType: 'piece',
    stockQty: 30,
    minStock: 8,
    categoryName: 'Cuci',
  },
  {
    sku: 'ID-WASH-TIRE-SHINE',
    barcode: '8998765620010',
    name: 'Semir Ban 500ml',
    description: 'Cairan penghitam dan pelindung permukaan ban.',
    unitPrice: 42000,
    unitType: 'piece',
    stockQty: 16,
    minStock: 4,
    categoryName: 'Cuci',
  },
  {
    sku: 'ID-WASH-GLASS-CLEANER',
    barcode: '8998765630019',
    name: 'Pembersih Kaca 500ml',
    description: 'Cairan pembersih kaca kendaraan tanpa meninggalkan noda.',
    unitPrice: 32000,
    unitType: 'piece',
    stockQty: 18,
    minStock: 4,
    categoryName: 'Cuci',
  },
  {
    sku: 'ID-WASH-SPONGE',
    barcode: '8998765640018',
    name: 'Spons Cuci Kendaraan',
    description: 'Spons tebal untuk mencuci bodi kendaraan.',
    unitPrice: 15000,
    unitType: 'piece',
    stockQty: 25,
    minStock: 6,
    categoryName: 'Cuci',
  },
  {
    sku: 'ID-DRINK-AQUA-600',
    barcode: '8998765700019',
    name: 'Aqua 600ml',
    description: 'Air mineral botol dingin.',
    unitPrice: 6000,
    unitType: 'piece',
    stockQty: 48,
    minStock: 12,
    categoryName: 'Minuman',
  },
  {
    sku: 'ID-DRINK-TEH-BOTOL',
    barcode: '8998765710018',
    name: 'Teh Botol Sosro 450ml',
    description: 'Minuman teh manis dalam botol.',
    unitPrice: 8000,
    unitType: 'piece',
    stockQty: 36,
    minStock: 10,
    categoryName: 'Minuman',
  },
  {
    sku: 'ID-DRINK-POCARI-500',
    barcode: '8998765720017',
    name: 'Pocari Sweat 500ml',
    description: 'Minuman isotonik dalam botol.',
    unitPrice: 11000,
    unitType: 'piece',
    stockQty: 24,
    minStock: 6,
    categoryName: 'Minuman',
  },
  {
    sku: 'ID-DRINK-COFFEE-CAN',
    barcode: '8998765730016',
    name: 'Kopi Susu Kaleng',
    description: 'Minuman kopi susu siap minum.',
    unitPrice: 10000,
    unitType: 'piece',
    stockQty: 24,
    minStock: 6,
    categoryName: 'Minuman',
  },
  {
    sku: 'ID-DRINK-COLA-390',
    barcode: '8998765740015',
    name: 'Coca-Cola 390ml',
    description: 'Minuman ringan berkarbonasi dalam botol.',
    unitPrice: 9000,
    unitType: 'piece',
    stockQty: 30,
    minStock: 8,
    categoryName: 'Minuman',
  },
]

export function seedProductCatalog(database: SqlJsDatabase): void {
  for (const categoryName of productCategorySeeds) {
    database.run(
      'INSERT INTO product_categories (name) SELECT ? WHERE NOT EXISTS (SELECT 1 FROM product_categories WHERE name = ?)',
      [categoryName, categoryName],
    )
  }

  for (const mapping of legacyCategoryMappings) {
    database.run(
      `
        UPDATE products
        SET category_id = (SELECT id FROM product_categories WHERE name = ?)
        WHERE category_id = (SELECT id FROM product_categories WHERE name = ?)
      `,
      [mapping.to, mapping.from],
    )
    database.run(
      `
        DELETE FROM product_categories
        WHERE name = ?
          AND NOT EXISTS (
            SELECT 1 FROM products WHERE category_id = product_categories.id
          )
      `,
      [mapping.from],
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
