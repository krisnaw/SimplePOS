import { getDatabaseClient } from '../db/client'

export function getServiceRepository() {
  return getDatabaseClient()
}
