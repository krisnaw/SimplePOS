import { type FormEvent, useEffect, useMemo, useState } from 'react'
import {
  Car,
  Check,
  Minus,
  Package,
  Plus,
  Search,
  UserRound,
  Wrench,
  X,
} from 'lucide-react'
import { Button } from '@/renderer/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/renderer/components/ui/card'
import { Input } from '@/renderer/components/ui/input'
import { Label } from '@/renderer/components/ui/label'
import { formatCurrency } from '@/renderer/lib/formatters'
import { cn } from '@/renderer/lib/utils'
import type { AuthenticatedUser } from '@/shared/types/user'
import type { VehicleSummary } from '@/shared/types/vehicle'
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
  price: number
}

type SaleLineItem = MockCatalogItem & {
  quantity: number
}

type MockSaleOrder = {
  id: string
  vehicle: MockVehicle
  lineItems: SaleLineItem[]
  createdAt: string
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
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null)

  const parsedInput = useMemo(() => parseVehicleInput(query), [query])
  const normalizedQuery = normalizeSearchText(query)
  const activeOrder = orders.find((order) => order.id === activeOrderId) ?? null
  const selectedVehicle = activeOrder?.vehicle ?? null
  const lineItems = activeOrder?.lineItems ?? []
  const total = lineItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

  useEffect(() => {
    const api = window.simplepos
    if (!api) return
    void Promise.all([api.products.list(), api.services.list()]).then(
      ([products, services]) => {
        setCatalogItems([
          ...services.filter((service) => service.isActive).map((service) => ({
            id: service.id,
            key: `service-${service.id}`,
            type: 'service' as const,
            name: service.name,
            code: service.code,
            price: service.price,
          })),
          ...products.filter((product) => product.isActive && product.stockQty > 0).map((product) => ({
            id: product.id,
            key: `product-${product.id}`,
            type: 'product' as const,
            name: product.name,
            code: product.sku,
            price: product.unitPrice,
          })),
        ])
      },
    )
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

  function selectVehicle(vehicle: MockVehicle) {
    const existingOrder = orders.find((order) => order.vehicle.id === vehicle.id)
    const nextOrderId = existingOrder?.id ?? `mock-order-${Date.now()}`

    if (!existingOrder) {
      setOrders((currentOrders) => [
        ...currentOrders,
        {
          id: nextOrderId,
          vehicle,
          lineItems: [],
          createdAt: new Date().toISOString(),
        },
      ])
    }

    setActiveOrderId(nextOrderId)
    setQuery(`${vehicle.plateNumber} ${vehicle.model}`)
    setIsDropdownOpen(false)
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
    selectVehicle(nextVehicle)
    setNewVehiclePlate('')
    setNewVehicleBrand('')
    setNewVehicleName('')
    setNewCustomerName('')
    setNewCustomerPhone('')
    setNewVehicleErrors({})
    setIsAddVehicleOpen(false)
  }

  async function checkoutActiveSale() {
    if (!activeOrder || lineItems.length === 0) return
    const api = window.simplepos
    if (!api) return
    const result = await api.checkout.create({
      vehicleId: activeOrder.vehicle.id,
      createdById: currentUser.id,
      paymentMethod: 'cash',
      amountPaid: total,
      items: lineItems.map((item) => ({
        itemType: item.type,
        id: item.id,
        quantity: item.quantity,
      })),
    })
    setStatusMessage(result.message)
    if (result.ok) {
      setOrders((current) => current.filter((order) => order.id !== activeOrder.id))
      setActiveOrderId(null)
      setQuery('')
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
          : [...order.lineItems, { ...item, quantity: 1 }]

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

        return { ...order, lineItems }
      }),
    )
  }

  function startNewSale() {
    setActiveOrderId(null)
    setQuery('')
    setIsDropdownOpen(false)
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
                            onClick={() => selectVehicle(vehicle)}
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

      {orders.length > 0 || selectedVehicle ? (
        <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[240px_minmax(0,1fr)_340px]">
          <Card className="min-h-0 overflow-hidden">
            <CardHeader>
              <CardTitle>In Progress</CardTitle>
              <CardDescription>{orders.length} active order{orders.length === 1 ? '' : 's'}</CardDescription>
              <CardAction>
                <Button type="button" size="icon-sm" variant="outline" className={pressableClass} onClick={startNewSale} aria-label="New sale">
                      <Plus aria-hidden="true" />
                    </Button>
              </CardAction>
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
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => {
                        setActiveOrderId(order.id)
                        setQuery(`${order.vehicle.plateNumber} ${order.vehicle.model}`)
                        setIsDropdownOpen(false)
                      }}
                      className={cn(
                        'rounded-lg border px-2.5 py-2 text-left shadow-sm transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out active:scale-[0.98]',
                        isActive
                          ? 'border-primary/50 bg-primary/5 shadow-border-hover'
                          : 'bg-card hover:border-primary/30 hover:shadow-border-hover',
                      )}
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold tabular-nums">{order.vehicle.plateNumber}</span>
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            {vehicleName(order.vehicle)}
                          </span>
                        </span>
                        {isActive ? (
                          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Check className="size-3" aria-hidden="true" />
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span className="tabular-nums">{order.lineItems.length} item{order.lineItems.length === 1 ? '' : 's'}</span>
                        <span className="font-medium text-foreground tabular-nums">{formatCurrency(getOrderTotal(order))}</span>
                      </span>
                    </button>
                  )
                })
              )}
            </CardContent>
          </Card>

          {selectedVehicle ? (
            <>
              <Card className="min-h-0 overflow-hidden">
                <CardHeader>
                  <CardTitle>Products & Services</CardTitle>
                  <CardDescription>{selectedVehicle.plateNumber} · {vehicleName(selectedVehicle)}</CardDescription>
                </CardHeader>
                <CardContent className="grid min-h-0 gap-1.5 overflow-auto">
                  {catalogItems.map((item) => {
                    const Icon = item.type === 'service' ? Wrench : Package

                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => addLineItem(item)}
                        className="rounded-lg border bg-background px-3 py-2 text-left shadow-sm transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out hover:border-primary/30 hover:shadow-border-hover active:scale-[0.98]"
                      >
                        <span className="flex items-center justify-between gap-3">
                          <span className="min-w-0">
                            <span className="flex items-center gap-2">
                              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                                <Icon className="size-3.5" aria-hidden="true" />
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-semibold">{item.name}</span>
                                <span className="block text-xs text-muted-foreground tabular-nums">{item.code}</span>
                              </span>
                            </span>
                          </span>
                          <span className="shrink-0 text-sm font-semibold tabular-nums">{formatCurrency(item.price)}</span>
                        </span>
                      </button>
                    )
                  })}
                </CardContent>
              </Card>

              <Card className="min-h-0 overflow-hidden">
                <CardHeader>
                  <CardTitle>Current Sale</CardTitle>
                  <CardDescription>Mock products and services</CardDescription>
                </CardHeader>
                <CardContent className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
                  <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto">
                    {lineItems.length === 0 ? (
                      <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed p-4 text-center">
                        <p className="text-sm text-muted-foreground text-pretty">Add a product or service to start.</p>
                      </div>
                    ) : (
                      lineItems.map((item) => (
                        <div key={item.key} className="rounded-lg bg-muted/60 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{item.name}</p>
                              <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                                {formatCurrency(item.price)} each
                              </p>
                            </div>
                            <p className="shrink-0 text-sm font-semibold tabular-nums">
                              {formatCurrency(item.price * item.quantity)}
                            </p>
                          </div>
                          <div className="mt-3 flex items-center justify-end gap-1">
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
                      onClick={() => void checkoutActiveSale()}
                    >
                      Checkout
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="min-h-0 overflow-hidden xl:col-span-2">
              <CardContent className="flex min-h-40 flex-1 items-center justify-center text-center">
                <p className="text-sm text-muted-foreground text-pretty">Start a new sale by searching a plate number.</p>
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}

    </div>
  )
}
