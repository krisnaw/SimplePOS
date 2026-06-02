export type UserRole = 'admin' | 'cashier'

export type AuthenticatedUser = {
  id: number
  email: string
  name: string
  role: UserRole
}

export type UserSummary = {
  id: number
  email: string
  name: string
  role: UserRole
  isActive: boolean
  createdAt: string
  updatedAt: string
  lastLoginAt: string | null
}

export type AppSection =
  | 'dashboard'
  | 'sales'
  | 'inventory'
  | 'work-orders'
  | 'customers'
  | 'invoices'
  | 'reports'
  | 'users'
  | 'settings'

export type SectionDetail = {
  eyebrow: string
  title: string
  description: string
}
