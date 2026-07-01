export type PurchasePaymentStatus = 'paid' | 'unpaid'
export type PurchaseInvoiceStatus = 'pending' | 'received'

export type PurchaseItemInput = {
  productId: number
  quantity: number
  unitCost: number
}

export type PurchaseCreateInput = {
  supplierId: number
  supplierInvoiceNumber?: string | null
  invoiceDate?: string | null
  paymentStatus?: PurchasePaymentStatus
  dueDate?: string | null
  notes?: string | null
  createdById: number
  items: PurchaseItemInput[]
}

export type PurchaseInvoiceUpdateInput = {
  id: number
  supplierInvoiceNumber?: string | null
  invoiceDate?: string | null
  paymentStatus?: PurchasePaymentStatus
  dueDate?: string | null
  paidAt?: string | null
  notes?: string | null
}

export type PurchaseItemSummary = {
  id: number
  productId: number
  sku: string
  productName: string
  quantity: number
  unitCost: number
  lineTotal: number
}

export type PurchaseSummary = {
  id: number
  purchaseNumber: string
  supplierId: number
  supplierName: string
  supplierInvoiceNumber: string | null
  invoiceDate: string | null
  paymentStatus: PurchasePaymentStatus
  invoiceStatus: PurchaseInvoiceStatus
  dueDate: string | null
  paidAt: string | null
  total: number
  itemCount: number
  createdById: number
  createdAt: string
}

export type PurchaseDetail = PurchaseSummary & {
  notes: string | null
  items: PurchaseItemSummary[]
}

export type PurchaseMutationResult = {
  ok: boolean
  message: string
  purchase?: PurchaseDetail
}
