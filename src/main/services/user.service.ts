import type { User } from '../db/schema'
import { getUserRepository } from '../repositories/user.repository'
import { createPasswordCredentials } from './password.service'

export type UserSummary = {
  id: number
  email: string
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
    email: user.email,
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

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export async function listUsers(): Promise<UserSummary[]> {
  const repository = getUserRepository()

  if (!repository) return []

  const users = await repository.find({
    order: {
      name: 'ASC',
    },
  })

  return users.map(toUserSummary)
}

export async function createUser(input: {
  email?: unknown
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
    typeof input.email !== 'string' ||
    typeof input.name !== 'string' ||
    typeof input.password !== 'string' ||
    !isValidRole(input.role)
  ) {
    return {
      ok: false,
      message: 'Invalid user request',
    }
  }

  const email = normalizeEmail(input.email)
  const name = input.name.trim()
  const password = input.password.trim()

  if (!email || !name || password.length < 6) {
    return {
      ok: false,
      message: 'Name, email, and a password with at least 6 characters are required',
    }
  }

  const existingUser = await repository.findOne({
    where: {
      email,
    },
  })

  if (existingUser) {
    return {
      ok: false,
      message: 'A user with this email already exists',
    }
  }

  const now = new Date().toISOString()
  const user = repository.create({
    email,
    name,
    role: input.role,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
    ...createPasswordCredentials(password),
  })

  const savedUser = await repository.save(user)

  return {
    ok: true,
    message: 'User created',
    user: toUserSummary(savedUser),
  }
}

export async function updateUser(input: {
  id?: unknown
  email?: unknown
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
    typeof input.email !== 'string' ||
    typeof input.name !== 'string' ||
    !isValidRole(input.role) ||
    typeof input.isActive !== 'boolean'
  ) {
    return {
      ok: false,
      message: 'Invalid user request',
    }
  }

  const email = normalizeEmail(input.email)
  const name = input.name.trim()
  const password = typeof input.password === 'string' ? input.password.trim() : ''

  if (!email || !name) {
    return {
      ok: false,
      message: 'Name and email are required',
    }
  }

  if (password && password.length < 6) {
    return {
      ok: false,
      message: 'Password must be at least 6 characters',
    }
  }

  const user = await repository.findOne({
    where: {
      id: input.id,
    },
  })

  if (!user) {
    return {
      ok: false,
      message: 'User not found',
    }
  }

  const existingUser = await repository.findOne({
    where: {
      email,
    },
  })

  if (existingUser && existingUser.id !== user.id) {
    return {
      ok: false,
      message: 'A user with this email already exists',
    }
  }

  const passwordFields = password ? createPasswordCredentials(password) : {}
  const updatedUser = await repository.save({
    ...user,
    email,
    name,
    role: input.role,
    isActive: input.isActive,
    updatedAt: new Date().toISOString(),
    ...passwordFields,
  })

  return {
    ok: true,
    message: 'User updated',
    user: toUserSummary(updatedUser),
  }
}
