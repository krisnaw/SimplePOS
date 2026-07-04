import {type FormEvent, useEffect, useMemo, useState} from 'react'
import {
  ArrowLeft,
  CalendarClock,
  Check,
  FileText,
  Loader2,
  Minus,
  PackageCheck,
  PackagePlus,
  PencilLine,
  Plus,
  ReceiptText,
  Search,
  Trash2,
  WalletCards,
  X,
} from 'lucide-react'
import {useTranslation} from 'react-i18next'
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogPopup,
  AlertDialogPortal,
  AlertDialogTitle,
} from '@/renderer/components/ui/alert-dialog'
import {Badge} from '@/renderer/components/ui/badge'
import {Button} from '@/renderer/components/ui/button'
import {Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle,} from '@/renderer/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/renderer/components/ui/dialog'
import {Field, FieldDescription, FieldGroup, FieldLabel} from '@/renderer/components/ui/field'
import {Input} from '@/renderer/components/ui/input'
import {BaseSelect} from '@/renderer/components/ui/base-select'
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/renderer/components/ui/table'
import {formatCurrency, formatDate} from '@/renderer/lib/formatters'
import {cn} from '@/renderer/lib/utils'
import type {ProductCategorySummary, ProductSummary} from '@/shared/types/product'
import type {
  PurchaseDetail,
  PurchaseInvoiceStatus,
  PurchaseInvoiceUpdateInput,
  PurchaseItemInput,
  PurchasePaymentStatus,
  PurchaseSummary,
} from '@/shared/types/purchase'
import type {SupplierSummary} from '@/shared/types/supplier'
import type {AuthenticatedUser} from '@/shared/types/user'
import type {StockMovementListInput, StockMovementListResult} from '@/shared/types/stock-movement'
import type {
  AdjustmentForm,
  CategoryFilter,
  Feedback,
  InventoryView,
  InvoiceForm,
  MovementFilters,
  ProductFormState,
  PurchaseForm,
  WorkspaceScreen,
} from './InventoryWorkspace.types'
import {InventoryLayout, type InventoryLayoutTab} from './InventoryLayout'
import {InventoryMovements} from './InventoryMovements'

type InventoryPurchaseProps = {
  currentUser: AuthenticatedUser
  embedded?: boolean
  initialView?: InventoryView
}

