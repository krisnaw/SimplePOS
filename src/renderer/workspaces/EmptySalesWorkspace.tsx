import { type FormEvent, useEffect, useMemo, useState } from 'react'
import {
  Banknote,
  Car,
  Check,
  Clock3,
  Minus,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogPopup,
  AlertDialogPortal,
  AlertDialogTitle,
} from '@/renderer/components/ui/alert-dialog'
import { Badge } from '@/renderer/components/ui/badge'
import { Button } from '@/renderer/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/renderer/components/ui/card'
import { Field, FieldError, FieldLabel } from '@/renderer/components/ui/field'
import { Input } from '@/renderer/components/ui/input'
import { Label } from '@/renderer/components/ui/label'
import { formatCurrency } from '@/renderer/lib/formatters'
import { cn } from '@/renderer/lib/utils'
import type { AuthenticatedUser } from '@/shared/types/user'
import type { VehicleSummary } from '@/shared/types/vehicle'
import { SalesCatalogListItem } from './SalesCatalogListItem'
import {
  normalizePlateNumber,
  normalizeSearchText,
  parseVehicleInput,
} from './vehicle-intake'

type MockVehicle = VehicleSummary

type MockCatalogItem = {
  key: string
  id: number
  type: 'service' | 'product'
  name: string
  code: string
  category: string
  price: number
}

type SaleLineItem = MockCatalogItem & {
  quantity: number
  basePrice: number
  priceOverriddenById: number | null
  priceOverriddenAt: string | null
}

type MockSaleOrder = {
  id: number
  vehicle: MockVehicle
  lineItems: SaleLineItem[]
  createdAt: string
  updatedAt: string
  isStale: boolean
}

const pressableClass =
  'transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out active:scale-[0.96]'

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

