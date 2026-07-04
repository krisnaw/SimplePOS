import type { VehicleSummary } from '@/shared/types/vehicle'

export type SimplePosApi = NonNullable<Window['simplepos']>

export type CatalogViewMode = 'grid' | 'list'

export type SampleProduct = {
  id: number
  itemType: 'product' | 'service'
  name: string
  category: string
  sku: string
  description: string
  compatibility: string
  price: number
  stock: number
  minStock: number
}

export type CartItem = SampleProduct & {
  cartKey: string
  quantity: number
}

export type MockVehicle = VehicleSummary

export type MockCatalogItem = {
  key: string
  id: number
  type: 'service' | 'product'
  name: string
  code: string
  category: string
  price: number
}

export type SaleLineItem = Omit<MockCatalogItem, 'category'> & {
  category?: string
  quantity: number
  basePrice: number
  priceOverriddenById: number | null
  priceOverriddenAt: string | null
}

export type MockSaleOrder = {
  id: number
  vehicle: MockVehicle
  lineItems: SaleLineItem[]
  createdAt: string
  updatedAt: string
  isStale: boolean
}
