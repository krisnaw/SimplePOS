import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Minus, Plus, Search, ShoppingCart, X } from 'lucide-react'
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

const LOW_STOCK_THRESHOLD = 5
const UNLIMITED_STOCK = 999

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
    stock: UNLIMITED_STOCK,
  },
]

const categories = ['All', ...new Set(sampleProducts.map((product) => product.category))]

const pressableButtonClass =
  'transition-[transform,box-shadow] duration-150 ease-out active:scale-[0.96] active:translate-y-0'

const qtyButtonClass =
  'relative after:absolute after:top-1/2 after:left-1/2 after:size-10 after:-translate-x-1/2 after:-translate-y-1/2'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value).replace(/^Rp[\s\u00a0]*/, 'Rp')
}

function isUnlimitedStock(stock: number): boolean {
  return stock >= UNLIMITED_STOCK
}

function isLowStock(stock: number): boolean {
  return !isUnlimitedStock(stock) && stock <= LOW_STOCK_THRESHOLD
}

export function SalesWorkspace() {
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [actionMessage, setActionMessage] = useState('')
  const [checkoutComplete, setCheckoutComplete] = useState(false)

  const normalizedSearchQuery = searchQuery.trim().toLowerCase()

  const visibleProducts = useMemo(() => {
    return sampleProducts.filter((product) => {
      const matchesCategory = categoryFilter === 'All' || product.category === categoryFilter
      const matchesSearch =
        normalizedSearchQuery.length === 0 ||
        [product.name, product.category, product.sku, product.description, product.compatibility].some((value) =>
          value.toLowerCase().includes(normalizedSearchQuery),
        )

      return matchesCategory && matchesSearch
    })
  }, [categoryFilter, normalizedSearchQuery])

  const cartQuantityByProductId = useMemo(() => {
    return new Map(cartItems.map((item) => [item.id, item.quantity]))
  }, [cartItems])

  const subtotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0)
  const tax = Math.round(subtotal * 0.11)
  const total = subtotal + tax
  const cartItemCount = cartItems.reduce((count, item) => count + item.quantity, 0)

  useEffect(() => {
    searchInputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!actionMessage) return

    const timeoutId = window.setTimeout(() => setActionMessage(''), 2800)
    return () => window.clearTimeout(timeoutId)
  }, [actionMessage])

  function getAvailableQuantity(product: SampleProduct): number {
    const inCart = cartQuantityByProductId.get(product.id) ?? 0
    if (isUnlimitedStock(product.stock)) return Number.POSITIVE_INFINITY
    return Math.max(product.stock - inCart, 0)
  }

  function addToCart(product: SampleProduct, quantity = 1): boolean {
    const available = getAvailableQuantity(product)

    if (available < quantity) {
      setActionMessage(
        isUnlimitedStock(product.stock)
          ? 'Unable to add item'
          : `Only ${product.stock} in stock for ${product.name}`,
      )
      return false
    }

    setCartItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.id === product.id)

      if (existingItem) {
        return currentItems.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item,
        )
      }

      return [...currentItems, { ...product, quantity }]
    })

    return true
  }

  function updateQuantity(productId: number, quantity: number) {
    const product = sampleProducts.find((item) => item.id === productId)
    if (!product) return

    if (quantity <= 0) {
      setCartItems((currentItems) => currentItems.filter((item) => item.id !== productId))
      return
    }

    if (!isUnlimitedStock(product.stock) && quantity > product.stock) {
      setActionMessage(`Only ${product.stock} in stock for ${product.name}`)
      return
    }

    setCartItems((currentItems) =>
      currentItems.map((item) => (item.id === productId ? { ...item, quantity } : item)),
    )
  }

  function handleCheckout() {
    if (cartItems.length === 0) return

    setCheckoutComplete(true)
    setActionMessage(`Sale completed — ${formatCurrency(total)}`)

    window.setTimeout(() => {
      setCartItems([])
      setCheckoutComplete(false)
    }, 1800)
  }

  function handleClearCart() {
    setCartItems([])
    setActionMessage('Cart cleared')
  }

  return (
    <div className="grid h-full min-h-0 gap-3 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card className="min-h-0 gap-3 border-0 shadow-border">
        <div className="flex shrink-0 flex-col gap-2 px-4">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search products, SKU, category..."
              aria-label="Search products"
              className="pl-9 pr-9"
            />
            {searchQuery ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearchQuery('')}
                className={cn(
                  'absolute top-1/2 right-1 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-[background-color,color,transform] duration-150 ease-out hover:bg-muted hover:text-foreground active:scale-[0.96]',
                  qtyButtonClass,
                )}
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {categories.map((category) => {
              const isActive = categoryFilter === category

              return (
                <button
                  key={category}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setCategoryFilter(category)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.96]',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
                  )}
                >
                  {category}
                </button>
              )
            })}
          </div>

          <p className="text-xs text-muted-foreground text-pretty tabular-nums">
            {visibleProducts.length} product{visibleProducts.length === 1 ? '' : 's'}
            {searchQuery ? ` matching "${searchQuery.trim()}"` : null}
          </p>
        </div>

        <CardContent className="min-h-0 flex-1 overflow-auto py-2">
          {visibleProducts.length === 0 ? (
            <div className="flex min-h-44 items-center justify-center rounded-lg border border-dashed bg-background p-6 text-center shadow-border">
              <div className="flex max-w-xs flex-col gap-1">
                <p className="text-sm font-medium text-balance">No products found</p>
                <p className="text-sm text-muted-foreground text-pretty">
                  Try another search term or category filter.
                </p>
              </div>
            </div>
          ) : (
            <div className="stagger-children grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {visibleProducts.map((product) => {
                const inCartQty = cartQuantityByProductId.get(product.id) ?? 0
                const available = getAvailableQuantity(product)
                const outOfStock = !isUnlimitedStock(product.stock) && available === 0

                return (
                  <div
                    key={product.id}
                    className="flex min-h-44 flex-col justify-between rounded-xl p-3 text-left shadow-border transition-[box-shadow] duration-150 ease-out hover:shadow-border-hover"
                  >
                    <div className="flex flex-1 flex-col gap-2">
                      <span className="flex items-start justify-between gap-2">
                        <span className="min-w-0 flex flex-col gap-0.5">
                          <span className="text-sm font-medium text-balance">{product.name}</span>
                          <span className="text-xs text-muted-foreground text-pretty">{product.category}</span>
                          <span className="text-xs text-muted-foreground tabular-nums">{product.sku}</span>
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-1">
                          {inCartQty > 0 ? (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary tabular-nums">
                              {inCartQty} in cart
                            </span>
                          ) : null}
                          {isLowStock(product.stock) ? (
                            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-700 tabular-nums">
                              Low stock
                            </span>
                          ) : null}
                        </span>
                      </span>
                      <span className="line-clamp-2 text-xs text-muted-foreground text-pretty">{product.description}</span>
                    </div>

                    <span className="mt-3 flex items-end justify-between gap-3">
                      <span className="flex flex-col gap-0.5">
                        <span className="text-base font-semibold tabular-nums">{formatCurrency(product.price)}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {isUnlimitedStock(product.stock) ? 'Service item' : `${product.stock} in stock`}
                        </span>
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        disabled={outOfStock}
                        className={pressableButtonClass}
                        onClick={() => addToCart(product)}
                      >
                        <Plus data-icon="inline-start" aria-hidden="true" />
                        Add
                      </Button>
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="flex min-h-0 flex-col gap-0 border-0 py-0 shadow-border">
        <CardHeader className="shrink-0 gap-1 border-b px-4 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-baseline gap-2">
              <CardTitle className="text-sm text-balance">Current Sale</CardTitle>
              <CardDescription className="truncate text-xs text-pretty">
                {cartItemCount > 0
                  ? `${cartItemCount} item${cartItemCount === 1 ? '' : 's'}`
                  : 'No items yet'}
              </CardDescription>
            </div>
            {cartItemCount > 0 ? (
              <span className="relative flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ShoppingCart className="size-4" aria-hidden="true" />
                <span className="sr-only">{cartItemCount} items in cart</span>
                <span className="absolute -top-1 -right-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground tabular-nums">
                  {cartItemCount}
                </span>
              </span>
            ) : null}
          </div>
        </CardHeader>

        <CardContent className="flex min-h-0 flex-1 flex-col gap-2.5 px-4 pt-3 pb-4">
          <div
            className={cn(
              'grid shrink-0 transition-[grid-template-rows,opacity] duration-150 ease-in',
              actionMessage ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
            )}
          >
            <div className="overflow-hidden">
              <p
                className={cn(
                  'rounded-lg px-3 py-2 text-sm transition-[transform] duration-150 ease-in text-pretty',
                  checkoutComplete ? 'bg-emerald-500/10 text-emerald-700' : 'bg-muted text-muted-foreground',
                  actionMessage ? 'translate-y-0' : '-translate-y-3',
                )}
                role="status"
                aria-live="polite"
              >
                {actionMessage || '\u00a0'}
              </p>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto">
            {cartItems.length === 0 ? (
              <div className="rounded-lg border border-dashed bg-background px-4 py-3 text-center shadow-border">
                <p className="text-sm text-muted-foreground text-pretty">
                  Add products from the catalog to start a sale.
                </p>
              </div>
            ) : (
              cartItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 rounded-lg bg-background p-2.5 shadow-border"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-balance">{item.name}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">{formatCurrency(item.price)} each</p>
                    <p className="text-sm font-medium tabular-nums">{formatCurrency(item.price * item.quantity)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      className={cn(pressableButtonClass, qtyButtonClass)}
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      aria-label={`Decrease quantity of ${item.name}`}
                    >
                      <Minus aria-hidden="true" />
                    </Button>
                    <span className="w-8 text-center text-sm font-medium tabular-nums">{item.quantity}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      className={cn(pressableButtonClass, qtyButtonClass)}
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      disabled={!isUnlimitedStock(item.stock) && item.quantity >= item.stock}
                      aria-label={`Increase quantity of ${item.name}`}
                    >
                      <Plus aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex shrink-0 flex-col gap-1.5 border-t pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax 11%</span>
              <span className="tabular-nums">{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="flex shrink-0 gap-2">
            <Button
              className={cn('h-10 flex-1', pressableButtonClass)}
              disabled={cartItems.length === 0 || checkoutComplete}
              onClick={handleCheckout}
            >
              {checkoutComplete ? (
                <>
                  <Check data-icon="inline-start" aria-hidden="true" />
                  Completed
                </>
              ) : (
                <>
                  <ShoppingCart data-icon="inline-start" aria-hidden="true" />
                  Checkout
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className={cn('h-10', pressableButtonClass)}
              onClick={handleClearCart}
              disabled={cartItems.length === 0 || checkoutComplete}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