export function EmptySalesWorkspace({ currentUser }: { currentUser: AuthenticatedUser }) {
  const [vehicles, setVehicles] = useState<MockVehicle[]>([])
  const [catalogItems, setCatalogItems] = useState<MockCatalogItem[]>([])
  const [query, setQuery] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false)
  const [newVehiclePlate, setNewVehiclePlate] = useState('')
  const [newVehicleBrand, setNewVehicleBrand] = useState('')
  const [newVehicleName, setNewVehicleName] = useState('')
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [newVehicleErrors, setNewVehicleErrors] = useState<{
    plateNumber?: string
    model?: string
  }>({})
  const [orders, setOrders] = useState<MockSaleOrder[]>([])
  const [activeOrderId, setActiveOrderId] = useState<number | null>(null)
  const [orderToDelete, setOrderToDelete] = useState<MockSaleOrder | null>(null)
  const [editingPriceKey, setEditingPriceKey] = useState<string | null>(null)
  const [priceDraft, setPriceDraft] = useState('')
  const [priceError, setPriceError] = useState('')
  const [isCheckoutConfirmOpen, setIsCheckoutConfirmOpen] = useState(false)
  const [isCheckingOut, setIsCheckingOut] = useState(false)

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
              ? 'Uncategorized'
              : categoryNames.get(product.categoryId) ?? 'Uncategorized',
            price: product.unitPrice,
          })),
        )
      },
    )
    void api.salesDrafts.list().then((drafts) => {
      setOrders(drafts)
      setActiveOrderId(drafts[0]?.id ?? null)
    })
  }, [])

  useEffect(() => {
    const api = window.simplepos
    if (!api) return
    const timeout = window.setTimeout(() => {
      void api.vehicles.search({ query, limit: 20 }).then(setVehicles)
    }, 150)
    return () => window.clearTimeout(timeout)
  }, [query])

  const matchedVehicles = useMemo(() => {
    if (!normalizedQuery) return vehicles

    const terms = normalizedQuery.split(' ').filter(Boolean)
    return vehicles.filter((vehicle) => {
      const searchText = vehicleSearchText(vehicle)
      return terms.every((term) => searchText.includes(term))
    })
  }, [normalizedQuery, vehicles])

  const hasExactPlateMatch = parsedInput.plateNumber
    ? vehicles.some(
        (vehicle) =>
          normalizePlateNumber(vehicle.plateNumber) ===
          normalizePlateNumber(parsedInput.plateNumber),
      )
    : false

  function clearSearch() {
    setQuery('')
    setIsDropdownOpen(false)
    setIsAddVehicleOpen(false)
  }

  async function selectVehicle(vehicle: MockVehicle) {
    const api = window.simplepos
    if (!api) return
    const draft = await api.salesDrafts.create({ vehicleId: vehicle.id, createdById: currentUser.id })
    if (!draft) return
    const drafts = await api.salesDrafts.list()
    setOrders(drafts)
    setActiveOrderId(draft.id)
    setStatusMessage(draft.created ? '' : 'This vehicle already has an ongoing sale.')
    setQuery('')
    setIsDropdownOpen(false)
  }

  async function deleteDraft(order: MockSaleOrder) {
    const api = window.simplepos
    if (!api) return
    const result = await api.salesDrafts.delete({ saleId: order.id })
    setStatusMessage(result.message)
    setOrderToDelete(null)
    if (!result.ok) return

    const remainingOrders = orders.filter((candidate) => candidate.id !== order.id)
    setOrders(remainingOrders)
    if (activeOrderId === order.id) {
      setActiveOrderId(remainingOrders[0]?.id ?? null)
    }
  }

  function openAddVehicleForm() {
    setNewVehiclePlate(parsedInput.plateNumber)
    setNewVehicleBrand('')
    setNewVehicleName(parsedInput.model)
    setNewCustomerName('')
    setNewCustomerPhone('')
    setNewVehicleErrors({})
    setIsAddVehicleOpen(true)
  }

  async function addMockVehicle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const plateNumber = normalizePlateNumber(newVehiclePlate)
    const brand = newVehicleBrand.trim()
    const carName = newVehicleName.trim()
    const plateExists = vehicles.some(
      (vehicle) => normalizePlateNumber(vehicle.plateNumber) === plateNumber,
    )
    const errors = {
      ...(!plateNumber ? { plateNumber: 'Plate number is required.' } : {}),
      ...(plateExists ? { plateNumber: 'This plate number already exists.' } : {}),
      ...(!carName ? { model: 'Model is required.' } : {}),
    }

    if (Object.keys(errors).length > 0) {
      setNewVehicleErrors(errors)
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
      setNewVehicleErrors({ plateNumber: result.message })
      return
    }
    const nextVehicle = result.vehicle

    setVehicles((currentVehicles) => [nextVehicle, ...currentVehicles])
    await selectVehicle(nextVehicle)
    setNewVehiclePlate('')
    setNewVehicleBrand('')
    setNewVehicleName('')
    setNewCustomerName('')
    setNewCustomerPhone('')
    setNewVehicleErrors({})
    setIsAddVehicleOpen(false)
  }

  async function checkoutActiveSale() {
    if (!activeOrder || lineItems.length === 0 || isCheckingOut) return
    const api = window.simplepos
    if (!api) return
    setIsCheckingOut(true)
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
      setStatusMessage(result.message)
      setIsCheckoutConfirmOpen(false)
      if (result.ok) {
        setOrders((current) => current.filter((order) => order.id !== activeOrder.id))
        setActiveOrderId(null)
        setQuery('')
      }
    } finally {
      setIsCheckingOut(false)
    }
  }

  function cancelAddVehicle() {
    setIsAddVehicleOpen(false)
    setNewVehicleErrors({})
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
    setEditingPriceKey(item.key)
    setPriceDraft(String(item.price * item.quantity))
    setPriceError('')
  }

  function cancelPriceEdit() {
    setEditingPriceKey(null)
    setPriceDraft('')
    setPriceError('')
  }

  async function saveLinePrice(item: SaleLineItem) {
    if (!activeOrder) return
    const lineTotal = Number(priceDraft)
    if (!Number.isInteger(lineTotal) || lineTotal < 0) {
      setPriceError('Enter a non-negative whole amount.')
      return
    }
    if (lineTotal % item.quantity !== 0) {
      setPriceError(`Total must be divisible by ${item.quantity}.`)
      return
    }
    const unitPrice = lineTotal / item.quantity

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
      setPriceError('Unable to save this price.')
      return
    }

    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === activeOrder.id ? { ...order, lineItems: nextItems } : order
      ),
    )
    cancelPriceEdit()
  }

  function getOrderTotal(order: MockSaleOrder): number {
    return order.lineItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <Card className="overflow-visible">
        <CardContent className="overflow-visible">
          <div className="relative flex max-w-2xl flex-col gap-2">
            <Label htmlFor="vehicle-intake-search" className="sr-only">Plate / vehicle</Label>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="vehicle-intake-search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setIsDropdownOpen(Boolean(event.target.value.trim()))
                }}
                onFocus={() => setIsDropdownOpen(Boolean(query.trim()))}
                placeholder="DK1234 Avanza"
                className="pl-10 pr-10 uppercase"
              />
              {query ? (
                <button
                  type="button"
                  aria-label="Clear vehicle search"
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
                    {matchedVehicles.length} result{matchedVehicles.length === 1 ? '' : 's'}
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
                          <p className="text-sm font-medium text-balance">No vehicle found</p>
                          <p className="mt-1 text-xs text-muted-foreground text-pretty">
                            Type a plate number to add a mock vehicle.
                          </p>
                        </div>
                        {parsedInput.plateNumber && !hasExactPlateMatch ? (
                          <Button type="button" size="sm" className={pressableClass} onClick={openAddVehicleForm}>
                            <Plus data-icon="inline-start" aria-hidden="true" />
                            Add vehicle
                          </Button>
                        ) : null}
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
                  {isAddVehicleOpen ? (
                    <form className="flex flex-col gap-3 border-t p-3" onSubmit={addMockVehicle}>
                      <div>
                        <p className="text-sm font-medium text-balance">Add vehicle</p>
                        <p className="mt-0.5 text-xs text-muted-foreground text-pretty">
                          This mock record will be cleared when the app refreshes.
                        </p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="new-vehicle-plate">Plate number</Label>
                          <Input
                            id="new-vehicle-plate"
                            value={newVehiclePlate}
                            onChange={(event) => {
                              setNewVehiclePlate(event.target.value)
                              setNewVehicleErrors((current) => ({ ...current, plateNumber: undefined }))
                            }}
                            placeholder="DK1234"
                            className="uppercase tabular-nums"
                            aria-invalid={Boolean(newVehicleErrors.plateNumber)}
                            autoFocus
                          />
                          {newVehicleErrors.plateNumber ? (
                            <p className="text-xs text-destructive" role="alert">
                              {newVehicleErrors.plateNumber}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="new-customer-name">Customer name (optional)</Label>
                          <Input
                            id="new-customer-name"
                            value={newCustomerName}
                            onChange={(event) => setNewCustomerName(event.target.value)}
                            placeholder="Customer name"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="new-customer-phone">Phone (optional)</Label>
                          <Input
                            id="new-customer-phone"
                            value={newCustomerPhone}
                            onChange={(event) => setNewCustomerPhone(event.target.value)}
                            placeholder="08123456789"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="new-vehicle-brand">Brand (optional)</Label>
                          <Input
                            id="new-vehicle-brand"
                            value={newVehicleBrand}
                            onChange={(event) => setNewVehicleBrand(event.target.value)}
                            placeholder="Toyota"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="new-vehicle-name">Model</Label>
                          <Input
                            id="new-vehicle-name"
                            value={newVehicleName}
                            onChange={(event) => {
                              setNewVehicleName(event.target.value)
                              setNewVehicleErrors((current) => ({ ...current, model: undefined }))
                            }}
                            placeholder="Avanza"
                            aria-invalid={Boolean(newVehicleErrors.model)}
                          />
                          {newVehicleErrors.model ? (
                            <p className="text-xs text-destructive" role="alert">
                              {newVehicleErrors.model}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" className={pressableClass} onClick={cancelAddVehicle}>
                          Cancel
                        </Button>
                        <Button type="submit" className={pressableClass}>
                          Add vehicle
                        </Button>
                      </div>
                    </form>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[240px_minmax(0,1fr)_340px]">
          <Card className="min-h-0 overflow-hidden">
            <CardHeader>
              <CardTitle>In Progress</CardTitle>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-auto">
              {orders.length === 0 ? (
                <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed p-4 text-center">
                  <p className="text-sm text-muted-foreground text-pretty">No orders in progress.</p>
                </div>
              ) : (
                orders.map((order) => {
                  const isActive = order.id === activeOrderId

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
                          setIsDropdownOpen(false)
                        }}
                        className="min-w-0 rounded-tl-lg px-2.5 pt-2 text-left transition-transform duration-150 ease-out active:scale-[0.98]"
                      >
                        <span className="flex items-start justify-between gap-2">
                          <span className="min-w-0">
                            <span className="flex flex-wrap items-center gap-1.5">
                              <span className="text-sm font-semibold tabular-nums">{order.vehicle.plateNumber}</span>
                              {order.isStale ? (
                                <Badge variant="secondary">
                                  <Clock3 data-icon="inline-start" aria-hidden="true" />
                                  Stale
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
                        onClick={() => setOrderToDelete(order)}
                        aria-label={`Delete draft for ${order.vehicle.plateNumber}`}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveOrderId(order.id)
                          setIsDropdownOpen(false)
                        }}
                        className="col-span-2 flex w-full items-center justify-between gap-2 rounded-b-lg px-2.5 pb-2 pt-1.5 text-xs text-muted-foreground transition-transform duration-150 ease-out active:scale-[0.98]"
                      >
                        <span className="tabular-nums">
                          {order.lineItems.length} item{order.lineItems.length === 1 ? '' : 's'}
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
                  <CardTitle>Products</CardTitle>
                  <CardDescription>{selectedVehicle.plateNumber} · {vehicleName(selectedVehicle)}</CardDescription>
                </CardHeader>
                <CardContent className="scroll-fade flex min-h-0 flex-col gap-3 overflow-auto">
                  {catalogItems.map((item) => (
                    <SalesCatalogListItem
                      key={item.key}
                      itemType={item.type}
                      typeLabel={item.type === 'service' ? 'Service' : 'Product'}
                      name={item.name}
                      category={item.category}
                      code={item.code}
                      price={item.price}
                      addLabel="Add"
                      onAdd={() => addLineItem(item)}
                    />
                  ))}
                </CardContent>
              </Card>

              <Card className="min-h-0 overflow-hidden">
                <CardHeader>
                  <CardTitle>Current Sale</CardTitle>
                  <CardDescription>
                    {saleItemCount} item{saleItemCount === 1 ? '' : 's'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
                  <div className="scroll-fade flex min-h-0 flex-1 flex-col gap-2 overflow-auto">
                    {lineItems.length === 0 ? (
                      <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed p-4 text-center">
                        <p className="text-sm text-muted-foreground text-pretty">Add a product to start.</p>
                      </div>
                    ) : (
                      lineItems.map((item) => (
                        <div key={item.key} className="rounded-lg bg-muted/60 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <p className="truncate text-sm font-medium">{item.name}</p>
                                {item.price !== item.basePrice ? <Badge variant="secondary">Adjusted</Badge> : null}
                              </div>
                            </div>
                            <div className="flex shrink-0 items-start">
                              <Button
                                type="button"
                                size="icon-sm"
                                variant="ghost"
                                className={pressableClass}
                                onClick={() => beginPriceEdit(item)}
                                aria-label={`Edit price for ${item.name}`}
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
                                aria-label={`Decrease ${item.name}`}
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
                                aria-label={`Increase ${item.name}`}
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
                                  min="0"
                                  step="1"
                                  value={priceDraft}
                                  onChange={(event) => {
                                    setPriceDraft(event.target.value)
                                    setPriceError('')
                                  }}
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter') void saveLinePrice(item)
                                    if (event.key === 'Escape') cancelPriceEdit()
                                  }}
                                  className="h-8 w-24 tabular-nums"
                                  aria-label={`Total price for ${item.name}`}
                                  aria-invalid={Boolean(priceError)}
                                  autoFocus
                                />
                                <Button
                                  type="button"
                                  size="icon-sm"
                                  className={pressableClass}
                                  onClick={() => void saveLinePrice(item)}
                                  aria-label={`Save total price for ${item.name}`}
                                >
                                  <Check aria-hidden="true" />
                                </Button>
                                <Button
                                  type="button"
                                  size="icon-sm"
                                  variant="outline"
                                  className={pressableClass}
                                  onClick={cancelPriceEdit}
                                  aria-label="Cancel price edit"
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
                      <span>Total</span>
                      <span className="tabular-nums">{formatCurrency(total)}</span>
                    </div>
                    {statusMessage ? (
                      <p className="mt-2 text-xs text-muted-foreground text-pretty">{statusMessage}</p>
                    ) : null}
                    <Button
                      type="button"
                      className={cn('mt-3 h-10 w-full', pressableClass)}
                      disabled={lineItems.length === 0}
                      onClick={() => setIsCheckoutConfirmOpen(true)}
                    >
                      Checkout
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <Card className="min-h-0 overflow-hidden">
                <CardHeader>
                  <CardTitle>Products</CardTitle>
                  <CardDescription>No vehicle selected</CardDescription>
                </CardHeader>
                <CardContent className="flex min-h-32 flex-1 items-center justify-center p-4 text-center">
                  <p className="text-sm text-muted-foreground text-pretty">
                    Select a vehicle to add products.
                  </p>
                </CardContent>
              </Card>
              <Card className="min-h-0 overflow-hidden">
                <CardHeader>
                  <CardTitle>Current Sale</CardTitle>
                  <CardDescription>No active sale</CardDescription>
                </CardHeader>
                <CardContent className="flex min-h-32 flex-1 items-center justify-center p-4 text-center">
                  <p className="text-sm text-muted-foreground text-pretty">
                    The selected vehicle&apos;s sale items will appear here.
                  </p>
                </CardContent>
              </Card>
            </>
          )}
      </div>

      <AlertDialog open={Boolean(orderToDelete)} onOpenChange={(open) => { if (!open) setOrderToDelete(null) }}>
        <AlertDialogPortal>
          <AlertDialogBackdrop />
          <AlertDialogPopup>
            <AlertDialogTitle>Delete this draft?</AlertDialogTitle>
            <AlertDialogDescription>
              {orderToDelete
                ? `The unfinished sale for ${orderToDelete.vehicle.plateNumber} and all of its items will be permanently deleted.`
                : 'This unfinished sale and all of its items will be permanently deleted.'}
            </AlertDialogDescription>
            <div className="mt-5 flex justify-end gap-2">
              <AlertDialogClose render={<Button type="button" variant="outline" className={pressableClass}>Keep draft</Button>} />
              <Button
                type="button"
                variant="destructive"
                className={pressableClass}
                onClick={() => { if (orderToDelete) void deleteDraft(orderToDelete) }}
              >
                <Trash2 data-icon="inline-start" aria-hidden="true" />
                Delete draft
              </Button>
            </div>
          </AlertDialogPopup>
        </AlertDialogPortal>
      </AlertDialog>
      <AlertDialog
        open={isCheckoutConfirmOpen}
        onOpenChange={(open) => {
          if (!isCheckingOut) setIsCheckoutConfirmOpen(open)
        }}
      >
        <AlertDialogPortal>
          <AlertDialogBackdrop />
          <AlertDialogPopup>
            <AlertDialogTitle>Confirm full cash payment?</AlertDialogTitle>
            <AlertDialogDescription>
              Confirm that {formatCurrency(total)} was received in cash. This completes the sale, creates a paid invoice, and reduces product stock.
            </AlertDialogDescription>
            <div className="mt-5 flex justify-end gap-2">
              <AlertDialogClose
                render={
                  <Button type="button" variant="outline" className={pressableClass} disabled={isCheckingOut}>
                    Go back
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
                {isCheckingOut ? 'Completing...' : 'Cash received'}
              </Button>
            </div>
          </AlertDialogPopup>
        </AlertDialogPortal>
      </AlertDialog>
    </div>
  )
}
