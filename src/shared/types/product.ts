export type UnitType = 'piece' | 'litre' | 'set' | 'box'

export type ProductCategorySummary = {
  id: number
  name: string
}

export type ProductCategoryMutationResult = {
  ok: boolean
  message: string
  category?: ProductCategorySummary
}

export type ProductSummary = {
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
  lastPurchaseCost: number
  isActive: boolean
  createdAt?: string
  updatedAt: string
}
