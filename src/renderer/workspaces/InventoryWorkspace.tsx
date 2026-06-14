import { useEffect, useMemo, useState } from 'react'
import { PackagePlus, Search, SlidersHorizontal, Trash2 } from 'lucide-react'
import { Button } from '@/renderer/components/ui/button'
import {Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle} from '@/renderer/components/ui/card'
import { Input } from '@/renderer/components/ui/input'
import { Label } from '@/renderer/components/ui/label'
import { BaseSelect } from '@/renderer/components/ui/base-select'
import { cn } from '@/renderer/lib/utils'

type ProductCategorySummary = {
  id: number
  name: string
  description: string | null
}

type ProductSummary = {
  id: number
  categoryId: number | null
  sku: string
  barcode: string | null
  name: string
  description: string | null
  unitPrice: number
  unitType: 'piece' | 'litre' | 'set' | 'box'
  stockQty: number
  minStock: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

type ProductFormState = {
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

const emptyForm: ProductFormState = {
  sku: '',
  barcode: '',
  name: '',
  description: '',
  categoryId: '',
  unitPrice: '',
  unitType: 'piece',
  stockQty: '',
  minStock: '',
}

const unitTypes: ProductFormState['unitType'][] = ['piece', 'litre', 'set', 'box']
const productTableGrid =
  'grid-cols-[minmax(0,1.35fr)_minmax(0,0.75fr)_104px_88px_84px_56px]'
const iconHitAreaClass =
  'relative after:absolute after:top-1/2 after:left-1/2 after:size-10 after:-translate-x-1/2 after:-translate-y-1/2'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value).replace(/^Rp[\s\u00a0]*/, 'Rp')
}

function isLowStock(product: ProductSummary): boolean {
  return product.stockQty <= product.minStock
}

function toProductForm(product: ProductSummary): ProductFormState {
  return {
    sku: product.sku,
    barcode: product.barcode ?? '',
    name: product.name,
    description: product.description ?? '',
    categoryId: product.categoryId ? String(product.categoryId) : '',
    unitPrice: String(product.unitPrice),
    unitType: product.unitType,
    stockQty: String(product.stockQty),
    minStock: String(product.minStock),
  }
}

