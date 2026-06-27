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

const defaultAdminEmail = 'admin@simplepos.com'
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
      email text NOT NULL,
      name text NOT NULL,
      role text NOT NULL DEFAULT ('cashier'),
      password_hash text NOT NULL,
      password_salt text NOT NULL,
      is_active integer NOT NULL DEFAULT (1),
      created_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      last_login_at text,
      CONSTRAINT UQ_users_email UNIQUE (email)
    )
  `)

  database.run(
    `
      INSERT INTO users (email, name, role, password_hash, password_salt, is_active)
      SELECT ?, ?, ?, ?, ?, 1
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = ?)
    `,
    [
      defaultAdminEmail,
      'Administrator',
      'admin',
      hashPassword(defaultAdminPassword, defaultAdminSalt),
      defaultAdminSalt,
      defaultAdminEmail,
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
      description text,
      is_active integer NOT NULL DEFAULT (1),
      created_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      CONSTRAINT UQ_product_categories_name UNIQUE (name)
    )
  `)

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
      is_active integer NOT NULL DEFAULT (1),
      created_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      CONSTRAINT UQ_products_sku UNIQUE (sku),
      CONSTRAINT UQ_products_barcode UNIQUE (barcode)
    )
  `)

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
    CREATE TABLE IF NOT EXISTS sale_items (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      sale_id integer NOT NULL REFERENCES sales(id),
      item_type text NOT NULL,
      product_id integer REFERENCES products(id),
      service_id integer REFERENCES services(id),
      name text NOT NULL,
      sku text,
      quantity integer NOT NULL,
      unit_price integer NOT NULL,
      line_total integer NOT NULL,
      created_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    )
  `)

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
