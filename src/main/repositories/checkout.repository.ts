import { getDatabaseClient } from '../db/client'

export function getCheckoutRepository() {
  return getDatabaseClient()
}
