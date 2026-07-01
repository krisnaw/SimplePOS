import type { User } from '../db/schema/index'
import { users } from '../db/schema/index'
import { flushDatabase } from '../db/client'
import { getUserRepository } from '../repositories/user.repository'
import { verifyPassword } from './password.service'
import { isValidUsername, normalizeUsername } from './username'
import { and, eq } from 'drizzle-orm'

export type LoginResult = {
  ok: boolean
  message: string
  user?: {
    id: number
    username: string
    name: string
    role: User['role']
  }
}

export async function authenticateUser(username: string, password: string): Promise<LoginResult> {
  const repository = getUserRepository()

  if (!repository) {
    return {
      ok: false,
      message: 'Database unavailable',
    }
  }

  const normalizedUsername = normalizeUsername(username)

  if (!isValidUsername(normalizedUsername)) {
    return {
      ok: false,
      message: 'Invalid username or password',
    }
  }

  const [user] = await repository
    .select()
    .from(users)
    .where(and(eq(users.username, normalizedUsername), eq(users.isActive, true)))
    .limit(1)

  if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
    return {
      ok: false,
      message: 'Invalid username or password',
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
      username: user.username,
      name: user.name,
      role: user.role,
    },
  }
}
