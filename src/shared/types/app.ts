import type { UserRole, AuthenticatedUser, UserSummary } from './user'

export type { UserRole, AuthenticatedUser, UserSummary }

export type AppSection =
  | 'dashboard'
  | 'sales'
  | 'inventory'
  | 'vehicles'
  | 'services'
  | 'work-orders'
  | 'customers'
  | 'invoices'
  | 'reports'
  | 'users'
  | 'user-guide'
  | 'settings'

export type SectionDetail = {
  eyebrow: string
  title: string
  description: string
}
