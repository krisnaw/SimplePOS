import {type FormEvent, useEffect, useMemo, useState} from 'react'
import {
  Minus,
  PackageCheck,
  Plus,
} from 'lucide-react'
import {useTranslation} from 'react-i18next'
import {Button} from '@/renderer/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/renderer/components/ui/dialog'
import {Field, FieldDescription, FieldLabel} from '@/renderer/components/ui/field'
import {Input} from '@/renderer/components/ui/input'
import {formatCurrency} from '@/renderer/lib/formatters'
import {cn} from '@/renderer/lib/utils'
import type {ProductCategorySummary, ProductSummary} from '@/shared/types/product'
import type {
  PurchaseDetail,
  PurchaseInvoiceUpdateInput,
  PurchaseItemInput,
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
import {InventoryInvoiceFormScreen} from './InventoryInvoiceFormScreen'
import {InventoryMovements} from './InventoryMovements'
import {InventoryProductFormScreen} from './InventoryProductFormScreen'
import {InventoryPurchaseDetailScreen} from './InventoryPurchaseDetailScreen'
import {InventoryPurchaseList} from './InventoryPurchaseList'
import {InventoryRecordPurchase} from './InventoryRecordPurchase'

type InventoryPurchaseProps = {
  currentUser: AuthenticatedUser
  embedded?: boolean
  initialView?: InventoryView
}

const emptyProductForm: ProductFormState = {
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

function toProductForm(product: ProductSummary): ProductFormState {
  return {
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
    <InventoryPurchaseList
      filteredPurchases={filteredPurchases}
      isLoading={isLoading}
      pressableClass={pressableClass}
      search={search}
      view={view}
      onClearSearch={() => setSearch('')}
      onSearchChange={setSearch}
      onShowPurchase={(id) => void showPurchase(id)}
      onStartNewPurchase={startNewPurchase}
    />
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
        <InventoryProductFormScreen
          categories={categories}
          editingProduct={editingProduct}
          formattedProductPrice={formattedProductPrice}
          isProductSaving={isProductSaving}
          pressableClass={pressableClass}
          productFeedback={productFeedback}
          productForm={productForm}
          unitTypes={unitTypes}
          onDeactivateProduct={(product) => void deactivateProduct(product)}
          onOpenAdjustment={openAdjustment}
          onResetProductForm={() => resetProductForm()}
          onSaveProduct={saveProduct}
          onShowList={showList}
          onUpdateProductForm={updateProductForm}
        />
      ) : screen === 'purchaseDetail' && selectedPurchase ? (
        <InventoryPurchaseDetailScreen
          feedback={feedback}
          pressableClass={pressableClass}
          purchase={selectedPurchase}
          onEditInvoiceDetails={editInvoiceDetails}
          onMarkPaid={() => void markPaid()}
          onShowList={showList}
        />
      ) : screen === 'invoiceForm' && selectedPurchase ? (
        <InventoryInvoiceFormScreen
          feedback={feedback}
          invoiceForm={invoiceForm}
          isSaving={isSaving}
          pressableClass={pressableClass}
          purchase={selectedPurchase}
          onBackToDetail={() => setScreen('purchaseDetail')}
          onSaveInvoiceDetails={saveInvoiceDetails}
          onUpdateInvoiceForm={updateInvoiceForm}
        />
      ) : screen === 'recordPurchase' ? (
        <InventoryRecordPurchase
          feedback={feedback}
          form={form}
          isConfirmOpen={isConfirmOpen}
          isSaving={isSaving}
          lines={lines}
          pressableClass={pressableClass}
          products={products}
          suppliers={suppliers}
          onAddLine={addLine}
          onConfirmOpenChange={setIsConfirmOpen}
          onRemoveLine={removeLine}
          onRequestSave={requestSave}
          onSavePurchase={() => void savePurchase()}
          onSelectProduct={selectProduct}
          onShowList={showList}
          onUpdateForm={updateForm}
        />
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
