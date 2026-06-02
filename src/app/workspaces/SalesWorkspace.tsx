import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type SampleProduct = {
  id: number
  name: string
  category: string
  sku: string
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
    price: 85000,
    stock: 24,
  },
  {
    id: 2,
    name: 'Oil Filter',
    category: 'Filters',
    sku: 'FLT-OIL-01',
    price: 45000,
    stock: 18,
  },
  {
    id: 3,
    name: 'Brake Pad Set',
    category: 'Brakes',
    sku: 'BRK-PAD-SET',
    price: 320000,
    stock: 8,
  },
  {
    id: 4,
    name: 'Spark Plug',
    category: 'Ignition',
    sku: 'IGN-SPARK',
    price: 55000,
    stock: 32,
  },
  {
    id: 5,
    name: 'Air Filter',
    category: 'Filters',
    sku: 'FLT-AIR-01',
    price: 75000,
    stock: 15,
  },
  {
    id: 6,
    name: 'Standard Service Labor',
    category: 'Service',
    sku: 'SVC-STD',
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
  const [cartItems, setCartItems] = useState<CartItem[]>([])
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
      <Card className="min-h-0">
        <CardHeader className="shrink-0">
          <CardTitle className="text-base">Sample Products</CardTitle>
          <CardDescription>Select products to add them to the current sale.</CardDescription>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 overflow-auto">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {sampleProducts.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => addToCart(product)}
                className="flex min-h-36 flex-col justify-between rounded-lg border bg-background p-4 text-left transition-colors hover:bg-muted/60"
              >
                <span className="flex flex-col gap-1">
                  <span className="text-sm font-medium">{product.name}</span>
                  <span className="text-xs text-muted-foreground">{product.category}</span>
                  <span className="text-xs text-muted-foreground">{product.sku}</span>
                </span>
                <span className="flex items-end justify-between gap-3">
                  <span className="text-base font-semibold">{formatCurrency(product.price)}</span>
                  <span className="text-xs text-muted-foreground">Stock {product.stock}</span>
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="min-h-0">
        <CardHeader className="shrink-0">
          <CardTitle className="text-base">Current Sale</CardTitle>
          <CardDescription>Sample cart for checkout flow layout.</CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto pr-1">
            {cartItems.length === 0 ? (
              <div className="flex min-h-full items-center justify-center rounded-lg border border-dashed bg-background p-4 text-center">
                <p className="text-sm text-muted-foreground">Select a product to start a sale.</p>
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
  )
}
