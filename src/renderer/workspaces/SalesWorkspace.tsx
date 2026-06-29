import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, LayoutGrid, List, Loader2, Minus, Package, Plus, Search, ShoppingCart, Wrench, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/renderer/components/ui/button'
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogPopup,
  AlertDialogPortal,
  AlertDialogTitle,
} from '@/renderer/components/ui/alert-dialog'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/renderer/components/ui/card'
import { Input } from '@/renderer/components/ui/input'
import { Label } from '@/renderer/components/ui/label'
import { BaseSelect } from '@/renderer/components/ui/base-select'
import { cn } from '@/renderer/lib/utils'
import { formatCurrency } from '@/renderer/lib/formatters'
import type { AuthenticatedUser } from '@/shared/types/user'
import type { CustomerSummary } from '@/shared/types/customer'
import { SalesCatalogListItem } from './SalesCatalogListItem'
import type { SimplePosApi, SampleProduct, CartItem } from './SalesWorkspace.types'

const UNLIMITED_STOCK = 999

const pressableButtonClass =
  'transition-[transform,box-shadow] duration-150 ease-out active:scale-[0.96] active:translate-y-0'

const qtyButtonClass =
  'relative after:absolute after:top-1/2 after:left-1/2 after:size-10 after:-translate-x-1/2 after:-translate-y-1/2'

type CatalogViewMode = 'grid' | 'list'

function isUnlimitedStock(stock: number): boolean {
  return stock >= UNLIMITED_STOCK
}

function isLowStock(product: SampleProduct): boolean {
  return product.itemType === 'product' && !isUnlimitedStock(product.stock) && product.stock <= product.minStock
}

function getCartKey(item: SampleProduct): string {
  return `${item.itemType}:${item.id}`
}

function getItemTypeClasses(item: SampleProduct): string {
  return item.itemType === 'service'
    ? 'bg-amber-500/10 text-amber-700 ring-amber-500/20'
    : 'bg-sky-500/10 text-sky-700 ring-sky-500/20'
}

function ItemTypeIcon({ item }: { item: SampleProduct }) {
  const Icon = item.itemType === 'service' ? Wrench : Package

  return <Icon className="size-3.5" aria-hidden="true" />
}

