import { useState } from 'react'
import { Button } from '@/renderer/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/renderer/components/ui/card'
import { Input } from '@/renderer/components/ui/input'
import { cn } from '@/renderer/lib/utils'

type SampleProduct = {
  id: number
  name: string
  category: string
  sku: string
  description: string
  compatibility: string
  price: number
  stock: number
}

type CartItem = SampleProduct & {
  quantity: number
}

const sampleProducts: SampleProduct[] = [
  {
    id: 1,
    name: 'Engine Oil 10W-40',
    category: 'Lubricants',
    sku: 'OIL-10W40',
    description: 'Semi-synthetic engine oil for routine maintenance and oil-change packages.',
    compatibility: 'Gasoline engines, common passenger vehicles',
    price: 85000,
    stock: 24,
  },
  {
    id: 2,
    name: 'Oil Filter',
    category: 'Filters',
    sku: 'FLT-OIL-01',
    description: 'Standard spin-on oil filter for regular service work.',
    compatibility: 'Most compact and mid-size vehicles',
    price: 45000,
    stock: 18,
  },
  {
    id: 3,
    name: 'Brake Pad Set',
    category: 'Brakes',
    sku: 'BRK-PAD-SET',
    description: 'Front brake pad set for brake replacement jobs.',
    compatibility: 'Confirm by vehicle model before installation',
    price: 320000,
    stock: 8,
  },
  {
    id: 4,
    name: 'Spark Plug',
    category: 'Ignition',
    sku: 'IGN-SPARK',
    description: 'Single spark plug for ignition service and tune-ups.',
    compatibility: 'Gasoline engines, model-specific fit',
    price: 55000,
    stock: 32,
  },
  {
    id: 5,
    name: 'Air Filter',
    category: 'Filters',
    sku: 'FLT-AIR-01',
    description: 'Engine air filter replacement for scheduled maintenance.',
    compatibility: 'Confirm size by vehicle airbox',
    price: 75000,
    stock: 15,
  },
  {
    id: 6,
    name: 'Standard Service Labor',
    category: 'Service',
    sku: 'SVC-STD',
    description: 'Labor line item for standard inspection and service packages.',
    compatibility: 'General shop service',
    price: 150000,
    stock: 999,
  },
]

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)
}

export function SalesWorkspace() {
  const [selectedProduct, setSelectedProduct] = useState<SampleProduct | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const normalizedSearchQuery = searchQuery.trim().toLowerCase()
  const visibleProducts = normalizedSearchQuery
    ? sampleProducts.filter((product) =>
        [product.name, product.category, product.sku, product.description, product.compatibility].some((value) =>
          value.toLowerCase().includes(normalizedSearchQuery),
        ),
      )
    : sampleProducts
  const subtotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0)
  const tax = Math.round(subtotal * 0.11)
  const total = subtotal + tax

  function addToCart(product: SampleProduct) {
    setCartItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.id === product.id)

      if (existingItem) {
        return currentItems.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        )
      }

      return [...currentItems, { ...product, quantity: 1 }]
    })
  }

  function updateQuantity(productId: number, quantity: number) {
    if (quantity <= 0) {
      setCartItems((currentItems) => currentItems.filter((item) => item.id !== productId))
      return
    }

    setCartItems((currentItems) =>
      currentItems.map((item) => (item.id === productId ? { ...item, quantity } : item)),
    )
  }

  return (
    <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="min-h-0 gap-4">
        <div className="shrink-0 px-6">
          <Input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search products, SKU, category..."
            aria-label="Search products"
          />
        </div>
        <CardContent className="min-h-0 flex-1 overflow-auto">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleProducts.map((product) => (
              <button
                key={product.id}
                type="button"
                aria-pressed={selectedProduct?.id === product.id}
                onClick={() => {
                  setSelectedProduct(product)
                  addToCart(product)
                }}
                className={cn(
                  'flex min-h-40 flex-col justify-between rounded-lg border bg-background p-4 text-left transition-colors hover:bg-muted/60',
                  selectedProduct?.id === product.id ? 'border-primary ring-2 ring-ring/20' : null,
                )}
              >
                <span className="flex flex-col gap-1">
                  <span className="text-sm font-medium">{product.name}</span>
                  <span className="text-xs text-muted-foreground">{product.category}</span>
                  <span className="text-xs text-muted-foreground">{product.sku}</span>
                  <span className="line-clamp-2 pt-2 text-xs text-muted-foreground">{product.description}</span>
                </span>
                <span className="flex items-end justify-between gap-3">
                  <span className="text-base font-semibold">{formatCurrency(product.price)}</span>
                  <span className="text-xs text-muted-foreground">Stock {product.stock}</span>
                </span>
              </button>
            ))}
          </div>
          {visibleProducts.length === 0 ? (
            <div className="flex min-h-44 items-center justify-center rounded-lg border border-dashed bg-background p-4 text-center">
              <p className="text-sm text-muted-foreground">No products match the search.</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex min-h-0 flex-col gap-4">
        <Card className="shrink-0 gap-0 bg-muted py-0">
          <CardContent className="flex flex-col gap-3 p-4">
            {selectedProduct ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{selectedProduct.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedProduct.sku}</p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold">{formatCurrency(selectedProduct.price)}</p>
                </div>

                <p className="line-clamp-2 text-xs text-muted-foreground">{selectedProduct.description}</p>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <span className="rounded-md border bg-background px-2 py-1.5">
                    <span className="block text-muted-foreground">Category</span>
                    <span className="block truncate font-medium">{selectedProduct.category}</span>
                  </span>
                  <span className="rounded-md border bg-background px-2 py-1.5">
                    <span className="block text-muted-foreground">Stock</span>
                    <span className="block font-medium">{selectedProduct.stock}</span>
                  </span>
                  <span className="rounded-md border bg-background px-2 py-1.5">
                    <span className="block text-muted-foreground">Fit</span>
                    <span className="block truncate font-medium">{selectedProduct.compatibility}</span>
                  </span>
                </div>

              </>
            ) : (
              <div className="flex min-h-24 items-center justify-center rounded-lg border border-dashed bg-background p-3 text-center">
                <p className="text-sm text-muted-foreground">Select a product to see price, stock, and fitment details.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-h-0 flex-1">
          <CardHeader className="shrink-0">
            <CardTitle className="text-base">Current Sale</CardTitle>
            <CardDescription>Sample cart for checkout flow layout.</CardDescription>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto pr-1">
              {cartItems.length === 0 ? (
                <div className="flex min-h-full items-center justify-center rounded-lg border border-dashed bg-background p-4 text-center">
                  <p className="text-sm text-muted-foreground">Add a reviewed product to start a sale.</p>
                </div>
              ) : null}

              {cartItems.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-3 rounded-lg border bg-background p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(item.price)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-xs"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    >
                      -
                    </Button>
                    <span className="w-6 text-center text-sm">{item.quantity}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-xs"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      +
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex shrink-0 flex-col gap-2 border-t pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax 11%</span>
                <span>{formatCurrency(tax)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            <div className="flex shrink-0 gap-2">
              <Button className="flex-1" disabled={cartItems.length === 0}>
                Checkout
              </Button>
              <Button type="button" variant="outline" onClick={() => setCartItems([])} disabled={cartItems.length === 0}>
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
