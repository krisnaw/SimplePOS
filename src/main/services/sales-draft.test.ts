import fs from 'fs'
import path from 'path'
import os from 'os'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { closeDatabase, initializeDatabase } from '../db/client'
import { quickCreateVehicle } from './customer.service'
import { createCheckout } from './checkout.service'
import { listProducts } from './product.service'
import {
  createOrResumeSalesDraft,
  listSalesDrafts,
  saveSalesDraftItems,
} from './sales-draft.service'

const databaseDirectory = path.join(os.tmpdir(), `simplepos-sales-draft-${process.pid}`)

describe('persisted sales drafts', () => {
  beforeAll(async () => {
    fs.rmSync(databaseDirectory, { recursive: true, force: true })
    await initializeDatabase(databaseDirectory)
  })

  afterAll(async () => {
    await closeDatabase()
    fs.rmSync(databaseDirectory, { recursive: true, force: true })
  })

  it('creates, resumes, restores, and checks out the same sale', async () => {
    const vehicleResult = await quickCreateVehicle({
      plateNumber: 'DK 42 AB',
      model: 'Avanza',
      customerName: 'Test Customer',
    })
    const vehicle = vehicleResult.vehicle
    expect(vehicle).toBeDefined()

    const product = (await listProducts())[0]
    expect(product).toBeDefined()

    const draft = await createOrResumeSalesDraft({
      vehicleId: vehicle!.id,
      createdById: 1,
    })
    const resumed = await createOrResumeSalesDraft({
      vehicleId: vehicle!.id,
      createdById: 1,
    })
    expect(resumed?.id).toBe(draft?.id)
    expect(draft?.status).toBe('in_progress')

    await expect(saveSalesDraftItems({
      saleId: draft!.id,
      items: [{ itemType: 'product', id: product.id, quantity: 2 }],
    })).resolves.toEqual({ ok: true })

    const restored = await listSalesDrafts()
    expect(restored).toHaveLength(1)
    expect(restored[0].lineItems).toMatchObject([
      { type: 'product', id: product.id, quantity: 2 },
    ])

    const checkout = await createCheckout({
      saleId: draft!.id,
      vehicleId: vehicle!.id,
      createdById: 1,
      paymentMethod: 'cash',
      items: [{ itemType: 'product', id: product.id, quantity: 2 }],
    })

    expect(checkout.ok).toBe(true)
    expect(checkout.checkout).toMatchObject({
      saleId: draft!.id,
      vehicleId: vehicle!.id,
    })
    await expect(listSalesDrafts()).resolves.toEqual([])
  })
})
