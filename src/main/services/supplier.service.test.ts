import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { closeDatabase, initializeDatabase } from '../db/client'
import { createSupplier, listSuppliers, updateSupplier } from './supplier.service'

const databaseDirectory = path.join(os.tmpdir(), `simplepos-suppliers-${process.pid}`)

describe('supplier service', () => {
  beforeAll(async () => {
    fs.rmSync(databaseDirectory, { recursive: true, force: true })
    await initializeDatabase(databaseDirectory)
  })

  afterAll(async () => {
    await closeDatabase()
    fs.rmSync(databaseDirectory, { recursive: true, force: true })
  })

  it('creates and normalizes a supplier', async () => {
    const result = await createSupplier({
      name: '  Bali   Motor Supply  ',
      contactName: 'Wayan',
    })

    expect(result).toMatchObject({
      ok: true,
      supplier: {
        name: 'Bali Motor Supply',
        contactName: 'Wayan',
        isActive: true,
      },
    })
  })

  it('rejects names that only differ by case or spacing', async () => {
    await expect(createSupplier({ name: 'bali motor   supply' })).resolves.toEqual({
      ok: false,
      message: 'A supplier with this name already exists',
    })
  })

  it('updates and deactivates without deleting history', async () => {
    const [supplier] = await listSuppliers()
    const result = await updateSupplier({
      ...supplier,
      phone: '08123456789',
      isActive: false,
    })

    expect(result).toMatchObject({
      ok: true,
      supplier: { phone: '08123456789', isActive: false },
    })
    await expect(listSuppliers()).resolves.toEqual([])
    await expect(listSuppliers({ includeInactive: true })).resolves.toHaveLength(1)
  })

  it('persists suppliers after reconnecting to the database', async () => {
    await closeDatabase()
    await initializeDatabase(databaseDirectory)

    await expect(listSuppliers({ includeInactive: true })).resolves.toMatchObject([
      { name: 'Bali Motor Supply', isActive: false },
    ])
  })
})
