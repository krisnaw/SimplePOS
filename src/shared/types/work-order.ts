export type WorkOrderStatus = 'draft' | 'open' | 'in_progress' | 'completed' | 'invoiced' | 'cancelled'
export type WorkOrderPriority = 'low' | 'normal' | 'high' | 'urgent'
export type WorkOrderItemType = 'product' | 'service'

export type WorkOrderItemSummary = {
  id: number
  itemType: WorkOrderItemType
  productId: number | null
  serviceId: number | null
  name: string
  sku: string | null
  quantity: number
  unitPrice: number
  lineTotal: number
  createdAt: string
  updatedAt: string
}

export type WorkOrderSummary = {
  id: number
  orderNumber: string
  customerId: number
  customerName: string
  vehicleId: number
  vehicleName: string
  plateNumber: string
  assignedUserId: number | null
  assignedUserName: string | null
  status: WorkOrderStatus
  priority: WorkOrderPriority
  complaint: string
  notes: string | null
  odometer: number | null
  itemCount: number
  subtotal: number
  discount: number
  tax: number
  total: number
  invoiceId: number | null
  invoiceNumber: string | null
  createdAt: string
  updatedAt: string
  completedAt: string | null
  invoicedAt: string | null
  cancelledAt: string | null
}

export type WorkOrderDetail = WorkOrderSummary & {
  customerPhone: string | null
  customerEmail: string | null
  customerAddress: string | null
  vehicleBrand: string
  vehicleModel: string
  vehicleYear: number | null
  vehicleColor: string | null
  items: WorkOrderItemSummary[]
}
