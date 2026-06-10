import { scryptSync } from 'crypto'
import fs from 'fs'
import path from 'path'
import { drizzle, type SQLJsDatabase } from 'drizzle-orm/sql-js'
import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js'
import * as schema from './schema/index'
import { seedProductCatalog } from './seeder'

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
      customer_id integer NOT NULL REFERENCES customers(id),
      plate_number text NOT NULL,
      brand text NOT NULL,
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

    databaseClient = drizzle(sqliteDatabase, { schema })
    fs.writeFileSync(dbPath, Buffer.from(sqliteDatabase.export()))

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

  fs.writeFileSync(status.path, Buffer.from(sqliteDatabase.export()))
}

export async function closeDatabase(): Promise<void> {
  if (!sqliteDatabase) return

  await flushDatabase()
  sqliteDatabase.close()
  sqliteDatabase = null
  databaseClient = null
}
