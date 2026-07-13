import type { VehicleSummary } from '@/shared/types/vehicle'
import type { InvoiceDetail } from '../invoice/InvoiceWorkspace.types'

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
  minimumPrice: number
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

export type VehicleSearchState = {
  query: string
  isDropdownOpen: boolean
}

export type NewVehicleFormState = {
  isOpen: boolean
  plate: string
  brand: string
  model: string
  customerName: string
  customerPhone: string
  errors: {
    plateNumber?: string
    model?: string
  }
}

export type PriceEditState = {
  editingKey: string | null
  draft: string
  error: string
}

export type CheckoutState = {
  isConfirmOpen: boolean
  isCheckingOut: boolean
  isCompleteOpen: boolean
  completedInvoice: InvoiceDetail
  completedInvoiceNumber: string
  isLoadingCompletedInvoice: boolean
}

export type ReceiptPreviewState = {
  isOpen: boolean
  url: string | null
}

export type SalesWorkspaceUiState = {
  vehicleSearch: VehicleSearchState
  newVehicleForm: NewVehicleFormState
  statusMessage: string
  orderToDelete: MockSaleOrder | null
  priceEdit: PriceEditState
  checkout: CheckoutState
  receiptPreview: ReceiptPreviewState
}

export type SalesWorkspaceUiAction =
  | { type: 'vehicleSearch/set'; patch: Partial<VehicleSearchState> }
  | { type: 'vehicleSearch/reset' }
  | { type: 'newVehicleForm/set'; patch: Partial<NewVehicleFormState> }
  | { type: 'newVehicleForm/reset' }
  | { type: 'newVehicleForm/setErrors'; errors: NewVehicleFormState['errors'] }
  | { type: 'statusMessage/set'; message: string }
  | { type: 'orderToDelete/set'; order: MockSaleOrder | null }
  | { type: 'priceEdit/start'; key: string; draft: string }
  | { type: 'priceEdit/cancel' }
  | { type: 'priceEdit/setDraft'; draft: string }
  | { type: 'priceEdit/setError'; error: string }
  | { type: 'checkout/set'; patch: Partial<CheckoutState> }
  | { type: 'checkout/closeCompletedSale' }
  | { type: 'receiptPreview/open'; url: string }
  | { type: 'receiptPreview/close' }
