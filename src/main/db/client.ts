import { scryptSync } from 'crypto'
import fs from 'fs'
import path from 'path'
import { drizzle, type SQLJsDatabase } from 'drizzle-orm/sql-js'
import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js'
import * as schema from './schema'

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
    await flushDatabase()

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
