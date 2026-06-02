import { useMemo, useState } from 'react'
import { PackagePlus, Search, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/renderer/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/renderer/components/ui/card'
import { Input } from '@/renderer/components/ui/input'
import { Label } from '@/renderer/components/ui/label'
import { cn } from '@/renderer/lib/utils'

type InventoryProduct = {
  id: number
  sku: string
  name: string
  category: string
  unitPrice: number
  unitType: string
  stockQty: number
  minStock: number
  isSellable: boolean
}

type ProductFormState = {
  sku: string
  name: string
  category: string
  unitPrice: string
  unitType: string
  stockQty: string
  minStock: string
  isSellable: boolean
}

const initialProducts: InventoryProduct[] = [
  {
    id: 1,
    sku: 'LUB-OIL-5W30-1L',
    name: 'Engine Oil 5W-30',
    category: 'Lubricants & Fluids',
    unitPrice: 65000,
    unitType: 'litre',
    stockQty: 50,
    minStock: 10,
    isSellable: true,
  },
  {
    id: 2,
    sku: 'FLT-OIL-UNIV',
    name: 'Oil Filter Universal',
    category: 'Filters',
    unitPrice: 35000,
    unitType: 'piece',
    stockQty: 40,
    minStock: 10,
    isSellable: true,
  },
  {
    id: 3,
    sku: 'BRK-PAD-FRONT-STD',
    name: 'Brake Pad Front',
    category: 'Brake Parts',
    unitPrice: 120000,
    unitType: 'set',
    stockQty: 3,
    minStock: 4,
    isSellable: true,
  },
  {
    id: 4,
    sku: 'ELC-BATT-45AH',
    name: 'Car Battery 45Ah',
    category: 'Electrical Parts',
    unitPrice: 550000,
    unitType: 'piece',
    stockQty: 8,
    minStock: 2,
    isSellable: true,
  },
  {
    id: 5,
    sku: 'TRE-VALVE-STD',
    name: 'Tire Valve Stem',
    category: 'Tires & Wheels Parts',
    unitPrice: 8000,
    unitType: 'piece',
    stockQty: 50,
    minStock: 10,
    isSellable: true,
  },
]

const emptyForm: ProductFormState = {
  sku: '',
  name: '',
  category: 'Lubricants & Fluids',
  unitPrice: '',
  unitType: 'piece',
  stockQty: '',
  minStock: '',
  isSellable: true,
}

const categories = [
  'Lubricants & Fluids',
  'Filters',
  'Brake Parts',
  'Electrical Parts',
  'Tires & Wheels Parts',
]

const unitTypes = ['piece', 'litre', 'set', 'box']

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)
}

function getStockStatus(product: InventoryProduct): 'Low' | 'In Stock' {
  return product.stockQty <= product.minStock ? 'Low' : 'In Stock'
}

