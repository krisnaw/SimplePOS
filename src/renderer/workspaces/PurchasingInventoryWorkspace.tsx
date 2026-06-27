import { type FormEvent, useMemo, useState } from 'react'
import {
  AlertCircle,
  CalendarClock,
  Check,
  ClipboardList,
  CreditCard,
  FileText,
  History,
  Package,
  PackageCheck,
  Plus,
  ReceiptText,
  Search,
  Trash2,
  Truck,
  WalletCards,
  X,
} from 'lucide-react'
import { Button } from '@/renderer/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/renderer/components/ui/card'
import { Input } from '@/renderer/components/ui/input'
import { Label } from '@/renderer/components/ui/label'
import { BaseSelect } from '@/renderer/components/ui/base-select'
import { formatCurrency } from '@/renderer/lib/formatters'
import { cn } from '@/renderer/lib/utils'

type InventoryView = 'products' | 'purchases' | 'payables'
type PaymentStatus = 'unpaid' | 'partial' | 'paid'
type ReceiptStatus = 'received' | 'void'

type InventoryProduct = {
  id: number
  sku: string
  name: string
  category: string
  unitType: 'piece' | 'litre' | 'set' | 'box'
  stockQty: number
  minStock: number
  sellingPrice: number
  lastPurchaseCost: number
}

type PurchaseLineDraft = {
  productId: number
  quantity: number
  unitCost: number
}

type PurchaseInvoice = {
  id: string
  supplierName: string
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  receiptStatus: ReceiptStatus
  paymentStatus: PaymentStatus
  amountPaid: number
  notes: string
  items: Array<PurchaseLineDraft & {
    sku: string
    name: string
  }>
}

type PurchaseFormState = {
  supplierName: string
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  amountPaid: string
  notes: string
  productId: string
  quantity: string
  unitCost: string
}

const today = new Date().toISOString().slice(0, 10)

const initialProducts: InventoryProduct[] = [
  {
    id: 1,
    sku: 'OIL-FLT-014',
    name: 'Oil Filter',
    category: 'Engine',
    unitType: 'piece',
    stockQty: 8,
    minStock: 6,
    sellingPrice: 55000,
    lastPurchaseCost: 38000,
  },
  {
    id: 2,
    sku: 'ENG-OIL-4L',
    name: 'Engine Oil 4L',
    category: 'Lubricants',
    unitType: 'litre',
    stockQty: 14,
    minStock: 8,
    sellingPrice: 320000,
    lastPurchaseCost: 255000,
  },
  {
    id: 3,
    sku: 'BRK-PAD-FR',
    name: 'Brake Pad Front',
    category: 'Brake',
    unitType: 'set',
    stockQty: 3,
    minStock: 4,
    sellingPrice: 420000,
    lastPurchaseCost: 310000,
  },
  {
    id: 4,
    sku: 'SPK-PLG-STD',
    name: 'Spark Plug Standard',
    category: 'Ignition',
    unitType: 'piece',
    stockQty: 24,
    minStock: 12,
    sellingPrice: 45000,
    lastPurchaseCost: 28000,
  },
]

const initialPurchases: PurchaseInvoice[] = [
  {
    id: 'PI-LOCAL-1',
    supplierName: 'Bali Motor Supply',
    invoiceNumber: 'BMS-2026-041',
    invoiceDate: today,
    dueDate: today,
    receiptStatus: 'received',
    paymentStatus: 'unpaid',
    amountPaid: 0,
    notes: 'Pay after closing cash count.',
    items: [
      { productId: 1, sku: 'OIL-FLT-014', name: 'Oil Filter', quantity: 10, unitCost: 38000 },
      { productId: 4, sku: 'SPK-PLG-STD', name: 'Spark Plug Standard', quantity: 12, unitCost: 28000 },
    ],
  },
  {
    id: 'PI-LOCAL-2',
    supplierName: 'Dewata Parts',
    invoiceNumber: 'DP-7712',
    invoiceDate: '2026-06-22',
    dueDate: '2026-06-28',
    receiptStatus: 'received',
    paymentStatus: 'partial',
    amountPaid: 500000,
    notes: 'Remaining balance due this week.',
    items: [
      { productId: 2, sku: 'ENG-OIL-4L', name: 'Engine Oil 4L', quantity: 4, unitCost: 255000 },
    ],
  },
]

