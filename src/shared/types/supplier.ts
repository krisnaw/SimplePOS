export type SupplierSummary = {
  id: number
  name: string
  contactName: string | null
  phone: string | null
  address: string | null
  notes: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type SupplierMutationResult = {
  ok: boolean
  message: string
  supplier?: SupplierSummary
}
