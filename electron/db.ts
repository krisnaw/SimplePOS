import fs from 'fs'
import path from 'path'
import { scryptSync, timingSafeEqual } from 'crypto'
import { DataSource } from 'typeorm'
import { SqljsEntityManager } from 'typeorm/entity-manager/SqljsEntityManager'
import { AppDatabaseStatusEntity } from './entity/AppDatabaseStatus'
import { User, UserEntity } from './entity/User'
import { CreateUserSchema1717300000000 } from './migration/1717300000000-CreateUserSchema'

export type DatabaseConnectionState = 'connected_existing' | 'connected_created' | 'error'

export type DatabaseStatus = {
  state: DatabaseConnectionState
  path: string
  existsBeforeOpen: boolean
  message: string
  checkedAt: string
}

export type LoginResult = {
  ok: boolean
  message: string
  user?: {
    id: number
    email: string
    name: string
    role: User['role']
  }
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

function hashPassword(password: string, salt: string): Buffer {
  return scryptSync(password, salt, 64)
}

function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const actualHash = hashPassword(password, salt)
  const expectedHashBuffer = Buffer.from(expectedHash, 'hex')

  if (actualHash.length !== expectedHashBuffer.length) return false

  return timingSafeEqual(actualHash, expectedHashBuffer)
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
    await (dataSource.manager as SqljsEntityManager).saveDatabase(dbPath)

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

export async function authenticateUser(email: string, password: string): Promise<LoginResult> {
  if (!dataSource?.isInitialized) {
    return {
      ok: false,
      message: 'Database unavailable',
    }
  }

  const normalizedEmail = email.trim().toLowerCase()
  const user = await dataSource.getRepository(UserEntity).findOne({
    where: {
      email: normalizedEmail,
      isActive: true,
    },
  })

  if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
    return {
      ok: false,
      message: 'Invalid email or password',
    }
  }

  await dataSource.getRepository(UserEntity).update(user.id, {
    lastLoginAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  return {
    ok: true,
    message: 'Signed in',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  }
}

export async function closeDatabase(): Promise<void> {
  if (!dataSource) return

  if (dataSource.isInitialized) {
    await (dataSource.manager as SqljsEntityManager).saveDatabase(status.path)
    await dataSource.destroy()
  }

  dataSource = null
}
