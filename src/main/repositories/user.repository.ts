import { getDatabaseClient } from '../db/client'

export function getUserRepository() {
  return getDatabaseClient()
}
