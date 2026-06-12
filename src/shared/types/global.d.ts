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

type ProductCategorySummary = {
  id: number
  name: string
  description: string | null
}

type UnitType = 'piece' | 'litre' | 'set' | 'box'

type ProductSummary = {
  id: number
  categoryId: number | null
  sku: string
  barcode: string | null
  name: string
  description: string | null
  unitPrice: number
  unitType: UnitType
  stockQty: number
  minStock: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

type ProductMutationResult = {
  ok: boolean
  message: string
  product?: ProductSummary
}

type ServiceSummary = {
  id: number
  code: string
  name: string
  description: string | null
  category: string | null
  price: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

type ServiceMutationResult = {
  ok: boolean
  message: string
  service?: ServiceSummary
}

type CustomerSummary = {
  id: number
  name: string
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

type VehicleSummary = {
  id: number
  customerId: number
  plateNumber: string
  brand: string
  model: string
  year: number | null
  vin: string | null
  color: string | null
  notes: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

type CustomerMutationResult = {
  ok: boolean
  message: string
  customer?: CustomerSummary
}

type VehicleMutationResult = {
  ok: boolean
  message: string
  vehicle?: VehicleSummary
}

type PaymentMethod = 'cash' | 'transfer' | 'card'

type CheckoutItemInput = {
  itemType: 'product' | 'service'
  id: number
  quantity: number
}

type CheckoutInput = {
  customerId?: number | null
  createdById?: number | null
  paymentMethod?: PaymentMethod
  amountPaid?: number
  discount?: number
  tax?: number
  notes?: string | null
  items: CheckoutItemInput[]
}

type CheckoutLineItemSummary = {
  id: number
  itemType: 'product' | 'service'
  productId: number | null
  serviceId: number | null
  name: string
  sku: string | null
  quantity: number
  unitPrice: number
  lineTotal: number
}

type CheckoutSummary = {
  saleId: number
  invoiceId: number
  invoiceNumber: string
  paymentId: number
  subtotal: number
  discount: number
  tax: number
  total: number
  amountPaid: number
  paymentMethod: PaymentMethod
  items: CheckoutLineItemSummary[]
}

type CheckoutResult = {
  ok: boolean
  message: string
  checkout?: CheckoutSummary
}

type InvoiceStatus = 'paid' | 'void'
type PaymentStatus = 'paid' | 'refunded' | 'void'

type InvoiceListInput = {
  search?: string
  status?: InvoiceStatus | 'all'
  dateFrom?: string
  dateTo?: string
}

type InvoiceSummary = {
  id: number
  saleId: number
  invoiceNumber: string
  status: InvoiceStatus
  customerName: string | null
  paymentMethod: PaymentMethod | null
  paymentStatus: PaymentStatus | null
  itemCount: number
  subtotal: number
  discount: number
  tax: number
  total: number
  issuedAt: string
}

type InvoiceLineItemSummary = {
  id: number
  itemType: 'product' | 'service'
  productId: number | null
  serviceId: number | null
  name: string
  sku: string | null
  quantity: number
  unitPrice: number
  lineTotal: number
}

type InvoicePaymentSummary = {
  id: number
  method: PaymentMethod
  status: PaymentStatus
  amount: number
  paidAt: string
}

type InvoiceDetail = InvoiceSummary & {
  customerPhone: string | null
  customerEmail: string | null
  customerAddress: string | null
  notes: string | null
  items: InvoiceLineItemSummary[]
  payment: InvoicePaymentSummary | null
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
      categories: {
        list: () => Promise<ProductCategorySummary[]>
      }
      products: {
        list: () => Promise<ProductSummary[]>
        create: (input: Record<string, unknown>) => Promise<ProductMutationResult>
        update: (input: Record<string, unknown>) => Promise<ProductMutationResult>
      }
      services: {
        list: () => Promise<ServiceSummary[]>
        create: (input: Record<string, unknown>) => Promise<ServiceMutationResult>
        update: (input: Record<string, unknown>) => Promise<ServiceMutationResult>
      }
      checkout: {
        create: (input: CheckoutInput) => Promise<CheckoutResult>
      }
      invoices: {
        list: (input?: InvoiceListInput) => Promise<InvoiceSummary[]>
        get: (input: { id: number }) => Promise<InvoiceDetail | null>
      }
      customers: {
        list: () => Promise<CustomerSummary[]>
        create: (input: Record<string, unknown>) => Promise<CustomerMutationResult>
        update: (input: Record<string, unknown>) => Promise<CustomerMutationResult>
        delete: (input: { id: number }) => Promise<CustomerMutationResult>
      }
      vehicles: {
        list: () => Promise<VehicleSummary[]>
        create: (input: Record<string, unknown>) => Promise<VehicleMutationResult>
        update: (input: Record<string, unknown>) => Promise<VehicleMutationResult>
        delete: (input: { id: number }) => Promise<VehicleMutationResult>
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
