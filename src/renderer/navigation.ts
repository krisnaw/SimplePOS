import {
  Building2,
  Car,
  LayoutDashboard,
  Package,
  ReceiptText,
  ScrollText,
  ShoppingCart,
} from 'lucide-react'
import type { AppSection, SectionDetail } from '@/shared/types/app'

export const navigationItems: Array<{
  id: AppSection
  translationKey: string
  label: string
  description: string
  icon: typeof LayoutDashboard
}> = [
  {
    id: 'dashboard',
    translationKey: 'dashboard',
    label: 'Dashboard',
    description: 'Overview',
    icon: LayoutDashboard,
  },
  {
    id: 'sales',
    translationKey: 'sales',
    label: 'Sales',
    description: 'Checkout and payments',
    icon: ShoppingCart,
  },
  {
    id: 'invoices',
    translationKey: 'invoices',
    label: 'Invoices',
    description: 'Completed sales and receipts',
    icon: ReceiptText,
  },
  {
    id: 'reports',
    translationKey: 'reports',
    label: 'Reports',
    description: 'Sales and operations',
    icon: ScrollText,
  },
  {
    id: 'inventory',
    translationKey: 'inventory',
    label: 'Inventory',
    description: 'Products, parts, and stock',
    icon: Package,
  },
  {
    id: 'suppliers',
    translationKey: 'suppliers',
    label: 'Suppliers',
    description: 'Supplier records',
    icon: Building2,
  },
  {
    id: 'vehicles',
    translationKey: 'vehicles',
    label: 'Vehicles',
    description: 'Vehicle records',
    icon: Car,
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
  suppliers: {
    eyebrow: 'Procurement',
    title: 'Suppliers',
    description: 'Manage supplier records and purchasing contact details.',
  },
  vehicles: {
    eyebrow: 'Vehicle records',
    title: 'Vehicles',
    description: 'Manage vehicle details and customer contact information.',
  },
  services: {
    eyebrow: 'Service catalog',
    title: 'Services',
    description: 'Manage labor, inspections, and service charges used in sales and work orders.',
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
  'user-guide': {
    eyebrow: 'Help',
    title: 'User Guide',
    description: 'Learn how to use the POS, inventory, and daily shop workflows.',
  },
  settings: {
    eyebrow: 'Configuration',
    title: 'Settings',
    description: 'Manage store profile, users, and receipt defaults.',
  },
}
