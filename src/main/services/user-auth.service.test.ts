import fs from 'fs'
import os from 'os'
import path from 'path'
import initSqlJs from 'sql.js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { closeDatabase, initializeDatabase } from '../db/client'
import { authenticateUser } from './auth.service'
import { createUser, listUsers, updateUser } from './user.service'

const databaseDirectory = path.join(os.tmpdir(), `simplepos-user-auth-${process.pid}`)
const databasePath = path.join(databaseDirectory, 'simplepos.sqlite')

describe('username authentication and user management', () => {
  beforeAll(async () => {
    fs.rmSync(databaseDirectory, { recursive: true, force: true })
    const status = await initializeDatabase(databaseDirectory)
    expect(status.state).toBe('connected_created')
  })

  afterAll(async () => {
    await closeDatabase()
    fs.rmSync(databaseDirectory, { recursive: true, force: true })
  })

  it('seeds exactly one administrator and remains idempotent', async () => {
    expect(await listUsers()).toMatchObject([
      {
        username: 'admin',
        name: 'Administrator',
        role: 'admin',
        isActive: true,
      },
    ])

    await closeDatabase()
    const status = await initializeDatabase(databaseDirectory)
    expect(status.state).toBe('connected_existing')
    expect(await listUsers()).toHaveLength(1)

    const SQL = await initSqlJs()
    const database = new SQL.Database(fs.readFileSync(databasePath))
    expect(database.exec('PRAGMA foreign_key_check')).toHaveLength(0)
    database.close()
  })

  it('authenticates by normalized username without exposing email', async () => {
    const result = await authenticateUser(' ADMIN ', 'admin123')

    expect(result).toMatchObject({
      ok: true,
      user: {
        username: 'admin',
        name: 'Administrator',
        role: 'admin',
      },
    })
    expect(result.user).not.toHaveProperty('email')
    expect((await listUsers())[0].lastLoginAt).not.toBeNull()
  })

  it('rejects email, invalid passwords, and inactive users', async () => {
    expect(await authenticateUser('admin@simplepos.com', 'admin123')).toMatchObject({
      ok: false,
      message: 'Invalid username or password',
    })
    expect(await authenticateUser('admin', 'wrong-password')).toMatchObject({
      ok: false,
      message: 'Invalid username or password',
    })

    const [admin] = await listUsers()
    await updateUser({
      id: admin.id,
      username: admin.username,
      name: admin.name,
      role: admin.role,
      isActive: false,
    })
    expect(await authenticateUser('admin', 'admin123')).toMatchObject({
      ok: false,
      message: 'Invalid username or password',
    })
    await updateUser({
      id: admin.id,
      username: admin.username,
      name: admin.name,
      role: admin.role,
      isActive: true,
    })
  })

  it('creates, normalizes, updates, and uniquely constrains usernames', async () => {
    const created = await createUser({
      username: ' Kasir1 ',
      name: 'Cashier One',
      role: 'cashier',
      password: 'secret1',
    })
    expect(created).toMatchObject({
      ok: true,
      user: { username: 'kasir1', name: 'Cashier One' },
    })
    expect(created.user).not.toHaveProperty('email')

    expect(await createUser({
      username: 'KASIR1',
      name: 'Duplicate',
      role: 'cashier',
      password: 'secret1',
    })).toMatchObject({ ok: false, message: 'Username is already in use' })

    expect(await createUser({
      username: 'kasir_2',
      name: 'Invalid',
      role: 'cashier',
      password: 'secret1',
    })).toMatchObject({ ok: false })

    const updated = await updateUser({
      id: created.user!.id,
      username: 'kasir2',
      name: 'Cashier Two',
      role: 'cashier',
      isActive: true,
    })
    expect(updated).toMatchObject({
      ok: true,
      user: { username: 'kasir2', name: 'Cashier Two' },
    })

    expect(await updateUser({
      id: created.user!.id,
      username: 'admin',
      name: 'Cashier Two',
      role: 'cashier',
      isActive: true,
    })).toMatchObject({ ok: false, message: 'Username is already in use' })
  })
})
