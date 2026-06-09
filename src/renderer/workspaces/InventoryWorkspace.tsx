import { useEffect, useMemo, useState } from 'react'
import { PackagePlus, Search, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/renderer/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/renderer/components/ui/card'
import { Input } from '@/renderer/components/ui/input'
import { Label } from '@/renderer/components/ui/label'
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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)
}

function isLowStock(product: ProductSummary): boolean {
  return product.stockQty <= product.minStock
}

export function InventoryWorkspace() {
  const [products, setProducts] = useState<ProductSummary[]>([])
  const [categories, setCategories] = useState<ProductCategorySummary[]>([])
  const [form, setForm] = useState<ProductFormState>(emptyForm)
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

    const result = await window.simplepos?.products.create({
      sku: form.sku.trim(),
      barcode: form.barcode.trim() || null,
      name: form.name.trim(),
      description: form.description.trim() || null,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      unitPrice,
      unitType: form.unitType,
      stockQty,
      minStock,
    })

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
    <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex min-h-0 flex-col gap-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Total Items</CardTitle>
              <CardDescription>Active product SKUs</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{products.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stock Units</CardTitle>
              <CardDescription>Available quantity</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{totalUnits}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Low Stock</CardTitle>
              <CardDescription>At or below minimum</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{lowStockCount}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="min-h-0">
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle className="text-base">Product List</CardTitle>
                <CardDescription>{formatCurrency(inventoryValue)} in current stock value.</CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative min-w-56">
                  <Search
                    className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search inventory"
                    className="pl-8"
                  />
                </div>
                <Button type="button" variant="outline" size="icon" aria-label="Filter inventory">
                  <SlidersHorizontal aria-hidden="true" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden pb-6">
            <div className="flex min-h-0 flex-1 flex-col overflow-x-auto">
              <div className="flex min-h-0 min-w-[800px] flex-1 flex-col rounded-lg border bg-background">
                <div className="grid shrink-0 grid-cols-[1.3fr_0.9fr_0.7fr_0.6fr_0.6fr_auto] gap-3 border-b bg-muted/60 px-3 py-2 text-xs font-medium text-muted-foreground">
                  <span>Product</span>
                  <span>Category</span>
                  <span>Price</span>
                  <span>Stock</span>
                  <span>Status</span>
                  <span />
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto divide-y">
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
                      className="grid grid-cols-[1.3fr_0.9fr_0.7fr_0.6fr_0.6fr_auto] gap-3 px-3 py-3 text-sm"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{product.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{product.sku}</span>
                      </span>
                      <span className="truncate">{categoryName}</span>
                      <span className="truncate tabular-nums">{formatCurrency(product.unitPrice)}</span>
                      <span className="truncate tabular-nums">
                        {product.stockQty} {product.unitType}
                      </span>
                      <span
                        className={cn(
                          'w-fit rounded-md border px-2 py-1 text-xs font-medium',
                          lowStock ? 'text-destructive' : 'text-muted-foreground',
                        )}
                      >
                        {lowStock ? 'Low' : 'In Stock'}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeactivate(product)}
                      >
                        Remove
                      </Button>
                    </div>
                  )
                })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="min-h-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PackagePlus aria-hidden="true" />
            Create Product
          </CardTitle>
          <CardDescription>Add a part or consumable to the inventory list.</CardDescription>
        </CardHeader>
        <CardContent className="min-h-0 overflow-auto">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
              <select
                id="inventory-category"
                value={form.categoryId}
                onChange={(e) => updateForm('categoryId', e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">— No category —</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
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
                <select
                  id="inventory-unit"
                  value={form.unitType}
                  onChange={(e) => updateForm('unitType', e.target.value as ProductFormState['unitType'])}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {unitTypes.map((unitType) => (
                    <option key={unitType} value={unitType}>
                      {unitType}
                    </option>
                  ))}
                </select>
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
                {isSubmitting ? 'Creating…' : 'Create'}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                Clear
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
