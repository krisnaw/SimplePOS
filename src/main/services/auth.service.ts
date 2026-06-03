import type { User } from '../db/schema'
import { users } from '../db/schema'
import { flushDatabase } from '../db/client'
import { getUserRepository } from '../repositories/user.repository'
import { verifyPassword } from './password.service'
import { normalizeEmail } from './user.service'
import { and, eq } from 'drizzle-orm'

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

export async function authenticateUser(email: string, password: string): Promise<LoginResult> {
  const repository = getUserRepository()

  if (!repository) {
    return {
      ok: false,
      message: 'Database unavailable',
    }
  }

  const normalizedEmail = normalizeEmail(email)
  const [user] = await repository
    .select()
    .from(users)
    .where(and(eq(users.email, normalizedEmail), eq(users.isActive, true)))
    .limit(1)

  if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
    return {
      ok: false,
      message: 'Invalid email or password',
    }
  }

  await repository.update(users).set({
    lastLoginAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }).where(eq(users.id, user.id))
  await flushDatabase()

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
