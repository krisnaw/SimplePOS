import { getDatabaseClient } from '../db/client'

export function getPurchaseRepository() {
  return getDatabaseClient()
}
