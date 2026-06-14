export type CatalogItem = {
  id: number
  itemType: 'product' | 'service'
  name: string
  code: string
  category: string
  price: number
  stockQty: number | null
}
