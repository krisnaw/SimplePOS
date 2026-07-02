import { scryptSync } from 'crypto'
import fs from 'fs'
import path from 'path'
import { drizzle, type SQLJsDatabase } from 'drizzle-orm/sql-js'
import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js'
import * as schema from './schema/index'
import { seedProductCatalog, seedServiceCatalog } from './seeder'

export type DatabaseConnectionState = 'connected_existing' | 'connected_created' | 'error'

export type DatabaseStatus = {
  state: DatabaseConnectionState
  path: string
  existsBeforeOpen: boolean
  message: string
  checkedAt: string
}

type DatabaseClient = SQLJsDatabase<typeof schema>

const defaultAdminUsername = 'admin'
const defaultAdminPassword = 'admin123'
const defaultAdminSalt = 'simplepos-default-admin-salt'

let sqliteDatabase: SqlJsDatabase | null = null
let databaseClient: DatabaseClient | null = null
let databaseFileMtimeMs = 0
let status: DatabaseStatus = {
  state: 'error',
  path: '',
  existsBeforeOpen: false,
  message: 'Database has not been checked yet',
  checkedAt: new Date().toISOString(),
}

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString('hex')
}

function addColumnIfMissing(database: SqlJsDatabase, tableName: string, columnName: string, definition: string): void {
  const columns = database.exec(`PRAGMA table_info(${tableName})`)[0]?.values ?? []
  const hasColumn = columns.some((column) => column[1] === columnName)

  if (!hasColumn) {
    database.run(`ALTER TABLE ${tableName} ADD COLUMN ${definition}`)
  }
}

function dropColumnIfPresent(database: SqlJsDatabase, tableName: string, columnName: string): void {
  const columns = database.exec(`PRAGMA table_info(${tableName})`)[0]?.values ?? []
  const hasColumn = columns.some((column) => column[1] === columnName)

  if (hasColumn) {
    database.run(`ALTER TABLE ${tableName} DROP COLUMN ${columnName}`)
  }
}

function migrateSaleItemsForPriceOverrides(database: SqlJsDatabase): void {
  const columns = database.exec('PRAGMA table_info(sale_items)')[0]?.values ?? []
  if (columns.length === 0) return

  const hasBasePrice = columns.some((column) => column[1] === 'base_price')
  if (!hasBasePrice) {
    database.run('ALTER TABLE sale_items ADD COLUMN base_price integer NOT NULL DEFAULT (0)')
    database.run('UPDATE sale_items SET base_price = unit_price')
  }
  addColumnIfMissing(
    database,
    'sale_items',
    'price_overridden_by_id',
    'price_overridden_by_id integer REFERENCES users(id)',
  )
  addColumnIfMissing(database, 'sale_items', 'price_overridden_at', 'price_overridden_at text')
}

function normalizeExistingVehiclePlates(database: SqlJsDatabase): void {
  const rows = database.exec('SELECT id, plate_number FROM vehicles')[0]?.values ?? []
  const normalized = rows.map(([id, plateNumber]) => ({
    id: Number(id),
    plateNumber: String(plateNumber).replace(/\s+/g, '').toUpperCase(),
  }))
  const seen = new Map<string, number>()

  for (const row of normalized) {
    const existingId = seen.get(row.plateNumber)
    if (existingId !== undefined) {
      throw new Error(
        `Vehicle plate migration conflict: records ${existingId} and ${row.id} normalize to ${row.plateNumber}`,
      )
    }
    seen.set(row.plateNumber, row.id)
  }

  for (const row of normalized) {
    database.run('UPDATE vehicles SET plate_number = ? WHERE id = ?', [row.plateNumber, row.id])
  }
}

