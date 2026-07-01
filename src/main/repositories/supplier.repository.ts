import { getDatabaseClient } from '../db/client'

export function getSupplierRepository() {
  return getDatabaseClient()
}
