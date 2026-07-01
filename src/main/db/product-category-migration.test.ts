import fs from 'fs'
import os from 'os'
import path from 'path'
import initSqlJs from 'sql.js'
import { afterAll, describe, expect, it } from 'vitest'
import { closeDatabase, initializeDatabase } from './client'

const databaseDirectory = path.join(os.tmpdir(), `simplepos-category-migration-${process.pid}`)
const databasePath = path.join(databaseDirectory, 'simplepos.sqlite')

describe('product category migration', () => {
  afterAll(async () => {
    await closeDatabase()
    fs.rmSync(databaseDirectory, { recursive: true, force: true })
  })

  it('removes legacy category fields without losing assignments', async () => {
    fs.rmSync(databaseDirectory, { recursive: true, force: true })
    fs.mkdirSync(databaseDirectory, { recursive: true })

    const SQL = await initSqlJs()
    const legacyDatabase = new SQL.Database()
    legacyDatabase.run(`
      CREATE TABLE product_categories (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        name text NOT NULL UNIQUE,
        description text,
        is_active integer NOT NULL DEFAULT (1),
        created_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        updated_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP)
      )
    `)
    legacyDatabase.run(`
      CREATE TABLE products (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        category_id integer REFERENCES product_categories(id),
        sku text NOT NULL UNIQUE,
        barcode text UNIQUE,
        name text NOT NULL,
        description text,
        unit_price integer NOT NULL DEFAULT (0),
        unit_type text NOT NULL DEFAULT ('piece'),
        stock_qty integer NOT NULL DEFAULT (0),
        min_stock integer NOT NULL DEFAULT (0),
        last_purchase_cost integer NOT NULL DEFAULT (0),
        is_active integer NOT NULL DEFAULT (1),
        created_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        updated_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP)
      )
    `)
    legacyDatabase.run(
      'INSERT INTO product_categories (id, name, description) VALUES (42, ?, ?)',
      ['Legacy Category', 'Remove this field'],
    )
    legacyDatabase.run(
      'INSERT INTO product_categories (id, name, description) VALUES (43, ?, ?)',
      ['Filter', 'Old seeded category'],
    )
    legacyDatabase.run(
      'INSERT INTO products (category_id, sku, name) VALUES (42, ?, ?)',
      ['LEGACY-PRODUCT', 'Legacy Product'],
    )
    legacyDatabase.run(
      'INSERT INTO products (category_id, sku, name) VALUES (43, ?, ?)',
      ['LEGACY-FILTER-PRODUCT', 'Legacy Filter Product'],
    )
    fs.writeFileSync(databasePath, Buffer.from(legacyDatabase.export()))
    legacyDatabase.close()

    const status = await initializeDatabase(databaseDirectory)
    expect(status.state).toBe('connected_existing')
    await closeDatabase()

    const migratedDatabase = new SQL.Database(fs.readFileSync(databasePath))
    const columns = migratedDatabase.exec('PRAGMA table_info(product_categories)')[0].values
      .map((column) => column[1])
    const assignment = migratedDatabase.exec(
      "SELECT category_id FROM products WHERE sku = 'LEGACY-PRODUCT'",
    )[0].values[0][0]
    const migratedCategory = migratedDatabase.exec(`
      SELECT product_categories.name
      FROM products
      JOIN product_categories ON product_categories.id = products.category_id
      WHERE products.sku = 'LEGACY-FILTER-PRODUCT'
    `)[0].values[0][0]
    const oldCategoryCount = migratedDatabase.exec(
      "SELECT COUNT(*) FROM product_categories WHERE name = 'Filter'",
    )[0].values[0][0]

    expect(columns).toEqual(['id', 'name'])
    expect(assignment).toBe(42)
    expect(migratedCategory).toBe('Mesin')
    expect(oldCategoryCount).toBe(0)
    migratedDatabase.close()
  })
})
