import type { User } from '../db/schema'
import { getUserRepository } from '../repositories/user.repository'
import { verifyPassword } from './password.service'
import { normalizeEmail } from './user.service'

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
  const user = await repository.findOne({
    where: {
      email: normalizedEmail,
      isActive: true,
    },
  })

  if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
    return {
      ok: false,
      message: 'Invalid email or password',
    }
  }

  await repository.update(user.id, {
    lastLoginAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

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