export function SalesWorkspace({ currentUser }: { currentUser: AuthenticatedUser }) {
  const { t } = useTranslation()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [catalogItems, setCatalogItems] = useState<SampleProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [customers, setCustomers] = useState<CustomerSummary[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [viewMode, setViewMode] = useState<CatalogViewMode>('list')
  const [itemsPerPage] = useState(100)
  const [currentPage, setCurrentPage] = useState(1)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [actionMessage, setActionMessage] = useState('')
  const [checkoutComplete, setCheckoutComplete] = useState(false)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  const normalizedSearchQuery = searchQuery.trim().toLowerCase()
  const categories = useMemo(() => ['All', ...new Set(catalogItems.map((item) => item.category))], [catalogItems])

  const visibleProducts = useMemo(() => {
    return catalogItems.filter((product) => {
      const matchesCategory = categoryFilter === 'All' || product.category === categoryFilter
      const matchesSearch =
        normalizedSearchQuery.length === 0 ||
        [
          product.name,
          product.category,
          product.sku,
          product.description,
          product.compatibility,
          product.itemType,
        ].some((value) =>
          value.toLowerCase().includes(normalizedSearchQuery),
        )

      return matchesCategory && matchesSearch
    })
  }, [catalogItems, categoryFilter, normalizedSearchQuery])

  const cartQuantityByProductId = useMemo(() => {
    return new Map(cartItems.map((item) => [item.cartKey, item.quantity]))
  }, [cartItems])

  const subtotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0)
  const total = subtotal
  const cartItemCount = cartItems.reduce((count, item) => count + item.quantity, 0)
  const pageCount = Math.max(1, Math.ceil(visibleProducts.length / itemsPerPage))
  const pageStart = (currentPage - 1) * itemsPerPage
  const paginatedProducts = visibleProducts.slice(pageStart, pageStart + itemsPerPage)
  const shownStart = visibleProducts.length === 0 ? 0 : pageStart + 1
  const shownEnd = Math.min(pageStart + itemsPerPage, visibleProducts.length)

  useEffect(() => {
    searchInputRef.current?.focus()
  }, [])

  useEffect(() => {
    let isMounted = true

    async function loadCatalog() {
      setIsLoading(true)
      const [products, categories, services, customerList] = await Promise.all([
        window.simplepos?.products.list(),
        window.simplepos?.categories.list(),
        window.simplepos?.services.list(),
        window.simplepos?.customers.list(),
      ])

      if (!isMounted) return

      setCustomers(customerList ?? [])

      const categoryNames = new Map((categories ?? []).map((category) => [category.id, category.name]))
      const productItems = (products ?? []).map<SampleProduct>((product) => ({
        id: product.id,
        itemType: 'product',
        name: product.name,
        category: categoryNames.get(product.categoryId ?? 0) ?? t('sales.productsCategory'),
        sku: product.sku,
        description: product.description ?? t('sales.inventoryProduct'),
        compatibility: product.barcode
          ? t('sales.barcode', { barcode: product.barcode })
          : t('sales.stockWithUnit', { count: product.stockQty, unit: product.unitType }),
        price: product.unitPrice,
        stock: product.stockQty,
        minStock: product.minStock,
      }))
      const serviceItems = (services ?? []).map<SampleProduct>((service) => ({
        id: service.id,
        itemType: 'service',
        name: service.name,
        category: service.category ?? t('sales.servicesCategory'),
        sku: service.code,
        description: service.description ?? t('sales.serviceLaborItem'),
        compatibility: t('sales.laborServiceCharge'),
        price: service.price,
        stock: UNLIMITED_STOCK,
        minStock: 0,
      }))

      if (productItems.length > 0 || serviceItems.length > 0) {
        setCatalogItems([...productItems, ...serviceItems])
      }

      setIsLoading(false)
    }

    void loadCatalog().catch(() => {
      if (isMounted) setIsLoading(false)
    })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!actionMessage) return

    const timeoutId = window.setTimeout(() => setActionMessage(''), 2800)
    return () => window.clearTimeout(timeoutId)
  }, [actionMessage])

  useEffect(() => {
    setCurrentPage(1)
  }, [categoryFilter, itemsPerPage, normalizedSearchQuery, viewMode])

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, pageCount))
  }, [pageCount])

  function getAvailableQuantity(product: SampleProduct): number {
    const inCart = cartQuantityByProductId.get(getCartKey(product)) ?? 0
    if (isUnlimitedStock(product.stock)) return Number.POSITIVE_INFINITY
    return Math.max(product.stock - inCart, 0)
  }

  function addToCart(product: SampleProduct, quantity = 1): boolean {
    const available = getAvailableQuantity(product)

    if (available < quantity) {
          setActionMessage(
            isUnlimitedStock(product.stock)
          ? t('sales.unableToAddItem')
          : t('sales.onlyInStock', { count: product.stock, name: product.name }),
      )
      return false
    }

    setCartItems((currentItems) => {
      const cartKey = getCartKey(product)
      const existingItem = currentItems.find((item) => item.cartKey === cartKey)

      if (existingItem) {
        return currentItems.map((item) =>
          item.cartKey === cartKey ? { ...item, quantity: item.quantity + quantity } : item,
        )
      }

      return [...currentItems, { ...product, cartKey, quantity }]
    })

    return true
  }

  function updateQuantity(cartKey: string, quantity: number) {
    const product = catalogItems.find((item) => getCartKey(item) === cartKey)
    if (!product) return

    if (quantity <= 0) {
      setCartItems((currentItems) => currentItems.filter((item) => item.cartKey !== cartKey))
      return
    }

    if (!isUnlimitedStock(product.stock) && quantity > product.stock) {
      setActionMessage(t('sales.onlyInStock', { count: product.stock, name: product.name }))
      return
    }

    setCartItems((currentItems) =>
      currentItems.map((item) => (item.cartKey === cartKey ? { ...item, quantity } : item)),
    )
  }

  async function handleCheckout() {
    if (cartItems.length === 0) return

    setIsCheckingOut(true)
    setActionMessage('')

    const result = await window.simplepos?.checkout.create({
      customerId: selectedCustomerId ? Number(selectedCustomerId) : null,
      createdById: currentUser.id,
      paymentMethod: 'cash',
      amountPaid: total,
      items: cartItems.map((item) => ({
        itemType: item.itemType,
        id: item.id,
        quantity: item.quantity,
      })),
    })

    setIsCheckingOut(false)

    if (!result) {
      setActionMessage(t('sales.unableToReachDb'))
      return
    }

    if (!result.ok || !result.checkout) {
      setActionMessage(result.message)
      return
    }

    setCheckoutComplete(true)
    setActionMessage(`${result.message} — ${formatCurrency(result.checkout.total)}`)
    setCatalogItems((currentItems) =>
      currentItems.map((item) => {
        const soldItem = cartItems.find((cartItem) => cartItem.itemType === item.itemType && cartItem.id === item.id)

        if (!soldItem || item.itemType !== 'product' || isUnlimitedStock(item.stock)) {
          return item
        }

        return {
          ...item,
          stock: Math.max(item.stock - soldItem.quantity, 0),
        }
      }),
    )

    window.setTimeout(() => {
      setCartItems([])
      setCheckoutComplete(false)
    }, 1800)
  }

  function handleClearCart() {
    setCartItems([])
    setActionMessage(t('sales.cartCleared'))
  }

  return (
    <div className="grid h-full min-h-0 min-w-0 gap-3 overflow-hidden xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card className="min-h-0 overflow-hidden">
        <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden pt-1">
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <div className="relative h-10 min-w-0 flex-1">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex size-10 items-center justify-center text-muted-foreground">
                  <Search aria-hidden="true" className="size-4" />
                </span>
                <Input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={t('sales.searchPlaceholder')}
                  aria-label={t('sales.searchAria')}
                  className="h-10 pl-10 pr-10"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    aria-label={t('sales.clearSearch')}
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 flex size-10 items-center justify-center rounded-md text-muted-foreground transition-[background-color,color,transform] duration-150 ease-out hover:bg-muted hover:text-foreground active:scale-[0.96]"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                ) : null}
              </div>

              <div className="flex h-10 shrink-0 items-center gap-1 rounded-lg bg-muted p-1" role="group" aria-label={t('sales.catalogView')}>
                <button
                  type="button"
                  aria-label={t('sales.gridView')}
                  aria-pressed={viewMode === 'grid'}
                  title={t('sales.gridView')}
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'flex size-8 items-center justify-center rounded-md transition-[background-color,color,transform,box-shadow] duration-150 ease-out active:scale-[0.96]',
                    viewMode === 'grid'
                      ? 'bg-background text-foreground shadow-border'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <LayoutGrid className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={t('sales.listView')}
                  aria-pressed={viewMode === 'list'}
                  title={t('sales.listView')}
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'flex size-8 items-center justify-center rounded-md transition-[background-color,color,transform,box-shadow] duration-150 ease-out active:scale-[0.96]',
                    viewMode === 'list'
                      ? 'bg-background text-foreground shadow-border'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <List className="size-4" aria-hidden="true" />
                </button>
              </div>
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
                    {category === 'All' ? t('common.all') : category}
                  </button>
                )
              })}
            </div>

            <p className="text-xs text-muted-foreground text-pretty tabular-nums">
              {t('sales.itemsFound', { count: visibleProducts.length })}
              {searchQuery ? t('sales.matching', { query: searchQuery.trim() }) : null}
            </p>
          </div>

          {isLoading ? (
            <div className="flex h-full min-h-64 items-center justify-center rounded-lg border border-dashed bg-background p-6 text-center shadow-border">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">{t('sales.loadingCatalog')}</p>
              </div>
            </div>
          ) : visibleProducts.length === 0 ? (
            <div className="flex h-full min-h-44 items-center justify-center rounded-lg border border-dashed bg-background p-6 text-center shadow-border">
              <div className="flex max-w-xs flex-col gap-1">
                <p className="text-sm font-medium text-balance">{t('sales.noItemsFound')}</p>
                <p className="text-sm text-muted-foreground text-pretty">
                  {t('sales.noItemsFoundHint')}
                </p>
              </div>
            </div>
          ) : (
            <div
              className={cn(
                'scroll-fade stagger-children min-h-0 flex-1 gap-3 overflow-auto px-1 pt-1 pb-2',
                viewMode === 'grid'
                  ? 'grid auto-rows-auto content-start md:grid-cols-2 xl:grid-cols-3'
                  : 'flex flex-col',
              )}
            >
              {paginatedProducts.map((product) => {
                const cartKey = getCartKey(product)
                const inCartQty = cartQuantityByProductId.get(cartKey) ?? 0
                const available = getAvailableQuantity(product)
                const outOfStock = !isUnlimitedStock(product.stock) && available === 0

                return viewMode === 'list' ? (
                  <SalesCatalogListItem
                    key={cartKey}
                    itemType={product.itemType}
                    typeLabel={product.itemType === 'service' ? t('sales.service') : t('sales.product')}
                    name={product.name}
                    category={product.category}
                    code={product.sku}
                    description={product.description}
                    price={product.price}
                    inventoryLabel={
                      product.itemType === 'service'
                        ? t('sales.serviceItem')
                        : t('sales.inStock', { count: product.stock })
                    }
                    addLabel={t('sales.add')}
                    disabled={outOfStock}
                    onAdd={() => addToCart(product)}
                  />
                ) : (
                  <div
                    key={cartKey}
                    className="flex min-h-0 flex-col justify-between overflow-hidden rounded-lg border bg-background p-3 text-left shadow-sm transition-[box-shadow] duration-150 ease-out hover:shadow-border-hover"
                  >
                    <div className="flex flex-1 flex-col gap-2">
                      <span className="flex items-start justify-between gap-2">
                        <span className="min-w-0 flex flex-col gap-0.5">
                          <span
                            className={cn(
                              'mb-1 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 tabular-nums',
                              getItemTypeClasses(product),
                            )}
                          >
                            <ItemTypeIcon item={product} />
                            {product.itemType === 'service' ? t('sales.service') : t('sales.product')}
                          </span>
                          <span className="text-sm font-medium text-balance">{product.name}</span>
                          <span className="text-xs text-muted-foreground text-pretty">
                            {product.category}
                          </span>
                          <span className="text-xs text-muted-foreground tabular-nums">{product.sku}</span>
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-1">
                          {inCartQty > 0 ? (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary tabular-nums">
                              {t('sales.inCart', { count: inCartQty })}
                            </span>
                          ) : null}
                          {isLowStock(product) ? (
                            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive tabular-nums">
                              {t('sales.lowStock')}
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
                          {product.itemType === 'service' ? t('sales.serviceItem') : t('sales.inStock', { count: product.stock })}
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
                        {t('sales.add')}
                      </Button>
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="min-h-0 overflow-hidden">
        <CardHeader>
          <CardTitle>{t('sales.currentSale')}</CardTitle>
          <CardDescription>
            {cartItemCount > 0
              ? t('sales.itemsFound', { count: cartItemCount })
              : t('sales.noItemsInCart')}
          </CardDescription>
          <CardAction>
            {cartItemCount > 0 ? (
              <span className="relative flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ShoppingCart className="size-4" aria-hidden="true" />
                <span className="sr-only">{t('sales.itemsInCart', { count: cartItemCount })}</span>
                <span className="absolute -top-1 -right-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground tabular-nums">
                  {cartItemCount}
                </span>
              </span>
            ) : null}
          </CardAction>
        </CardHeader>

        <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
          <div className="flex shrink-0 flex-col gap-1.5">
            <Label htmlFor="sale-customer">{t('customers.table.customer')}</Label>
            <BaseSelect
              id="sale-customer"
              value={selectedCustomerId}
              ariaLabel={t('sales.saleCustomer')}
              placeholder={t('invoices.walkInCustomer')}
              disabled={checkoutComplete || isCheckingOut}
              options={[
                { value: '', label: t('invoices.walkInCustomer') },
                ...customers.map((customer) => ({
                  value: String(customer.id),
                  label: `${customer.name}${customer.phone ? ` · ${customer.phone}` : ''}`,
                })),
              ]}
              onValueChange={setSelectedCustomerId}
            />
          </div>

          {actionMessage ? (
            <p
              className={cn(
                'shrink-0 rounded-lg px-3 py-2 text-sm text-pretty',
                checkoutComplete ? 'bg-emerald-500/10 text-emerald-700' : 'bg-muted text-muted-foreground',
              )}
              role="status"
              aria-live="polite"
            >
              {actionMessage}
            </p>
          ) : null}

          <div className="scroll-fade -mx-1 flex min-h-0 flex-1 flex-col gap-2 overflow-auto px-1 py-1">
            {cartItems.length === 0 ? (
              <div className="rounded-lg border border-dashed bg-background px-4 py-3 text-center shadow-border">
                <p className="text-sm text-muted-foreground text-pretty">
                  {t('sales.cartEmptyHint')}
                </p>
              </div>
            ) : (
              cartItems.map((item) => (
                <div
                  key={item.cartKey}
                  className="flex items-start justify-between gap-3 rounded-lg bg-background p-2.5 shadow-border"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-balance">{item.name}</p>
                    <p
                      className={cn(
                        'mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1',
                        getItemTypeClasses(item),
                      )}
                    >
                      <ItemTypeIcon item={item} />
                      {item.itemType === 'service' ? t('sales.service') : t('sales.product')}
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">{t('sales.priceEach', { price: formatCurrency(item.price) })}</p>
                    <p className="text-sm font-medium tabular-nums">{formatCurrency(item.price * item.quantity)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      className={cn(pressableButtonClass, qtyButtonClass)}
                      onClick={() => updateQuantity(item.cartKey, item.quantity - 1)}
                      aria-label={t('sales.decreaseQuantity', { name: item.name })}
                    >
                      <Minus aria-hidden="true" />
                    </Button>
                    <span className="w-8 text-center text-sm font-medium tabular-nums">{item.quantity}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      className={cn(pressableButtonClass, qtyButtonClass)}
                      onClick={() => updateQuantity(item.cartKey, item.quantity + 1)}
                      disabled={!isUnlimitedStock(item.stock) && item.quantity >= item.stock}
                      aria-label={t('sales.increaseQuantity', { name: item.name })}
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
              <span className="text-muted-foreground">{t('sales.subtotal')}</span>
              <span className="tabular-nums">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <span>{t('sales.total')}</span>
              <span className="tabular-nums">{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="flex shrink-0 gap-2">
            <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
              <Button
                className={cn('h-10 flex-1', pressableButtonClass)}
                disabled={cartItems.length === 0 || checkoutComplete || isCheckingOut}
                onClick={() => setIsConfirmOpen(true)}
              >
                {isCheckingOut ? (
                  <>
                    <ShoppingCart data-icon="inline-start" aria-hidden="true" />
                    {t('sales.saving')}
                  </>
                ) : checkoutComplete ? (
                  <>
                    <Check data-icon="inline-start" aria-hidden="true" />
                    {t('sales.completed')}
                  </>
                ) : (
                  <>
                    <ShoppingCart data-icon="inline-start" aria-hidden="true" />
                    {t('sales.checkout')}
                  </>
                )}
              </Button>
              <AlertDialogPortal>
                <AlertDialogBackdrop />
                <AlertDialogPopup>
                  <AlertDialogTitle>{t('sales.confirmCheckoutTitle')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('sales.confirmCheckoutDescription', { total: formatCurrency(total) })}
                  </AlertDialogDescription>
                  <div className="mt-5 flex justify-end gap-2">
                    <AlertDialogClose render={
                      <Button type="button" variant="outline" className={pressableButtonClass}>
                        {t('sales.cancelCheckout')}
                      </Button>
                    } />
                    <AlertDialogClose render={
                      <Button
                        type="button"
                        className={pressableButtonClass}
                        onClick={handleCheckout}
                      >
                        {t('sales.confirmCheckout')}
                      </Button>
                    } />
                  </div>
                </AlertDialogPopup>
              </AlertDialogPortal>
            </AlertDialog>
            <Button
              type="button"
              variant="outline"
              className={cn('h-10', pressableButtonClass)}
              onClick={handleClearCart}
              disabled={cartItems.length === 0 || checkoutComplete || isCheckingOut}
            >
              {t('sales.clearCart')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
