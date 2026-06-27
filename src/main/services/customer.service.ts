import { asc, eq } from 'drizzle-orm'
import { flushDatabase } from '../db/client'
import { customers, vehicles } from '../db/schema/index'
import type { Customer, Vehicle } from '../db/schema/index'
import { getCustomerRepository } from '../repositories/customer.repository'

export type CustomerSummary = {
  id: number
  name: string
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type VehicleSummary = {
  id: number
  customerId: number | null
  customerName: string | null
  customerPhone: string | null
  plateNumber: string
  brand: string | null
  model: string
  year: number | null
  vin: string | null
  color: string | null
  notes: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type CustomerMutationResult = {
  ok: boolean
  message: string
  customer?: CustomerSummary
}

export type VehicleMutationResult = {
  ok: boolean
  message: string
  vehicle?: VehicleSummary
}

function toCustomerSummary(customer: Customer): CustomerSummary {
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    address: customer.address,
    notes: customer.notes,
    isActive: customer.isActive,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  }
}

function toVehicleSummary(vehicle: Vehicle): VehicleSummary {
  return {
    id: vehicle.id,
    customerId: vehicle.customerId,
    customerName: vehicle.customerName,
    customerPhone: vehicle.customerPhone,
    plateNumber: vehicle.plateNumber,
    brand: vehicle.brand,
    model: vehicle.model,
    year: vehicle.year,
    vin: vehicle.vin,
    color: vehicle.color,
    notes: vehicle.notes,
    isActive: vehicle.isActive,
    createdAt: vehicle.createdAt,
    updatedAt: vehicle.updatedAt,
  }
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export async function listCustomers(): Promise<CustomerSummary[]> {
  const repository = getCustomerRepository()

  if (!repository) return []

  const list = await repository
    .select()
    .from(customers)
    .where(eq(customers.isActive, true))
    .orderBy(asc(customers.name))

  return list.map(toCustomerSummary)
}

export async function createCustomer(input: Record<string, unknown>): Promise<CustomerMutationResult> {
  const repository = getCustomerRepository()

  if (!repository) return { ok: false, message: 'Database unavailable' }

  if (typeof input.name !== 'string') {
    return { ok: false, message: 'Customer name is required' }
  }

  const name = input.name.trim()
  const phone = optionalString(input.phone)

  if (!name || !phone) {
    return { ok: false, message: 'Name and phone are required' }
  }

  const now = new Date().toISOString()
  const [saved] = await repository.insert(customers).values({
    name,
    phone,
    email: optionalString(input.email),
    address: optionalString(input.address),
    notes: optionalString(input.notes),
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }).returning()

  await flushDatabase()

  return { ok: true, message: 'Customer created', customer: toCustomerSummary(saved) }
}

export async function updateCustomer(input: Record<string, unknown>): Promise<CustomerMutationResult> {
  const repository = getCustomerRepository()

  if (!repository) return { ok: false, message: 'Database unavailable' }

  if (typeof input.id !== 'number' || typeof input.name !== 'string') {
    return { ok: false, message: 'Invalid customer request' }
  }

  const name = input.name.trim()
  const phone = optionalString(input.phone)

  if (!name || !phone) {
    return { ok: false, message: 'Name and phone are required' }
  }

  const [existing] = await repository.select().from(customers).where(eq(customers.id, input.id)).limit(1)

  if (!existing) return { ok: false, message: 'Customer not found' }

  const [updated] = await repository.update(customers).set({
    name,
    phone,
    email: optionalString(input.email),
    address: optionalString(input.address),
    notes: optionalString(input.notes),
    updatedAt: new Date().toISOString(),
  }).where(eq(customers.id, input.id)).returning()

  await flushDatabase()

  return { ok: true, message: 'Customer updated', customer: toCustomerSummary(updated) }
}

export async function deleteCustomer(input: Record<string, unknown>): Promise<CustomerMutationResult> {
  const repository = getCustomerRepository()

  if (!repository) return { ok: false, message: 'Database unavailable' }
  if (typeof input.id !== 'number') return { ok: false, message: 'Invalid customer request' }

  const [existing] = await repository.select().from(customers).where(eq(customers.id, input.id)).limit(1)

  if (!existing) return { ok: false, message: 'Customer not found' }

  const now = new Date().toISOString()
  const [updated] = await repository.update(customers).set({
    isActive: false,
    updatedAt: now,
  }).where(eq(customers.id, input.id)).returning()

  await repository.update(vehicles).set({
    isActive: false,
    updatedAt: now,
  }).where(eq(vehicles.customerId, input.id))

  await flushDatabase()

  return { ok: true, message: 'Customer deleted', customer: toCustomerSummary(updated) }
}

export async function listVehicles(): Promise<VehicleSummary[]> {
  const repository = getCustomerRepository()

  if (!repository) return []

  const list = await repository
    .select()
    .from(vehicles)
    .where(eq(vehicles.isActive, true))
    .orderBy(asc(vehicles.plateNumber))

  return list.map(toVehicleSummary)
}

export async function createVehicle(input: Record<string, unknown>): Promise<VehicleMutationResult> {
  const repository = getCustomerRepository()

  if (!repository) return { ok: false, message: 'Database unavailable' }

  if (
    typeof input.plateNumber !== 'string' ||
    typeof input.model !== 'string'
  ) {
    return { ok: false, message: 'Plate number and model are required' }
  }

  const plateNumber = input.plateNumber.replace(/\s+/g, '').toUpperCase()
  const brand = optionalString(input.brand)
  const model = input.model.trim()

  if (!plateNumber || !model) {
    return { ok: false, message: 'Plate number and model are required' }
  }

  const now = new Date().toISOString()
  const customerId = typeof input.customerId === 'number' ? input.customerId : null
  const [linkedCustomer] = customerId
    ? await repository.select().from(customers).where(eq(customers.id, customerId)).limit(1)
    : []
  const [saved] = await repository.insert(vehicles).values({
    customerId,
    customerName: optionalString(input.customerName) ?? linkedCustomer?.name ?? null,
    customerPhone: optionalString(input.customerPhone) ?? linkedCustomer?.phone ?? null,
    plateNumber,
    brand,
    model,
    year: typeof input.year === 'number' ? input.year : null,
    vin: optionalString(input.vin)?.toUpperCase() ?? null,
    color: optionalString(input.color),
    notes: optionalString(input.notes),
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }).returning()

  await flushDatabase()

  return { ok: true, message: 'Vehicle created', vehicle: toVehicleSummary(saved) }
}

export async function updateVehicle(input: Record<string, unknown>): Promise<VehicleMutationResult> {
  const repository = getCustomerRepository()

  if (!repository) return { ok: false, message: 'Database unavailable' }

  if (
    typeof input.id !== 'number' ||
    typeof input.plateNumber !== 'string' ||
    typeof input.model !== 'string'
  ) {
    return { ok: false, message: 'Invalid vehicle request' }
  }

  const plateNumber = input.plateNumber.replace(/\s+/g, '').toUpperCase()
  const brand = optionalString(input.brand)
  const model = input.model.trim()

  if (!plateNumber || !model) {
    return { ok: false, message: 'Plate number and model are required' }
  }

  const [existing] = await repository.select().from(vehicles).where(eq(vehicles.id, input.id)).limit(1)

  if (!existing) return { ok: false, message: 'Vehicle not found' }

  const customerId = typeof input.customerId === 'number' ? input.customerId : null
  const [linkedCustomer] = customerId
    ? await repository.select().from(customers).where(eq(customers.id, customerId)).limit(1)
    : []
  const [updated] = await repository.update(vehicles).set({
    customerId,
    customerName: optionalString(input.customerName) ?? linkedCustomer?.name ?? existing.customerName,
    customerPhone: optionalString(input.customerPhone) ?? linkedCustomer?.phone ?? existing.customerPhone,
    plateNumber,
    brand,
    model,
    year: typeof input.year === 'number' ? input.year : null,
    vin: optionalString(input.vin)?.toUpperCase() ?? null,
    color: optionalString(input.color),
    notes: optionalString(input.notes),
    updatedAt: new Date().toISOString(),
  }).where(eq(vehicles.id, input.id)).returning()

  await flushDatabase()

  return { ok: true, message: 'Vehicle updated', vehicle: toVehicleSummary(updated) }
}

export async function searchVehicles(input: Record<string, unknown>): Promise<VehicleSummary[]> {
  const query = typeof input.query === 'string' ? input.query.trim().toUpperCase() : ''
  const limit = typeof input.limit === 'number' && Number.isInteger(input.limit)
    ? Math.min(Math.max(input.limit, 1), 50)
    : 20
  const plateQuery = query.replace(/\s+/g, '')
  const terms = query.split(/\s+/).filter(Boolean)
  const vehiclesList = await listVehicles()

  return vehiclesList.filter((vehicle) => {
    if (!query) return true
    const searchText = [
      vehicle.plateNumber,
      vehicle.brand ?? '',
      vehicle.model,
      vehicle.customerName ?? '',
      vehicle.customerPhone ?? '',
      vehicle.notes ?? '',
    ].join(' ').toUpperCase()

    return vehicle.plateNumber.includes(plateQuery) || terms.every((term) => searchText.includes(term))
  }).slice(0, limit)
}

export async function quickCreateVehicle(input: Record<string, unknown>): Promise<VehicleMutationResult> {
  if (typeof input.plateNumber !== 'string' || typeof input.model !== 'string') {
    return { ok: false, message: 'Plate number and model are required' }
  }

  const plateNumber = input.plateNumber.replace(/\s+/g, '').toUpperCase()
  const existing = (await listVehicles()).find((vehicle) => vehicle.plateNumber === plateNumber)
  if (existing) return { ok: false, message: 'This plate number already exists', vehicle: existing }

  try {
    return await createVehicle({
      plateNumber,
      model: input.model,
      brand: input.brand,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      notes: input.notes,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.toLowerCase().includes('unique')) {
      return { ok: false, message: 'This plate number already exists' }
    }
    throw error
  }
}

export async function deleteVehicle(input: Record<string, unknown>): Promise<VehicleMutationResult> {
  const repository = getCustomerRepository()

  if (!repository) return { ok: false, message: 'Database unavailable' }
  if (typeof input.id !== 'number') return { ok: false, message: 'Invalid vehicle request' }

  const [existing] = await repository.select().from(vehicles).where(eq(vehicles.id, input.id)).limit(1)

  if (!existing) return { ok: false, message: 'Vehicle not found' }

  const [updated] = await repository.update(vehicles).set({
    isActive: false,
    updatedAt: new Date().toISOString(),
  }).where(eq(vehicles.id, input.id)).returning()

  await flushDatabase()

  return { ok: true, message: 'Vehicle deleted', vehicle: toVehicleSummary(updated) }
}
