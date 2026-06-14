import { useEffect, useMemo, useState } from 'react'
import {
  Check,
  ClipboardList,
  FileText,
  Minus,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Trash2,
} from 'lucide-react'
import { Button } from '@/renderer/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/renderer/components/ui/card'
import { Input } from '@/renderer/components/ui/input'
import { Label } from '@/renderer/components/ui/label'
import { cn } from '@/renderer/lib/utils'
import type { AuthenticatedUser } from '@/shared/types/app'

type SimplePosApi = NonNullable<Window['simplepos']>
type WorkOrderSummary = Awaited<ReturnType<SimplePosApi['workOrders']['list']>>[number]
type WorkOrderDetail = Awaited<ReturnType<SimplePosApi['workOrders']['get']>>
type WorkOrderStatus = WorkOrderSummary['status']
type WorkOrderPriority = WorkOrderSummary['priority']
type CustomerSummary = Awaited<ReturnType<SimplePosApi['customers']['list']>>[number]
type VehicleSummary = Awaited<ReturnType<SimplePosApi['vehicles']['list']>>[number]
type ProductSummary = Awaited<ReturnType<SimplePosApi['products']['list']>>[number]
type ServiceSummary = Awaited<ReturnType<SimplePosApi['services']['list']>>[number]
type UserSummary = Awaited<ReturnType<SimplePosApi['users']['list']>>[number]

type CatalogItem = {
  id: number
  itemType: 'product' | 'service'
  name: string
  code: string
  category: string
  price: number
  stockQty: number | null
}

const pressableButtonClass =
  'transition-[transform,box-shadow] duration-150 ease-out active:scale-[0.96] active:translate-y-0'

const statusOptions: Array<{ value: WorkOrderStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'invoiced', label: 'Invoiced' },
  { value: 'cancelled', label: 'Cancelled' },
]

const statusFlow: WorkOrderStatus[] = ['draft', 'open', 'in_progress', 'completed', 'invoiced', 'cancelled']
const editableStatuses: WorkOrderStatus[] = ['draft', 'open', 'in_progress', 'completed']

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value).replace(/^Rp[\s\u00a0]*/, 'Rp')
}

function formatDate(value: string | null): string {
  if (!value) return 'Not set'

  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function statusLabel(status: WorkOrderStatus): string {
  return status.replace('_', ' ')
}

function priorityLabel(priority: WorkOrderPriority): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1)
}

function statusClass(status: WorkOrderStatus): string {
  if (status === 'completed') return 'bg-primary/10 text-primary'
  if (status === 'invoiced') return 'bg-emerald-500/10 text-emerald-700'
  if (status === 'cancelled') return 'bg-destructive/10 text-destructive'
  if (status === 'in_progress') return 'bg-muted text-foreground'
  return 'bg-muted text-muted-foreground'
}

function priorityClass(priority: WorkOrderPriority): string {
  if (priority === 'urgent') return 'bg-destructive/10 text-destructive'
  if (priority === 'high') return 'bg-primary/10 text-primary'
  return 'bg-muted text-muted-foreground'
}

function getVehicleLabel(vehicle: VehicleSummary): string {
  return `${vehicle.plateNumber} · ${vehicle.brand} ${vehicle.model}`
}

