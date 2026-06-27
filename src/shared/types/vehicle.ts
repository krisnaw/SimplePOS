export type VehicleSummary = {
  id: number
  customerId: number | null
  customerName: string | null
  customerPhone: string | null
  plateNumber: string
  brand: string | null
  model: string
  year: number | null
  vin: string | null
  color: string | null
  notes: string | null
  isActive: boolean
  createdAt?: string
  updatedAt: string
}

export type VehicleSearchInput = {
  query: string
  limit?: number
}

export type QuickCreateVehicleInput = {
  plateNumber: string
  model: string
  brand?: string | null
  customerName?: string | null
  customerPhone?: string | null
  notes?: string | null
}
