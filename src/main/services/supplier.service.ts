import { asc, eq } from 'drizzle-orm'
import { flushDatabase } from '../db/client'
import { suppliers } from '../db/schema/index'
import type { Supplier } from '../db/schema/index'
import { getSupplierRepository } from '../repositories/supplier.repository'

export type SupplierSummary = {
  id: number
  name: string
  contactName: string | null
  phone: string | null
  address: string | null
  notes: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type SupplierMutationResult = {
  ok: boolean
  message: string
  supplier?: SupplierSummary
}

function toSupplierSummary(supplier: Supplier): SupplierSummary {
  return {
    id: supplier.id,
    name: supplier.name,
    contactName: supplier.contactName,
    phone: supplier.phone,
    address: supplier.address,
    notes: supplier.notes,
    isActive: supplier.isActive,
    createdAt: supplier.createdAt,
    updatedAt: supplier.updatedAt,
  }
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US')
}

export async function listSuppliers(input: Record<string, unknown> = {}): Promise<SupplierSummary[]> {
  const repository = getSupplierRepository()
  if (!repository) return []

  const includeInactive = input.includeInactive === true
  const query = repository.select().from(suppliers)
  const rows = includeInactive
    ? await query.orderBy(asc(suppliers.name))
    : await query.where(eq(suppliers.isActive, true)).orderBy(asc(suppliers.name))

  return rows.map(toSupplierSummary)
}

export async function createSupplier(input: Record<string, unknown>): Promise<SupplierMutationResult> {
  const repository = getSupplierRepository()
  if (!repository) return { ok: false, message: 'Database unavailable' }
  if (typeof input.name !== 'string') return { ok: false, message: 'Supplier name is required' }

  const name = input.name.trim().replace(/\s+/g, ' ')
  const normalizedName = normalizeName(name)
  if (!normalizedName) return { ok: false, message: 'Supplier name is required' }

  const existing = await repository.select({ id: suppliers.id })
    .from(suppliers)
    .where(eq(suppliers.normalizedName, normalizedName))
    .limit(1)
  if (existing.length > 0) return { ok: false, message: 'A supplier with this name already exists' }

  const now = new Date().toISOString()
  const [saved] = await repository.insert(suppliers).values({
    name,
    normalizedName,
    contactName: optionalString(input.contactName),
    phone: optionalString(input.phone),
    address: optionalString(input.address),
    notes: optionalString(input.notes),
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }).returning()

  await flushDatabase()
  return { ok: true, message: 'Supplier created', supplier: toSupplierSummary(saved) }
}

export async function updateSupplier(input: Record<string, unknown>): Promise<SupplierMutationResult> {
  const repository = getSupplierRepository()
  if (!repository) return { ok: false, message: 'Database unavailable' }
  if (typeof input.id !== 'number' || typeof input.name !== 'string' || typeof input.isActive !== 'boolean') {
    return { ok: false, message: 'Invalid supplier request' }
  }

  const [existing] = await repository.select().from(suppliers).where(eq(suppliers.id, input.id)).limit(1)
  if (!existing) return { ok: false, message: 'Supplier not found' }

  const name = input.name.trim().replace(/\s+/g, ' ')
  const normalizedName = normalizeName(name)
  if (!normalizedName) return { ok: false, message: 'Supplier name is required' }

  const [nameConflict] = await repository.select({ id: suppliers.id })
    .from(suppliers)
    .where(eq(suppliers.normalizedName, normalizedName))
    .limit(1)
  if (nameConflict && nameConflict.id !== input.id) {
    return { ok: false, message: 'A supplier with this name already exists' }
  }

  const [updated] = await repository.update(suppliers).set({
    name,
    normalizedName,
    contactName: optionalString(input.contactName),
    phone: optionalString(input.phone),
    address: optionalString(input.address),
    notes: optionalString(input.notes),
    isActive: input.isActive,
    updatedAt: new Date().toISOString(),
  }).where(eq(suppliers.id, input.id)).returning()

  await flushDatabase()
  return {
    ok: true,
    message: updated.isActive ? 'Supplier updated' : 'Supplier deactivated',
    supplier: toSupplierSummary(updated),
  }
}
