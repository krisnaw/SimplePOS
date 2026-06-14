export type UnitType = 'piece' | 'litre' | 'set' | 'box'

export type ProductCategorySummary = {
  id: number
  name: string
  description: string | null
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
  isActive: boolean
  createdAt?: string
  updatedAt: string
}