const emptyForm: PurchaseFormState = {
  supplierName: '',
  invoiceNumber: '',
  invoiceDate: today,
  dueDate: '',
  amountPaid: '',
  notes: '',
  productId: '',
  quantity: '1',
  unitCost: '',
}

const pressableClass =
  'transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out active:scale-[0.96]'

const productGridClass =
  'grid-cols-[minmax(0,1.25fr)_minmax(0,0.65fr)_104px_96px_104px_112px]'

const purchaseGridClass =
  'grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)_104px_108px_112px]'

function getInvoiceTotal(invoice: PurchaseInvoice): number {
  return invoice.items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0)
}

function getInvoiceBalance(invoice: PurchaseInvoice): number {
  return Math.max(getInvoiceTotal(invoice) - invoice.amountPaid, 0)
}

function getPaymentStatus(amountPaid: number, total: number): PaymentStatus {
  if (total > 0 && amountPaid >= total) return 'paid'
  if (amountPaid > 0) return 'partial'
  return 'unpaid'
}

function formatDate(value: string): string {
  if (!value) return '-'

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

function isDueSoon(value: string): boolean {
  if (!value) return false

  const due = new Date(`${value}T00:00:00`).getTime()
  const now = new Date(`${today}T00:00:00`).getTime()
  const diffDays = Math.ceil((due - now) / 86_400_000)

  return diffDays <= 2
}

function PaymentStatusPill({ status }: { status: PaymentStatus }) {
  return (
    <span
      className={cn(
        'inline-flex min-h-6 w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium capitalize tabular-nums',
        status === 'paid' && 'bg-emerald-500/10 text-emerald-700',
        status === 'partial' && 'bg-amber-500/10 text-amber-700',
        status === 'unpaid' && 'bg-destructive/10 text-destructive',
      )}
    >
      {status === 'paid' ? <Check className="size-3.5" aria-hidden="true" /> : null}
      {status === 'partial' ? <WalletCards className="size-3.5" aria-hidden="true" /> : null}
      {status === 'unpaid' ? <CalendarClock className="size-3.5" aria-hidden="true" /> : null}
      {status}
    </span>
  )
}

function MetricCard({
  title,
  description,
  value,
  icon: Icon,
}: {
  title: string
  description: string
  value: string
  icon: typeof Package
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate text-sm">{title}</CardTitle>
            <CardDescription className="text-xs text-pretty">{description}</CardDescription>
          </div>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Icon className="size-4" aria-hidden="true" />
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="truncate text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  )
}

export function PurchasingInventoryWorkspace() {
  const [view, setView] = useState<InventoryView>('purchases')
  const [products, setProducts] = useState<InventoryProduct[]>(initialProducts)
  const [purchases, setPurchases] = useState<PurchaseInvoice[]>(initialPurchases)
  const [searchQuery, setSearchQuery] = useState('')
  const [form, setForm] = useState<PurchaseFormState>(emptyForm)
  const [draftLines, setDraftLines] = useState<PurchaseLineDraft[]>([])
  const [message, setMessage] = useState('')

  const normalizedSearch = searchQuery.trim().toLowerCase()
  const filteredProducts = useMemo(() => {
    if (!normalizedSearch) return products

    return products.filter((product) =>
      [product.name, product.sku, product.category].some((value) => value.toLowerCase().includes(normalizedSearch)),
    )
  }, [normalizedSearch, products])

  const filteredPurchases = useMemo(() => {
    if (!normalizedSearch) return purchases

    return purchases.filter((purchase) =>
      [
        purchase.supplierName,
        purchase.invoiceNumber,
        purchase.paymentStatus,
        ...purchase.items.flatMap((item) => [item.name, item.sku]),
      ].some((value) => value.toLowerCase().includes(normalizedSearch)),
    )
  }, [normalizedSearch, purchases])

  const unpaidPurchases = purchases.filter((purchase) => purchase.paymentStatus !== 'paid')
  const lowStockCount = products.filter((product) => product.stockQty <= product.minStock).length
  const totalStockUnits = products.reduce((sum, product) => sum + product.stockQty, 0)
  const retailValue = products.reduce((sum, product) => sum + product.stockQty * product.sellingPrice, 0)
  const payableTotal = unpaidPurchases.reduce((sum, purchase) => sum + getInvoiceBalance(purchase), 0)
  const draftTotal = draftLines.reduce((sum, line) => sum + line.quantity * line.unitCost, 0)
  const amountPaid = Math.max(Number(form.amountPaid) || 0, 0)
  const draftBalance = Math.max(draftTotal - amountPaid, 0)

  function updateForm<K extends keyof PurchaseFormState>(field: K, value: PurchaseFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function addDraftLine() {
    const productId = Number(form.productId)
    const quantity = Number(form.quantity)
    const unitCost = Number(form.unitCost)
    const product = products.find((item) => item.id === productId)

    if (!product || quantity <= 0 || unitCost < 0) {
      setMessage('Choose a product, quantity, and purchase cost before adding a line.')
      return
    }

    setDraftLines((current) => {
      const existing = current.find((line) => line.productId === productId)
      if (!existing) return [...current, { productId, quantity, unitCost }]

      return current.map((line) =>
        line.productId === productId
          ? { ...line, quantity: line.quantity + quantity, unitCost }
          : line,
      )
    })
    setForm((current) => ({ ...current, productId: '', quantity: '1', unitCost: '' }))
    setMessage('')
  }

  function removeDraftLine(productId: number) {
    setDraftLines((current) => current.filter((line) => line.productId !== productId))
  }

  function savePurchase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!form.supplierName.trim() || !form.invoiceNumber.trim() || draftLines.length === 0) {
      setMessage('Supplier, invoice number, and at least one product line are required.')
      return
    }

    if (amountPaid > draftTotal) {
      setMessage('Amount paid cannot exceed the invoice total.')
      return
    }

    const nextPurchase: PurchaseInvoice = {
      id: `PI-LOCAL-${Date.now()}`,
      supplierName: form.supplierName.trim(),
      invoiceNumber: form.invoiceNumber.trim(),
      invoiceDate: form.invoiceDate || today,
      dueDate: form.dueDate,
      receiptStatus: 'received',
      paymentStatus: getPaymentStatus(amountPaid, draftTotal),
      amountPaid,
      notes: form.notes.trim(),
      items: draftLines.map((line) => {
        const product = products.find((item) => item.id === line.productId)

        return {
          ...line,
          sku: product?.sku ?? 'UNKNOWN',
          name: product?.name ?? 'Unknown product',
        }
      }),
    }

    setProducts((currentProducts) =>
      currentProducts.map((product) => {
        const line = draftLines.find((item) => item.productId === product.id)
        if (!line) return product

        return {
          ...product,
          stockQty: product.stockQty + line.quantity,
          lastPurchaseCost: line.unitCost,
        }
      }),
    )
    setPurchases((current) => [nextPurchase, ...current])
    setForm(emptyForm)
    setDraftLines([])
    setMessage(`Recorded ${nextPurchase.invoiceNumber}. Stock was added; payment is ${nextPurchase.paymentStatus}.`)
  }

  function recordPayment(invoiceId: string) {
    setPurchases((current) =>
      current.map((purchase) => {
        if (purchase.id !== invoiceId) return purchase

        const total = getInvoiceTotal(purchase)
        return {
          ...purchase,
          amountPaid: total,
          paymentStatus: 'paid',
        }
      }),
    )
  }

  return (
    <div className="grid h-full min-h-0 min-w-0 gap-3 overflow-hidden xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex min-h-0 min-w-0 flex-col gap-3 overflow-hidden">
        <div className="grid shrink-0 gap-3 md:grid-cols-4">
          <MetricCard title="Active SKUs" description="Products available for jobs" value={String(products.length)} icon={Package} />
          <MetricCard title="Stock Units" description="Current quantity on hand" value={String(totalStockUnits)} icon={PackageCheck} />
          <MetricCard title="Low Stock" description="At or below minimum" value={String(lowStockCount)} icon={AlertCircle} />
          <MetricCard title="Payables" description="Unpaid supplier invoices" value={formatCurrency(payableTotal)} icon={CreditCard} />
        </div>

        <Card className="min-h-0 flex-1 overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <CardTitle>Inventory Purchasing</CardTitle>
                <CardDescription>
                  Record supplier invoices, receive stock, and track unpaid balances.
                </CardDescription>
              </div>
              <CardAction>
                <div className="flex h-10 items-center gap-1 rounded-lg bg-muted p-1" role="tablist" aria-label="Inventory views">
                  {[
                    { id: 'products', label: 'Products', icon: Package },
                    { id: 'purchases', label: 'Purchases', icon: ReceiptText },
                    { id: 'payables', label: 'Payables', icon: WalletCards },
                  ].map((item) => {
                    const Icon = item.icon
                    const isActive = view === item.id

                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => setView(item.id as InventoryView)}
                        className={cn(
                          'flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-[background-color,color,box-shadow,transform] duration-150 ease-out active:scale-[0.96]',
                          isActive
                            ? 'bg-background text-foreground shadow-border'
                            : 'text-muted-foreground hover:text-foreground',
                        )}
                      >
                        <Icon className="size-3.5" aria-hidden="true" />
                        <span className="hidden sm:inline">{item.label}</span>
                      </button>
                    )
                  })}
                </div>
              </CardAction>
            </div>
          </CardHeader>

          <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden pt-1">
            <div className="relative shrink-0">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={view === 'products' ? 'Search SKU, product, or category' : 'Search supplier, invoice, status, or item'}
                className="h-10 pl-10 pr-10"
              />
              {searchQuery ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 flex size-10 items-center justify-center rounded-md text-muted-foreground transition-[background-color,color,transform] duration-150 ease-out hover:bg-muted hover:text-foreground active:scale-[0.96]"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              ) : null}
            </div>

            {view === 'products' ? (
              <div className="min-h-0 flex-1 overflow-auto rounded-lg border bg-background">
                <div
                  className={cn(
                    'sticky top-0 z-10 grid min-w-[760px] items-center gap-3 border-b bg-muted/95 px-3 py-2 text-xs font-medium text-muted-foreground backdrop-blur',
                    productGridClass,
                  )}
                >
                  <span>Product</span>
                  <span>Category</span>
                  <span className="text-right">Sell Price</span>
                  <span>Stock</span>
                  <span>Last Cost</span>
                  <span>Status</span>
                </div>
                <div className="min-w-[760px] divide-y">
                  {filteredProducts.map((product) => {
                    const lowStock = product.stockQty <= product.minStock

                    return (
                      <div
                        key={product.id}
                        className={cn(
                          'grid min-h-14 items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-muted/50',
                          productGridClass,
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{product.name}</span>
                          <span className="block truncate text-xs text-muted-foreground tabular-nums">{product.sku}</span>
                        </span>
                        <span className="truncate text-muted-foreground">{product.category}</span>
                        <span className="text-right tabular-nums">{formatCurrency(product.sellingPrice)}</span>
                        <span className="tabular-nums">{product.stockQty} {product.unitType}</span>
                        <span className="tabular-nums">{formatCurrency(product.lastPurchaseCost)}</span>
                        <span
                          className={cn(
                            'inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-medium',
                            lowStock ? 'bg-destructive/10 text-destructive' : 'bg-emerald-500/10 text-emerald-700',
                          )}
                        >
                          {lowStock ? 'Low stock' : 'In stock'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {view === 'purchases' ? (
              <div className="grid min-h-0 flex-1 gap-3 overflow-hidden lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="min-h-0 overflow-auto rounded-lg border bg-background">
                  <div
                    className={cn(
                      'sticky top-0 z-10 grid min-w-[720px] items-center gap-3 border-b bg-muted/95 px-3 py-2 text-xs font-medium text-muted-foreground backdrop-blur',
                      purchaseGridClass,
                    )}
                  >
                    <span>Supplier Invoice</span>
                    <span>Items</span>
                    <span className="text-right">Total</span>
                    <span>Payment</span>
                    <span>Due</span>
                  </div>
                  <div className="min-w-[720px] divide-y">
                    {filteredPurchases.map((purchase) => {
                      const total = getInvoiceTotal(purchase)
                      const balance = getInvoiceBalance(purchase)

                      return (
                        <div
                          key={purchase.id}
                          className={cn(
                            'grid min-h-16 items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-muted/50',
                            purchaseGridClass,
                          )}
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{purchase.invoiceNumber}</span>
                            <span className="block truncate text-xs text-muted-foreground">{purchase.supplierName} · {formatDate(purchase.invoiceDate)}</span>
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-xs text-muted-foreground">
                              {purchase.items.length} line{purchase.items.length === 1 ? '' : 's'}
                            </span>
                            <span className="block truncate text-xs">
                              {purchase.items.map((item) => item.name).join(', ')}
                            </span>
                          </span>
                          <span className="text-right tabular-nums">
                            <span className="block font-medium">{formatCurrency(total)}</span>
                            {balance > 0 ? <span className="block text-xs text-muted-foreground">{formatCurrency(balance)} due</span> : null}
                          </span>
                          <PaymentStatusPill status={purchase.paymentStatus} />
                          <span className={cn('text-xs tabular-nums', isDueSoon(purchase.dueDate) && purchase.paymentStatus !== 'paid' ? 'font-medium text-destructive' : 'text-muted-foreground')}>
                            {purchase.dueDate ? formatDate(purchase.dueDate) : '-'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="min-h-0 overflow-auto rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center gap-2">
                    <span className="flex size-8 items-center justify-center rounded-md bg-background text-muted-foreground shadow-border">
                      <History className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">Recent activity</p>
                      <p className="text-xs text-muted-foreground text-pretty">UI-only local purchase records.</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-col gap-2">
                    {purchases.slice(0, 3).map((purchase) => (
                      <div key={purchase.id} className="rounded-md bg-background p-2 shadow-border">
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 truncate text-sm font-medium">{purchase.supplierName}</p>
                          <PaymentStatusPill status={purchase.paymentStatus} />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                          {purchase.invoiceNumber} · {formatCurrency(getInvoiceTotal(purchase))}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {view === 'payables' ? (
              <div className="grid min-h-0 flex-1 content-start gap-3 overflow-auto md:grid-cols-2 xl:grid-cols-3">
                {unpaidPurchases.length === 0 ? (
                  <div className="flex min-h-44 items-center justify-center rounded-lg border border-dashed bg-background p-6 text-center md:col-span-2 xl:col-span-3">
                    <div className="flex max-w-sm flex-col items-center gap-2">
                      <Check className="size-6 text-emerald-600" aria-hidden="true" />
                      <p className="text-sm font-medium">No unpaid supplier invoices</p>
                      <p className="text-sm text-muted-foreground text-pretty">New unpaid purchases will appear here after stock is received.</p>
                    </div>
                  </div>
                ) : (
                  unpaidPurchases.map((purchase) => {
                    const balance = getInvoiceBalance(purchase)

                    return (
                      <div key={purchase.id} className="flex min-h-44 flex-col justify-between rounded-lg border bg-background p-3 shadow-sm">
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold">{purchase.supplierName}</span>
                              <span className="block truncate text-xs text-muted-foreground tabular-nums">{purchase.invoiceNumber}</span>
                            </span>
                            <PaymentStatusPill status={purchase.paymentStatus} />
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-md bg-muted/70 p-2">
                              <p className="text-muted-foreground">Balance</p>
                              <p className="mt-1 font-semibold tabular-nums">{formatCurrency(balance)}</p>
                            </div>
                            <div className="rounded-md bg-muted/70 p-2">
                              <p className="text-muted-foreground">Due</p>
                              <p className={cn('mt-1 font-semibold tabular-nums', isDueSoon(purchase.dueDate) && 'text-destructive')}>
                                {purchase.dueDate ? formatDate(purchase.dueDate) : '-'}
                              </p>
                            </div>
                          </div>
                          {purchase.notes ? (
                            <p className="mt-3 line-clamp-2 text-xs text-muted-foreground text-pretty">{purchase.notes}</p>
                          ) : null}
                        </div>
                        <Button type="button" size="sm" className={cn('mt-3 w-full', pressableClass)} onClick={() => recordPayment(purchase.id)}>
                          <CreditCard data-icon="inline-start" aria-hidden="true" />
                          Mark paid
                        </Button>
                      </div>
                    )
                  })
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card className="min-h-0 overflow-hidden">
        <CardHeader>
          <CardTitle>Record Purchase</CardTitle>
          <CardDescription>
            Receive supplier stock now, then track whether the invoice is unpaid, partial, or paid.
          </CardDescription>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 overflow-y-auto">
          <form onSubmit={savePurchase} className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="grid gap-2">
                <Label htmlFor="purchase-supplier">Supplier</Label>
                <Input
                  id="purchase-supplier"
                  value={form.supplierName}
                  onChange={(event) => updateForm('supplierName', event.target.value)}
                  placeholder="Bali Motor Supply"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="purchase-invoice">Invoice number</Label>
                <Input
                  id="purchase-invoice"
                  value={form.invoiceNumber}
                  onChange={(event) => updateForm('invoiceNumber', event.target.value)}
                  placeholder="BMS-2026-042"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="purchase-date">Invoice date</Label>
                <Input
                  id="purchase-date"
                  type="date"
                  value={form.invoiceDate}
                  onChange={(event) => updateForm('invoiceDate', event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="purchase-due-date">Due date</Label>
                <Input
                  id="purchase-due-date"
                  type="date"
                  value={form.dueDate}
                  onChange={(event) => updateForm('dueDate', event.target.value)}
                />
              </div>
            </div>

            <div className="rounded-lg border bg-background p-3">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Truck className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Received items</p>
                  <p className="text-xs text-muted-foreground text-pretty">Saving these lines will add stock locally.</p>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="purchase-product">Product</Label>
                <BaseSelect
                  id="purchase-product"
                  value={form.productId}
                  ariaLabel="Product"
                  placeholder="Choose product"
                  options={[
                    { value: '', label: 'Choose product' },
                    ...products.map((product) => ({
                      value: String(product.id),
                      label: `${product.sku} · ${product.name}`,
                    })),
                  ]}
                  onValueChange={(value) => updateForm('productId', value)}
                />
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="purchase-qty">Qty</Label>
                  <Input
                    id="purchase-qty"
                    type="number"
                    min="1"
                    value={form.quantity}
                    onChange={(event) => updateForm('quantity', event.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="purchase-cost">Unit cost</Label>
                  <Input
                    id="purchase-cost"
                    type="number"
                    min="0"
                    value={form.unitCost}
                    onChange={(event) => updateForm('unitCost', event.target.value)}
                    placeholder="38000"
                  />
                </div>
              </div>

              <Button type="button" variant="outline" className={cn('mt-3 w-full', pressableClass)} onClick={addDraftLine}>
                <Plus data-icon="inline-start" aria-hidden="true" />
                Add line
              </Button>

              <div className="mt-3 flex flex-col gap-2">
                {draftLines.length === 0 ? (
                  <div className="rounded-md border border-dashed p-3 text-center text-sm text-muted-foreground">
                    No items added yet.
                  </div>
                ) : (
                  draftLines.map((line) => {
                    const product = products.find((item) => item.id === line.productId)

                    return (
                      <div key={line.productId} className="flex items-center justify-between gap-2 rounded-md bg-muted/70 p-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{product?.name ?? 'Unknown product'}</p>
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {line.quantity} x {formatCurrency(line.unitCost)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <span className="text-sm font-semibold tabular-nums">{formatCurrency(line.quantity * line.unitCost)}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className={pressableClass}
                            onClick={() => removeDraftLine(line.productId)}
                            aria-label={`Remove ${product?.name ?? 'line item'}`}
                          >
                            <Trash2 aria-hidden="true" />
                          </Button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="purchase-paid">Amount paid</Label>
              <Input
                id="purchase-paid"
                type="number"
                min="0"
                value={form.amountPaid}
                onChange={(event) => updateForm('amountPaid', event.target.value)}
                placeholder="0"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="purchase-notes">Notes</Label>
              <Input
                id="purchase-notes"
                value={form.notes}
                onChange={(event) => updateForm('notes', event.target.value)}
                placeholder="Pay at end of week"
              />
            </div>

            <div className="rounded-lg bg-muted/70 p-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Purchase total</span>
                <span className="font-semibold tabular-nums">{formatCurrency(draftTotal)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Amount paid</span>
                <span className="font-semibold tabular-nums">{formatCurrency(amountPaid)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 border-t pt-2 text-base font-semibold">
                <span>Balance due</span>
                <span className="tabular-nums">{formatCurrency(draftBalance)}</span>
              </div>
            </div>

            {message ? (
              <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground text-pretty" role="status">
                {message}
              </p>
            ) : null}

            <Button type="submit" className={cn('h-10 w-full', pressableClass)}>
              <FileText data-icon="inline-start" aria-hidden="true" />
              Save supplier invoice
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
