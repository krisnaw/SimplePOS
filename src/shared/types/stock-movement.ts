import type { UnitType } from './product'

export type StockMovementType = 'opening' | 'purchase' | 'sale' | 'adjustment'

export type StockMovementListInput = {
  productId?: number
  movementType?: StockMovementType | 'all'
  dateFrom?: string
  dateTo?: string
  search?: string
  limit?: number
  offset?: number
}

export type StockMovementSummary = {
  id: number
  productId: number
  sku: string
  productName: string
  unitType: UnitType
  movementType: StockMovementType
  quantityDelta: number
  balanceAfter: number
  referenceNumber: string | null
  reason: string | null
  createdById: number | null
  createdByName: string | null
  createdAt: string
}

export type StockMovementListResult = {
  items: StockMovementSummary[]
  total: number
  totalIn: number
  totalOut: number
}

export type StockAdjustmentInput = {
  productId: number
  newStockQty: number
  reason: string
  createdById: number
}

export type StockAdjustmentResult = {
  ok: boolean
  message: string
  balanceAfter?: number
}