export function InventoryWorkspace() {
  const [products, setProducts] = useState<ProductSummary[]>([])
  const [categories, setCategories] = useState<ProductCategorySummary[]>([])
  const [form, setForm] = useState<ProductFormState>(emptyForm)
  const [editingProduct, setEditingProduct] = useState<ProductSummary | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    void window.simplepos?.products.list().then(setProducts)
    void window.simplepos?.categories.list().then((list) => {
      setCategories(list)
      if (list[0]) setForm((f) => ({ ...f, categoryId: String(list[0].id) }))
    })
  }, [])

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    if (!query) return products

    return products.filter((product) =>
      [product.name, product.sku, product.barcode ?? ''].some((value) =>
        value.toLowerCase().includes(query),
      ),
    )
  }, [products, searchQuery])

  const lowStockCount = products.filter(isLowStock).length
  const totalUnits = products.reduce((total, p) => total + p.stockQty, 0)
  const inventoryValue = products.reduce((total, p) => total + p.stockQty * p.unitPrice, 0)

  function updateForm<K extends keyof ProductFormState>(field: K, value: ProductFormState[K]) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function resetForm() {
    setForm((f) => ({ ...emptyForm, categoryId: f.categoryId }))
    setEditingProduct(null)
    setMessage('')
  }

  function handleEdit(product: ProductSummary) {
    setEditingProduct(product)
    setForm(toProductForm(product))
    setMessage('')
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const unitPrice = Number(form.unitPrice)
    const stockQty = Number(form.stockQty)
    const minStock = Number(form.minStock)

    if (!form.sku.trim() || !form.name.trim() || unitPrice < 0 || stockQty < 0 || minStock < 0) {
      setMessage('Enter product details and valid stock numbers.')
      return
    }

    setIsSubmitting(true)

    const payload = {
      sku: form.sku.trim(),
      barcode: form.barcode.trim() || null,
      name: form.name.trim(),
      description: form.description.trim() || null,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      unitPrice,
      unitType: form.unitType,
      stockQty,
      minStock,
    }

    const result = editingProduct
      ? await window.simplepos?.products.update({
          ...payload,
          id: editingProduct.id,
          isActive: editingProduct.isActive,
        })
      : await window.simplepos?.products.create(payload)

    setIsSubmitting(false)

    if (!result) {
      setMessage('Unable to reach the database.')
      return
    }

    if (!result.ok) {
      setMessage(result.message)
      return
    }

    setMessage(result.message)
    resetForm()
    void window.simplepos?.products.list().then(setProducts)
  }

  async function handleDeactivate(product: ProductSummary) {
    await window.simplepos?.products.update({ ...product, isActive: false })
    void window.simplepos?.products.list().then(setProducts)
  }

  return (
    <div className="grid h-full min-h-0 min-w-0 gap-3 overflow-hidden xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex min-h-0 min-w-0 flex-col gap-3 overflow-hidden">
        <div className="grid shrink-0 gap-3 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Total Items</CardTitle>
              <CardDescription>Active product SKUs</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{products.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stock Units</CardTitle>
              <CardDescription>Available quantity</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{totalUnits}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Low Stock</CardTitle>
              <CardDescription>At or below minimum</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{lowStockCount}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Product List</CardTitle>
            <CardDescription>{formatCurrency(inventoryValue)} in current stock value.</CardDescription>
            <CardAction>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search inventory"
              />
            </CardAction>
          </CardHeader>
          <CardContent className="min-h-0 min-w-0 flex-1 overflow-hidden pb-4">
            <div className="h-full min-h-0 min-w-0 overflow-y-auto rounded-lg border bg-background">
              <div
                className={cn(
                  'sticky top-0 z-10 grid shrink-0 items-center gap-3 border-b bg-muted/95 px-3 py-2 text-xs font-medium text-muted-foreground backdrop-blur',
                  productTableGrid,
                )}
              >
                  <span>Product</span>
                  <span>Category</span>
                  <span className="text-right">Price</span>
                  <span>Stock</span>
                  <span>Status</span>
                  <span className="text-center">Remove</span>
              </div>

              <div className="divide-y">
                {filteredProducts.length === 0 ? (
                  <div className="px-3 py-6 text-sm text-muted-foreground">
                    {products.length === 0 ? 'No products yet. Add one using the form.' : 'No products match this search.'}
                  </div>
                ) : null}

                {filteredProducts.map((product) => {
                  const categoryName = categories.find((c) => c.id === product.categoryId)?.name ?? '—'
                  const lowStock = isLowStock(product)

                  return (
                    <div
                      key={product.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleEdit(product)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          handleEdit(product)
                        }
                      }}
                      className={cn(
                        'grid min-h-12 w-full cursor-pointer items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                        productTableGrid,
                        editingProduct?.id === product.id && 'bg-muted/60',
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{product.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{product.sku}</span>
                      </span>
                      <span className="min-w-0 truncate">{categoryName}</span>
                      <span className="truncate text-right tabular-nums">{formatCurrency(product.unitPrice)}</span>
                      <span className="truncate tabular-nums">
                        {product.stockQty} {product.unitType}
                      </span>
                      <span
                        className={cn(
                          'w-fit rounded-full px-2 py-0.5 text-[10px] font-medium tabular-nums',
                          lowStock
                            ? 'bg-destructive/10 text-destructive'
                            : 'bg-emerald-500/15 text-emerald-700',
                        )}
                      >
                        {lowStock ? 'Low stock' : 'In stock'}
                      </span>
                      <span className="flex justify-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={cn('text-muted-foreground hover:text-destructive active:scale-[0.96]', iconHitAreaClass)}
                          onClick={(event) => {
                            event.stopPropagation()
                            void handleDeactivate(product)
                          }}
                          aria-label={`Remove ${product.name}`}
                          title={`Remove ${product.name}`}
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {editingProduct ? 'Edit Product' : 'Create Product'}
          </CardTitle>
          <CardDescription>
            {editingProduct
              ? `Update ${editingProduct.name} details, price, and stock.`
              : 'Add a part or consumable to the inventory list.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 overflow-auto">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="inventory-sku">SKU</Label>
              <Input
                id="inventory-sku"
                value={form.sku}
                onChange={(e) => updateForm('sku', e.target.value)}
                placeholder="BRK-PAD-FRONT"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="inventory-name">Product Name</Label>
              <Input
                id="inventory-name"
                value={form.name}
                onChange={(e) => updateForm('name', e.target.value)}
                placeholder="Brake Pad Front"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="inventory-barcode">Barcode <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                id="inventory-barcode"
                value={form.barcode}
                onChange={(e) => updateForm('barcode', e.target.value)}
                placeholder="8991234567890"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="inventory-category">Category</Label>
              <BaseSelect
                id="inventory-category"
                value={form.categoryId}
                ariaLabel="Product category"
                placeholder="No category"
                options={[
                  { value: '', label: 'No category' },
                  ...categories.map((category) => ({
                    value: String(category.id),
                    label: category.name,
                  })),
                ]}
                onValueChange={(value) => updateForm('categoryId', value)}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="inventory-price">Unit Price (IDR)</Label>
                <Input
                  id="inventory-price"
                  type="number"
                  min="0"
                  value={form.unitPrice}
                  onChange={(e) => updateForm('unitPrice', e.target.value)}
                  placeholder="120000"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="inventory-unit">Unit Type</Label>
                <BaseSelect
                  id="inventory-unit"
                  value={form.unitType}
                  ariaLabel="Product unit type"
                  options={unitTypes.map((unitType) => ({
                    value: unitType,
                    label: unitType,
                  }))}
                  onValueChange={(value) => updateForm('unitType', value as ProductFormState['unitType'])}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="inventory-stock">Opening Stock</Label>
                <Input
                  id="inventory-stock"
                  type="number"
                  min="0"
                  value={form.stockQty}
                  onChange={(e) => updateForm('stockQty', e.target.value)}
                  placeholder="12"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="inventory-min-stock">Minimum Stock</Label>
                <Input
                  id="inventory-min-stock"
                  type="number"
                  min="0"
                  value={form.minStock}
                  onChange={(e) => updateForm('minStock', e.target.value)}
                  placeholder="4"
                  required
                />
              </div>
            </div>

            {message ? (
              <p className="text-sm text-muted-foreground" role="status">
                {message}
              </p>
            ) : null}

            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                <PackagePlus data-icon="inline-start" aria-hidden="true" />
                {isSubmitting ? (editingProduct ? 'Saving...' : 'Creating...') : editingProduct ? 'Save Changes' : 'Create'}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                {editingProduct ? 'Cancel' : 'Clear'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