export function InventoryWorkspace() {
  const [products, setProducts] = useState<InventoryProduct[]>(initialProducts)
  const [form, setForm] = useState<ProductFormState>(emptyForm)
  const [searchQuery, setSearchQuery] = useState('')
  const [message, setMessage] = useState('')

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    if (!query) return products

    return products.filter((product) =>
      [product.name, product.sku, product.category].some((value) => value.toLowerCase().includes(query)),
    )
  }, [products, searchQuery])

  const lowStockCount = products.filter((product) => getStockStatus(product) === 'Low').length
  const totalUnits = products.reduce((total, product) => total + product.stockQty, 0)
  const inventoryValue = products.reduce((total, product) => total + product.stockQty * product.unitPrice, 0)

  function updateForm(field: keyof ProductFormState, value: string | boolean) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }))
  }

  function resetForm() {
    setForm(emptyForm)
    setMessage('')
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const unitPrice = Number(form.unitPrice)
    const stockQty = Number(form.stockQty)
    const minStock = Number(form.minStock)

    if (!form.sku.trim() || !form.name.trim() || unitPrice < 0 || stockQty < 0 || minStock < 0) {
      setMessage('Enter product details and valid stock numbers.')
      return
    }

    const nextProduct: InventoryProduct = {
      id: Math.max(...products.map((product) => product.id), 0) + 1,
      sku: form.sku.trim().toUpperCase(),
      name: form.name.trim(),
      category: form.category,
      unitPrice,
      unitType: form.unitType,
      stockQty,
      minStock,
      isSellable: form.isSellable,
    }

    setProducts((currentProducts) => [nextProduct, ...currentProducts])
    setMessage(`${nextProduct.name} added to inventory.`)
    setForm(emptyForm)
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
              <p className="text-2xl font-semibold">{products.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stock Units</CardTitle>
              <CardDescription>Available quantity</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{totalUnits}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Low Stock</CardTitle>
              <CardDescription>At or below minimum</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{lowStockCount}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="min-h-0">
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle className="text-base">Product List</CardTitle>
                <CardDescription>{formatCurrency(inventoryValue)} in current sample stock value.</CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative min-w-56">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
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
          <CardContent className="min-h-0 overflow-auto">
            <div className="overflow-hidden rounded-lg border bg-background">
              <div className="grid min-w-[760px] grid-cols-[1.3fr_0.9fr_0.7fr_0.6fr_0.7fr] gap-3 border-b bg-muted/60 px-3 py-2 text-xs font-medium text-muted-foreground">
                <span>Product</span>
                <span>Category</span>
                <span>Price</span>
                <span>Stock</span>
                <span>Status</span>
              </div>

              <div className="min-w-[760px] divide-y">
                {filteredProducts.length === 0 ? (
                  <div className="px-3 py-6 text-sm text-muted-foreground">No products match this search.</div>
                ) : null}

                {filteredProducts.map((product) => {
                  const stockStatus = getStockStatus(product)

                  return (
                    <div
                      key={product.id}
                      className="grid grid-cols-[1.3fr_0.9fr_0.7fr_0.6fr_0.7fr] gap-3 px-3 py-3 text-sm"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{product.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{product.sku}</span>
                      </span>
                      <span className="truncate">{product.category}</span>
                      <span className="truncate">{formatCurrency(product.unitPrice)}</span>
                      <span className="truncate">
                        {product.stockQty} {product.unitType}
                      </span>
                      <span
                        className={cn(
                          'w-fit rounded-md border px-2 py-1 text-xs font-medium',
                          stockStatus === 'Low' ? 'text-destructive' : 'text-muted-foreground',
                        )}
                      >
                        {stockStatus}
                      </span>
                    </div>
                  )
                })}
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
                onChange={(event) => updateForm('sku', event.target.value)}
                placeholder="BRK-PAD-FRONT"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="inventory-name">Product Name</Label>
              <Input
                id="inventory-name"
                value={form.name}
                onChange={(event) => updateForm('name', event.target.value)}
                placeholder="Brake Pad Front"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="inventory-category">Category</Label>
              <select
                id="inventory-category"
                value={form.category}
                onChange={(event) => updateForm('category', event.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="inventory-price">Unit Price</Label>
                <Input
                  id="inventory-price"
                  type="number"
                  min="0"
                  value={form.unitPrice}
                  onChange={(event) => updateForm('unitPrice', event.target.value)}
                  placeholder="120000"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="inventory-unit">Unit Type</Label>
                <select
                  id="inventory-unit"
                  value={form.unitType}
                  onChange={(event) => updateForm('unitType', event.target.value)}
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
                  onChange={(event) => updateForm('stockQty', event.target.value)}
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
                  onChange={(event) => updateForm('minStock', event.target.value)}
                  placeholder="4"
                  required
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isSellable}
                onChange={(event) => updateForm('isSellable', event.target.checked)}
                className="size-4"
              />
              Sellable at checkout
            </label>

            {message ? (
              <p className="text-sm text-muted-foreground" role="status">
                {message}
              </p>
            ) : null}

            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                <PackagePlus data-icon="inline-start" aria-hidden="true" />
                Create
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
