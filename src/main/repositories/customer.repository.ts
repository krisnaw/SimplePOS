import { getDatabaseClient } from '../db/client'

export function getCustomerRepository() {
  return getDatabaseClient()
}
