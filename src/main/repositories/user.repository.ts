import type { Repository } from 'typeorm'
import { getDataSource } from '../db/client'
import { User, UserEntity } from '../db/schema'

export function getUserRepository(): Repository<User> | null {
  return getDataSource()?.getRepository(UserEntity) ?? null
}