function migrateVehiclesForIntake(database: SqlJsDatabase): void {
  const columns = database.exec('PRAGMA table_info(vehicles)')[0]?.values ?? []
  if (columns.length === 0) return

  const customerIdColumn = columns.find((column) => column[1] === 'customer_id')
  const brandColumn = columns.find((column) => column[1] === 'brand')
  const hasCustomerName = columns.some((column) => column[1] === 'customer_name')
  const hasCustomerPhone = columns.some((column) => column[1] === 'customer_phone')
  const needsRebuild =
    customerIdColumn?.[3] === 1 ||
    brandColumn?.[3] === 1 ||
    !hasCustomerName ||
    !hasCustomerPhone

  normalizeExistingVehiclePlates(database)
  if (!needsRebuild) return

  database.run('PRAGMA foreign_keys = OFF')
  try {
    database.run('BEGIN')
    database.run(`
      CREATE TABLE vehicles_intake_migration (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        customer_id integer REFERENCES customers(id),
        customer_name text,
        customer_phone text,
        plate_number text NOT NULL,
        brand text,
        model text NOT NULL,
        year integer,
        vin text,
        color text,
        notes text,
        is_active integer NOT NULL DEFAULT (1),
        created_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        updated_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        CONSTRAINT UQ_vehicles_plate_number UNIQUE (plate_number),
        CONSTRAINT UQ_vehicles_vin UNIQUE (vin)
      )
    `)
    database.run(`
      INSERT INTO vehicles_intake_migration (
        id, customer_id, customer_name, customer_phone, plate_number, brand, model,
        year, vin, color, notes, is_active, created_at, updated_at
      )
      SELECT
        v.id,
        v.customer_id,
        c.name,
        c.phone,
        v.plate_number,
        NULLIF(v.brand, ''),
        v.model,
        v.year,
        v.vin,
        v.color,
        v.notes,
        v.is_active,
        v.created_at,
        v.updated_at
      FROM vehicles v
      LEFT JOIN customers c ON c.id = v.customer_id
    `)
    database.run('DROP TABLE vehicles')
    database.run('ALTER TABLE vehicles_intake_migration RENAME TO vehicles')
    database.run('COMMIT')
  } catch (error) {
    database.run('ROLLBACK')
    throw error
  } finally {
    database.run('PRAGMA foreign_keys = ON')
  }
}

function migratePurchasesForDelayedInvoice(database: SqlJsDatabase): void {
  const columns = database.exec('PRAGMA table_info(purchases)')[0]?.values ?? []
  if (columns.length === 0) return

  const hasInvoiceStatus = columns.some((column) => column[1] === 'invoice_status')
  const supplierInvoiceColumn = columns.find((column) => column[1] === 'supplier_invoice_number')
  const normalizedInvoiceColumn = columns.find((column) => column[1] === 'normalized_invoice_number')
  const invoiceDateColumn = columns.find((column) => column[1] === 'invoice_date')
  const needsRebuild =
    !hasInvoiceStatus ||
    supplierInvoiceColumn?.[3] === 1 ||
    normalizedInvoiceColumn?.[3] === 1 ||
    invoiceDateColumn?.[3] === 1

  if (!needsRebuild) return

  database.run('PRAGMA foreign_keys = OFF')
  try {
    database.run('BEGIN')
    database.run('DROP INDEX IF EXISTS purchases_supplier_invoice_unique')
    database.run('DROP INDEX IF EXISTS purchases_purchase_number_unique')
    database.run('DROP INDEX IF EXISTS purchases_supplier_id_idx')
    database.run('DROP INDEX IF EXISTS purchases_invoice_date_idx')
    database.run('DROP INDEX IF EXISTS purchases_payment_status_idx')
    database.run('DROP INDEX IF EXISTS purchases_invoice_status_idx')
    database.run(`
      CREATE TABLE purchases_delayed_invoice_migration (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        purchase_number text NOT NULL,
        supplier_id integer NOT NULL REFERENCES suppliers(id),
        supplier_invoice_number text,
        normalized_invoice_number text,
        invoice_date text,
        payment_status text NOT NULL DEFAULT ('unpaid'),
        invoice_status text NOT NULL DEFAULT ('received'),
        due_date text,
        paid_at text,
        notes text,
        total integer NOT NULL DEFAULT (0),
        created_by_id integer NOT NULL REFERENCES users(id),
        created_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        CONSTRAINT purchases_total_non_negative CHECK (total >= 0)
      )
    `)
    database.run(`
      INSERT INTO purchases_delayed_invoice_migration (
        id,
        purchase_number,
        supplier_id,
        supplier_invoice_number,
        normalized_invoice_number,
        invoice_date,
        payment_status,
        invoice_status,
        due_date,
        paid_at,
        notes,
        total,
        created_by_id,
        created_at
      )
      SELECT
        id,
        purchase_number,
        supplier_id,
        NULLIF(supplier_invoice_number, ''),
        NULLIF(normalized_invoice_number, ''),
        NULLIF(invoice_date, ''),
        payment_status,
        CASE
          WHEN NULLIF(normalized_invoice_number, '') IS NULL OR NULLIF(invoice_date, '') IS NULL THEN 'pending'
          ELSE 'received'
        END,
        due_date,
        paid_at,
        notes,
        total,
        created_by_id,
        created_at
      FROM purchases
    `)
    database.run('DROP TABLE purchases')
    database.run('ALTER TABLE purchases_delayed_invoice_migration RENAME TO purchases')
    database.run('COMMIT')
  } catch (error) {
    database.run('ROLLBACK')
    throw error
  } finally {
    database.run('PRAGMA foreign_keys = ON')
  }
}

