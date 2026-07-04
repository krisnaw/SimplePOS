import { useEffect, useMemo, useState } from 'react'
import {
  Check,
  ClipboardList,
  FileText,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Trash2,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/renderer/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/renderer/components/ui/card'
import { Input } from '@/renderer/components/ui/input'
import { Label } from '@/renderer/components/ui/label'
import { BaseSelect } from '@/renderer/components/ui/base-select'
import { cn } from '@/renderer/lib/utils'
import { formatCurrency, formatDateTime as formatDate } from '@/renderer/lib/formatters'
import type { AuthenticatedUser, UserSummary } from '@/shared/types/user'
import type { CustomerSummary } from '@/shared/types/customer'
import type { VehicleSummary } from '@/shared/types/vehicle'
import type { ProductSummary } from '@/shared/types/product'
import type { ServiceSummary } from '@/shared/types/service'
import type {
  WorkOrderSummary,
  WorkOrderDetail,
  WorkOrderStatus,
  WorkOrderPriority,
} from '@/shared/types/work-order'
import type { CatalogItem, SimplePosApi } from './WorkOrderWorkspace.types'

const pressableButtonClass =
  'transition-[transform,box-shadow] duration-150 ease-out active:scale-[0.96] active:translate-y-0'

const statusOptions: Array<WorkOrderStatus | 'all'> = ['all', 'draft', 'open', 'in_progress', 'completed', 'invoiced', 'cancelled']

const statusFlow: WorkOrderStatus[] = ['draft', 'open', 'in_progress', 'completed', 'cancelled']
const editableStatuses: WorkOrderStatus[] = ['draft', 'open', 'in_progress', 'completed']

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

function selectableStatuses(workOrder: NonNullable<WorkOrderDetail>): WorkOrderStatus[] {
  if (workOrder.status === 'invoiced') {
    return workOrder.invoiceNumber ? ['invoiced'] : ['invoiced', 'completed']
  }

  return statusFlow
}

function getVehicleLabel(vehicle: VehicleSummary): string {
  return `${vehicle.plateNumber} · ${vehicle.brand} ${vehicle.model}`
}

export function WorkOrderWorkspace({ currentUser }: { currentUser: AuthenticatedUser }) {
  const { t } = useTranslation()
  const [workOrders, setWorkOrders] = useState<WorkOrderSummary[]>([])
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrderDetail | null>(null)
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
  const [isCreatingWorkOrder, setIsCreatingWorkOrder] = useState(false)

  const [customerId, setCustomerId] = useState('')
  const [vehicleId, setVehicleId] = useState('')
  const [assignedUserId, setAssignedUserId] = useState('')
  const [priority, setPriority] = useState<WorkOrderPriority>('normal')
  const [complaint, setComplaint] = useState('')
  const [notes, setNotes] = useState('')
  const [odometer, setOdometer] = useState('')

  const [catalogType, setCatalogType] = useState<'service' | 'product'>('service')
  const [catalogId, setCatalogId] = useState('')
  const [itemQuantity, setItemQuantity] = useState('1')

  const catalogItems = useMemo<CatalogItem[]>(() => {
    const serviceItems = services.map<CatalogItem>((service) => ({
      id: service.id,
      itemType: 'service',
      name: service.name,
      code: service.code,
      category: service.category ?? t('workOrders.servicesCategory'),
      price: service.price,
      stockQty: null,
    }))

    const productItems = products.map<CatalogItem>((product) => ({
      id: product.id,
      itemType: 'product',
      name: product.name,
      code: product.sku,
      category: t(`workOrders.units.${product.unitType}`),
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

    const nextSelectedId = selectedId ?? selectedWorkOrder?.id
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
  }

  function syncForm(workOrder: NonNullable<WorkOrderDetail>) {
    setCustomerId(String(workOrder.customerId))
    setVehicleId(String(workOrder.vehicleId))
    setAssignedUserId(workOrder.assignedUserId ? String(workOrder.assignedUserId) : '')
    setPriority(workOrder.priority)
    setComplaint(workOrder.complaint)
    setNotes(workOrder.notes ?? '')
    setOdometer(workOrder.odometer ? String(workOrder.odometer) : '')
  }

  async function selectWorkOrder(id: number) {
    const detail = await window.simplepos?.workOrders.get({ id })
    setSelectedWorkOrder(detail ?? null)
    if (detail) syncForm(detail)
    setIsCreatingWorkOrder(false)
  }

  async function handleNewWorkOrder() {
    setSelectedWorkOrder(null)
    resetForm()
    setIsCreatingWorkOrder(true)
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
      status: selectedWorkOrder?.status ?? 'open',
    }

    const result = selectedWorkOrder
      ? await window.simplepos?.workOrders.update(payload)
      : await window.simplepos?.workOrders.create(payload)

    if (!result) {
      setMessage(t('workOrders.messages.unableToReachDb'))
      return
    }

    setMessage(result.message)

    if (result.ok && result.workOrder) {
      setIsCreatingWorkOrder(false)
      await loadWorkspace(result.workOrder.id)
    }
  }

  async function handleStatusChange(status: WorkOrderStatus) {
    if (!selectedWorkOrder) return

    const result = await window.simplepos?.workOrders.updateStatus({
      id: selectedWorkOrder.id,
      status,
    })

    setMessage(result?.message ?? t('workOrders.messages.unableToUpdateStatus'))
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

    setMessage(result?.message ?? t('workOrders.messages.unableToAddItem'))
    if (result?.ok && result.workOrder) await loadWorkspace(result.workOrder.id)
  }

  async function handleUpdateItem(id: number, quantity: number) {
    const result = await window.simplepos?.workOrders.updateItem({ id, quantity })

    setMessage(result?.message ?? t('workOrders.messages.unableToUpdateItem'))
    if (result?.ok && result.workOrder) await loadWorkspace(result.workOrder.id)
  }

  async function handleDeleteItem(id: number) {
    const result = await window.simplepos?.workOrders.deleteItem({ id })

    setMessage(result?.message ?? t('workOrders.messages.unableToRemoveItem'))
    if (result?.ok && result.workOrder) await loadWorkspace(result.workOrder.id)
  }

  async function handleCheckout() {
    if (!selectedWorkOrder) return

    const result = await window.simplepos?.workOrders.checkout({
      id: selectedWorkOrder.id,
      createdById: currentUser.id,
      paymentMethod: 'cash',
      amountPaid: selectedWorkOrder.total,
      notes: selectedWorkOrder.notes,
    })

    setMessage(result?.message ?? t('workOrders.messages.unableToCheckout'))
    if (result?.ok && result.workOrder) await loadWorkspace(result.workOrder.id)
  }

  return (
    <div className="grid min-h-0 min-w-0 gap-3 p-1 xl:grid-cols-[360px_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle>{t('workOrders.title')}</CardTitle>
          <CardDescription>
            {t('workOrders.listDescription')}
          </CardDescription>
          <CardAction>
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              className={pressableButtonClass}
              onClick={() => void loadWorkspace()}
              aria-label={t('workOrders.refresh')}
            >
              <RefreshCw aria-hidden="true" />
            </Button>
          </CardAction>
        </CardHeader>

        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('workOrders.searchPlaceholder')}
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {statusOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={statusFilter === option}
                  onClick={() => setStatusFilter(option)}
                  className={cn(
                    'rounded-full px-2.5 py-1 text-[11px] font-medium transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.96]',
                    statusFilter === option
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
                  )}
                >
                  {option === 'all' ? t('common.all') : t(`workOrders.statuses.${option}`)}
                </button>
              ))}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
                aria-label={t('workOrders.fromDate')}
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                aria-label={t('workOrders.toDate')}
              />
            </div>
          </div>
          {visibleWorkOrders.length === 0 ? (
            <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-background p-4 text-center shadow-border">
              {isLoading ? (
                <>
                  <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
                  <p className="text-sm text-muted-foreground">{t('workOrders.loading')}</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-pretty">{t('workOrders.noWorkOrders')}</p>
              )}
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
                        {t(`workOrders.statuses.${workOrder.status}`)}
                      </span>
                    </span>
                    <span className="mt-2 line-clamp-2 text-xs text-muted-foreground text-pretty">
                      {workOrder.complaint}
                    </span>
                    <span className="mt-2 flex items-center justify-between gap-2 text-xs">
                      <span className="text-muted-foreground tabular-nums">
                        {t('workOrders.itemCount', { count: workOrder.itemCount })}
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
            {t('workOrders.newWorkOrder')}
          </Button>
        </div>
      </Card>

      <div className="grid min-h-0 min-w-0 gap-3 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedWorkOrder ? selectedWorkOrder.orderNumber : isCreatingWorkOrder ? t('workOrders.newWorkOrder') : t('workOrders.detailTitle')}
            </CardTitle>
            <CardDescription>
              {selectedWorkOrder || isCreatingWorkOrder
                ? t('workOrders.detailDescription')
                : t('workOrders.detailEmptyDescription')}
            </CardDescription>
            {selectedWorkOrder ? (
              <CardAction>
                <div className="flex flex-wrap gap-1.5">
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium capitalize', statusClass(selectedWorkOrder.status))}>
                    {t(`workOrders.statuses.${selectedWorkOrder.status}`)}
                  </span>
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', priorityClass(selectedWorkOrder.priority))}>
                    {t(`workOrders.priorities.${selectedWorkOrder.priority}`)}
                  </span>
                </div>
              </CardAction>
            ) : null}
          </CardHeader>

          <CardContent className="flex flex-col gap-3">
            {!selectedWorkOrder && !isCreatingWorkOrder ? (
              <div className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-background p-6 text-center shadow-border">
                <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                  <ClipboardList className="size-5 text-muted-foreground" aria-hidden="true" />
                </div>
                <div className="max-w-sm">
                  <p className="text-sm font-medium text-balance">{t('workOrders.noSelectionTitle')}</p>
                  <p className="mt-1 text-sm text-muted-foreground text-pretty">
                    {t('workOrders.noSelectionHint')}
                  </p>
                </div>
                <Button type="button" className={pressableButtonClass} onClick={() => void handleNewWorkOrder()}>
                  <Plus data-icon="inline-start" aria-hidden="true" />
                  {t('workOrders.newWorkOrder')}
                </Button>
              </div>
            ) : (
              <>
            {message ? (
              <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground text-pretty" role="status">
                {message}
              </p>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="work-order-customer">{t('workOrders.form.customer')}</Label>
                <BaseSelect
                  value={customerId}
                  disabled={!canEditSelected}
                  ariaLabel={t('workOrders.form.customer')}
                  placeholder={t('workOrders.form.selectCustomer')}
                  options={[
                    { value: '', label: t('workOrders.form.selectCustomer') },
                    ...customers.map((customer) => ({ value: String(customer.id), label: customer.name })),
                  ]}
                  onValueChange={(nextCustomerId) => {
                    const nextVehicle = vehicles.find((vehicle) => vehicle.customerId === Number(nextCustomerId))
                    setCustomerId(nextCustomerId)
                    setVehicleId(nextVehicle ? String(nextVehicle.id) : '')
                  }}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="work-order-vehicle">{t('workOrders.form.vehicle')}</Label>
                <BaseSelect
                  value={vehicleId}
                  disabled={!canEditSelected}
                  ariaLabel={t('workOrders.form.vehicle')}
                  placeholder={t('workOrders.form.selectVehicle')}
                  options={[
                    { value: '', label: t('workOrders.form.selectVehicle') },
                    ...filteredVehicles.map((vehicle) => ({
                      value: String(vehicle.id),
                      label: getVehicleLabel(vehicle),
                    })),
                  ]}
                  onValueChange={setVehicleId}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="work-order-assignee">{t('workOrders.form.assignedStaff')}</Label>
                <BaseSelect
                  value={assignedUserId}
                  disabled={!canEditSelected}
                  ariaLabel={t('workOrders.form.assignedStaff')}
                  placeholder={t('workOrders.form.unassigned')}
                  options={[
                    { value: '', label: t('workOrders.form.unassigned') },
                    ...users.map((user) => ({ value: String(user.id), label: user.name })),
                  ]}
                  onValueChange={setAssignedUserId}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="work-order-priority">{t('workOrders.form.priority')}</Label>
                  <BaseSelect
                    value={priority}
                    disabled={!canEditSelected}
                    ariaLabel={t('workOrders.form.priority')}
                    options={[
                      { value: 'low', label: t('workOrders.priorities.low') },
                      { value: 'normal', label: t('workOrders.priorities.normal') },
                      { value: 'high', label: t('workOrders.priorities.high') },
                      { value: 'urgent', label: t('workOrders.priorities.urgent') },
                    ]}
                    onValueChange={(nextPriority) => setPriority(nextPriority as WorkOrderPriority)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="work-order-odometer">{t('workOrders.form.odometer')}</Label>
                  <Input
                    id="work-order-odometer"
                    type="number"
                    min="0"
                    value={odometer}
                    disabled={!canEditSelected}
                    onChange={(event) => setOdometer(event.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="work-order-complaint">{t('workOrders.form.complaint')}</Label>
              <textarea
                id="work-order-complaint"
                value={complaint}
                disabled={!canEditSelected}
                onChange={(event) => setComplaint(event.target.value)}
                rows={3}
                className="min-h-20 resize-y rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="work-order-notes">{t('common.notes')}</Label>
              <Input
                id="work-order-notes"
                value={notes}
                disabled={!canEditSelected}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {selectedWorkOrder ? (
                <div className="flex flex-col gap-1.5">
                  <Label>{t('common.status')}</Label>
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <BaseSelect
                      value={selectedWorkOrder.status}
                      ariaLabel={t('workOrders.changeStatus')}
                      options={selectableStatuses(selectedWorkOrder).map((status) => ({
                        value: status,
                        label: t(`workOrders.statuses.${status}`),
                      }))}
                      onValueChange={(nextStatus) => void handleStatusChange(nextStatus as WorkOrderStatus)}
                    />
                    <Button
                      type="button"
                      className={cn('h-10', pressableButtonClass)}
                      disabled={!canEditSelected || !customerId || !vehicleId || !complaint.trim()}
                      onClick={() => void handleSaveWorkOrder()}
                    >
                      <Check data-icon="inline-start" aria-hidden="true" />
                      {t('workOrders.saveWorkOrder')}
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-col gap-1.5">
                <Label>{t('workOrders.actionGroup')}</Label>
                <Button
                  type="button"
                  variant={selectedWorkOrder ? 'outline' : 'default'}
                  className={cn('h-10', !selectedWorkOrder && 'w-full', pressableButtonClass)}
                  disabled={selectedWorkOrder ? !canCheckoutSelected : !canEditSelected || !customerId || !vehicleId || !complaint.trim()}
                  onClick={() => selectedWorkOrder ? void handleCheckout() : void handleSaveWorkOrder()}
                >
                  {selectedWorkOrder ? (
                    <>
                      <ShoppingCart data-icon="inline-start" aria-hidden="true" />
                      {t('workOrders.checkout')}
                    </>
                  ) : (
                    <>
                      <Check data-icon="inline-start" aria-hidden="true" />
                      {t('workOrders.createWorkOrder')}
                    </>
                  )}
                </Button>
              </div>
            </div>

            {selectedWorkOrder ? (
              <div className="rounded-lg bg-muted px-3 py-2">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('workOrders.statusTimeline')}
                </p>
                <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                  <span className="flex justify-between gap-3">
                    <span>{t('workOrders.timeline.created')}</span>
                    <span className="text-right tabular-nums">{formatDate(selectedWorkOrder.createdAt)}</span>
                  </span>
                  <span className="flex justify-between gap-3">
                    <span>{t('workOrders.timeline.updated')}</span>
                    <span className="text-right tabular-nums">{formatDate(selectedWorkOrder.updatedAt)}</span>
                  </span>
                  <span className="flex justify-between gap-3">
                    <span>{t('workOrders.timeline.completed')}</span>
                    <span className="text-right tabular-nums">{formatDate(selectedWorkOrder.completedAt)}</span>
                  </span>
                  <span className="flex justify-between gap-3">
                    <span>{t('workOrders.timeline.invoiced')}</span>
                    <span className="text-right tabular-nums">{formatDate(selectedWorkOrder.invoicedAt)}</span>
                  </span>
                </div>
              </div>
            ) : null}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('workOrders.itemsAndTotals')}</CardTitle>
            <CardDescription>
              {t('workOrders.itemsDescription')}
            </CardDescription>
            <CardAction>
              <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </CardAction>
          </CardHeader>

          <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
            {!selectedWorkOrder ? (
              <div className="flex min-h-40 flex-1 items-center justify-center rounded-lg border border-dashed bg-background p-4 text-center shadow-border">
                <div className="flex max-w-xs flex-col items-center gap-2">
                  <ClipboardList className="size-5 text-muted-foreground" aria-hidden="true" />
                  <p className="text-sm text-muted-foreground text-pretty">
                    {t('workOrders.createOrSelectBeforeItems')}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="grid gap-2 sm:grid-cols-[110px_1fr_76px_auto]">
                  <BaseSelect
                    value={catalogType}
                    disabled={!canEditSelected}
                    ariaLabel={t('workOrders.itemType')}
                    options={[
                      { value: 'service', label: t('sales.service') },
                      { value: 'product', label: t('sales.product') },
                    ]}
                    onValueChange={(nextType) => setCatalogType(nextType as 'service' | 'product')}
                  />
                  <BaseSelect
                    value={catalogId}
                    disabled={!canEditSelected}
                    ariaLabel={t('workOrders.catalogItem')}
                    placeholder={t('workOrders.selectItem')}
                    options={catalogItems.map((item) => ({
                      value: String(item.id),
                      label: `${item.name} · ${formatCurrency(item.price)}${
                        item.stockQty === null ? '' : ` · ${t('workOrders.stockCount', { count: item.stockQty })}`
                      }`,
                    }))}
                    onValueChange={setCatalogId}
                  />
                  <Input
                    type="number"
                    min="1"
                    value={itemQuantity}
                    disabled={!canEditSelected}
                    onChange={(event) => setItemQuantity(event.target.value)}
                    aria-label={t('workOrders.quantity')}
                  />
                  <Button
                    type="button"
                    className={pressableButtonClass}
                    disabled={!canEditSelected || !catalogId || Number(itemQuantity) <= 0}
                    onClick={() => void handleAddItem()}
                  >
                    <Plus data-icon="inline-start" aria-hidden="true" />
                    {t('sales.add')}
                  </Button>
                </div>

                <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto">
                  {selectedWorkOrder.items.length === 0 ? (
                    <div className="rounded-lg border border-dashed bg-background px-4 py-3 text-center shadow-border">
                      <p className="text-sm text-muted-foreground text-pretty">
                        {t('workOrders.addItemsHint')}
                      </p>
                    </div>
                  ) : (
                    selectedWorkOrder.items.map((item) => (
                      <div key={item.id} className="rounded-lg bg-background p-3 shadow-border">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-balance">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.itemType === 'service' ? t('sales.service') : t('sales.product')} · {item.sku ?? t('workOrders.noCode')}
                            </p>
                            <p className="text-xs text-muted-foreground tabular-nums">
                              {t('workOrders.priceEach', { price: formatCurrency(item.unitPrice) })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold tabular-nums">{formatCurrency(item.lineTotal)}</p>
                            <p className="text-xs text-muted-foreground tabular-nums">{t('workOrders.qty', { count: item.quantity })}</p>
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
                              aria-label={t('workOrders.decreaseItem', { name: item.name })}
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
                              aria-label={t('workOrders.increaseItem', { name: item.name })}
                            >
                              <Plus aria-hidden="true" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-sm"
                              className={pressableButtonClass}
                              onClick={() => void handleDeleteItem(item.id)}
                              aria-label={t('workOrders.removeItem', { name: item.name })}
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
                    <span className="text-muted-foreground">{t('sales.subtotal')}</span>
                    <span className="tabular-nums">{formatCurrency(selectedWorkOrder.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-base font-semibold">
                    <span>{t('sales.total')}</span>
                    <span className="tabular-nums">{formatCurrency(selectedWorkOrder.total)}</span>
                  </div>
                  <div className="mt-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground text-pretty">
                    {selectedWorkOrder.invoiceNumber
                      ? t('workOrders.invoiceCreated', { invoice: selectedWorkOrder.invoiceNumber, date: formatDate(selectedWorkOrder.invoicedAt) })
                      : selectedWorkOrder.status === 'completed'
                        ? t('workOrders.readyForCheckout')
                        : t('workOrders.completeBeforeCheckout')}
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
