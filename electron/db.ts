import fs from 'fs'
import path from 'path'
import { DatabaseSync } from 'node:sqlite'

export type DatabaseConnectionState = 'connected_existing' | 'connected_created' | 'error'

export type DatabaseStatus = {
  state: DatabaseConnectionState
  path: string
  existsBeforeOpen: boolean
  message: string
  checkedAt: string
}

let db: DatabaseSync | null = null
let status: DatabaseStatus = {
  state: 'error',
  path: '',
  existsBeforeOpen: false,
  message: 'Database has not been checked yet',
  checkedAt: new Date().toISOString(),
}

export function initializeDatabase(projectPath: string): DatabaseStatus {
  const dbPath = path.join(projectPath, 'simplepos.sqlite')
  const existsBeforeOpen = fs.existsSync(dbPath)

  try {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true })

    db = new DatabaseSync(dbPath)
    db.exec('PRAGMA foreign_keys = ON')
    db.exec(`
      CREATE TABLE IF NOT EXISTS app_database_status (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        initialized_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    db.prepare('SELECT 1 AS ok').get()

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

export function closeDatabase(): void {
  if (!db) return

  db.close()
  db = null
}