const emptyProductForm: ProductFormState = {
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
const now = new Date()
const today = [
  now.getFullYear(),
  String(now.getMonth() + 1).padStart(2, '0'),
  String(now.getDate()).padStart(2, '0'),
].join('-')
const emptyForm: PurchaseForm = {
  supplierId: '',
  supplierInvoiceNumber: '',
  invoiceDate: today,
  paymentStatus: 'unpaid',
  dueDate: '',
  notes: '',
  productId: '',
  quantity: '1',
  unitCost: '',
}
const emptyInvoiceForm: InvoiceForm = {
  supplierInvoiceNumber: '',
  invoiceDate: '',
  paymentStatus: 'unpaid',
  dueDate: '',
  paidAt: today,
  notes: '',
}
const emptyMovementResult: StockMovementListResult = {
  items: [],
  total: 0,
  totalIn: 0,
  totalOut: 0,
}
const emptyMovementFilters: MovementFilters = {
  productId: '',
  movementType: 'all',
  dateFrom: '',
  dateTo: '',
  search: '',
}
const emptyAdjustmentForm: AdjustmentForm = {
  quantity: '',
  reason: '',
}
const movementPageSize = 50
const pressableClass =
  'transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out active:scale-[0.96]'

function PaymentBadge({ status }: { status: PurchasePaymentStatus }) {
  return (
    <Badge variant={status === 'paid' ? 'secondary' : 'destructive'}>
      {status === 'paid' ? <Check data-icon="inline-start" aria-hidden="true" /> : <CalendarClock data-icon="inline-start" aria-hidden="true" />}
      {status === 'paid' ? 'Paid' : 'Unpaid'}
    </Badge>
  )
}

function InvoiceBadge({ status }: { status: PurchaseInvoiceStatus }) {
  return (
    <Badge variant={status === 'received' ? 'secondary' : 'outline'}>
      {status === 'received' ? <ReceiptText data-icon="inline-start" aria-hidden="true" /> : <CalendarClock data-icon="inline-start" aria-hidden="true" />}
      {status === 'received' ? 'Invoice received' : 'Needs invoice'}
    </Badge>
  )
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

export function InventoryPurchase({
  currentUser,
  embedded = false,
  initialView = 'purchases',
}: InventoryPurchaseProps) {
  const { t } = useTranslation()
  const [products, setProducts] = useState<ProductSummary[]>([])
  const [categories, setCategories] = useState<ProductCategorySummary[]>([])
  const [suppliers, setSuppliers] = useState<SupplierSummary[]>([])
  const [purchases, setPurchases] = useState<PurchaseSummary[]>([])
  const [movements, setMovements] = useState<StockMovementListResult>(emptyMovementResult)
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseDetail | null>(null)
  const [view, setView] = useState<InventoryView>(initialView)
  const [screen, setScreen] = useState<WorkspaceScreen>('list')
  const [search, setSearch] = useState('')
  const [movementFilters, setMovementFilters] = useState<MovementFilters>(emptyMovementFilters)
  const [movementPage, setMovementPage] = useState(0)
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [form, setForm] = useState<PurchaseForm>(emptyForm)
  const [invoiceForm, setInvoiceForm] = useState<InvoiceForm>(emptyInvoiceForm)
  const [productForm, setProductForm] = useState<ProductFormState>(emptyProductForm)
  const [editingProduct, setEditingProduct] = useState<ProductSummary | null>(null)
  const [adjustingProduct, setAdjustingProduct] = useState<ProductSummary | null>(null)
  const [adjustmentForm, setAdjustmentForm] = useState<AdjustmentForm>(emptyAdjustmentForm)
  const [lines, setLines] = useState<PurchaseItemInput[]>([])
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [productFeedback, setProductFeedback] = useState<Feedback | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isMovementsLoading, setIsMovementsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isProductSaving, setIsProductSaving] = useState(false)
  const [isAdjusting, setIsAdjusting] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  async function loadMovements(filters = movementFilters, page = movementPage) {
    const api = window.simplepos?.stockMovements
    if (!api) {
      setFeedback({ message: t('inventory.movements.messages.unavailable'), tone: 'error' })
      return
    }

    setIsMovementsLoading(true)
    const input: StockMovementListInput = {
      productId: filters.productId ? Number(filters.productId) : undefined,
      movementType: filters.movementType,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      search: filters.search.trim() || undefined,
      limit: movementPageSize,
      offset: page * movementPageSize,
    }
    const result = await api.list(input)
    setMovements(result)
    setIsMovementsLoading(false)
  }

  async function loadWorkspace({ includeMovements = true }: { includeMovements?: boolean } = {}) {
    const api = window.simplepos
    if (!api) {
      setFeedback({ message: 'Database service is unavailable.', tone: 'error' })
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    const [productList, supplierList, purchaseList, categoryList] = await Promise.all([
      api.products.list(),
      api.suppliers.list(),
      api.purchases.list(),
      api.categories.list(),
    ])
    setProducts(productList)
    setSuppliers(supplierList)
    setPurchases(purchaseList)
    setCategories(categoryList)
    setForm((current) => ({
      ...current,
      supplierId: current.supplierId || (supplierList[0] ? String(supplierList[0].id) : ''),
    }))
    setProductForm((current) => ({
      ...current,
      categoryId: current.categoryId || (categoryList[0] ? String(categoryList[0].id) : ''),
    }))
    setIsLoading(false)
    if (includeMovements) await loadMovements()
  }

  useEffect(() => {
    void loadWorkspace().catch(() => {
      setFeedback({ message: 'Unable to load purchasing data.', tone: 'error' })
      setIsLoading(false)
    })
  }, [])

  useEffect(() => {
    if (view !== 'movements') return
    void loadMovements().catch(() => {
      setFeedback({ message: t('inventory.movements.messages.loadFailed'), tone: 'error' })
      setIsMovementsLoading(false)
    })
  }, [movementFilters, movementPage, view])

  useEffect(() => {
    if (feedback?.tone !== 'success') return
    const timeout = window.setTimeout(() => {
      setFeedback((current) => current === feedback ? null : current)
    }, 3000)
    return () => window.clearTimeout(timeout)
  }, [feedback])

  const query = search.trim().toLocaleLowerCase()
  const categoryNames = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  )
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory = categoryFilter === 'all'
        || product.categoryId === Number(categoryFilter)
      if (!matchesCategory) return false
      if (!query) return true

      const categoryName = product.categoryId === null
        ? 'Uncategorized'
        : categoryNames.get(product.categoryId) ?? 'Uncategorized'
      return [product.name, categoryName]
        .some((value) => value.toLocaleLowerCase().includes(query))
    })
  }, [categoryFilter, categoryNames, products, query])
  const filteredPurchases = useMemo(() => {
    const source = view === 'pending'
      ? purchases.filter((purchase) => purchase.invoiceStatus === 'pending')
      : view === 'unpaid'
      ? purchases.filter((purchase) => purchase.paymentStatus === 'unpaid')
      : purchases
    if (!query) return source
    return source.filter((purchase) =>
      [purchase.purchaseNumber, purchase.supplierName, purchase.supplierInvoiceNumber ?? '']
        .some((value) => value.toLocaleLowerCase().includes(query)),
    )
  }, [purchases, query, view])

  const purchaseTotal = lines.reduce((sum, line) => sum + line.quantity * line.unitCost, 0)
  const receivedUnits = lines.reduce((sum, line) => sum + line.quantity, 0)
  const formattedProductPrice = formatCurrency(
    Number.isFinite(Number(productForm.unitPrice)) ? Number(productForm.unitPrice) : 0,
  )
  const adjustmentTarget = Number(adjustmentForm.quantity)
  const adjustmentDelta = adjustingProduct && Number.isFinite(adjustmentTarget)
    ? adjustmentTarget - adjustingProduct.stockQty
    : 0
  const inventoryLayoutTab: InventoryLayoutTab = view === 'products'
    ? 'product'
    : view === 'movements'
    ? 'moving'
    : 'purchase'

  function updateForm<K extends keyof PurchaseForm>(field: K, value: PurchaseForm[K]) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function updateInvoiceForm<K extends keyof InvoiceForm>(field: K, value: InvoiceForm[K]) {
    setInvoiceForm((current) => ({ ...current, [field]: value }))
  }

  function updateProductForm<K extends keyof ProductFormState>(field: K, value: ProductFormState[K]) {
    setProductForm((current) => ({ ...current, [field]: value }))
  }

  function updateMovementFilters(next: Partial<MovementFilters>) {
    setMovementFilters((current) => ({ ...current, ...next }))
    setMovementPage(0)
  }

  function selectInventoryTab(tab: InventoryLayoutTab) {
    setScreen('list')
    setSelectedPurchase(null)
    setFeedback(null)
    if (tab === 'product') {
      setView('products')
      return
    }
    if (tab === 'moving') {
      setView('movements')
      return
    }
    setView('purchases')
  }

  function openProductMovements(product: ProductSummary) {
    updateMovementFilters({ productId: String(product.id), search: '', movementType: 'all' })
    setView('movements')
    setScreen('list')
  }

  function openAdjustment(product: ProductSummary) {
    setAdjustingProduct(product)
    setAdjustmentForm({ quantity: String(product.stockQty), reason: '' })
    setProductFeedback(null)
  }

  function closeAdjustment() {
    setAdjustingProduct(null)
    setAdjustmentForm(emptyAdjustmentForm)
    setIsAdjusting(false)
  }

  function resetProductForm({ clearFeedback = true }: { clearFeedback?: boolean } = {}) {
    setProductForm((current) => ({ ...emptyProductForm, categoryId: current.categoryId }))
    setEditingProduct(null)
    if (clearFeedback) setProductFeedback(null)
  }

  function startNewProduct() {
    resetProductForm()
    setView('products')
    setScreen('productForm')
  }

  function editProduct(product: ProductSummary) {
    setEditingProduct(product)
    setProductForm(toProductForm(product))
    setProductFeedback(null)
    setView('products')
    setScreen('productForm')
  }

  function resetPurchaseForm() {
    setForm({
      ...emptyForm,
      supplierId: suppliers[0] ? String(suppliers[0].id) : '',
    })
    setLines([])
    setFeedback(null)
  }

  function invoiceFormFromPurchase(purchase: PurchaseDetail): InvoiceForm {
    return {
      supplierInvoiceNumber: purchase.supplierInvoiceNumber ?? '',
      invoiceDate: purchase.invoiceDate ?? '',
      paymentStatus: purchase.paymentStatus,
      dueDate: purchase.dueDate ?? '',
      paidAt: purchase.paidAt ? purchase.paidAt.slice(0, 10) : today,
      notes: purchase.notes ?? '',
    }
  }

  function startNewPurchase() {
    resetPurchaseForm()
    setView('purchases')
    setScreen('recordPurchase')
  }

  function editInvoiceDetails() {
    if (!selectedPurchase) return
    setInvoiceForm(invoiceFormFromPurchase(selectedPurchase))
    setFeedback(null)
    setScreen('invoiceForm')
  }

  function showList() {
    setScreen('list')
    setSelectedPurchase(null)
    setFeedback(null)
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const unitPrice = Number(productForm.unitPrice)
    const stockQty = Number(productForm.stockQty)
    const minStock = Number(productForm.minStock)

    if (
      !productForm.name.trim() ||
      !productForm.categoryId ||
      !Number.isFinite(unitPrice) ||
      !Number.isFinite(stockQty) ||
      !Number.isFinite(minStock) ||
      unitPrice < 0 ||
      stockQty < 0 ||
      minStock < 0
    ) {
      setProductFeedback({ message: 'Enter product name, category, and valid stock and price values.', tone: 'error' })
      return
    }

    const payload = {
      sku: productForm.sku.trim(),
      barcode: productForm.barcode.trim() || null,
      name: productForm.name.trim(),
      description: productForm.description.trim() || null,
      categoryId: Number(productForm.categoryId),
      unitPrice,
      unitType: productForm.unitType,
      stockQty,
      minStock,
    }

    setIsProductSaving(true)
    const result = editingProduct
      ? await window.simplepos?.products.update({
          ...payload,
          id: editingProduct.id,
          isActive: editingProduct.isActive,
        })
      : await window.simplepos?.products.create(payload)
    setIsProductSaving(false)

    if (!result) {
      setProductFeedback({ message: 'Database service is unavailable.', tone: 'error' })
      return
    }

    const feedback: Feedback = { message: result.message, tone: result.ok ? 'success' : 'error' }
    setProductFeedback(feedback)
    if (!result.ok) return

    resetProductForm({ clearFeedback: false })
    setProductFeedback(feedback)
    const productList = await window.simplepos?.products.list()
    if (productList) setProducts(productList)
  }

  async function deactivateProduct(product: ProductSummary) {
    setIsProductSaving(true)
    const result = await window.simplepos?.products.update({ ...product, isActive: false })
    setIsProductSaving(false)
    if (!result) {
      setProductFeedback({ message: 'Database service is unavailable.', tone: 'error' })
      return
    }

    setProductFeedback({ message: result.message, tone: result.ok ? 'success' : 'error' })
    if (!result.ok) return

    if (editingProduct?.id === product.id) {
      resetProductForm()
      setScreen('list')
    }
    const productList = await window.simplepos?.products.list()
    if (productList) setProducts(productList)
  }

  async function saveAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!adjustingProduct || isAdjusting) return

    const newStockQty = Number(adjustmentForm.quantity)
    const reason = adjustmentForm.reason.trim()
    if (!Number.isSafeInteger(newStockQty) || newStockQty < 0) {
      setProductFeedback({ message: t('inventory.adjustment.messages.invalidQuantity'), tone: 'error' })
      return
    }
    if (!reason) {
      setProductFeedback({ message: t('inventory.adjustment.messages.reasonRequired'), tone: 'error' })
      return
    }

    setIsAdjusting(true)
    const result = await window.simplepos?.stockMovements.adjust({
      productId: adjustingProduct.id,
      newStockQty,
      reason,
      createdById: currentUser.id,
    })
    setIsAdjusting(false)

    if (!result) {
      setProductFeedback({ message: t('inventory.movements.messages.unavailable'), tone: 'error' })
      return
    }

    setProductFeedback({ message: result.ok ? t('inventory.adjustment.messages.success', { count: result.balanceAfter }) : result.message, tone: result.ok ? 'success' : 'error' })
    if (!result.ok) return

    closeAdjustment()
    const productList = await window.simplepos?.products.list()
    if (productList) {
      setProducts(productList)
      if (editingProduct?.id === adjustingProduct.id) {
        const updated = productList.find((product) => product.id === adjustingProduct.id)
        if (updated) {
          setEditingProduct(updated)
          setProductForm(toProductForm(updated))
        }
      }
    }
    await loadMovements()
  }

  function selectProduct(value: string) {
    const product = products.find((item) => item.id === Number(value))
    setForm((current) => ({
      ...current,
      productId: value,
      unitCost: product?.lastPurchaseCost ? String(product.lastPurchaseCost) : current.unitCost,
    }))
  }

  function addLine() {
    const productId = Number(form.productId)
    const quantity = Number(form.quantity)
    const unitCost = Number(form.unitCost)
    const product = products.find((item) => item.id === productId)

    if (!product || !Number.isInteger(quantity) || quantity <= 0 || !Number.isInteger(unitCost) || unitCost < 0) {
      setFeedback({ message: 'Choose a product and enter a valid quantity and unit cost.', tone: 'error' })
      return
    }
    if (lines.some((line) => line.productId === productId)) {
      setFeedback({ message: 'This product is already in the purchase.', tone: 'error' })
      return
    }

    setLines((current) => [...current, { productId, quantity, unitCost }])
    setForm((current) => ({ ...current, productId: '', quantity: '1', unitCost: '' }))
    setFeedback(null)
  }

  function removeLine(productId: number) {
    setLines((current) => current.filter((line) => line.productId !== productId))
  }

  function updateLine(productId: number, field: 'quantity' | 'unitCost', value: string) {
    const nextValue = Number(value)
    if (!Number.isInteger(nextValue) || nextValue < 0) return
    setLines((current) => current.map((line) => {
      if (line.productId !== productId) return line
      if (field === 'quantity' && nextValue === 0) return line
      return { ...line, [field]: nextValue }
    }))
  }

  function requestSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.supplierId || lines.length === 0) {
      setFeedback({ message: 'Supplier and at least one product are required.', tone: 'error' })
      return
    }
    setIsConfirmOpen(true)
  }

  async function savePurchase() {
    const api = window.simplepos?.purchases
    if (!api || isSaving) return

    setIsSaving(true)
    let result = await api.create({
      supplierId: Number(form.supplierId),
      supplierInvoiceNumber: form.supplierInvoiceNumber.trim() || null,
      invoiceDate: form.invoiceDate || null,
      paymentStatus: form.paymentStatus,
      dueDate: form.paymentStatus === 'unpaid' && form.dueDate ? form.dueDate : null,
      notes: form.notes.trim() || null,
      createdById: currentUser.id,
      items: lines,
    })
    if (result.ok && result.purchase && form.paymentStatus === 'paid' && result.purchase.paymentStatus !== 'paid') {
      const paidResult = await api.markPaid({ id: result.purchase.id })
      if (paidResult.ok) result = paidResult
    }
    setIsSaving(false)
    setIsConfirmOpen(false)
    setFeedback({ message: result.message, tone: result.ok ? 'success' : 'error' })

    if (result.ok && result.purchase) {
      await loadWorkspace({ includeMovements: true })
      setSelectedPurchase(result.purchase)
      setScreen('purchaseDetail')
      setLines([])
      setForm({
        ...emptyForm,
        supplierId: suppliers[0] ? String(suppliers[0].id) : '',
      })
    }
  }

  async function showPurchase(id: number) {
    const detail = await window.simplepos?.purchases.get({ id })
    if (!detail) {
      setFeedback({ message: 'Unable to load purchase detail.', tone: 'error' })
      return
    }
    setSelectedPurchase(detail)
    setScreen('purchaseDetail')
    setFeedback(null)
  }

  async function markPaid() {
    if (!selectedPurchase) return
    const result = await window.simplepos?.purchases.markPaid({ id: selectedPurchase.id })
    if (!result) return

    setFeedback({ message: result.message, tone: result.ok ? 'success' : 'error' })
    if (result.ok && result.purchase) {
      setSelectedPurchase(result.purchase)
      await loadWorkspace({ includeMovements: true })
    }
  }

  async function saveInvoiceDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedPurchase || isSaving) return

    const payload: PurchaseInvoiceUpdateInput = {
      id: selectedPurchase.id,
      supplierInvoiceNumber: invoiceForm.supplierInvoiceNumber.trim() || null,
      invoiceDate: invoiceForm.invoiceDate || null,
      paymentStatus: invoiceForm.paymentStatus,
      dueDate: invoiceForm.paymentStatus === 'unpaid' && invoiceForm.dueDate ? invoiceForm.dueDate : null,
      paidAt: invoiceForm.paymentStatus === 'paid' ? invoiceForm.paidAt || today : null,
      notes: invoiceForm.notes.trim() || null,
    }

    setIsSaving(true)
    const result = await window.simplepos?.purchases.updateInvoice(payload)
    setIsSaving(false)
    if (!result) {
      setFeedback({ message: 'Database service is unavailable.', tone: 'error' })
      return
    }

    setFeedback({ message: result.message, tone: result.ok ? 'success' : 'error' })
    if (result.ok && result.purchase) {
      setSelectedPurchase(result.purchase)
      setInvoiceForm(invoiceFormFromPurchase(result.purchase))
      setScreen('purchaseDetail')
      await loadWorkspace({ includeMovements: true })
    }
  }

  const movementCard = (
    <InventoryMovements
      filters={movementFilters}
      isLoading={isLoading}
      isMovementsLoading={isMovementsLoading}
      movementPage={movementPage}
      movementPageSize={movementPageSize}
      movements={movements}
      pressableClass={pressableClass}
      products={products}
      onFiltersChange={updateMovementFilters}
      onPageChange={setMovementPage}
      onRefresh={() => void loadMovements()}
    />
  )

  const purchaseCard = (
    <Card className="h-full min-h-0">
      <CardHeader>
        <CardTitle>Purchase</CardTitle>
        <CardDescription>
          Receive supplier stock and track paid or unpaid invoices.
        </CardDescription>
        <CardAction>
          <Button type="button" size="sm" className={pressableClass} onClick={startNewPurchase}>
            <Plus data-icon="inline-start" aria-hidden="true" />
            Record Purchase
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
          <div className="relative min-w-0 shrink-0">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search purchase, supplier, or invoice"
              className="h-10 pl-10 pr-10"
            />
            {search ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearch('')}
                className="absolute inset-y-0 right-0 flex size-10 items-center justify-center rounded-md text-muted-foreground transition-[background-color,color,transform] duration-150 ease-out hover:bg-muted hover:text-foreground active:scale-[0.96]"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 rounded-lg border bg-background">
            <Table containerClassName="h-full overflow-auto" className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky top-0 z-10 rounded-tl-lg bg-muted/95 backdrop-blur">Purchase</TableHead>
                  <TableHead className="sticky top-0 z-10 bg-muted/95 backdrop-blur">Supplier invoice</TableHead>
                  <TableHead className="sticky top-0 z-10 bg-muted/95 text-right backdrop-blur">Total</TableHead>
                  <TableHead className="sticky top-0 z-10 bg-muted/95 backdrop-blur">Invoice</TableHead>
                  <TableHead className="sticky top-0 z-10 bg-muted/95 backdrop-blur">Payment</TableHead>
                  <TableHead className="sticky top-0 z-10 rounded-tr-lg bg-muted/95 backdrop-blur">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="size-6 animate-spin" aria-hidden="true" />
                        <p className="text-sm">Loading purchasing data...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredPurchases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <div className="flex min-h-48 flex-col items-center justify-center gap-2 p-6 text-center">
                        <ReceiptText className="size-7 text-muted-foreground" aria-hidden="true" />
                        <p className="font-medium">{view === 'pending' ? 'No pending invoices' : view === 'unpaid' ? 'No unpaid invoices' : 'No purchases yet'}</p>
                        <p className="text-sm text-muted-foreground text-pretty">
                          {view === 'pending' ? 'All received goods have supplier invoice details.' : view === 'unpaid' ? 'All supplier invoices are paid.' : 'Record a purchase to receive inventory.'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : null}

                {!isLoading && filteredPurchases.map((purchase) => (
                  <TableRow
                    key={purchase.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => void showPurchase(purchase.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        void showPurchase(purchase.id)
                      }
                    }}
                    className="cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <TableCell>
                      <span className="block truncate font-medium">{purchase.purchaseNumber}</span>
                      <span className="block truncate text-xs text-muted-foreground">{purchase.supplierName}</span>
                    </TableCell>
                    <TableCell>
                      <span className="block truncate">{purchase.supplierInvoiceNumber ?? 'Pending invoice'}</span>
                      <span className="block text-xs text-muted-foreground">{purchase.itemCount} product{purchase.itemCount === 1 ? '' : 's'}</span>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatCurrency(purchase.total)}</TableCell>
                    <TableCell>
                      <InvoiceBadge status={purchase.invoiceStatus} />
                    </TableCell>
                    <TableCell>
                      <PaymentBadge status={purchase.paymentStatus} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground tabular-nums">{formatDate(purchase.invoiceDate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
      </CardContent>
    </Card>
  )

  const listContent = view === 'movements' ? movementCard : purchaseCard

  return (
    <div
      className={cn(
        'grid h-full min-h-0 min-w-0 gap-3 p-1',
        'grid-cols-1',
      )}
    >
      {screen === 'list' ? (
        embedded ? (
          listContent
        ) : (
          <InventoryLayout
            activeTab={inventoryLayoutTab}
            onTabChange={selectInventoryTab}
          >
            {listContent}
          </InventoryLayout>
        )
      ) : null}

      {screen === 'productForm' ? (
        <Card className="min-h-0 overflow-hidden">
          <CardHeader>
            <CardTitle>{editingProduct ? 'Edit Product' : 'Create Product'}</CardTitle>
            <CardDescription>
              {editingProduct
                ? `Update ${editingProduct.name} for sales and purchasing.`
                : 'Add products here before receiving them in Record Purchase.'}
            </CardDescription>
            <CardAction>
              <Button type="button" variant="outline" size="sm" className={pressableClass} onClick={showList}>
                <ArrowLeft data-icon="inline-start" aria-hidden="true" />
                Products
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-y-auto">
            <form onSubmit={saveProduct}>
              <FieldGroup className="mx-auto max-w-3xl">
                <Field>
                  <FieldLabel htmlFor="inventory-name">Product name</FieldLabel>
                  <Input
                    id="inventory-name"
                    value={productForm.name}
                    onChange={(event) => updateProductForm('name', event.target.value)}
                    placeholder="Brake Pad Front"
                    required
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="inventory-category">Category</FieldLabel>
                  <BaseSelect
                    id="inventory-category"
                    value={productForm.categoryId}
                    placeholder="Select category"
                    options={categories.map((category) => ({
                      value: String(category.id),
                      label: category.name,
                    }))}
                    onValueChange={(value) => updateProductForm('categoryId', value)}
                  />
                </Field>

                <div className="grid gap-3 md:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="inventory-price">Sell price</FieldLabel>
                    <Input
                      id="inventory-price"
                      type="number"
                      min="0"
                      step="1"
                      value={productForm.unitPrice}
                      onChange={(event) => updateProductForm('unitPrice', event.target.value)}
                      placeholder="120000"
                      required
                    />
                    <FieldDescription className="tabular-nums" aria-live="polite">
                      {formattedProductPrice}
                    </FieldDescription>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="inventory-unit">Unit type</FieldLabel>
                    <BaseSelect
                      id="inventory-unit"
                      value={productForm.unitType}
                      options={unitTypes.map((unitType) => ({
                        value: unitType,
                        label: unitType,
                      }))}
                      onValueChange={(value) => updateProductForm('unitType', value as ProductFormState['unitType'])}
                    />
                  </Field>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="inventory-stock">{editingProduct ? t('inventory.adjustment.currentStock') : t('inventory.openingStock')}</FieldLabel>
                    <Input
                      id="inventory-stock"
                      type="number"
                      min="0"
                      step="1"
                      value={productForm.stockQty}
                      onChange={(event) => updateProductForm('stockQty', event.target.value)}
                      placeholder="0"
                      readOnly={Boolean(editingProduct)}
                      className={cn(editingProduct && 'bg-muted text-muted-foreground')}
                      required
                    />
                    {editingProduct ? (
                      <FieldDescription>{t('inventory.adjustment.editHint')}</FieldDescription>
                    ) : null}
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="inventory-min-stock">Minimum stock</FieldLabel>
                    <Input
                      id="inventory-min-stock"
                      type="number"
                      min="0"
                      step="1"
                      value={productForm.minStock}
                      onChange={(event) => updateProductForm('minStock', event.target.value)}
                      placeholder="4"
                      required
                    />
                  </Field>
                </div>

                <Field>
                  <FieldLabel htmlFor="inventory-description">Description <span className="text-muted-foreground">Optional</span></FieldLabel>
                  <Input
                    id="inventory-description"
                    value={productForm.description}
                    onChange={(event) => updateProductForm('description', event.target.value)}
                    placeholder="Short product note"
                  />
                </Field>

                {productFeedback ? (
                  <p className={cn('rounded-md px-3 py-2 text-sm text-pretty', productFeedback.tone === 'success' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive')} role={productFeedback.tone === 'error' ? 'alert' : 'status'}>
                    {productFeedback.message}
                  </p>
                ) : null}

                <div className="flex gap-2">
                  <Button type="submit" className={cn('h-10 flex-1', pressableClass)} disabled={isProductSaving}>
                    <PackagePlus data-icon="inline-start" aria-hidden="true" />
                    {isProductSaving ? 'Saving...' : editingProduct ? 'Save Changes' : 'Create'}
                  </Button>
                  {editingProduct ? (
                    <Button type="button" variant="outline" className={cn('h-10', pressableClass)} onClick={() => openAdjustment(editingProduct)}>
                      <PencilLine data-icon="inline-start" aria-hidden="true" />
                      {t('inventory.adjustment.action')}
                    </Button>
                  ) : null}
                  <Button type="button" variant="outline" className={cn('h-10', pressableClass)} onClick={editingProduct ? showList : () => resetProductForm()}>
                    {editingProduct ? 'Cancel' : 'Clear'}
                  </Button>
                </div>

                {editingProduct ? (
                  <Button
                    type="button"
                    variant="destructive"
                    className={cn('h-10 w-full', pressableClass)}
                    onClick={() => void deactivateProduct(editingProduct)}
                    disabled={isProductSaving}
                  >
                    <Trash2 data-icon="inline-start" aria-hidden="true" />
                    Delete Product
                  </Button>
                ) : null}
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      ) : screen === 'purchaseDetail' && selectedPurchase ? (
        <Card className="min-h-0 overflow-hidden">
          <CardHeader>
            <CardTitle className="truncate">{selectedPurchase.purchaseNumber}</CardTitle>
            <CardDescription className="truncate">{selectedPurchase.supplierName}</CardDescription>
            <CardAction>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" className={pressableClass} onClick={showList}>
                  <ArrowLeft data-icon="inline-start" aria-hidden="true" />
                  Purchases
                </Button>
                <InvoiceBadge status={selectedPurchase.invoiceStatus} />
                <PaymentBadge status={selectedPurchase.paymentStatus} />
              </div>
            </CardAction>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md bg-muted p-3">
                <p className="text-xs text-muted-foreground">Supplier invoice</p>
                <p className="mt-1 truncate font-medium">{selectedPurchase.supplierInvoiceNumber ?? 'Pending invoice'}</p>
              </div>
              <div className="rounded-md bg-muted p-3">
                <p className="text-xs text-muted-foreground">Invoice date</p>
                <p className="mt-1 font-medium tabular-nums">{formatDate(selectedPurchase.invoiceDate)}</p>
              </div>
              <div className="rounded-md bg-muted p-3">
                <p className="text-xs text-muted-foreground">Due date</p>
                <p className="mt-1 font-medium tabular-nums">{formatDate(selectedPurchase.dueDate)}</p>
              </div>
              <div className="rounded-md bg-muted p-3">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="mt-1 font-medium tabular-nums">{formatCurrency(selectedPurchase.total)}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold">Received products</p>
              {selectedPurchase.items.map((item) => (
                <div key={item.id} className="rounded-md bg-muted/70 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{item.productName}</span>
                      <span className="block truncate text-xs text-muted-foreground">{item.sku}</span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">{formatCurrency(item.lineTotal)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground tabular-nums">{item.quantity} × {formatCurrency(item.unitCost)}</p>
                </div>
              ))}
            </div>

            {selectedPurchase.notes ? (
              <div>
                <p className="text-sm font-semibold">Notes</p>
                <p className="mt-1 text-sm text-muted-foreground text-pretty">{selectedPurchase.notes}</p>
              </div>
            ) : null}

            {feedback ? (
              <p className={cn('rounded-md px-3 py-2 text-sm text-pretty', feedback.tone === 'success' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive')} role={feedback.tone === 'error' ? 'alert' : 'status'}>
                {feedback.message}
              </p>
            ) : null}

            <div className="mt-auto flex gap-2">
              <Button type="button" variant="outline" className={cn('flex-1', pressableClass)} onClick={editInvoiceDetails}>
                <PencilLine data-icon="inline-start" aria-hidden="true" />
                Edit Invoice
              </Button>
              {selectedPurchase.paymentStatus === 'unpaid' ? (
                <Button type="button" className={cn('flex-1', pressableClass)} onClick={() => void markPaid()}>
                  <WalletCards data-icon="inline-start" aria-hidden="true" />
                  Mark Paid
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : screen === 'invoiceForm' && selectedPurchase ? (
        <Card className="min-h-0 overflow-hidden">
          <CardHeader>
            <CardTitle className="truncate">Invoice Details</CardTitle>
            <CardDescription className="truncate">{selectedPurchase.purchaseNumber} · {selectedPurchase.supplierName}</CardDescription>
            <CardAction>
              <Button type="button" variant="outline" size="sm" className={pressableClass} onClick={() => setScreen('purchaseDetail')}>
                <ArrowLeft data-icon="inline-start" aria-hidden="true" />
                Detail
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-y-auto">
            <form onSubmit={saveInvoiceDetails}>
              <FieldGroup className="mx-auto max-w-3xl">
                <div className="rounded-lg bg-muted p-3">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">Locked stock total</span>
                    <span className="font-semibold tabular-nums">{formatCurrency(selectedPurchase.total)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground text-pretty">
                    Supplier, products, quantities, costs, and stock movement are locked after posting.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="invoice-edit-number">Supplier invoice number</FieldLabel>
                    <Input
                      id="invoice-edit-number"
                      value={invoiceForm.supplierInvoiceNumber}
                      onChange={(event) => updateInvoiceForm('supplierInvoiceNumber', event.target.value)}
                      placeholder="SUP-INV-001"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="invoice-edit-date">Invoice date</FieldLabel>
                    <Input
                      id="invoice-edit-date"
                      type="date"
                      value={invoiceForm.invoiceDate}
                      onChange={(event) => updateInvoiceForm('invoiceDate', event.target.value)}
                    />
                  </Field>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <Field>
                    <FieldLabel htmlFor="invoice-edit-payment">Payment</FieldLabel>
                    <BaseSelect
                      id="invoice-edit-payment"
                      value={invoiceForm.paymentStatus}
                      onValueChange={(value) => updateInvoiceForm('paymentStatus', value as PurchasePaymentStatus)}
                      options={[
                        { value: 'unpaid', label: 'Unpaid' },
                        { value: 'paid', label: 'Paid' },
                      ]}
                    />
                  </Field>
                  {invoiceForm.paymentStatus === 'unpaid' ? (
                    <Field>
                      <FieldLabel htmlFor="invoice-edit-due">Due date</FieldLabel>
                      <Input
                        id="invoice-edit-due"
                        type="date"
                        min={invoiceForm.invoiceDate}
                        value={invoiceForm.dueDate}
                        onChange={(event) => updateInvoiceForm('dueDate', event.target.value)}
                      />
                    </Field>
                  ) : (
                    <Field>
                      <FieldLabel htmlFor="invoice-edit-paid">Paid date</FieldLabel>
                      <Input
                        id="invoice-edit-paid"
                        type="date"
                        value={invoiceForm.paidAt}
                        onChange={(event) => updateInvoiceForm('paidAt', event.target.value)}
                      />
                    </Field>
                  )}
                </div>

                <Field>
                  <FieldLabel htmlFor="invoice-edit-notes">Notes</FieldLabel>
                  <Input
                    id="invoice-edit-notes"
                    value={invoiceForm.notes}
                    onChange={(event) => updateInvoiceForm('notes', event.target.value)}
                    placeholder="Optional payment or supplier note"
                  />
                </Field>

                {feedback ? (
                  <p className={cn('rounded-md px-3 py-2 text-sm text-pretty', feedback.tone === 'success' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive')} role={feedback.tone === 'error' ? 'alert' : 'status'}>
                    {feedback.message}
                  </p>
                ) : null}

                <Button type="submit" className={cn('h-10 w-full', pressableClass)} disabled={isSaving}>
                  <PencilLine data-icon="inline-start" aria-hidden="true" />
                  {isSaving ? 'Saving...' : selectedPurchase.invoiceStatus === 'pending' ? 'Complete Invoice Details' : 'Save Invoice Details'}
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      ) : screen === 'recordPurchase' ? (
        <Card className="min-h-0 overflow-hidden">
          <CardHeader>
            <CardTitle>Record Purchase</CardTitle>
            <CardDescription>
              Saving receives stock immediately. Supplier invoice details can be completed later.
            </CardDescription>
            <CardAction>
              <Button type="button" variant="outline" size="sm" className={pressableClass} onClick={showList}>
                <ArrowLeft data-icon="inline-start" aria-hidden="true" />
                Purchases
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-y-auto">
            <form onSubmit={requestSave}>
              <FieldGroup className="mx-auto max-w-3xl">
                <div className="grid gap-3 md:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="purchase-supplier">Supplier</FieldLabel>
                    <BaseSelect
                      id="purchase-supplier"
                      value={form.supplierId}
                      onValueChange={(value) => updateForm('supplierId', value)}
                      placeholder={suppliers.length ? 'Choose supplier' : 'Add a supplier first'}
                      disabled={suppliers.length === 0}
                      options={suppliers.map((supplier) => ({ value: String(supplier.id), label: supplier.name }))}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="purchase-invoice">Supplier invoice number <span className="text-muted-foreground">Optional</span></FieldLabel>
                    <Input id="purchase-invoice" value={form.supplierInvoiceNumber} onChange={(event) => updateForm('supplierInvoiceNumber', event.target.value)} placeholder="SUP-INV-001" />
                  </Field>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <Field>
                    <FieldLabel htmlFor="purchase-date">Invoice date <span className="text-muted-foreground">Optional</span></FieldLabel>
                    <Input id="purchase-date" type="date" value={form.invoiceDate} onChange={(event) => updateForm('invoiceDate', event.target.value)} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="purchase-status">Payment</FieldLabel>
                    <BaseSelect
                      id="purchase-status"
                      value={form.paymentStatus}
                      onValueChange={(value) => updateForm('paymentStatus', value as PurchasePaymentStatus)}
                      options={[
                        { value: 'unpaid', label: 'Unpaid' },
                        { value: 'paid', label: 'Paid' },
                      ]}
                    />
                  </Field>
                  {form.paymentStatus === 'unpaid' ? (
                    <Field>
                      <FieldLabel htmlFor="purchase-due">Due date</FieldLabel>
                      <Input id="purchase-due" type="date" min={form.invoiceDate || undefined} value={form.dueDate} onChange={(event) => updateForm('dueDate', event.target.value)} />
                    </Field>
                  ) : null}
                </div>

                <div className="rounded-lg border bg-background p-3">
                  <p className="text-sm font-semibold">Products received</p>
                  <p className="mt-0.5 text-xs text-muted-foreground text-pretty">Add existing products with the received quantity and purchase cost.</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_120px_140px_auto] md:items-end">
                    <Field>
                      <FieldLabel htmlFor="purchase-product">Product</FieldLabel>
                      <BaseSelect
                        id="purchase-product"
                        value={form.productId}
                        onValueChange={selectProduct}
                        placeholder="Choose product"
                        options={products.map((product) => ({
                          value: String(product.id),
                          label: product.name,
                          disabled: lines.some((line) => line.productId === product.id),
                        }))}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="purchase-quantity">Quantity</FieldLabel>
                      <Input id="purchase-quantity" type="number" min="1" step="1" value={form.quantity} onChange={(event) => updateForm('quantity', event.target.value)} />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="purchase-cost">Unit cost</FieldLabel>
                      <Input id="purchase-cost" type="number" min="0" step="1" value={form.unitCost} onChange={(event) => updateForm('unitCost', event.target.value)} placeholder="0" />
                    </Field>
                    <Button type="button" variant="outline" className={cn('h-10', pressableClass)} onClick={addLine}>
                      <Plus data-icon="inline-start" aria-hidden="true" />
                      Add
                    </Button>
                  </div>

                  <div className="mt-3 flex flex-col gap-2">
                    {lines.length === 0 ? (
                      <p className="rounded-md border border-dashed p-3 text-center text-sm text-muted-foreground">No products added.</p>
                    ) : lines.map((line) => {
                      const product = products.find((item) => item.id === line.productId)
                      return (
                        <div key={line.productId} className="grid gap-2 rounded-md bg-muted/70 p-2.5 md:grid-cols-[minmax(0,1fr)_100px_130px_120px_auto] md:items-end">
                          <span className="min-w-0 md:pb-2">
                            <span className="block truncate text-sm font-medium">{product?.name}</span>
                          </span>
                          <Field>
                            <FieldLabel htmlFor={`purchase-line-qty-${line.productId}`} className="text-xs">Qty</FieldLabel>
                            <Input
                              id={`purchase-line-qty-${line.productId}`}
                              type="number"
                              min="1"
                              step="1"
                              value={line.quantity}
                              onChange={(event) => updateLine(line.productId, 'quantity', event.target.value)}
                              className="h-9"
                            />
                          </Field>
                          <Field>
                            <FieldLabel htmlFor={`purchase-line-cost-${line.productId}`} className="text-xs">Unit cost</FieldLabel>
                            <Input
                              id={`purchase-line-cost-${line.productId}`}
                              type="number"
                              min="0"
                              step="1"
                              value={line.unitCost}
                              onChange={(event) => updateLine(line.productId, 'unitCost', event.target.value)}
                              className="h-9"
                            />
                          </Field>
                          <span className="text-sm font-semibold tabular-nums md:pb-2">{formatCurrency(line.quantity * line.unitCost)}</span>
                          <Button type="button" variant="ghost" size="icon-sm" className={cn('md:mb-0.5', pressableClass)} onClick={() => removeLine(line.productId)} aria-label={`Remove ${product?.name}`}>
                            <Trash2 aria-hidden="true" />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <Field>
                  <FieldLabel htmlFor="purchase-notes">Notes</FieldLabel>
                  <Input id="purchase-notes" value={form.notes} onChange={(event) => updateForm('notes', event.target.value)} placeholder="Optional payment or delivery notes" />
                </Field>

                <div className="rounded-lg bg-muted p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Products received</span>
                    <span className="tabular-nums">{receivedUnits}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-base font-semibold">
                    <span>Invoice total</span>
                    <span className="tabular-nums">{formatCurrency(purchaseTotal)}</span>
                  </div>
                </div>

                {feedback ? (
                  <p className={cn('rounded-md px-3 py-2 text-sm text-pretty', feedback.tone === 'success' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive')} role={feedback.tone === 'error' ? 'alert' : 'status'}>
                    {feedback.message}
                  </p>
                ) : null}

                <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                  <Button type="submit" className={cn('h-10 w-full', pressableClass)} disabled={isSaving || suppliers.length === 0}>
                    <FileText data-icon="inline-start" aria-hidden="true" />
                    {isSaving ? 'Saving...' : 'Review and Save'}
                  </Button>
                  <AlertDialogPortal>
                    <AlertDialogBackdrop />
                    <AlertDialogPopup>
                      <AlertDialogTitle>Receive this purchase into inventory?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will add {receivedUnits} unit{receivedUnits === 1 ? '' : 's'} to stock and record a {formatCurrency(purchaseTotal)} purchase. Invoice details can be completed later, but posted products, quantities, and costs cannot be changed.
                      </AlertDialogDescription>
                      <div className="mt-5 flex justify-end gap-2">
                        <AlertDialogClose render={<Button type="button" variant="outline" className={pressableClass}>Cancel</Button>} />
                        <Button type="button" className={pressableClass} onClick={() => void savePurchase()} disabled={isSaving}>
                          <PackageCheck data-icon="inline-start" aria-hidden="true" />
                          {isSaving ? 'Receiving...' : 'Receive Stock'}
                        </Button>
                      </div>
                    </AlertDialogPopup>
                  </AlertDialogPortal>
                </AlertDialog>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={Boolean(adjustingProduct)} onOpenChange={(open) => { if (!open) closeAdjustment() }}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={saveAdjustment}>
            <DialogHeader>
              <DialogTitle>{t('inventory.adjustment.title')}</DialogTitle>
              <DialogDescription>
                {adjustingProduct ? t('inventory.adjustment.description', { name: adjustingProduct.name }) : ''}
              </DialogDescription>
            </DialogHeader>
            {adjustingProduct ? (
              <div className="mt-4 flex flex-col gap-4">
                <div className="rounded-lg bg-muted/70 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{adjustingProduct.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{adjustingProduct.sku}</span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">
                      {adjustingProduct.stockQty} {adjustingProduct.unitType}
                    </span>
                  </div>
                </div>

                <Field>
                  <FieldLabel htmlFor="stock-adjustment-quantity">{t('inventory.adjustment.newQuantity')}</FieldLabel>
                  <Input
                    id="stock-adjustment-quantity"
                    type="number"
                    min="0"
                    step="1"
                    value={adjustmentForm.quantity}
                    onChange={(event) => setAdjustmentForm((current) => ({ ...current, quantity: event.target.value }))}
                    required
                  />
                </Field>

                <div className="flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm">
                  <span className="text-muted-foreground">{t('inventory.adjustment.changePreview')}</span>
                  <span className={cn(
                    'font-semibold tabular-nums',
                    adjustmentDelta > 0 && 'text-primary',
                    adjustmentDelta < 0 && 'text-destructive',
                  )}>
                    {adjustmentDelta > 0 ? <Plus className="mr-1 inline size-3.5" aria-hidden="true" /> : adjustmentDelta < 0 ? <Minus className="mr-1 inline size-3.5" aria-hidden="true" /> : null}
                    {adjustmentDelta > 0 ? `+${adjustmentDelta}` : adjustmentDelta} {adjustingProduct.unitType}
                  </span>
                </div>

                <Field>
                  <FieldLabel htmlFor="stock-adjustment-reason">{t('inventory.adjustment.reason')}</FieldLabel>
                  <Input
                    id="stock-adjustment-reason"
                    value={adjustmentForm.reason}
                    onChange={(event) => setAdjustmentForm((current) => ({ ...current, reason: event.target.value }))}
                    placeholder={t('inventory.adjustment.reasonPlaceholder')}
                    required
                  />
                  <FieldDescription>{t('inventory.adjustment.reasonHint')}</FieldDescription>
                </Field>

                {productFeedback ? (
                  <p className={cn('rounded-md px-3 py-2 text-sm text-pretty', productFeedback.tone === 'success' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive')} role={productFeedback.tone === 'error' ? 'alert' : 'status'}>
                    {productFeedback.message}
                  </p>
                ) : null}
              </div>
            ) : null}
            <DialogFooter className="mt-5">
              <Button type="button" variant="outline" className={pressableClass} onClick={closeAdjustment}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" className={pressableClass} disabled={isAdjusting || adjustmentDelta === 0}>
                <PackageCheck data-icon="inline-start" aria-hidden="true" />
                {isAdjusting ? t('common.saving') : t('inventory.adjustment.confirm')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