function migrateStockMovements(database: SqlJsDatabase): void {
  database.run(`
    CREATE TABLE IF NOT EXISTS stock_movements (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      product_id integer NOT NULL REFERENCES products(id),
      sku_snapshot text NOT NULL,
      product_name_snapshot text NOT NULL,
      unit_type_snapshot text NOT NULL,
      movement_type text NOT NULL,
      quantity_delta integer NOT NULL,
      balance_after integer NOT NULL,
      reference_type text,
      reference_id integer,
      reference_number text,
      reason text,
      created_by_id integer REFERENCES users(id),
      created_by_name_snapshot text,
      created_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      CONSTRAINT stock_movements_quantity_delta_non_zero CHECK (quantity_delta <> 0),
      CONSTRAINT stock_movements_balance_after_non_negative CHECK (balance_after >= 0),
      CONSTRAINT stock_movements_type_valid CHECK (movement_type IN ('opening', 'purchase', 'sale', 'adjustment'))
    )
  `)
  database.run(`
    CREATE INDEX IF NOT EXISTS stock_movements_product_history_idx
    ON stock_movements (product_id, created_at DESC, id DESC)
  `)
  database.run(`
    CREATE INDEX IF NOT EXISTS stock_movements_type_created_at_idx
    ON stock_movements (movement_type, created_at DESC)
  `)
  database.run('CREATE INDEX IF NOT EXISTS stock_movements_created_by_id_idx ON stock_movements (created_by_id)')
  database.run(`
    CREATE UNIQUE INDEX IF NOT EXISTS stock_movements_reference_unique
    ON stock_movements (reference_type, reference_id)
    WHERE reference_type IS NOT NULL AND reference_id IS NOT NULL
  `)
  database.run(`
    INSERT INTO stock_movements (
      product_id,
      sku_snapshot,
      product_name_snapshot,
      unit_type_snapshot,
      movement_type,
      quantity_delta,
      balance_after,
      reference_type,
      reference_id,
      reference_number,
      reason,
      created_by_id,
      created_by_name_snapshot
    )
    SELECT
      products.id,
      products.sku,
      products.name,
      products.unit_type,
      'opening',
      products.stock_qty,
      products.stock_qty,
      'product',
      products.id,
      'Opening balance',
      'Balance imported when inventory ledger was enabled',
      NULL,
      'System'
    FROM products
    WHERE products.stock_qty > 0
      AND NOT EXISTS (
        SELECT 1 FROM stock_movements
        WHERE stock_movements.product_id = products.id
      )
  `)

  const foreignKeyErrors = database.exec('PRAGMA foreign_key_check')[0]?.values ?? []
  if (foreignKeyErrors.length > 0) {
    throw new Error('Database foreign key check failed after stock movement migration')
  }
}

