export type SupplierForm = {
  name: string
  contactName: string
  phone: string
  address: string
  notes: string
}

export type SupplierFeedback = {
  message: string
  tone: 'success' | 'error'
}
