export type VehicleSummary = {
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
  createdAt?: string
  updatedAt: string
}
