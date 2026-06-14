export type SimplePosApi = NonNullable<Window['simplepos']>

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
