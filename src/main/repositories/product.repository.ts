import { getDatabaseClient } from '../db/client'

export function getProductRepository() {
  return getDatabaseClient()
}