function runSchemaMigration(database: SqlJsDatabase): void {
  database.run(`
    CREATE TABLE IF NOT EXISTS app_database_status (
      id integer PRIMARY KEY NOT NULL,
      initialized_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    )
  `)

  database.run(`
    CREATE TABLE IF NOT EXISTS users (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      username text NOT NULL,
      name text NOT NULL,
      role text NOT NULL DEFAULT ('cashier'),
      password_hash text NOT NULL,
      password_salt text NOT NULL,
      is_active integer NOT NULL DEFAULT (1),
      created_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      last_login_at text,
      CONSTRAINT UQ_users_username UNIQUE (username)
    )
  `)

  database.run(
    `
      INSERT INTO users (username, name, role, password_hash, password_salt, is_active)
      SELECT ?, ?, ?, ?, ?, 1
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = ?)
    `,
    [
      defaultAdminUsername,
      'Administrator',
      'admin',
      hashPassword(defaultAdminPassword, defaultAdminSalt),
      defaultAdminSalt,
      defaultAdminUsername,
    ],
  )

  database.run(`
    CREATE TABLE IF NOT EXISTS customers (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      name text NOT NULL,
      phone text,
      email text,
      address text,
      notes text,
      is_active integer NOT NULL DEFAULT (1),
      created_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      CONSTRAINT UQ_customers_email UNIQUE (email)
    )
  `)

  database.run(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      name text NOT NULL,
      normalized_name text NOT NULL,
      contact_name text,
      phone text,
      address text,
      notes text,
      is_active integer NOT NULL DEFAULT (1),
      created_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    )
  `)
  database.run(`
    CREATE UNIQUE INDEX IF NOT EXISTS suppliers_normalized_name_unique
    ON suppliers (normalized_name)
  `)
  dropColumnIfPresent(database, 'suppliers', 'email')

  database.run(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      customer_id integer REFERENCES customers(id),
      customer_name text,
      customer_phone text,
      plate_number text NOT NULL,
      brand text,
      model text NOT NULL,
      year integer,
      vin text,
      color text,
      notes text,
      is_active integer NOT NULL DEFAULT (1),
      created_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      CONSTRAINT UQ_vehicles_plate_number UNIQUE (plate_number),
      CONSTRAINT UQ_vehicles_vin UNIQUE (vin)
    )
  `)

  migrateVehiclesForIntake(database)

  database.run(`
    CREATE TABLE IF NOT EXISTS services (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      code text NOT NULL,
      name text NOT NULL,
      description text,
      category text,
      price integer NOT NULL DEFAULT (0),
      is_active integer NOT NULL DEFAULT (1),
      created_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      CONSTRAINT UQ_services_code UNIQUE (code)
    )
  `)

  database.run(`
    CREATE TABLE IF NOT EXISTS product_categories (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      name text NOT NULL,
      CONSTRAINT UQ_product_categories_name UNIQUE (name)
    )
  `)
  dropColumnIfPresent(database, 'product_categories', 'description')
  dropColumnIfPresent(database, 'product_categories', 'is_active')
  dropColumnIfPresent(database, 'product_categories', 'created_at')
  dropColumnIfPresent(database, 'product_categories', 'updated_at')

  database.run(`
    CREATE TABLE IF NOT EXISTS products (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      category_id integer REFERENCES product_categories(id),
      sku text NOT NULL,
      barcode text,
      name text NOT NULL,
      description text,
      unit_price integer NOT NULL DEFAULT (0),
      unit_type text NOT NULL DEFAULT ('piece'),
      stock_qty integer NOT NULL DEFAULT (0),
      min_stock integer NOT NULL DEFAULT (0),
      last_purchase_cost integer NOT NULL DEFAULT (0),
      is_active integer NOT NULL DEFAULT (1),
      created_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      CONSTRAINT UQ_products_sku UNIQUE (sku),
      CONSTRAINT UQ_products_barcode UNIQUE (barcode)
    )
  `)

  addColumnIfMissing(database, 'products', 'last_purchase_cost', 'last_purchase_cost integer NOT NULL DEFAULT (0)')

  database.run(`
    CREATE TABLE IF NOT EXISTS purchases (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      purchase_number text NOT NULL,
      supplier_id integer NOT NULL REFERENCES suppliers(id),
      supplier_invoice_number text,
      normalized_invoice_number text,
      invoice_date text,
      payment_status text NOT NULL DEFAULT ('unpaid'),
      invoice_status text NOT NULL DEFAULT ('received'),
      due_date text,
      paid_at text,
      notes text,
      total integer NOT NULL DEFAULT (0),
      created_by_id integer NOT NULL REFERENCES users(id),
      created_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      CONSTRAINT purchases_total_non_negative CHECK (total >= 0)
    )
  `)
  migratePurchasesForDelayedInvoice(database)
  database.run('CREATE UNIQUE INDEX IF NOT EXISTS purchases_purchase_number_unique ON purchases (purchase_number)')
  database.run(`
    CREATE UNIQUE INDEX IF NOT EXISTS purchases_supplier_invoice_unique
    ON purchases (supplier_id, normalized_invoice_number)
    WHERE normalized_invoice_number IS NOT NULL AND normalized_invoice_number <> ''
  `)
  database.run('CREATE INDEX IF NOT EXISTS purchases_supplier_id_idx ON purchases (supplier_id)')
  database.run('CREATE INDEX IF NOT EXISTS purchases_invoice_date_idx ON purchases (invoice_date)')
  database.run('CREATE INDEX IF NOT EXISTS purchases_payment_status_idx ON purchases (payment_status)')
  database.run('CREATE INDEX IF NOT EXISTS purchases_invoice_status_idx ON purchases (invoice_status)')

  database.run(`
    CREATE TABLE IF NOT EXISTS purchase_items (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      purchase_id integer NOT NULL REFERENCES purchases(id),
      product_id integer NOT NULL REFERENCES products(id),
      sku_snapshot text NOT NULL,
      product_name_snapshot text NOT NULL,
      quantity integer NOT NULL,
      unit_cost integer NOT NULL,
      line_total integer NOT NULL,
      CONSTRAINT purchase_items_quantity_positive CHECK (quantity > 0),
      CONSTRAINT purchase_items_unit_cost_non_negative CHECK (unit_cost >= 0),
      CONSTRAINT purchase_items_line_total_non_negative CHECK (line_total >= 0)
    )
  `)
  database.run('CREATE UNIQUE INDEX IF NOT EXISTS purchase_items_purchase_product_unique ON purchase_items (purchase_id, product_id)')
  database.run('CREATE INDEX IF NOT EXISTS purchase_items_purchase_id_idx ON purchase_items (purchase_id)')
  database.run('CREATE INDEX IF NOT EXISTS purchase_items_product_id_idx ON purchase_items (product_id)')

  database.run(`
    CREATE TABLE IF NOT EXISTS work_orders (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      order_number text NOT NULL,
      customer_id integer NOT NULL REFERENCES customers(id),
      vehicle_id integer NOT NULL REFERENCES vehicles(id),
      assigned_user_id integer REFERENCES users(id),
      status text NOT NULL DEFAULT ('open'),
      priority text NOT NULL DEFAULT ('normal'),
      complaint text NOT NULL,
      notes text,
      odometer integer,
      subtotal integer NOT NULL DEFAULT (0),
      discount integer NOT NULL DEFAULT (0),
      tax integer NOT NULL DEFAULT (0),
      total integer NOT NULL DEFAULT (0),
      created_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      completed_at text,
      invoiced_at text,
      cancelled_at text,
      CONSTRAINT UQ_work_orders_order_number UNIQUE (order_number)
    )
  `)

  database.run(`
    CREATE TABLE IF NOT EXISTS work_order_items (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      work_order_id integer NOT NULL REFERENCES work_orders(id),
      item_type text NOT NULL,
      product_id integer REFERENCES products(id),
      service_id integer REFERENCES services(id),
      name text NOT NULL,
      sku text,
      quantity integer NOT NULL,
      unit_price integer NOT NULL,
      line_total integer NOT NULL,
      created_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    )
  `)

  database.run(`
    CREATE TABLE IF NOT EXISTS sales (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      work_order_id integer REFERENCES work_orders(id),
      vehicle_id integer REFERENCES vehicles(id),
      customer_id integer REFERENCES customers(id),
      customer_name_snapshot text,
      customer_phone_snapshot text,
      created_by_id integer REFERENCES users(id),
      status text NOT NULL DEFAULT ('completed'),
      subtotal integer NOT NULL DEFAULT (0),
      discount integer NOT NULL DEFAULT (0),
      tax integer NOT NULL DEFAULT (0),
      total integer NOT NULL DEFAULT (0),
      notes text,
      created_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    )
  `)
  database.run(`
    CREATE UNIQUE INDEX IF NOT EXISTS sales_open_vehicle_unique
    ON sales (vehicle_id)
    WHERE status = 'in_progress' AND vehicle_id IS NOT NULL
  `)

  database.run(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      sale_id integer NOT NULL REFERENCES sales(id),
      item_type text NOT NULL,
      product_id integer REFERENCES products(id),
      service_id integer REFERENCES services(id),
      name text NOT NULL,
      sku text,
      quantity integer NOT NULL,
      base_price integer NOT NULL,
      unit_price integer NOT NULL,
      price_overridden_by_id integer REFERENCES users(id),
      price_overridden_at text,
      line_total integer NOT NULL,
      created_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    )
  `)
  migrateSaleItemsForPriceOverrides(database)

  database.run(`
    CREATE TABLE IF NOT EXISTS invoices (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      sale_id integer NOT NULL REFERENCES sales(id),
      work_order_id integer REFERENCES work_orders(id),
      invoice_number text NOT NULL,
      status text NOT NULL DEFAULT ('paid'),
      subtotal integer NOT NULL DEFAULT (0),
      discount integer NOT NULL DEFAULT (0),
      tax integer NOT NULL DEFAULT (0),
      total integer NOT NULL DEFAULT (0),
      issued_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      created_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      CONSTRAINT UQ_invoices_invoice_number UNIQUE (invoice_number)
    )
  `)

  database.run(`
    CREATE TABLE IF NOT EXISTS payments (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      sale_id integer NOT NULL REFERENCES sales(id),
      invoice_id integer NOT NULL REFERENCES invoices(id),
      method text NOT NULL,
      status text NOT NULL DEFAULT ('paid'),
      amount integer NOT NULL,
      paid_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      created_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    )
  `)

  addColumnIfMissing(database, 'sales', 'work_order_id', 'work_order_id integer REFERENCES work_orders(id)')
  addColumnIfMissing(database, 'sales', 'vehicle_id', 'vehicle_id integer REFERENCES vehicles(id)')
  addColumnIfMissing(database, 'sales', 'customer_name_snapshot', 'customer_name_snapshot text')
  addColumnIfMissing(database, 'sales', 'customer_phone_snapshot', 'customer_phone_snapshot text')
  addColumnIfMissing(database, 'invoices', 'work_order_id', 'work_order_id integer REFERENCES work_orders(id)')

  seedServiceCatalog(database)
  seedProductCatalog(database)
  migrateStockMovements(database)
}

export async function initializeDatabase(databaseDirectory: string): Promise<DatabaseStatus> {
  const dbPath = path.join(databaseDirectory, 'simplepos.sqlite')
  const existsBeforeOpen = fs.existsSync(dbPath)

  try {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true })

    const SQL = await initSqlJs()
    const databaseBytes = existsBeforeOpen ? fs.readFileSync(dbPath) : undefined

    sqliteDatabase = databaseBytes ? new SQL.Database(databaseBytes) : new SQL.Database()
    sqliteDatabase.run('PRAGMA foreign_keys = ON')
    runSchemaMigration(sqliteDatabase)

    fs.writeFileSync(dbPath, Buffer.from(sqliteDatabase.export()))
    databaseFileMtimeMs = fs.statSync(dbPath).mtimeMs
    databaseClient = drizzle(sqliteDatabase, { schema })

    status = {
      state: existsBeforeOpen ? 'connected_existing' : 'connected_created',
      path: dbPath,
      existsBeforeOpen,
      message: existsBeforeOpen
        ? 'Connected to existing database'
        : 'Created and connected to database',
      checkedAt: new Date().toISOString(),
    }
  } catch (error) {
    status = {
      state: 'error',
      path: dbPath,
      existsBeforeOpen,
      message: error instanceof Error ? error.message : 'Unable to connect to database',
      checkedAt: new Date().toISOString(),
    }
  }

  return status
}

export function getDatabaseStatus(): DatabaseStatus {
  return status
}

export function getDatabaseClient(): DatabaseClient | null {
  return databaseClient
}

export async function flushDatabase(): Promise<void> {
  if (!sqliteDatabase || !status.path) return

  if (fs.existsSync(status.path)) {
    const currentMtimeMs = fs.statSync(status.path).mtimeMs

    if (databaseFileMtimeMs > 0 && currentMtimeMs > databaseFileMtimeMs + 1) {
      console.warn(`Skipped database flush because ${status.path} was modified by another process.`)
      return
    }
  }

  fs.writeFileSync(status.path, Buffer.from(sqliteDatabase.export()))
  databaseFileMtimeMs = fs.statSync(status.path).mtimeMs
}

export async function closeDatabase(): Promise<void> {
  if (!sqliteDatabase) return

  await flushDatabase()
  sqliteDatabase.close()
  sqliteDatabase = null
  databaseClient = null
  databaseFileMtimeMs = 0
}
