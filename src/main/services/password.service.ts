import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import type { User } from '../db/schema'

function hashPassword(password: string, salt: string): Buffer {
  return scryptSync(password, salt, 64)
}

export function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const actualHash = hashPassword(password, salt)
  const expectedHashBuffer = Buffer.from(expectedHash, 'hex')

  if (actualHash.length !== expectedHashBuffer.length) return false

  return timingSafeEqual(actualHash, expectedHashBuffer)
}

export function createPasswordCredentials(password: string): Pick<User, 'passwordHash' | 'passwordSalt'> {
  const passwordSalt = randomBytes(16).toString('hex')

  return {
    passwordHash: hashPassword(password, passwordSalt).toString('hex'),
    passwordSalt,
  }
}
