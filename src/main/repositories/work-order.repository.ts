import { getDatabaseClient } from '../db/client'

export function getWorkOrderRepository() {
  return getDatabaseClient()
}
