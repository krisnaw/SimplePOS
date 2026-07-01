import type { User } from '../db/schema/index'
import { users } from '../db/schema/index'
import { flushDatabase } from '../db/client'
import { getUserRepository } from '../repositories/user.repository'
import { createPasswordCredentials } from './password.service'
import { isValidUsername, normalizeUsername } from './username'
import { asc, eq } from 'drizzle-orm'

export type UserSummary = {
  id: number
  username: string
  name: string
  role: User['role']
  isActive: boolean
  createdAt: string
  updatedAt: string
  lastLoginAt: string | null
}

export type UserMutationResult = {
  ok: boolean
  message: string
  user?: UserSummary
}

export function toUserSummary(user: User): UserSummary {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt,
  }
}

export function isValidRole(role: unknown): role is User['role'] {
  return role === 'admin' || role === 'cashier'
}

export async function listUsers(): Promise<UserSummary[]> {
  const repository = getUserRepository()

  if (!repository) return []

  const userList = await repository.select().from(users).orderBy(asc(users.name))

  return userList.map(toUserSummary)
}

export async function createUser(input: {
  username?: unknown
  name?: unknown
  role?: unknown
  password?: unknown
}): Promise<UserMutationResult> {
  const repository = getUserRepository()

  if (!repository) {
    return {
      ok: false,
      message: 'Database unavailable',
    }
  }

  if (
    typeof input.username !== 'string' ||
    typeof input.name !== 'string' ||
    typeof input.password !== 'string' ||
    !isValidRole(input.role)
  ) {
    return {
      ok: false,
      message: 'Invalid user request',
    }
  }

  const username = normalizeUsername(input.username)
  const name = input.name.trim()
  const password = input.password.trim()

  if (!isValidUsername(username) || !name || password.length < 6) {
    return {
      ok: false,
      message: 'Username must be 3–32 lowercase letters or numbers; name and a password with at least 6 characters are required',
    }
  }

  const existingUser = await repository.select().from(users).where(eq(users.username, username)).limit(1)

  if (existingUser.length > 0) {
    return {
      ok: false,
      message: 'Username is already in use',
    }
  }

  const now = new Date().toISOString()
  let savedUser: User
  try {
    [savedUser] = await repository.insert(users).values({
      username,
      name,
      role: input.role,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
      ...createPasswordCredentials(password),
    }).returning()
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed: users.username')) {
      return { ok: false, message: 'Username is already in use' }
    }
    throw error
  }
  await flushDatabase()

  return {
    ok: true,
    message: 'User created',
    user: toUserSummary(savedUser),
  }
}

export async function updateUser(input: {
  id?: unknown
  username?: unknown
  name?: unknown
  role?: unknown
  password?: unknown
  isActive?: unknown
}): Promise<UserMutationResult> {
  const repository = getUserRepository()

  if (!repository) {
    return {
      ok: false,
      message: 'Database unavailable',
    }
  }

  if (
    typeof input.id !== 'number' ||
    typeof input.username !== 'string' ||
    typeof input.name !== 'string' ||
    !isValidRole(input.role) ||
    typeof input.isActive !== 'boolean'
  ) {
    return {
      ok: false,
      message: 'Invalid user request',
    }
  }

  const username = normalizeUsername(input.username)
  const name = input.name.trim()
  const password = typeof input.password === 'string' ? input.password.trim() : ''

  if (!isValidUsername(username) || !name) {
    return {
      ok: false,
      message: 'Username must be 3–32 lowercase letters or numbers, and name is required',
    }
  }

  if (password && password.length < 6) {
    return {
      ok: false,
      message: 'Password must be at least 6 characters',
    }
  }

  const [user] = await repository.select().from(users).where(eq(users.id, input.id)).limit(1)

  if (!user) {
    return {
      ok: false,
      message: 'User not found',
    }
  }

  const existingUser = await repository
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1)

  if (existingUser[0] && existingUser[0].id !== user.id) {
    return {
      ok: false,
      message: 'Username is already in use',
    }
  }

  const passwordFields = password ? createPasswordCredentials(password) : {}
  let updatedUser: User
  try {
    [updatedUser] = await repository.update(users).set({
      username,
      name,
      role: input.role,
      isActive: input.isActive,
      updatedAt: new Date().toISOString(),
      ...passwordFields,
    }).where(eq(users.id, user.id)).returning()
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed: users.username')) {
      return { ok: false, message: 'Username is already in use' }
    }
    throw error
  }
  await flushDatabase()

  return {
    ok: true,
    message: 'User updated',
    user: toUserSummary(updatedUser),
  }
}
