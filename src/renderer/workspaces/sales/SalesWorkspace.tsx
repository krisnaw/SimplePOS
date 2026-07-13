import {type SubmitEvent, useEffect, useMemo, useReducer, useState} from 'react'
import {
  Banknote,
  Car,
  Check,
  Clock3,
  Eye,
  Loader2,
  Minus,
  Pencil,
  Plus,
  Printer,
  ReceiptText,
  Search,
  Trash2,
  UserRound,
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
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/renderer/components/ui/card'
import {FieldError} from '@/renderer/components/ui/field'
import {Input} from '@/renderer/components/ui/input'
import {Label} from '@/renderer/components/ui/label'
import {formatCurrency} from '@/renderer/lib/formatters'
import {generateReceiptHTML, printInvoice} from '@/renderer/lib/invoice-print'
import {cn} from '@/renderer/lib/utils'
import type {AuthenticatedUser} from '@/shared/types/user'
import {ProductCategoryBadge} from '../inventory/ProductCategoryBadge'
import {AddVehicleDialog} from './AddVehicleDialog'
import {SalesCatalogListItem} from './SalesCatalogListItem'
import type {
  MockCatalogItem,
  MockSaleOrder,
  MockVehicle,
  NewVehicleFormState,
  SaleLineItem,
  SalesWorkspaceUiAction,
  SalesWorkspaceUiState,
} from './SalesWorkspace.types'
import {normalizePlateNumber, normalizeSearchText, parseVehicleInput,} from './vehicle-intake'

const pressableClass =
  'transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out active:scale-[0.96]'

const initialNewVehicleFormState: NewVehicleFormState = {
  isOpen: false,
  plate: '',
  brand: '',
  model: '',
  customerName: '',
  customerPhone: '',
  errors: {},
}

const initialSalesWorkspaceUiState: SalesWorkspaceUiState = {
  vehicleSearch: {
    query: '',
    isDropdownOpen: false,
  },
  newVehicleForm: initialNewVehicleFormState,
  statusMessage: '',
  orderToDelete: null,
  priceEdit: {
    editingKey: null,
    draft: '',
    error: '',
  },
  checkout: {
    isConfirmOpen: false,
    isCheckingOut: false,
    isCompleteOpen: false,
    completedInvoice: null,
    completedInvoiceNumber: '',
    isLoadingCompletedInvoice: false,
  },
  receiptPreview: {
    isOpen: false,
    url: null,
  },
}

function salesWorkspaceUiReducer(
  state: SalesWorkspaceUiState,
  action: SalesWorkspaceUiAction,
): SalesWorkspaceUiState {
  switch (action.type) {
    case 'vehicleSearch/set':
      return { ...state, vehicleSearch: { ...state.vehicleSearch, ...action.patch } }
    case 'vehicleSearch/reset':
      return { ...state, vehicleSearch: initialSalesWorkspaceUiState.vehicleSearch }
    case 'newVehicleForm/set':
      return { ...state, newVehicleForm: { ...state.newVehicleForm, ...action.patch } }
    case 'newVehicleForm/reset':
      return { ...state, newVehicleForm: initialNewVehicleFormState }
    case 'newVehicleForm/setErrors':
      return { ...state, newVehicleForm: { ...state.newVehicleForm, errors: action.errors } }
    case 'statusMessage/set':
      return { ...state, statusMessage: action.message }
    case 'orderToDelete/set':
      return { ...state, orderToDelete: action.order }
    case 'priceEdit/start':
      return { ...state, priceEdit: { editingKey: action.key, draft: action.draft, error: '' } }
    case 'priceEdit/cancel':
      return { ...state, priceEdit: initialSalesWorkspaceUiState.priceEdit }
    case 'priceEdit/setDraft':
      return { ...state, priceEdit: { ...state.priceEdit, draft: action.draft, error: '' } }
    case 'priceEdit/setError':
      return { ...state, priceEdit: { ...state.priceEdit, error: action.error } }
    case 'checkout/set':
      return { ...state, checkout: { ...state.checkout, ...action.patch } }
    case 'checkout/closeCompletedSale':
      return {
        ...state,
        checkout: {
          ...state.checkout,
          isCompleteOpen: false,
          completedInvoice: null,
          completedInvoiceNumber: '',
        },
      }
    case 'receiptPreview/open':
      return { ...state, receiptPreview: { isOpen: true, url: action.url } }
    case 'receiptPreview/close':
      return { ...state, receiptPreview: { isOpen: false, url: null } }
  }
}

function playCheckoutCompleteSound() {
  const AudioContext = window.AudioContext
  if (!AudioContext) return

  const audioContext = new AudioContext()
  const gain = audioContext.createGain()
  gain.connect(audioContext.destination)
  gain.gain.setValueAtTime(0.0001, audioContext.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.16, audioContext.currentTime + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.55)

  ;[
    { frequency: 659.25, startsAt: 0, duration: 0.18 },
    { frequency: 880, startsAt: 0.16, duration: 0.36 },
  ].forEach(({ frequency, startsAt, duration }) => {
    const oscillator = audioContext.createOscillator()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime + startsAt)
    oscillator.connect(gain)
    oscillator.start(audioContext.currentTime + startsAt)
    oscillator.stop(audioContext.currentTime + startsAt + duration)
  })

  window.setTimeout(() => void audioContext.close(), 750)
}

