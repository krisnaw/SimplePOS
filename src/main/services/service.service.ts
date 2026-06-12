import { asc, eq } from 'drizzle-orm'
import { flushDatabase } from '../db/client'
import { services } from '../db/schema/index'
import type { Service } from '../db/schema/index'
import { getServiceRepository } from '../repositories/service.repository'

export type ServiceSummary = {
  id: number
  code: string
  name: string
  description: string | null
  category: string | null
  price: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type ServiceMutationResult = {
  ok: boolean
  message: string
  service?: ServiceSummary
}

function toServiceSummary(service: Service): ServiceSummary {
  return {
    id: service.id,
    code: service.code,
    name: service.name,
    description: service.description,
    category: service.category,
    price: service.price,
    isActive: service.isActive,
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
  }
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export async function listServices(): Promise<ServiceSummary[]> {
  const repository = getServiceRepository()

  if (!repository) return []

  const list = await repository
    .select()
    .from(services)
    .where(eq(services.isActive, true))
    .orderBy(asc(services.name))

  return list.map(toServiceSummary)
}

export async function createService(input: Record<string, unknown>): Promise<ServiceMutationResult> {
  const repository = getServiceRepository()

  if (!repository) return { ok: false, message: 'Database unavailable' }

  if (
    typeof input.code !== 'string' ||
    typeof input.name !== 'string' ||
    typeof input.price !== 'number'
  ) {
    return { ok: false, message: 'Code, name, and price are required' }
  }

  const code = input.code.trim().toUpperCase()
  const name = input.name.trim()

  if (!code || !name || input.price < 0) {
    return { ok: false, message: 'Enter valid service details and a non-negative price' }
  }

  const existing = await repository.select().from(services).where(eq(services.code, code)).limit(1)

  if (existing.length > 0) {
    return { ok: false, message: 'A service with this code already exists' }
  }

  const now = new Date().toISOString()
  const [saved] = await repository.insert(services).values({
    code,
    name,
    description: optionalString(input.description),
    category: optionalString(input.category),
    price: input.price,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }).returning()

  await flushDatabase()

  return { ok: true, message: 'Service created', service: toServiceSummary(saved) }
}

export async function updateService(input: Record<string, unknown>): Promise<ServiceMutationResult> {
  const repository = getServiceRepository()

  if (!repository) return { ok: false, message: 'Database unavailable' }

  if (
    typeof input.id !== 'number' ||
    typeof input.code !== 'string' ||
    typeof input.name !== 'string' ||
    typeof input.price !== 'number' ||
    typeof input.isActive !== 'boolean'
  ) {
    return { ok: false, message: 'Invalid service request' }
  }

  const [existing] = await repository.select().from(services).where(eq(services.id, input.id)).limit(1)

  if (!existing) return { ok: false, message: 'Service not found' }

  const code = input.code.trim().toUpperCase()
  const name = input.name.trim()

  if (!code || !name || input.price < 0) {
    return { ok: false, message: 'Enter valid service details and a non-negative price' }
  }

  const codeConflict = await repository.select().from(services).where(eq(services.code, code)).limit(1)

  if (codeConflict[0] && codeConflict[0].id !== input.id) {
    return { ok: false, message: 'A service with this code already exists' }
  }

  const [updated] = await repository.update(services).set({
    code,
    name,
    description: optionalString(input.description),
    category: optionalString(input.category),
    price: input.price,
    isActive: input.isActive,
    updatedAt: new Date().toISOString(),
  }).where(eq(services.id, input.id)).returning()

  await flushDatabase()

  return { ok: true, message: 'Service updated', service: toServiceSummary(updated) }
}
