import fs from 'fs'
import path from 'path'
import { DataSource } from 'typeorm'
import { AppDatabaseStatusEntity, UserEntity } from './schema'
import { CreateUserSchema1717300000000 } from './migrations/1717300000000-CreateUserSchema'

export type DatabaseConnectionState = 'connected_existing' | 'connected_created' | 'error'

export type DatabaseStatus = {
  state: DatabaseConnectionState
  path: string
  existsBeforeOpen: boolean
  message: string
  checkedAt: string
}

type SqljsDatabaseManager = {
  saveDatabase(fileNameOrLocalStorage?: string): Promise<void>
}

let dataSource: DataSource | null = null
let status: DatabaseStatus = {
  state: 'error',
  path: '',
  existsBeforeOpen: false,
  message: 'Database has not been checked yet',
  checkedAt: new Date().toISOString(),
}

function persistDatabase(dbPath: string, database: Uint8Array): void {
  fs.writeFileSync(dbPath, Buffer.from(database))
}

function saveSqljsDatabase(source: DataSource, dbPath: string): Promise<void> {
  return (source.manager as unknown as SqljsDatabaseManager).saveDatabase(dbPath)
}

export async function initializeDatabase(projectPath: string): Promise<DatabaseStatus> {
  const dbPath = path.join(projectPath, 'simplepos.sqlite')
  const existsBeforeOpen = fs.existsSync(dbPath)

  try {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true })

    const database = existsBeforeOpen ? new Uint8Array(fs.readFileSync(dbPath)) : undefined

    dataSource = new DataSource({
      type: 'sqljs',
      database,
      autoSave: true,
      autoSaveCallback: (updatedDatabase: Uint8Array) => {
        persistDatabase(dbPath, updatedDatabase)
      },
      entities: [AppDatabaseStatusEntity, UserEntity],
      migrations: [CreateUserSchema1717300000000],
      synchronize: false,
    })

    await dataSource.initialize()
    await dataSource.query('PRAGMA foreign_keys = ON')
    await dataSource.runMigrations()
    await dataSource.query('SELECT 1 AS ok')
    await saveSqljsDatabase(dataSource, dbPath)

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

export function getDataSource(): DataSource | null {
  return dataSource?.isInitialized ? dataSource : null
}

export async function closeDatabase(): Promise<void> {
  if (!dataSource) return

  if (dataSource.isInitialized) {
    await saveSqljsDatabase(dataSource, status.path)
    await dataSource.destroy()
  }

  dataSource = null
}
