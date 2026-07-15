import type { PurchasePaymentStatus } from '@/shared/types/purchase'
import type { StockMovementType } from '@/shared/types/stock-movement'

export type ProductFormState = {
  name: string
  description: string
  categoryId: string
  unitPrice: string
  unitType: 'piece' | 'litre' | 'set' | 'box'
  stockQty: string
  minStock: string
}

export type MovementTypeFilter = StockMovementType | 'all'

export type MovementFilters = {
  productId: string
  movementType: MovementTypeFilter
  dateFrom: string
  dateTo: string
  search: string
}

export type InventoryView = 'products' | 'purchases' | 'movements' | 'pending' | 'unpaid'

export type WorkspaceScreen = 'list' | 'recordPurchase' | 'purchaseDetail' | 'invoiceForm' | 'productForm'

export type CategoryFilter = 'all' | `${number}`

export type PurchaseForm = {
  supplierId: string
  supplierInvoiceNumber: string
  invoiceDate: string
  paymentStatus: PurchasePaymentStatus
  dueDate: string
  notes: string
  productId: string
  quantity: string
  unitCost: string
}

export type Feedback = {
  message: string
  tone: 'success' | 'error'
}

export type InvoiceForm = {
  supplierInvoiceNumber: string
  invoiceDate: string
  paymentStatus: PurchasePaymentStatus
  dueDate: string
  paidAt: string
  notes: string
}

export type AdjustmentForm = {
  quantity: string
  reason: string
}