export function WorkOrderWorkspace({ currentUser }: { currentUser: AuthenticatedUser }) {
  const [workOrders, setWorkOrders] = useState<WorkOrderSummary[]>([])
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrderDetail>(null)
  const [customers, setCustomers] = useState<CustomerSummary[]>([])
  const [vehicles, setVehicles] = useState<VehicleSummary[]>([])
  const [products, setProducts] = useState<ProductSummary[]>([])
  const [services, setServices] = useState<ServiceSummary[]>([])
  const [users, setUsers] = useState<UserSummary[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<WorkOrderStatus | 'all'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  const [customerId, setCustomerId] = useState('')
  const [vehicleId, setVehicleId] = useState('')
  const [assignedUserId, setAssignedUserId] = useState('')
  const [priority, setPriority] = useState<WorkOrderPriority>('normal')
  const [complaint, setComplaint] = useState('')
  const [notes, setNotes] = useState('')
  const [odometer, setOdometer] = useState('')
  const [discount, setDiscount] = useState('0')

  const [catalogType, setCatalogType] = useState<'service' | 'product'>('service')
  const [catalogId, setCatalogId] = useState('')
  const [itemQuantity, setItemQuantity] = useState('1')

  const catalogItems = useMemo<CatalogItem[]>(() => {
    const serviceItems = services.map<CatalogItem>((service) => ({
      id: service.id,
      itemType: 'service',
      name: service.name,
      code: service.code,
      category: service.category ?? 'Services',
      price: service.price,
      stockQty: null,
    }))

    const productItems = products.map<CatalogItem>((product) => ({
      id: product.id,
      itemType: 'product',
      name: product.name,
      code: product.sku,
      category: product.unitType,
      price: product.unitPrice,
      stockQty: product.stockQty,
    }))

    return catalogType === 'service' ? serviceItems : productItems
  }, [catalogType, products, services])

  const filteredVehicles = useMemo(() => {
    const selectedCustomerId = Number(customerId)
    if (!selectedCustomerId) return []

    return vehicles.filter((vehicle) => vehicle.customerId === selectedCustomerId)
  }, [customerId, vehicles])

  const visibleWorkOrders = useMemo(() => {
    const query = search.trim().toLowerCase()

    return workOrders.filter((workOrder) => {
      if (statusFilter !== 'all' && workOrder.status !== statusFilter) return false
      if (dateFrom && workOrder.createdAt.slice(0, 10) < dateFrom) return false
      if (dateTo && workOrder.createdAt.slice(0, 10) > dateTo) return false
      if (!query) return true

      return [
        workOrder.orderNumber,
        workOrder.customerName,
        workOrder.vehicleName,
        workOrder.plateNumber,
        workOrder.complaint,
        workOrder.assignedUserName ?? '',
      ].some((value) => value.toLowerCase().includes(query))
    })
  }, [dateFrom, dateTo, search, statusFilter, workOrders])

  const canEditSelected = selectedWorkOrder ? editableStatuses.includes(selectedWorkOrder.status) : true
  const canCheckoutSelected = selectedWorkOrder?.status === 'completed' && selectedWorkOrder.items.length > 0

  useEffect(() => {
    void loadWorkspace()
  }, [])

  useEffect(() => {
    if (!message) return

    const timeoutId = window.setTimeout(() => setMessage(''), 3000)
    return () => window.clearTimeout(timeoutId)
  }, [message])

  useEffect(() => {
    if (catalogItems[0]) {
      setCatalogId(String(catalogItems[0].id))
    } else {
      setCatalogId('')
    }
  }, [catalogItems])

  async function loadWorkspace(selectedId?: number) {
    setIsLoading(true)

    const [
      workOrderList,
      customerList,
      vehicleList,
      productList,
      serviceList,
      userList,
    ] = await Promise.all([
      window.simplepos?.workOrders.list(),
      window.simplepos?.customers.list(),
      window.simplepos?.vehicles.list(),
      window.simplepos?.products.list(),
      window.simplepos?.services.list(),
      window.simplepos?.users.list(),
    ])

    const nextWorkOrders = workOrderList ?? []
    setWorkOrders(nextWorkOrders)
    setCustomers(customerList ?? [])
    setVehicles(vehicleList ?? [])
    setProducts(productList ?? [])
    setServices(serviceList ?? [])
    setUsers(userList ?? [])

    const nextSelectedId = selectedId ?? selectedWorkOrder?.id ?? nextWorkOrders[0]?.id
    if (nextSelectedId) {
      const detail = await window.simplepos?.workOrders.get({ id: nextSelectedId })
      setSelectedWorkOrder(detail ?? null)
      if (detail) syncForm(detail)
    } else {
      setSelectedWorkOrder(null)
      resetForm(customerList?.[0]?.id, vehicleList)
    }

    setIsLoading(false)
  }

  function resetForm(nextCustomerId?: number, nextVehicles = vehicles) {
    const firstCustomerId = nextCustomerId ?? customers[0]?.id
    const firstVehicle = firstCustomerId
      ? nextVehicles.find((vehicle) => vehicle.customerId === firstCustomerId)
      : undefined

    setCustomerId(firstCustomerId ? String(firstCustomerId) : '')
    setVehicleId(firstVehicle ? String(firstVehicle.id) : '')
    setAssignedUserId(String(currentUser.id))
    setPriority('normal')
    setComplaint('')
    setNotes('')
    setOdometer('')
    setDiscount('0')
  }

  function syncForm(workOrder: NonNullable<WorkOrderDetail>) {
    setCustomerId(String(workOrder.customerId))
    setVehicleId(String(workOrder.vehicleId))
    setAssignedUserId(workOrder.assignedUserId ? String(workOrder.assignedUserId) : '')
    setPriority(workOrder.priority)
    setComplaint(workOrder.complaint)
    setNotes(workOrder.notes ?? '')
    setOdometer(workOrder.odometer ? String(workOrder.odometer) : '')
    setDiscount(String(workOrder.discount))
  }

  async function selectWorkOrder(id: number) {
    const detail = await window.simplepos?.workOrders.get({ id })
    setSelectedWorkOrder(detail ?? null)
    if (detail) syncForm(detail)
  }

  async function handleNewWorkOrder() {
    setSelectedWorkOrder(null)
    resetForm()
  }

  async function handleSaveWorkOrder() {
    const payload = {
      id: selectedWorkOrder?.id,
      customerId: Number(customerId),
      vehicleId: Number(vehicleId),
      assignedUserId: assignedUserId ? Number(assignedUserId) : null,
      priority,
      complaint,
      notes,
      odometer: odometer ? Number(odometer) : null,
      discount: discount ? Number(discount) : 0,
      status: selectedWorkOrder?.status ?? 'open',
    }

    const result = selectedWorkOrder
      ? await window.simplepos?.workOrders.update(payload)
      : await window.simplepos?.workOrders.create(payload)

    if (!result) {
      setMessage('Unable to reach the database.')
      return
    }

    setMessage(result.message)

    if (result.ok && result.workOrder) {
      await loadWorkspace(result.workOrder.id)
    }
  }

  async function handleStatusChange(status: WorkOrderStatus) {
    if (!selectedWorkOrder) return

    const result = await window.simplepos?.workOrders.updateStatus({
      id: selectedWorkOrder.id,
      status,
    })

    setMessage(result?.message ?? 'Unable to update status.')
    if (result?.ok && result.workOrder) await loadWorkspace(result.workOrder.id)
  }

  async function handleAddItem() {
    if (!selectedWorkOrder || !catalogId) return

    const result = await window.simplepos?.workOrders.addItem({
      workOrderId: selectedWorkOrder.id,
      itemType: catalogType,
      id: Number(catalogId),
      quantity: Number(itemQuantity),
    })

    setMessage(result?.message ?? 'Unable to add item.')
    if (result?.ok && result.workOrder) await loadWorkspace(result.workOrder.id)
  }

  async function handleUpdateItem(id: number, quantity: number) {
    const result = await window.simplepos?.workOrders.updateItem({ id, quantity })

    setMessage(result?.message ?? 'Unable to update item.')
    if (result?.ok && result.workOrder) await loadWorkspace(result.workOrder.id)
  }

  async function handleDeleteItem(id: number) {
    const result = await window.simplepos?.workOrders.deleteItem({ id })

    setMessage(result?.message ?? 'Unable to remove item.')
    if (result?.ok && result.workOrder) await loadWorkspace(result.workOrder.id)
  }

  async function handleCheckout() {
    if (!selectedWorkOrder) return

    const result = await window.simplepos?.workOrders.checkout({
      id: selectedWorkOrder.id,
      createdById: currentUser.id,
      paymentMethod: 'cash',
      amountPaid: selectedWorkOrder.total,
      discount: selectedWorkOrder.discount,
      tax: selectedWorkOrder.tax,
      notes: selectedWorkOrder.notes,
    })

    setMessage(result?.message ?? 'Unable to checkout work order.')
    if (result?.ok && result.workOrder) await loadWorkspace(result.workOrder.id)
  }

  return (
    <div className="grid min-h-0 min-w-0 gap-3 xl:grid-cols-[360px_minmax(0,1fr)]">
      <Card className="flex min-h-[560px] min-w-0 flex-col gap-0 overflow-hidden shadow-border">
        <CardHeader className="gap-2 border-b px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-sm text-balance">Work Orders</CardTitle>
              <CardDescription className="truncate text-xs text-pretty">
                Repair jobs before checkout
              </CardDescription>
            </div>
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              className={pressableButtonClass}
              onClick={() => void loadWorkspace()}
              aria-label="Refresh work orders"
            >
              <RefreshCw aria-hidden="true" />
            </Button>
          </div>

          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search work orders..."
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={statusFilter === option.value}
                onClick={() => setStatusFilter(option.value)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[11px] font-medium transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.96]',
                  statusFilter === option.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              aria-label="Filter work orders from date"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              aria-label="Filter work orders to date"
            />
          </div>
        </CardHeader>

        <CardContent className="min-h-0 flex-1 overflow-auto px-2 py-2">
          {visibleWorkOrders.length === 0 ? (
            <div className="flex min-h-40 items-center justify-center rounded-lg border border-dashed bg-background p-4 text-center shadow-border">
              <p className="text-sm text-muted-foreground text-pretty">
                {isLoading ? 'Loading work orders...' : 'No work orders found.'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {visibleWorkOrders.map((workOrder) => {
                const isSelected = selectedWorkOrder?.id === workOrder.id

                return (
                  <button
                    key={workOrder.id}
                    type="button"
                    onClick={() => void selectWorkOrder(workOrder.id)}
                    className={cn(
                      'rounded-lg p-3 text-left shadow-border transition-[background-color,box-shadow,transform] duration-150 ease-out active:scale-[0.98]',
                      isSelected ? 'bg-primary/10 shadow-border-hover' : 'bg-background hover:bg-muted/50',
                    )}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{workOrder.orderNumber}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {workOrder.customerName} · {workOrder.plateNumber}
                        </span>
                      </span>
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium capitalize', statusClass(workOrder.status))}>
                        {statusLabel(workOrder.status)}
                      </span>
                    </span>
                    <span className="mt-2 line-clamp-2 text-xs text-muted-foreground text-pretty">
                      {workOrder.complaint}
                    </span>
                    <span className="mt-2 flex items-center justify-between gap-2 text-xs">
                      <span className="text-muted-foreground tabular-nums">
                        {workOrder.itemCount} item{workOrder.itemCount === 1 ? '' : 's'}
                      </span>
                      <span className="font-medium tabular-nums">{formatCurrency(workOrder.total)}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>

        <div className="border-t p-3">
          <Button type="button" className={cn('w-full', pressableButtonClass)} onClick={() => void handleNewWorkOrder()}>
            <Plus data-icon="inline-start" aria-hidden="true" />
            New Work Order
          </Button>
        </div>
      </Card>

      <div className="grid min-h-0 min-w-0 gap-3 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="min-w-0 shadow-border">
          <CardHeader className="gap-1 px-4 py-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <CardTitle className="text-sm text-balance">
                  {selectedWorkOrder ? selectedWorkOrder.orderNumber : 'New Work Order'}
                </CardTitle>
                <CardDescription className="text-xs text-pretty">
                  Customer vehicle, complaint, assignment, and job status.
                </CardDescription>
              </div>
              {selectedWorkOrder ? (
                <div className="flex flex-wrap justify-start gap-1.5 sm:justify-end">
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium capitalize', statusClass(selectedWorkOrder.status))}>
                    {statusLabel(selectedWorkOrder.status)}
                  </span>
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', priorityClass(selectedWorkOrder.priority))}>
                    {priorityLabel(selectedWorkOrder.priority)}
                  </span>
                </div>
              ) : null}
            </div>
          </CardHeader>

          <CardContent className="flex flex-col gap-4 px-4 pb-4">
            <div
              className={cn(
                'grid transition-[grid-template-rows,opacity] duration-150 ease-in',
                message ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
              )}
            >
              <div className="overflow-hidden">
                <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground text-pretty" role="status">
                  {message || '\u00a0'}
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="work-order-customer">Customer</Label>
                <select
                  id="work-order-customer"
                  value={customerId}
                  disabled={!canEditSelected}
                  onChange={(event) => {
                    const nextCustomerId = event.target.value
                    const nextVehicle = vehicles.find((vehicle) => vehicle.customerId === Number(nextCustomerId))
                    setCustomerId(nextCustomerId)
                    setVehicleId(nextVehicle ? String(nextVehicle.id) : '')
                  }}
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                >
                  <option value="">Select customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>{customer.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="work-order-vehicle">Vehicle</Label>
                <select
                  id="work-order-vehicle"
                  value={vehicleId}
                  disabled={!canEditSelected}
                  onChange={(event) => setVehicleId(event.target.value)}
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                >
                  <option value="">Select vehicle</option>
                  {filteredVehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>{getVehicleLabel(vehicle)}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="work-order-assignee">Assigned Staff</Label>
                <select
                  id="work-order-assignee"
                  value={assignedUserId}
                  disabled={!canEditSelected}
                  onChange={(event) => setAssignedUserId(event.target.value)}
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                >
                  <option value="">Unassigned</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="work-order-priority">Priority</Label>
                  <select
                    id="work-order-priority"
                    value={priority}
                    disabled={!canEditSelected}
                    onChange={(event) => setPriority(event.target.value as WorkOrderPriority)}
                    className="h-10 rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="work-order-odometer">Odometer</Label>
                  <Input
                    id="work-order-odometer"
                    type="number"
                    min="0"
                    value={odometer}
                    disabled={!canEditSelected}
                    onChange={(event) => setOdometer(event.target.value)}
                    placeholder="42500"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="work-order-complaint">Complaint</Label>
              <textarea
                id="work-order-complaint"
                value={complaint}
                disabled={!canEditSelected}
                onChange={(event) => setComplaint(event.target.value)}
                rows={3}
                className="min-h-20 resize-y rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="Brake noise when stopping..."
              />
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_160px]">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="work-order-notes">Notes</Label>
                <Input
                  id="work-order-notes"
                  value={notes}
                  disabled={!canEditSelected}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Internal notes"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="work-order-discount">Discount</Label>
                <Input
                  id="work-order-discount"
                  type="number"
                  min="0"
                  value={discount}
                  disabled={!canEditSelected}
                  onChange={(event) => setDiscount(event.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className={pressableButtonClass}
                disabled={!canEditSelected || !customerId || !vehicleId || !complaint.trim()}
                onClick={() => void handleSaveWorkOrder()}
              >
                <Check data-icon="inline-start" aria-hidden="true" />
                {selectedWorkOrder ? 'Save Work Order' : 'Create Work Order'}
              </Button>

              {selectedWorkOrder ? (
                <>
                  <select
                    value={selectedWorkOrder.status}
                    onChange={(event) => void handleStatusChange(event.target.value as WorkOrderStatus)}
                    className="h-10 rounded-md border bg-background px-3 text-sm"
                    aria-label="Change work order status"
                  >
                    {statusFlow.map((status) => (
                      <option key={status} value={status}>{statusLabel(status)}</option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    className={pressableButtonClass}
                    disabled={!canCheckoutSelected}
                    onClick={() => void handleCheckout()}
                  >
                    <ShoppingCart data-icon="inline-start" aria-hidden="true" />
                    Checkout
                  </Button>
                </>
              ) : null}
            </div>

            {selectedWorkOrder ? (
              <div className="rounded-lg bg-muted px-3 py-2">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Status Timeline
                </p>
                <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                  <span className="flex justify-between gap-3">
                    <span>Created</span>
                    <span className="text-right tabular-nums">{formatDate(selectedWorkOrder.createdAt)}</span>
                  </span>
                  <span className="flex justify-between gap-3">
                    <span>Updated</span>
                    <span className="text-right tabular-nums">{formatDate(selectedWorkOrder.updatedAt)}</span>
                  </span>
                  <span className="flex justify-between gap-3">
                    <span>Completed</span>
                    <span className="text-right tabular-nums">{formatDate(selectedWorkOrder.completedAt)}</span>
                  </span>
                  <span className="flex justify-between gap-3">
                    <span>Invoiced</span>
                    <span className="text-right tabular-nums">{formatDate(selectedWorkOrder.invoicedAt)}</span>
                  </span>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="flex min-h-[560px] min-w-0 flex-col gap-0 overflow-hidden shadow-border">
          <CardHeader className="gap-1 border-b px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="text-sm text-balance">Items And Totals</CardTitle>
                <CardDescription className="truncate text-xs text-pretty">
                  Services and products attached to the repair job.
                </CardDescription>
              </div>
              <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </div>
          </CardHeader>

          <CardContent className="flex min-h-0 flex-1 flex-col gap-3 px-4 py-3">
            {!selectedWorkOrder ? (
              <div className="flex min-h-40 flex-1 items-center justify-center rounded-lg border border-dashed bg-background p-4 text-center shadow-border">
                <div className="flex max-w-xs flex-col items-center gap-2">
                  <ClipboardList className="size-5 text-muted-foreground" aria-hidden="true" />
                  <p className="text-sm text-muted-foreground text-pretty">
                    Create or select a work order before adding line items.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="grid gap-2 sm:grid-cols-[110px_1fr_76px_auto]">
                  <select
                    value={catalogType}
                    disabled={!canEditSelected}
                    onChange={(event) => setCatalogType(event.target.value as 'service' | 'product')}
                    className="h-10 rounded-md border bg-background px-3 text-sm"
                    aria-label="Item type"
                  >
                    <option value="service">Service</option>
                    <option value="product">Product</option>
                  </select>
                  <select
                    value={catalogId}
                    disabled={!canEditSelected}
                    onChange={(event) => setCatalogId(event.target.value)}
                    className="h-10 min-w-0 rounded-md border bg-background px-3 text-sm"
                    aria-label="Catalog item"
                  >
                    {catalogItems.map((item) => (
                      <option key={`${item.itemType}:${item.id}`} value={item.id}>
                        {item.name} · {formatCurrency(item.price)}
                        {item.stockQty === null ? '' : ` · ${item.stockQty} stock`}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    min="1"
                    value={itemQuantity}
                    disabled={!canEditSelected}
                    onChange={(event) => setItemQuantity(event.target.value)}
                    aria-label="Quantity"
                  />
                  <Button
                    type="button"
                    className={pressableButtonClass}
                    disabled={!canEditSelected || !catalogId || Number(itemQuantity) <= 0}
                    onClick={() => void handleAddItem()}
                  >
                    <Plus data-icon="inline-start" aria-hidden="true" />
                    Add
                  </Button>
                </div>

                <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto">
                  {selectedWorkOrder.items.length === 0 ? (
                    <div className="rounded-lg border border-dashed bg-background px-4 py-3 text-center shadow-border">
                      <p className="text-sm text-muted-foreground text-pretty">
                        Add services or products before completing the job.
                      </p>
                    </div>
                  ) : (
                    selectedWorkOrder.items.map((item) => (
                      <div key={item.id} className="rounded-lg bg-background p-3 shadow-border">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-balance">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.itemType === 'service' ? 'Service' : 'Product'} · {item.sku ?? 'No code'}
                            </p>
                            <p className="text-xs text-muted-foreground tabular-nums">
                              {formatCurrency(item.unitPrice)} each
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold tabular-nums">{formatCurrency(item.lineTotal)}</p>
                            <p className="text-xs text-muted-foreground tabular-nums">Qty {item.quantity}</p>
                          </div>
                        </div>
                        {canEditSelected ? (
                          <div className="mt-3 flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-sm"
                              className={pressableButtonClass}
                              onClick={() => void handleUpdateItem(item.id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              aria-label={`Decrease ${item.name}`}
                            >
                              <Minus aria-hidden="true" />
                            </Button>
                            <span className="w-8 text-center text-sm font-medium tabular-nums">{item.quantity}</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-sm"
                              className={pressableButtonClass}
                              onClick={() => void handleUpdateItem(item.id, item.quantity + 1)}
                              aria-label={`Increase ${item.name}`}
                            >
                              <Plus aria-hidden="true" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-sm"
                              className={pressableButtonClass}
                              onClick={() => void handleDeleteItem(item.id)}
                              aria-label={`Remove ${item.name}`}
                            >
                              <Trash2 aria-hidden="true" />
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>

                <div className="flex shrink-0 flex-col gap-1.5 border-t pt-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="tabular-nums">{formatCurrency(selectedWorkOrder.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="tabular-nums">{formatCurrency(selectedWorkOrder.discount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax 11%</span>
                    <span className="tabular-nums">{formatCurrency(selectedWorkOrder.tax)}</span>
                  </div>
                  <div className="flex justify-between text-base font-semibold">
                    <span>Total</span>
                    <span className="tabular-nums">{formatCurrency(selectedWorkOrder.total)}</span>
                  </div>
                  <div className="mt-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground text-pretty">
                    {selectedWorkOrder.invoiceNumber
                      ? `Invoice ${selectedWorkOrder.invoiceNumber} created ${formatDate(selectedWorkOrder.invoicedAt)}.`
                      : selectedWorkOrder.status === 'completed'
                        ? 'This work order is ready for checkout.'
                        : 'Complete the job before checkout.'}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
