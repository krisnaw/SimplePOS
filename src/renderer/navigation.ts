import {
  Boxes,
  ClipboardList,
  LayoutDashboard,
  Receipt,
  ScrollText,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Users,
} from 'lucide-react'
import type { AppSection, SectionDetail } from '@/shared/types/app'

export const navigationItems: Array<{
  id: AppSection
  label: string
  description: string
  icon: typeof LayoutDashboard
}> = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Overview',
    icon: LayoutDashboard,
  },
  {
    id: 'sales',
    label: 'Sales',
    description: 'Checkout and payments',
    icon: ShoppingCart,
  },
  {
    id: 'inventory',
    label: 'Inventory',
    description: 'Parts and stock',
    icon: Boxes,
  },
  {
    id: 'work-orders',
    label: 'Work Orders',
    description: 'Repairs in progress',
    icon: ClipboardList,
  },
  {
    id: 'customers',
    label: 'Customers',
    description: 'Vehicle owners',
    icon: Users,
  },
  {
    id: 'invoices',
    label: 'Invoices',
    description: 'Billing history',
    icon: Receipt,
  },
  {
    id: 'reports',
    label: 'Reports',
    description: 'Sales and operations',
    icon: ScrollText,
  },
  {
    id: 'users',
    label: 'Users',
    description: 'Admin and cashier access',
    icon: ShieldCheck,
  },
  {
    id: 'settings',
    label: 'Settings',
    description: 'Shop preferences',
    icon: Settings,
  },
]

export const sectionDetails: Record<AppSection, SectionDetail> = {
  dashboard: {
    eyebrow: 'Today',
    title: 'Dashboard',
    description: 'A quick read on shop activity and operational status.',
  },
  sales: {
    eyebrow: 'Point of sale',
    title: 'Sales',
    description: 'Create repair sales, accept payments, and review current transactions.',
  },
  inventory: {
    eyebrow: 'Stock control',
    title: 'Inventory',
    description: 'Track spare parts, supplies, stock levels, and reorder needs.',
  },
  'work-orders': {
    eyebrow: 'Repair queue',
    title: 'Work Orders',
    description: 'Manage incoming vehicles, service tasks, labor, and parts usage.',
  },
  customers: {
    eyebrow: 'Customer records',
    title: 'Customers',
    description: 'Find customers, vehicles, service history, and contact details.',
  },
  invoices: {
    eyebrow: 'Billing',
    title: 'Invoices',
    description: 'Review unpaid, paid, and draft invoices for completed service.',
  },
  reports: {
    eyebrow: 'Analytics',
    title: 'Reports',
    description: 'Review shop performance across sales, inventory, work orders, and invoices.',
  },
  users: {
    eyebrow: 'Access control',
    title: 'Users',
    description: 'Manage admin and cashier accounts for the POS.',
  },
  settings: {
    eyebrow: 'Configuration',
    title: 'Settings',
    description: 'Manage store profile, tax settings, users, and receipt defaults.',
  },
}
