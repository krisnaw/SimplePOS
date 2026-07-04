export type ProductFormState = {
  sku: string
  barcode: string
  name: string
  description: string
  categoryId: string
  unitPrice: string
  unitType: 'piece' | 'litre' | 'set' | 'box'
  stockQty: string
  minStock: string
}
