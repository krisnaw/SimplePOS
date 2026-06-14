export type ServiceSummary = {
  id: number
  code: string
  name: string
  description: string | null
  category: string | null
  price: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}
