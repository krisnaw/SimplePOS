export {}

import type { UpdateStatus } from './updates'

type DatabaseConnectionState = 'connected_existing' | 'connected_created' | 'error'

type DatabaseStatus = {
  state: DatabaseConnectionState
  path: string
  existsBeforeOpen: boolean
  message: string
  checkedAt: string
}

type LoginResult = {
  ok: boolean
  message: string
  user?: {
    id: number
    email: string
    name: string
    role: UserRole
  }
}

type UserRole = 'admin' | 'cashier'

type UserSummary = {
  id: number
  email: string
  name: string
  role: UserRole
  isActive: boolean
  createdAt: string
  updatedAt: string
  lastLoginAt: string | null
}

type UserMutationResult = {
  ok: boolean
  message: string
  user?: UserSummary
}

declare global {
  interface Window {
    simplepos?: {
      db: {
        getStatus: () => Promise<DatabaseStatus>
      }
      auth: {
        login: (credentials: { email: string; password: string }) => Promise<LoginResult>
      }
      users: {
        list: () => Promise<UserSummary[]>
        create: (input: { email: string; name: string; role: UserRole; password: string }) => Promise<UserMutationResult>
        update: (input: {
          id: number
          email: string
          name: string
          role: UserRole
          isActive: boolean
          password?: string
        }) => Promise<UserMutationResult>
      }
      updates: {
        getStatus: () => Promise<UpdateStatus>
        check: () => Promise<UpdateStatus>
        install: () => Promise<{ ok: boolean; message: string }>
        onStatus: (callback: (status: UpdateStatus) => void) => () => void
      }
    }
  }
}