function vehicleSearchText(vehicle: MockVehicle): string {
  return normalizeSearchText([
    normalizePlateNumber(vehicle.plateNumber),
    vehicle.brand,
    vehicle.model,
    vehicle.customerName,
    vehicle.customerPhone ?? '',
    vehicle.notes ?? '',
  ].join(' '))
}

function vehicleName(vehicle: MockVehicle): string {
  return [vehicle.brand, vehicle.model].filter(Boolean).join(' ')
}

export function SalesWorkspace({ currentUser }: { currentUser: AuthenticatedUser }) {
  const { t } = useTranslation()
  const [vehicles, setVehicles] = useState<MockVehicle[]>([])
  const [catalogItems, setCatalogItems] = useState<MockCatalogItem[]>([])
  const [uiState, dispatchUi] = useReducer(
    salesWorkspaceUiReducer,
    initialSalesWorkspaceUiState,
  )
  const [orders, setOrders] = useState<MockSaleOrder[]>([])
  const [activeOrderId, setActiveOrderId] = useState<number | null>(null)

  const {
    vehicleSearch,
    newVehicleForm,
    statusMessage,
    orderToDelete,
    priceEdit,
    checkout,
    receiptPreview,
  } = uiState
  const { query, isDropdownOpen } = vehicleSearch
  const {
    isOpen: isAddVehicleOpen,
    plate: newVehiclePlate,
    brand: newVehicleBrand,
    model: newVehicleName,
    customerName: newCustomerName,
    customerPhone: newCustomerPhone,
  } = newVehicleForm
  const {
    editingKey: editingPriceKey,
    draft: priceDraft,
    error: priceError,
  } = priceEdit
  const {
    isConfirmOpen: isCheckoutConfirmOpen,
    isCheckingOut,
    isCompleteOpen: isCheckoutCompleteOpen,
    completedInvoice,
    completedInvoiceNumber,
    isLoadingCompletedInvoice,
  } = checkout
  const { isOpen: isPreviewOpen, url: previewUrl } = receiptPreview

  const parsedInput = useMemo(() => parseVehicleInput(query), [query])
  const normalizedQuery = normalizeSearchText(query)
  const activeOrder = orders.find((order) => order.id === activeOrderId) ?? null
  const selectedVehicle = activeOrder?.vehicle ?? null
  const lineItems = activeOrder?.lineItems ?? []
  const saleItemCount = lineItems.reduce((count, item) => count + item.quantity, 0)
  const total = lineItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

  useEffect(() => {
    const api = window.simplepos
    if (!api) return
    void Promise.all([api.products.list(), api.categories.list()]).then(
      ([products, categories]) => {
        const categoryNames = new Map(categories.map((category) => [category.id, category.name]))
        setCatalogItems(
          products.filter((product) => product.isActive && product.stockQty > 0).map((product) => ({
            id: product.id,
            key: `product-${product.id}`,
            type: 'product' as const,
            name: product.name,
            code: product.sku,
            category: product.categoryId === null
              ? t('sales.uncategorized')
              : categoryNames.get(product.categoryId) ?? t('sales.uncategorized'),
            price: product.unitPrice,
            minimumPrice: product.lastPurchaseCost > 0 ? product.lastPurchaseCost : 0,
          })),
        )
      },
    )
    void api.salesDrafts.list().then((drafts) => {
      setOrders(drafts)
      setActiveOrderId(drafts[0]?.id ?? null)
    })
  }, [t])

  useEffect(() => {
    const api = window.simplepos
    if (!api) return
    const timeout = window.setTimeout(() => {
      void api.vehicles.search({ query, limit: 20 }).then(setVehicles)
    }, 150)
    return () => window.clearTimeout(timeout)
  }, [query])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const matchedVehicles = useMemo(() => {
    if (!normalizedQuery) return vehicles

    const terms = normalizedQuery.split(' ').filter(Boolean)
    return vehicles.filter((vehicle) => {
      const searchText = vehicleSearchText(vehicle)
      return terms.every((term) => searchText.includes(term))
    })
  }, [normalizedQuery, vehicles])

  function clearSearch() {
    dispatchUi({ type: 'vehicleSearch/reset' })
    dispatchUi({ type: 'newVehicleForm/set', patch: { isOpen: false } })
  }

  async function selectVehicle(vehicle: MockVehicle) {
    const api = window.simplepos
    if (!api) return
    const draft = await api.salesDrafts.create({ vehicleId: vehicle.id, createdById: currentUser.id })
    if (!draft) return
    const drafts = await api.salesDrafts.list()
    setOrders(drafts)
    setActiveOrderId(draft.id)
    dispatchUi({
      type: 'statusMessage/set',
      message: draft.created ? '' : t('sales.vehicleAlreadyHasOngoingSale'),
    })
    dispatchUi({ type: 'vehicleSearch/reset' })
  }

  async function deleteDraft(order: MockSaleOrder) {
    const api = window.simplepos
    if (!api) return
    const result = await api.salesDrafts.delete({ saleId: order.id })
    dispatchUi({ type: 'statusMessage/set', message: result.message })
    dispatchUi({ type: 'orderToDelete/set', order: null })
    if (!result.ok) return

    const remainingOrders = orders.filter((candidate) => candidate.id !== order.id)
    setOrders(remainingOrders)
    if (activeOrderId === order.id) {
      setActiveOrderId(remainingOrders[0]?.id ?? null)
    }
  }

  function openAddVehicleForm() {
    dispatchUi({
      type: 'newVehicleForm/set',
      patch: {
        isOpen: true,
        plate: parsedInput.plateNumber,
        brand: '',
        model: parsedInput.model || (parsedInput.plateNumber ? '' : query.trim()),
        customerName: '',
        customerPhone: '',
        errors: {},
      },
    })
  }

  async function addMockVehicle(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()

    const plateNumber = normalizePlateNumber(newVehiclePlate)
    const brand = newVehicleBrand.trim()
    const carName = newVehicleName.trim()
    const plateExists = vehicles.some(
      (vehicle) => normalizePlateNumber(vehicle.plateNumber) === plateNumber,
    )
    const errors = {
      ...(!plateNumber ? { plateNumber: t('sales.validation.plateRequired') } : {}),
      ...(plateExists ? { plateNumber: t('sales.validation.plateExists') } : {}),
      ...(!carName ? { model: t('sales.validation.modelRequired') } : {}),
    }

    if (Object.keys(errors).length > 0) {
      dispatchUi({ type: 'newVehicleForm/setErrors', errors })
      return
    }

    const api = window.simplepos
    if (!api) return
    const result = await api.vehicles.quickCreate({
      plateNumber,
      brand,
      model: carName,
      customerName: newCustomerName.trim() || null,
      customerPhone: newCustomerPhone.trim() || null,
    })
    if (!result.ok || !result.vehicle) {
      dispatchUi({
        type: 'newVehicleForm/setErrors',
        errors: { plateNumber: result.message },
      })
      return
    }
    const nextVehicle = result.vehicle

    setVehicles((currentVehicles) => [nextVehicle, ...currentVehicles])
    await selectVehicle(nextVehicle)
    dispatchUi({ type: 'newVehicleForm/reset' })
  }

  async function checkoutActiveSale() {
    if (!activeOrder || lineItems.length === 0 || isCheckingOut) return
    const api = window.simplepos
    if (!api) return
    dispatchUi({ type: 'checkout/set', patch: { isCheckingOut: true } })
    try {
      const result = await api.checkout.create({
        saleId: activeOrder.id,
        vehicleId: activeOrder.vehicle.id,
        createdById: currentUser.id,
        paymentMethod: 'cash',
        amountPaid: total,
        items: lineItems.map((item) => ({
          itemType: item.type,
          id: item.id,
          quantity: item.quantity,
          unitPrice: item.price,
        })),
      })
      dispatchUi({ type: 'statusMessage/set', message: result.message })
      dispatchUi({ type: 'checkout/set', patch: { isConfirmOpen: false } })
      if (result.ok && result.checkout) {
        playCheckoutCompleteSound()
        dispatchUi({
          type: 'checkout/set',
          patch: {
            completedInvoice: null,
            completedInvoiceNumber: result.checkout.invoiceNumber,
            isCompleteOpen: true,
          },
        })
        setOrders((current) => current.filter((order) => order.id !== activeOrder.id))
        setActiveOrderId(null)
        dispatchUi({ type: 'vehicleSearch/set', patch: { query: '' } })

        dispatchUi({ type: 'checkout/set', patch: { isLoadingCompletedInvoice: true } })
        try {
          const invoice = await api.invoices.get({ id: result.checkout.invoiceId })
          dispatchUi({ type: 'checkout/set', patch: { completedInvoice: invoice ?? null } })
          if (!invoice) {
            dispatchUi({
              type: 'statusMessage/set',
              message: t('sales.invoiceLoadFailed', { invoiceNumber: result.checkout.invoiceNumber }),
            })
          }
        } catch {
          dispatchUi({ type: 'checkout/set', patch: { completedInvoice: null } })
          dispatchUi({
            type: 'statusMessage/set',
            message: t('sales.invoiceLoadFailed', { invoiceNumber: result.checkout.invoiceNumber }),
          })
        } finally {
          dispatchUi({ type: 'checkout/set', patch: { isLoadingCompletedInvoice: false } })
        }
      }
    } finally {
      dispatchUi({ type: 'checkout/set', patch: { isCheckingOut: false } })
    }
  }

  function cancelAddVehicle() {
    dispatchUi({ type: 'newVehicleForm/set', patch: { isOpen: false, errors: {} } })
    dispatchUi({ type: 'vehicleSearch/set', patch: { isDropdownOpen: false } })
  }

  function addLineItem(item: MockCatalogItem) {
    if (!activeOrderId) return

    setOrders((currentOrders) =>
      currentOrders.map((order) => {
        if (order.id !== activeOrderId) return order

        const existingItem = order.lineItems.find((lineItem) => lineItem.key === item.key)
        const lineItems = existingItem
          ? order.lineItems.map((lineItem) =>
              lineItem.key === item.key ? { ...lineItem, quantity: lineItem.quantity + 1 } : lineItem,
            )
          : [...order.lineItems, {
              ...item,
              quantity: 1,
              basePrice: item.price,
              priceOverriddenById: null,
              priceOverriddenAt: null,
            }]

        void saveDraftItems(order.id, lineItems)
        return { ...order, lineItems }
      }),
    )
  }

  function updateLineItemQuantity(key: string, quantity: number) {
    if (!activeOrderId) return

    setOrders((currentOrders) =>
      currentOrders.map((order) => {
        if (order.id !== activeOrderId) return order

        const lineItems = quantity <= 0
          ? order.lineItems.filter((item) => item.key !== key)
          : order.lineItems.map((item) => (item.key === key ? { ...item, quantity } : item))

        void saveDraftItems(order.id, lineItems)
        return { ...order, lineItems }
      }),
    )
  }

  async function saveDraftItems(saleId: number, items: SaleLineItem[]) {
    const api = window.simplepos
    if (!api) return { ok: false }
    return api.salesDrafts.saveItems({
      saleId,
      updatedById: currentUser.id,
      items: items.map((item) => ({
        itemType: item.type,
        id: item.id,
        quantity: item.quantity,
        unitPrice: item.price,
      })),
    })
  }

  function beginPriceEdit(item: SaleLineItem) {
    dispatchUi({
      type: 'priceEdit/start',
      key: item.key,
      draft: String(item.price * item.quantity),
    })
  }

  function cancelPriceEdit() {
    dispatchUi({ type: 'priceEdit/cancel' })
  }

  async function saveLinePrice(item: SaleLineItem) {
    if (!activeOrder) return
    const lineTotal = Number(priceDraft)
    if (!Number.isInteger(lineTotal) || lineTotal < 0) {
      dispatchUi({ type: 'priceEdit/setError', error: t('sales.validation.nonNegativeWholeAmount') })
      return
    }
    if (lineTotal % item.quantity !== 0) {
      dispatchUi({
        type: 'priceEdit/setError',
        error: t('sales.validation.totalDivisibleByQuantity', { quantity: item.quantity }),
      })
      return
    }
    const unitPrice = lineTotal / item.quantity
    if (item.type === 'product' && unitPrice < item.minimumPrice) {
      dispatchUi({
        type: 'priceEdit/setError',
        error: t('sales.validation.priceBelowInventoryCost', {
          price: formatCurrency(item.minimumPrice * item.quantity),
        }),
      })
      return
    }

    const nextItems = activeOrder.lineItems.map((lineItem) =>
      lineItem.key === item.key
        ? {
            ...lineItem,
            price: unitPrice,
            priceOverriddenById: unitPrice === lineItem.basePrice ? null : currentUser.id,
            priceOverriddenAt: unitPrice === lineItem.basePrice ? null : new Date().toISOString(),
          }
        : lineItem,
    )
    const result = await saveDraftItems(activeOrder.id, nextItems)
    if (!result.ok) {
      dispatchUi({ type: 'priceEdit/setError', error: t('sales.validation.unableToSavePrice') })
      return
    }

    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === activeOrder.id ? { ...order, lineItems: nextItems } : order
      ),
    )
    cancelPriceEdit()
  }

  function closeCompletedSaleDialog() {
    dispatchUi({ type: 'checkout/closeCompletedSale' })
  }

  function handlePrintCompletedInvoice() {
    if (!completedInvoice) return
    printInvoice(completedInvoice)
  }

  function handlePreviewCompletedInvoice() {
    if (!completedInvoice) return
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    const html = generateReceiptHTML(completedInvoice)
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
    dispatchUi({ type: 'receiptPreview/open', url })
  }

  function handlePreviewClose() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    dispatchUi({ type: 'receiptPreview/close' })
  }

  function getOrderTotal(order: MockSaleOrder): number {
    return order.lineItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-1">
      <Card className="overflow-visible">
        <CardContent className="overflow-visible">
          <div className="relative flex max-w-2xl flex-col gap-2">
            <Label htmlFor="vehicle-intake-search" className="sr-only">{t('sales.vehicleSearchLabel')}</Label>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="vehicle-intake-search"
                value={query}
                onChange={(event) => {
                  dispatchUi({
                    type: 'vehicleSearch/set',
                    patch: {
                      query: event.target.value,
                      isDropdownOpen: Boolean(event.target.value.trim()),
                    },
                  })
                }}
                onFocus={() => {
                  dispatchUi({
                    type: 'vehicleSearch/set',
                    patch: { isDropdownOpen: Boolean(query.trim()) },
                  })
                }}
                placeholder="DK1234 Avanza"
                className="pl-10 pr-10 uppercase"
              />
              {query ? (
                <button
                  type="button"
                  aria-label={t('sales.clearVehicleSearch')}
                  onClick={clearSearch}
                  className="absolute inset-y-0 right-0 flex size-10 items-center justify-center rounded-md text-muted-foreground transition-[background-color,color,transform] duration-150 ease-out hover:bg-muted hover:text-foreground active:scale-[0.96]"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              ) : null}
            </div>

            {normalizedQuery && isDropdownOpen ? (
              <div className="absolute top-full right-0 left-0 z-20 mt-2 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg">
                <div className="flex items-center justify-between gap-3 border-b bg-muted/50 px-3 py-2">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {t('sales.searchResults', { count: matchedVehicles.length })}
                  </span>
                </div>

                <div className="max-h-80 overflow-auto p-1.5">
                  {matchedVehicles.length === 0 ? (
                    <div className="flex min-h-28 items-center justify-center rounded-md p-4 text-center">
                      <div className="flex max-w-xs flex-col items-center gap-2.5">
                        <div className="flex size-9 items-center justify-center rounded-full bg-muted">
                          <Car className="size-4 text-muted-foreground" aria-hidden="true" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-balance">{t('sales.noVehicleFound')}</p>
                          <p className="mt-1 text-xs text-muted-foreground text-pretty">
                            {t('sales.addVehicleFromPlateHint')}
                          </p>
                        </div>
                        <AddVehicleDialog
                          open={isAddVehicleOpen}
                          form={newVehicleForm}
                          onOpen={openAddVehicleForm}
                          onClose={cancelAddVehicle}
                          onSubmit={addMockVehicle}
                          onCancel={cancelAddVehicle}
                          onFormChange={(patch) => {
                            dispatchUi({ type: 'newVehicleForm/set', patch })
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {matchedVehicles.map((vehicle) => {
                        const isSelected = vehicle.id === selectedVehicle?.id

                        return (
                          <button
                            key={vehicle.id}
                            type="button"
                            aria-current={isSelected ? 'true' : undefined}
                            onClick={() => void selectVehicle(vehicle)}
                            className={cn(
                              'flex min-h-16 w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.98]',
                              isSelected ? 'bg-primary/10 text-foreground' : 'hover:bg-muted',
                            )}
                          >
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold tabular-nums">{vehicle.plateNumber}</span>
                              <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                                {vehicleName(vehicle)}
                              </span>
                              <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                <span className="inline-flex items-center gap-1">
                                  <UserRound className="size-3.5" aria-hidden="true" />
                                  {vehicle.customerName}
                                </span>
                                {vehicle.customerPhone ? <span className="tabular-nums">{vehicle.customerPhone}</span> : null}
                                {vehicle.notes ? <span>{vehicle.notes}</span> : null}
                              </span>
                            </span>
                            {isSelected ? (
                              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                <Check className="size-4" aria-hidden="true" />
                              </span>
                            ) : null}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[240px_minmax(0,1fr)_340px]">
          <Card className="min-h-0 overflow-hidden">
            <CardHeader>
              <CardTitle>{t('sales.runningOrders')}</CardTitle>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-auto">
              {orders.length === 0 ? (
                <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed p-4 text-center">
                  <p className="text-sm text-muted-foreground text-pretty">{t('sales.noRunningOrders')}</p>
                </div>
              ) : (
                orders.map((order, orderIndex) => {
                  const isActive = order.id === activeOrderId
                  const entryNumber = orderIndex + 1

                  return (
                    <div
                      key={order.id}
                      className={cn(
                        'group grid grid-cols-[minmax(0,1fr)_auto] rounded-lg border shadow-sm transition-[background-color,border-color,box-shadow] duration-150 ease-out',
                        isActive
                          ? 'border-primary/50 bg-primary/5 shadow-border-hover'
                          : 'bg-card hover:border-primary/30 hover:shadow-border-hover',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setActiveOrderId(order.id)
                          dispatchUi({ type: 'vehicleSearch/set', patch: { isDropdownOpen: false } })
                        }}
                        className="min-w-0 rounded-tl-lg px-2.5 pt-2 text-left transition-transform duration-150 ease-out active:scale-[0.98]"
                      >
                        <span className="flex items-start justify-between gap-2">
                          <span className="min-w-0">
                            <span className="flex flex-wrap items-center gap-1.5">
                              <Badge variant="outline" className="h-5 px-1.5 text-[11px] tabular-nums">
                                #{entryNumber}
                              </Badge>
                              <span className="text-sm font-semibold tabular-nums">{order.vehicle.plateNumber}</span>
                              {order.isStale ? (
                                <Badge variant="secondary">
                                  <Clock3 data-icon="inline-start" aria-hidden="true" />
                                  {t('sales.stale')}
                                </Badge>
                              ) : null}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                              {vehicleName(order.vehicle)}
                            </span>
                          </span>
                        </span>
                      </button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        className={cn('my-1 mr-1 shrink-0 self-start text-muted-foreground hover:text-destructive', pressableClass)}
                        onClick={() => dispatchUi({ type: 'orderToDelete/set', order })}
                        aria-label={t('sales.deleteDraftForVehicle', { plateNumber: order.vehicle.plateNumber })}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveOrderId(order.id)
                          dispatchUi({ type: 'vehicleSearch/set', patch: { isDropdownOpen: false } })
                        }}
                        className="col-span-2 flex w-full items-center justify-between gap-2 rounded-b-lg px-2.5 pb-2 pt-1.5 text-xs text-muted-foreground transition-transform duration-150 ease-out active:scale-[0.98]"
                      >
                        <span className="tabular-nums">
                          {t('sales.activeItemCount', { count: order.lineItems.length })}
                        </span>
                        <span className="font-medium text-foreground tabular-nums">
                          {formatCurrency(getOrderTotal(order))}
                        </span>
                      </button>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>

          {selectedVehicle ? (
            <>
              <Card className="min-h-0 overflow-hidden">
                <CardHeader>
                  <CardTitle>{t('sales.products')}</CardTitle>
                  <CardDescription>{selectedVehicle.plateNumber} · {vehicleName(selectedVehicle)}</CardDescription>
                </CardHeader>
                <CardContent className="scroll-fade flex min-h-0 flex-col gap-3 overflow-auto">
                  {catalogItems.map((item) => (
                    <SalesCatalogListItem
                      key={item.key}
                      itemType={item.type}
                      typeLabel={item.type === 'service' ? t('sales.service') : t('sales.product')}
                      name={item.name}
                      category={item.category}
                      code={item.code}
                      price={item.price}
                      addLabel={t('sales.add')}
                      onAdd={() => addLineItem(item)}
                    />
                  ))}
                </CardContent>
              </Card>

              <Card className="min-h-0 overflow-hidden">
                <CardHeader>
                  <CardTitle>{t('sales.currentSale')}</CardTitle>
                  <CardDescription>
                    {t('sales.activeItemCount', { count: saleItemCount })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
                  <div className="scroll-fade flex min-h-0 flex-1 flex-col gap-2 overflow-auto">
                    {lineItems.length === 0 ? (
                      <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed p-4 text-center">
                        <p className="text-sm text-muted-foreground text-pretty">{t('sales.addProductToStart')}</p>
                      </div>
                    ) : (
                      lineItems.map((item) => (
                        <div key={item.key} className="rounded-lg bg-muted/60 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <p className="truncate text-sm font-medium">{item.name}</p>
                                {item.price !== item.basePrice ? <Badge variant="secondary">{t('sales.adjusted')}</Badge> : null}
                              </div>
                            </div>
                            <div className="flex shrink-0 items-start">
                              <Button
                                type="button"
                                size="icon-sm"
                                variant="ghost"
                                className={pressableClass}
                                onClick={() => beginPriceEdit(item)}
                                aria-label={t('sales.editPriceForItem', { name: item.name })}
                              >
                                <Pencil aria-hidden="true" />
                              </Button>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon-sm"
                                className={pressableClass}
                                onClick={() => updateLineItemQuantity(item.key, item.quantity - 1)}
                                aria-label={t('sales.decreaseItem', { name: item.name })}
                              >
                                <Minus aria-hidden="true" />
                              </Button>
                              <span className="w-8 text-center text-sm font-medium tabular-nums">{item.quantity}</span>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon-sm"
                                className={pressableClass}
                                onClick={() => updateLineItemQuantity(item.key, item.quantity + 1)}
                                aria-label={t('sales.increaseItem', { name: item.name })}
                              >
                                <Plus aria-hidden="true" />
                              </Button>
                            </div>
                            <div className="flex w-[168px] shrink-0 justify-end">
                              {editingPriceKey === item.key ? (
                                <div className="flex items-center gap-1">
                                <Input
                                  id={`sale-total-${item.key}`}
                                  type="number"
                                  min={item.type === 'product' ? item.minimumPrice * item.quantity : 0}
                                  step="1"
                                  value={priceDraft}
                                  onChange={(event) => {
                                    dispatchUi({ type: 'priceEdit/setDraft', draft: event.target.value })
                                  }}
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter') void saveLinePrice(item)
                                    if (event.key === 'Escape') cancelPriceEdit()
                                  }}
                                  className="h-8 w-24 tabular-nums"
                                  aria-label={t('sales.totalPriceForItem', { name: item.name })}
                                  aria-invalid={Boolean(priceError)}
                                  autoFocus
                                />
                                <Button
                                  type="button"
                                  size="icon-sm"
                                  className={pressableClass}
                                  onClick={() => void saveLinePrice(item)}
                                  aria-label={t('sales.saveTotalPriceForItem', { name: item.name })}
                                >
                                  <Check aria-hidden="true" />
                                </Button>
                                <Button
                                  type="button"
                                  size="icon-sm"
                                  variant="outline"
                                  className={pressableClass}
                                  onClick={cancelPriceEdit}
                                  aria-label={t('sales.cancelPriceEdit')}
                                >
                                  <X aria-hidden="true" />
                                </Button>
                                </div>
                              ) : (
                                <p className="text-sm font-semibold tabular-nums">
                                  {formatCurrency(item.price * item.quantity)}
                                </p>
                              )}
                            </div>
                          </div>
                          {editingPriceKey === item.key && priceError ? (
                            <FieldError className="mt-2 text-right">{priceError}</FieldError>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="border-t pt-3">
                    <div className="flex items-center justify-between gap-3 text-base font-semibold">
                      <span>{t('sales.total')}</span>
                      <span className="tabular-nums">{formatCurrency(total)}</span>
                    </div>
                    {statusMessage ? (
                      <p className="mt-2 text-xs text-muted-foreground text-pretty">{statusMessage}</p>
                    ) : null}
                    <Button
                      type="button"
                      className={cn('mt-3 h-10 w-full', pressableClass)}
                      disabled={lineItems.length === 0}
                      onClick={() => dispatchUi({ type: 'checkout/set', patch: { isConfirmOpen: true } })}
                    >
                      {t('sales.checkout')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <Card className="min-h-0 overflow-hidden">
                <CardHeader>
                  <CardTitle>{t('sales.products')}</CardTitle>
                  <CardDescription>{t('sales.noVehicleSelected')}</CardDescription>
                </CardHeader>
                <CardContent className="flex min-h-32 flex-1 items-center justify-center p-4 text-center">
                  <p className="text-sm text-muted-foreground text-pretty">
                    {t('sales.selectVehicleToAddProducts')}
                  </p>
                </CardContent>
              </Card>
              <Card className="min-h-0 overflow-hidden">
                <CardHeader>
                  <CardTitle>{t('sales.currentSale')}</CardTitle>
                  <CardDescription>{t('sales.noActiveSale')}</CardDescription>
                </CardHeader>
                <CardContent className="flex min-h-32 flex-1 items-center justify-center p-4 text-center">
                  <p className="text-sm text-muted-foreground text-pretty">
                    {t('sales.selectedVehicleItemsHint')}
                  </p>
                </CardContent>
              </Card>
            </>
          )}
      </div>

      <AlertDialog
        open={Boolean(orderToDelete)}
        onOpenChange={(open) => {
          if (!open) dispatchUi({ type: 'orderToDelete/set', order: null })
        }}
      >
        <AlertDialogPortal>
          <AlertDialogBackdrop />
          <AlertDialogPopup>
            <AlertDialogTitle>{t('sales.deleteDraftTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {orderToDelete
                ? t('sales.deleteDraftDescriptionWithVehicle', { plateNumber: orderToDelete.vehicle.plateNumber })
                : t('sales.deleteDraftDescription')}
            </AlertDialogDescription>
            <div className="mt-5 flex justify-end gap-2">
              <AlertDialogClose render={<Button type="button" variant="outline" className={pressableClass}>{t('sales.keepDraft')}</Button>} />
              <Button
                type="button"
                variant="destructive"
                className={pressableClass}
                onClick={() => { if (orderToDelete) void deleteDraft(orderToDelete) }}
              >
                <Trash2 data-icon="inline-start" aria-hidden="true" />
                {t('sales.deleteDraft')}
              </Button>
            </div>
          </AlertDialogPopup>
        </AlertDialogPortal>
      </AlertDialog>
      <AlertDialog
        open={isCheckoutConfirmOpen}
        onOpenChange={(open) => {
          if (!isCheckingOut) dispatchUi({ type: 'checkout/set', patch: { isConfirmOpen: open } })
        }}
      >
        <AlertDialogPortal>
          <AlertDialogBackdrop />
          <AlertDialogPopup className="flex max-h-[90vh] max-w-3xl flex-col overflow-hidden p-0">
            <div className="flex items-start gap-3 px-6 pt-6">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <ReceiptText aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <AlertDialogTitle className="text-lg">{t('sales.reviewSaleTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('sales.reviewSaleDescription')}
                </AlertDialogDescription>
              </div>
            </div>

            <div className="min-h-0 overflow-y-auto px-6 py-5">
              <div className="rounded-lg bg-muted/40 p-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('sales.sale')}</p>
                    <p className="mt-1 font-semibold tabular-nums">#{activeOrder?.id}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('sales.vehicle')}</p>
                    <p className="mt-1 font-semibold">{selectedVehicle?.plateNumber}</p>
                    <p className="text-sm text-muted-foreground text-pretty">
                      {selectedVehicle ? vehicleName(selectedVehicle) : ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('sales.customer')}</p>
                    <p className="mt-1 font-semibold">
                      {selectedVehicle?.customerName || t('sales.walkInCustomer')}
                    </p>
                    {selectedVehicle?.customerPhone ? (
                      <p className="text-sm text-muted-foreground tabular-nums">
                        {selectedVehicle.customerPhone}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="mt-5 overflow-hidden rounded-lg border bg-background">
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(100px,160px)_72px_96px_104px] gap-3 border-b bg-muted/70 px-3 py-2 text-xs font-medium text-muted-foreground">
                  <span>{t('sales.item')}</span>
                  <span>{t('sales.category')}</span>
                  <span className="text-right">{t('sales.qty')}</span>
                  <span className="text-right">{t('sales.price')}</span>
                  <span className="text-right">{t('sales.total')}</span>
                </div>
                <div className="divide-y">
                  {lineItems.map((item) => (
                    <div
                      key={item.key}
                      className="grid grid-cols-[minmax(0,1fr)_minmax(100px,160px)_72px_96px_104px] items-center gap-3 px-3 py-2.5 text-sm"
                    >
                      <p className="truncate font-medium text-balance">{item.name}</p>
                      {item.category ? (
                        <ProductCategoryBadge name={item.category} />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                      <span className="text-right tabular-nums">{item.quantity}</span>
                      <span className="text-right tabular-nums">{formatCurrency(item.price)}</span>
                      <span className="text-right font-medium tabular-nums">
                        {formatCurrency(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="w-16 text-muted-foreground">{t('sales.items')}</span>
                    <span className="tabular-nums">{saleItemCount}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="w-16 text-muted-foreground">{t('sales.payment')}</span>
                    <span>{t('sales.cash')}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-6 text-lg font-semibold sm:justify-end">
                  <span>{t('sales.total')}</span>
                  <span className="tabular-nums">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 bg-muted/40 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground text-pretty">
                {t('sales.checkoutSideEffectHint')}
              </p>
              <div className="flex shrink-0 justify-end gap-2">
                <AlertDialogClose
                  render={
                    <Button type="button" variant="outline" className={pressableClass} disabled={isCheckingOut}>
                      {t('sales.goBack')}
                    </Button>
                  }
                />
                <Button
                  type="button"
                  className={pressableClass}
                  disabled={isCheckingOut}
                  onClick={() => void checkoutActiveSale()}
                >
                  <Banknote data-icon="inline-start" aria-hidden="true" />
                  {isCheckingOut ? t('sales.completing') : t('sales.cashReceived')}
                </Button>
              </div>
            </div>
          </AlertDialogPopup>
        </AlertDialogPortal>
      </AlertDialog>
      <AlertDialog
        open={isCheckoutCompleteOpen}
        onOpenChange={(open) => {
          if (!open) closeCompletedSaleDialog()
        }}
      >
        <AlertDialogPortal>
          <AlertDialogBackdrop />
          <AlertDialogPopup className="max-w-md">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
                <Check aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <AlertDialogTitle>{t('sales.checkoutCompleteTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {completedInvoice
                    ? t('sales.checkoutCompleteDescription', { invoiceNumber: completedInvoice.invoiceNumber })
                    : isLoadingCompletedInvoice
                      ? t('sales.preparingInvoiceForPrinting', { invoiceNumber: completedInvoiceNumber })
                      : t('sales.invoiceNotReadyHere', { invoiceNumber: completedInvoiceNumber || t('sales.thisSale') })}
                </AlertDialogDescription>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <Button
                type="button"
                className={cn('h-10 w-full', pressableClass)}
                disabled={!completedInvoice || isLoadingCompletedInvoice}
                onClick={handlePrintCompletedInvoice}
              >
                {isLoadingCompletedInvoice ? (
                  <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" />
                ) : (
                  <Printer data-icon="inline-start" aria-hidden="true" />
                )}
                {t('sales.printInvoice')}
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className={pressableClass}
                  disabled={!completedInvoice || isLoadingCompletedInvoice}
                  onClick={handlePreviewCompletedInvoice}
                >
                  <Eye data-icon="inline-start" aria-hidden="true" />
                  {t('sales.preview')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={pressableClass}
                  onClick={closeCompletedSaleDialog}
                >
                  <Plus data-icon="inline-start" aria-hidden="true" />
                  {t('sales.newSale')}
                </Button>
              </div>
            </div>
          </AlertDialogPopup>
        </AlertDialogPortal>
      </AlertDialog>
      <AlertDialog
        open={isPreviewOpen}
        onOpenChange={(open) => {
          if (!open) handlePreviewClose()
        }}
      >
        <AlertDialogPortal>
          <AlertDialogBackdrop />
          <AlertDialogPopup className="flex max-h-[90vh] w-[90vw] max-w-3xl flex-col gap-0 p-0">
            <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
              <p className="text-sm font-semibold">{completedInvoice?.invoiceNumber ?? t('sales.receiptPreview')}</p>
              <AlertDialogClose
                render={
                  <Button type="button" variant="ghost" size="icon-sm" className={pressableClass} aria-label={t('sales.closePreview')}>
                    <X aria-hidden="true" />
                  </Button>
                }
              />
            </div>
            <div className="min-h-0 flex-1">
              {previewUrl ? (
                <iframe
                  src={previewUrl}
                  title={completedInvoice ? t('sales.invoiceTitle', { invoiceNumber: completedInvoice.invoiceNumber }) : t('sales.receiptPreview')}
                  className="h-full w-full rounded-b-xl border-0"
                  style={{ minHeight: '70vh' }}
                />
              ) : null}
            </div>
          </AlertDialogPopup>
        </AlertDialogPortal>
      </AlertDialog>
    </div>
  )
}
