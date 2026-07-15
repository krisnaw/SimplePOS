import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, Loader2, Mail, MapPin, Pencil, Phone, Plus, Search, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/renderer/components/ui/button'
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
import {VehicleIdentityFields} from '@/renderer/components/VehicleIdentityFields'
import { cn } from '@/renderer/lib/utils'
import { formatDate } from '@/renderer/lib/formatters'
import type { CustomerSummary } from '@/shared/types/customer'
import type { VehicleSummary } from '@/shared/types/vehicle'
import type { CustomerFormState, VehicleFormState } from './CustomerWorkspace.types'

const emptyForm: CustomerFormState = {
  name: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
}

const emptyVehicleForm: VehicleFormState = {
  plateNumber: '',
  brand: '',
  model: '',
  year: '',
  vin: '',
  color: '',
  notes: '',
}

function toVehicleForm(vehicle: VehicleSummary): VehicleFormState {
  return {
    plateNumber: vehicle.plateNumber,
    brand: vehicle.brand ?? '',
    model: vehicle.model,
    year: vehicle.year ? String(vehicle.year) : '',
    vin: vehicle.vin ?? '',
    color: vehicle.color ?? '',
    notes: vehicle.notes ?? '',
  }
}

function RequiredMark() {
  return <span className="ml-0.5 text-destructive" aria-hidden="true">*</span>
}

export function CustomerWorkspace() {
  const { t } = useTranslation()
  const [customers, setCustomers] = useState<CustomerSummary[]>([])
  const [vehicles, setVehicles] = useState<VehicleSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null)
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [form, setForm] = useState<CustomerFormState>(emptyForm)
  const [vehicleForm, setVehicleForm] = useState<VehicleFormState>(emptyVehicleForm)
  const [message, setMessage] = useState('')
  const [vehicleMessage, setVehicleMessage] = useState('')
  const [isEditingCustomer, setIsEditingCustomer] = useState(false)
  const [isEditingVehicle, setIsEditingVehicle] = useState(false)
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false)
  const [view, setView] = useState<'list' | 'detail'>('list')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isVehicleSubmitting, setIsVehicleSubmitting] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [confirmingVehicleDelete, setConfirmingVehicleDelete] = useState(false)

  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId) ?? null
  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === selectedVehicleId) ?? null
  const selectedCustomerVehicles = selectedCustomer
    ? vehicles.filter((vehicle) => vehicle.customerId === selectedCustomer.id && vehicle.isActive)
    : []
  const activeCustomers = customers.filter((customer) => customer.isActive).length
  const customersWithEmail = customers.filter((customer) => customer.email).length
  const activeVehicles = vehicles.filter((vehicle) => vehicle.isActive).length

  useEffect(() => {
    let isMounted = true

    async function loadRecords() {
      setIsLoading(true)
      const [customerList, vehicleList] = await Promise.all([
        window.simplepos?.customers.list(),
        window.simplepos?.vehicles.list(),
      ])

      if (!isMounted) return

      if (customerList && vehicleList) {
        setCustomers(customerList)
        setVehicles(vehicleList)
      }

      setIsLoading(false)
    }

    void loadRecords().catch((error) => {
      if (!isMounted) return
      setMessage(error instanceof Error ? error.message : t('customers.messages.loadFailed'))
      setIsLoading(false)
    })

    return () => {
      isMounted = false
    }
  }, [])

  const filteredCustomers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    if (!query) return customers

    return customers.filter((customer) =>
      [customer.name, customer.phone ?? '', customer.email ?? '', customer.address ?? ''].some((value) =>
        value.toLowerCase().includes(query),
      ),
    )
  }, [customers, searchQuery])

  function updateForm<K extends keyof CustomerFormState>(field: K, value: CustomerFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function updateVehicleForm<K extends keyof VehicleFormState>(field: K, value: VehicleFormState[K]) {
    setVehicleForm((current) => ({ ...current, [field]: value }))
  }

  function selectCustomer(customer: CustomerSummary) {
    const nextVehicle = vehicles.find((vehicle) => vehicle.customerId === customer.id && vehicle.isActive) ?? null

    setSelectedCustomerId(customer.id)
    setSelectedVehicleId(nextVehicle?.id ?? null)
    setForm({
      name: customer.name,
      phone: customer.phone ?? '',
      email: customer.email ?? '',
      address: customer.address ?? '',
      notes: customer.notes ?? '',
    })
    setVehicleForm(nextVehicle ? toVehicleForm(nextVehicle) : emptyVehicleForm)
    setMessage('')
    setVehicleMessage('')
    setIsEditingCustomer(false)
    setIsEditingVehicle(false)
    setIsCreatingCustomer(false)
    setConfirmingDelete(false)
    setConfirmingVehicleDelete(false)
    setView('detail')
  }

  function startNewCustomer() {
    setSelectedCustomerId(null)
    setSelectedVehicleId(null)
    setForm(emptyForm)
    setVehicleForm(emptyVehicleForm)
    setMessage('')
    setVehicleMessage('')
    setIsEditingCustomer(false)
    setIsEditingVehicle(false)
    setIsCreatingCustomer(true)
  }

  function goBackToList() {
    setView('list')
    setIsEditingCustomer(false)
    setIsEditingVehicle(false)
    setIsCreatingCustomer(false)
    setConfirmingDelete(false)
    setConfirmingVehicleDelete(false)
    setForm(emptyForm)
    setMessage('')
  }

  function cancelEdit() {
    if (selectedCustomer) {
      setForm({
        name: selectedCustomer.name,
        phone: selectedCustomer.phone ?? '',
        email: selectedCustomer.email ?? '',
        address: selectedCustomer.address ?? '',
        notes: selectedCustomer.notes ?? '',
      })
      setMessage('')
      setIsEditingCustomer(false)
    } else {
      startNewCustomer()
    }
  }

  function selectVehicle(vehicle: VehicleSummary) {
    setSelectedVehicleId(vehicle.id)
    setVehicleForm(toVehicleForm(vehicle))
    setVehicleMessage('')
    setConfirmingVehicleDelete(false)
    setIsEditingVehicle(true)
  }

  function startNewVehicle() {
    setSelectedVehicleId(null)
    setVehicleForm(emptyVehicleForm)
    setVehicleMessage('')
    setConfirmingVehicleDelete(false)
    setIsEditingVehicle(true)
  }

  function cancelVehicleEdit() {
    setIsEditingVehicle(false)
    setConfirmingVehicleDelete(false)
    setVehicleMessage('')
  }

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()

    const name = form.name.trim()
    const phone = form.phone.trim()
    const email = form.email.trim()
    const address = form.address.trim()
    const notes = form.notes.trim()

    if (!name || !phone) {
      setMessage(t('customers.messages.required'))
      return
    }

    setIsSubmitting(true)

    if (selectedCustomer) {
      const result = await window.simplepos?.customers.update({
        id: selectedCustomer.id,
        name,
        phone,
        email,
        address,
        notes,
      })

      setIsSubmitting(false)

      if (result && !result.ok) {
        setMessage(result.message)
        return
      }

      const updatedCustomer = result?.customer
      setCustomers((current) =>
        current.map((customer) =>
          customer.id === selectedCustomer.id
            ? updatedCustomer ?? {
              ...customer,
              name,
              phone,
              email,
              address,
              notes,
              updatedAt: new Date().toISOString(),
            }
            : customer,
        ),
      )
      setMessage(result?.message ?? t('customers.messages.updated'))
      setIsEditingCustomer(false)
      return
    }

    const result = await window.simplepos?.customers.create({
      name,
      phone,
      email,
      address,
      notes,
    })

    setIsSubmitting(false)

    if (result && !result.ok) {
      setMessage(result.message)
      return
    }

    const nextCustomer: CustomerSummary = result?.customer ?? {
      id: Math.max(0, ...customers.map((customer) => customer.id)) + 1,
      name,
      phone,
      email,
      address,
      notes,
      isActive: true,
      updatedAt: new Date().toISOString(),
    }

    setCustomers((current) => [nextCustomer, ...current])
    setSelectedCustomerId(nextCustomer.id)
    setSelectedVehicleId(null)
    setVehicleForm(emptyVehicleForm)
    setMessage(result?.message ?? t('customers.messages.created'))
    setIsEditingCustomer(false)
    setIsCreatingCustomer(false)
    setView('detail')
  }

  async function handleDeleteCustomer() {
    if (!selectedCustomer) return

    if (!confirmingDelete) {
      setConfirmingDelete(true)
      return
    }

    const result = await window.simplepos?.customers.delete({ id: selectedCustomer.id })

    if (result && !result.ok) {
      setMessage(result.message)
      setConfirmingDelete(false)
      return
    }

    setCustomers((current) => current.filter((customer) => customer.id !== selectedCustomer.id))
    setVehicles((current) => current.filter((vehicle) => vehicle.customerId !== selectedCustomer.id))
    setSelectedCustomerId(null)
    setSelectedVehicleId(null)
    setForm(emptyForm)
    setVehicleForm(emptyVehicleForm)
    setConfirmingDelete(false)
    setView('list')
  }

  async function handleVehicleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedCustomer) {
      setVehicleMessage(t('customers.messages.selectCustomerForVehicle'))
      return
    }

    const plateNumber = vehicleForm.plateNumber.trim().toUpperCase()
    const brand = vehicleForm.brand.trim()
    const model = vehicleForm.model.trim()
    const year = vehicleForm.year.trim()
    const vin = vehicleForm.vin.trim().toUpperCase()
    const color = vehicleForm.color.trim()
    const notes = vehicleForm.notes.trim()

    if (!plateNumber || !brand || !model) {
      setVehicleMessage(t('customers.messages.vehicleRequired'))
      return
    }

    setIsVehicleSubmitting(true)

    if (selectedVehicle) {
      const result = await window.simplepos?.vehicles.update({
        id: selectedVehicle.id,
        customerId: selectedCustomer.id,
        plateNumber,
        brand,
        model,
        year: year ? Number(year) : null,
        vin,
        color,
        notes,
      })

      setIsVehicleSubmitting(false)

      if (result && !result.ok) {
        setVehicleMessage(result.message)
        return
      }

      const updatedVehicle = result?.vehicle
      setVehicles((current) =>
        current.map((vehicle) =>
          vehicle.id === selectedVehicle.id
            ? updatedVehicle ?? {
              ...vehicle,
              plateNumber,
              brand,
              model,
              year: year ? Number(year) : null,
              vin,
              color,
              notes,
              updatedAt: new Date().toISOString(),
            }
            : vehicle,
        ),
      )
      setVehicleMessage(result?.message ?? t('customers.messages.vehicleUpdated'))
      setIsEditingVehicle(false)
      return
    }

    const result = await window.simplepos?.vehicles.create({
      customerId: selectedCustomer.id,
      plateNumber,
      brand,
      model,
      year: year ? Number(year) : null,
      vin,
      color,
      notes,
    })

    setIsVehicleSubmitting(false)

    if (result && !result.ok) {
      setVehicleMessage(result.message)
      return
    }

    const nextVehicle: VehicleSummary = result?.vehicle ?? {
      id: Math.max(0, ...vehicles.map((vehicle) => vehicle.id)) + 1,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerPhone: selectedCustomer.phone,
      plateNumber,
      brand,
      model,
      year: year ? Number(year) : null,
      vin,
      color,
      notes,
      isActive: true,
      updatedAt: new Date().toISOString(),
    }

    setVehicles((current) => [nextVehicle, ...current])
    setSelectedVehicleId(nextVehicle.id)
    setVehicleMessage(result?.message ?? t('customers.messages.vehicleCreated'))
    setIsEditingVehicle(false)
  }

  async function handleDeleteVehicle() {
    if (!selectedVehicle) return

    if (!confirmingVehicleDelete) {
      setConfirmingVehicleDelete(true)
      return
    }

    const result = await window.simplepos?.vehicles.delete({ id: selectedVehicle.id })

    if (result && !result.ok) {
      setVehicleMessage(result.message)
      setConfirmingVehicleDelete(false)
      return
    }

    setVehicles((current) => current.filter((vehicle) => vehicle.id !== selectedVehicle.id))
    setSelectedVehicleId(null)
    setVehicleForm(emptyVehicleForm)
    setConfirmingVehicleDelete(false)
    setIsEditingVehicle(false)
    setVehicleMessage(result?.message ?? t('customers.messages.vehicleDeleted'))
  }

  if (view === 'detail' && selectedCustomer) {
    return (
      <div className="flex min-h-0 flex-col gap-4">
        <nav className="flex items-center gap-2 text-sm" aria-label={t('customers.breadcrumb')}>
          <button
            type="button"
            onClick={goBackToList}
            className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            {t('customers.sections.customers.title')}
          </button>
          <span className="text-muted-foreground" aria-hidden="true">/</span>
          <span className="font-medium" aria-current="page">{selectedCustomer.name}</span>
        </nav>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex flex-col gap-4">
            {/* Customer info card */}
            <Card>
              <CardHeader>
                <CardTitle>{selectedCustomer.name}</CardTitle>
                <CardDescription>{t('customers.updatedAt', { date: formatDate(selectedCustomer.updatedAt) })}</CardDescription>
                {!isEditingCustomer ? (
                  <CardAction>
                    <Button size="sm" variant="outline" onClick={() => setIsEditingCustomer(true)}>
                      <Pencil data-icon="inline-start" aria-hidden="true" />
                      {t('common.update')}
                    </Button>
                  </CardAction>
                ) : null}
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Phone className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="truncate">{selectedCustomer.phone ?? t('customers.noPhone')}</span>
                  </div>
                  {selectedCustomer.email ? (
                    <div className="flex items-center gap-2">
                      <Mail className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="truncate">{selectedCustomer.email}</span>
                    </div>
                  ) : null}
                  {selectedCustomer.address ? (
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="text-pretty">{selectedCustomer.address}</span>
                    </div>
                  ) : null}
                  {selectedCustomer.notes ? (
                    <p className="rounded-lg bg-muted px-3 py-2 text-muted-foreground text-pretty">
                      {selectedCustomer.notes}
                    </p>
                  ) : null}
                </div>
              </CardContent>
              <CardFooter>
                {confirmingDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{t('customers.deleteCustomerConfirm')}</span>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteCustomer}
                    >
                      {t('customers.yesDelete')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmingDelete(false)}
                    >
                      {t('common.cancel')}
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteCustomer}
                  >
                    {t('customers.deleteCustomer')}
                  </Button>
                )}
              </CardFooter>
            </Card>

            {/* Vehicles card */}
            <Card>
              <CardHeader>
                <CardTitle>{t('customers.vehicles')}</CardTitle>
                <CardDescription>
                  {selectedCustomerVehicles.length === 0
                    ? t('customers.noVehiclesLinkedShort')
                    : t('customers.vehicleLinkedCount', { count: selectedCustomerVehicles.length })}
                </CardDescription>
                <CardAction>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={t('customers.addVehicle')}
                    onClick={startNewVehicle}
                  >
                    <Plus aria-hidden="true" />
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent>
                {selectedCustomerVehicles.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-background py-8 text-center">
                    <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                      <Phone className="size-4 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t('customers.noVehiclesYet')}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{t('customers.addVehicleHint')}</p>
                    </div>
                    <Button type="button" size="sm" variant="outline" onClick={startNewVehicle}>
                      <Plus data-icon="inline-start" aria-hidden="true" />
                      {t('customers.addVehicle')}
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {selectedCustomerVehicles.map((vehicle) => (
                      <button
                        key={vehicle.id}
                        type="button"
                        onClick={() => selectVehicle(vehicle)}
                        className={cn(
                          'flex items-center justify-between rounded-lg border bg-background px-3 py-2.5 text-left text-sm transition-[background-color,border-color] duration-150 ease-out hover:bg-muted/60',
                          selectedVehicleId === vehicle.id && isEditingVehicle && 'border-primary/40 bg-primary/5',
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {vehicle.brand} {vehicle.model} {vehicle.year}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground tabular-nums">
                            {vehicle.plateNumber}
                          </span>
                        </span>
                        <span className="ml-3 flex shrink-0 items-center gap-2">
                          {vehicle.color ? (
                            <span className="text-xs text-muted-foreground">{vehicle.color}</span>
                          ) : null}
                          <Pencil className="size-3 text-muted-foreground/50" aria-hidden="true" />
                        </span>
                      </button>
                    ))}
                    {vehicleMessage && !isEditingVehicle ? (
                      <p className="mt-1 text-sm text-muted-foreground" role="status">{vehicleMessage}</p>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column: edit forms */}
          <div className="flex flex-col gap-3">
            {isEditingCustomer ? (
              <Card>
                <CardHeader>
                  <CardTitle>{t('customers.editCustomer')}</CardTitle>
                  <CardDescription>{t('customers.editCustomerHint')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <form id="customer-form" onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="customer-name">
                        {t('customers.form.name')} <RequiredMark />
                      </Label>
                      <Input
                        id="customer-name"
                        value={form.name}
                        onChange={(event) => updateForm('name', event.target.value)}
                        placeholder={t('customers.form.namePlaceholder')}
                        autoComplete="name"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="customer-phone">
                        {t('customers.form.phone')} <RequiredMark />
                      </Label>
                      <div className="relative">
                        <Phone
                          className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <Input
                          id="customer-phone"
                          type="tel"
                          value={form.phone}
                          onChange={(event) => updateForm('phone', event.target.value)}
                          placeholder={t('customers.form.phonePlaceholder')}
                          className="pl-8"
                          autoComplete="tel"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="customer-email">{t('customers.form.email')}</Label>
                      <div className="relative">
                        <Mail
                          className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <Input
                          id="customer-email"
                          type="email"
                          value={form.email}
                          onChange={(event) => updateForm('email', event.target.value)}
                          placeholder={t('customers.form.emailPlaceholder')}
                          className="pl-8"
                          autoComplete="email"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="customer-address">{t('customers.form.address')}</Label>
                      <div className="relative">
                        <MapPin
                          className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <Input
                          id="customer-address"
                          value={form.address}
                          onChange={(event) => updateForm('address', event.target.value)}
                          placeholder={t('customers.form.addressPlaceholder')}
                          className="pl-8"
                          autoComplete="street-address"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="customer-notes">{t('customers.form.notes')}</Label>
                      <textarea
                        id="customer-notes"
                        value={form.notes}
                        onChange={(event) => updateForm('notes', event.target.value)}
                        placeholder={t('customers.form.notesPlaceholder')}
                        className="min-h-20 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      />
                    </div>

                    {message ? (
                      <p className="text-sm text-muted-foreground" role="status">{message}</p>
                    ) : null}
                  </form>
                </CardContent>
                <CardFooter>
                  <div className="flex gap-2">
                    <Button type="submit" form="customer-form" className="flex-1" disabled={isSubmitting}>
                      {isSubmitting ? t('common.saving') : t('common.update')}
                    </Button>
                    <Button type="button" variant="outline" onClick={cancelEdit} disabled={isSubmitting}>
                      {t('common.cancel')}
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ) : null}

            {/* Vehicle form: shown only when actively editing/creating */}
            {isEditingVehicle ? (
              <Card>
                <CardHeader>
                  <CardTitle>{selectedVehicle ? t('customers.editVehicle') : t('customers.addVehicle')}</CardTitle>
                  <CardDescription>{t('customers.linkedTo', { name: selectedCustomer.name })}</CardDescription>
                </CardHeader>
                <CardContent>
                  <form id="vehicle-form" onSubmit={handleVehicleSubmit} className="flex flex-col gap-3" noValidate>
                    <VehicleIdentityFields
                      idPrefix="customer-vehicle"
                      value={vehicleForm}
                      labels={{
                        model: t('customers.form.model'),
                        brand: t('customers.form.brand'),
                        plateNumber: t('customers.form.plateNumber'),
                      }}
                      placeholders={{
                        model: t('customers.form.modelPlaceholder'),
                        brand: t('customers.form.brandPlaceholder'),
                        plateNumber: t('customers.form.platePlaceholder'),
                      }}
                      requiredFields={['model', 'brand', 'plateNumber']}
                      onChange={updateVehicleForm}
                    />

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="vehicle-year">{t('customers.form.year')}</Label>
                        <Input
                          id="vehicle-year"
                          inputMode="numeric"
                          value={vehicleForm.year}
                          onChange={(event) => updateVehicleForm('year', event.target.value)}
                          placeholder={t('customers.form.yearPlaceholder')}
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <Label htmlFor="vehicle-color">{t('customers.form.color')}</Label>
                        <Input
                          id="vehicle-color"
                          value={vehicleForm.color}
                          onChange={(event) => updateVehicleForm('color', event.target.value)}
                          placeholder={t('customers.form.colorPlaceholder')}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="vehicle-vin">{t('customers.form.vin')}</Label>
                      <Input
                        id="vehicle-vin"
                        value={vehicleForm.vin}
                        onChange={(event) => updateVehicleForm('vin', event.target.value)}
                        placeholder={t('customers.form.vinPlaceholder')}
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="vehicle-notes">{t('customers.form.notes')}</Label>
                      <textarea
                        id="vehicle-notes"
                        value={vehicleForm.notes}
                        onChange={(event) => updateVehicleForm('notes', event.target.value)}
                        placeholder={t('customers.form.vehicleNotesPlaceholder')}
                        className="min-h-20 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      />
                    </div>

                    {vehicleMessage ? (
                      <p className="text-sm text-muted-foreground" role="status">{vehicleMessage}</p>
                    ) : null}

                    <div className="flex gap-2">
                      <Button type="submit" form="vehicle-form" className="flex-1" disabled={isVehicleSubmitting}>
                        {isVehicleSubmitting ? t('common.saving') : selectedVehicle ? t('common.update') : t('customers.addVehicle')}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={cancelVehicleEdit}
                        disabled={isVehicleSubmitting}
                      >
                        {t('common.cancel')}
                      </Button>
                    </div>

                    {selectedVehicle ? (
                      <div className="border-t pt-3">
                        {confirmingVehicleDelete ? (
                          <div className="flex items-center gap-2">
                            <span className="flex-1 text-xs text-muted-foreground">{t('customers.removeVehicleConfirm')}</span>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={handleDeleteVehicle}
                            >
                              {t('customers.yesRemove')}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setConfirmingVehicleDelete(false)}
                            >
                              {t('customers.no')}
                            </Button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={handleDeleteVehicle}
                          >
                            {t('customers.removeVehicle')}
                          </Button>
                        )}
                      </div>
                    ) : null}
                  </form>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="grid h-full min-h-0 gap-3 p-1 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex min-h-0 flex-col gap-3">
        <div className="grid gap-3 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>{t('customers.sections.customers.title')}</CardTitle>
              <CardDescription>{t('customers.activeRecords')}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{activeCustomers}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('customers.contacts')}</CardTitle>
              <CardDescription>{t('customers.emailAvailable')}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{customersWithEmail}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('customers.vehicles')}</CardTitle>
              <CardDescription>{t('customers.registeredAssets')}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{activeVehicles}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('customers.customerList')}</CardTitle>
            <CardDescription>
              {searchQuery.trim()
                ? t('customers.filteredCustomerCount', { filtered: filteredCustomers.length, total: customers.length })
                : t('customers.customerCount', { count: customers.length })}
            </CardDescription>
            <CardAction>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={t('customers.createCustomer')}
                onClick={startNewCustomer}
              >
                <Plus aria-hidden="true" />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <div className="relative mb-2">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t('customers.searchPlaceholder')}
                className="pl-8"
                aria-label={t('customers.searchPlaceholder')}
              />
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-background py-20 text-center">
                <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">{t('customers.loading')}</p>
              </div>
            ) : customers.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-background py-12 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                  <UserRound className="size-5 text-muted-foreground" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-medium">{t('customers.noCustomers')}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{t('customers.addFirstCustomerHint')}</p>
                </div>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col overflow-x-auto">
                <div className="flex min-h-0 min-w-190 flex-1 flex-col rounded-lg border bg-background">
                  <div className="grid shrink-0 grid-cols-[minmax(220px,1.2fr)_minmax(150px,0.8fr)_minmax(220px,1fr)_minmax(120px,0.6fr)] items-center gap-3 border-b bg-muted/60 px-3 py-2 text-xs font-medium text-muted-foreground">
                    <span>{t('customers.table.customer')}</span>
                    <span>{t('customers.table.phone')}</span>
                    <span>{t('customers.table.address')}</span>
                    <span className="text-right">{t('customers.table.updated')}</span>
                  </div>

                  <div className="min-h-0 flex-1 divide-y overflow-y-auto">
                    {filteredCustomers.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
                        <p className="text-sm font-medium">{t('customers.noResultsFor', { query: searchQuery })}</p>
                        <p className="text-xs text-muted-foreground">{t('customers.tryDifferentSearch')}</p>
                      </div>
                    ) : null}

                    {filteredCustomers.map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        onClick={() => selectCustomer(customer)}
                        className="grid min-h-12 w-full grid-cols-[minmax(220px,1.2fr)_minmax(150px,0.8fr)_minmax(220px,1fr)_minmax(120px,0.6fr)] items-center gap-3 px-3 py-2.5 text-left text-sm transition-[background-color,color,transform] duration-150 ease-out hover:bg-muted/60 active:scale-[0.99]"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{customer.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">{customer.email || t('customers.noEmail')}</span>
                        </span>
                        <span className="truncate tabular-nums">{customer.phone}</span>
                        <span className="truncate text-muted-foreground">{customer.address || t('customers.noAddress')}</span>
                        <span className="truncate text-right text-xs text-muted-foreground tabular-nums">
                          {formatDate(customer.updatedAt)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex min-h-0 flex-col gap-3">
        {isCreatingCustomer ? (
          <Card>
            <CardHeader>
              <CardTitle>{t('customers.createCustomer')}</CardTitle>
              <CardDescription>{t('customers.addCustomerBeforeVehicles')}</CardDescription>
            </CardHeader>
            <CardContent>
              <form id="customer-form" onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
                <p className="text-xs text-muted-foreground">
                  {t('customers.requiredFieldsHint')}
                </p>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="customer-name">
                    {t('customers.form.name')} <RequiredMark />
                  </Label>
                  <Input
                    id="customer-name"
                    value={form.name}
                    onChange={(event) => updateForm('name', event.target.value)}
                    placeholder={t('customers.form.namePlaceholder')}
                    autoComplete="name"
                    required
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="customer-phone">
                    {t('customers.form.phone')} <RequiredMark />
                  </Label>
                  <div className="relative">
                    <Phone
                      className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <Input
                      id="customer-phone"
                      type="tel"
                      value={form.phone}
                      onChange={(event) => updateForm('phone', event.target.value)}
                      placeholder={t('customers.form.phonePlaceholder')}
                      className="pl-8"
                      autoComplete="tel"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="customer-email">{t('customers.form.email')}</Label>
                  <div className="relative">
                    <Mail
                      className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <Input
                      id="customer-email"
                      type="email"
                      value={form.email}
                      onChange={(event) => updateForm('email', event.target.value)}
                      placeholder={t('customers.form.emailPlaceholder')}
                      className="pl-8"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="customer-address">{t('customers.form.address')}</Label>
                  <div className="relative">
                    <MapPin
                      className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <Input
                      id="customer-address"
                      value={form.address}
                      onChange={(event) => updateForm('address', event.target.value)}
                      placeholder={t('customers.form.addressPlaceholder')}
                      className="pl-8"
                      autoComplete="street-address"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="customer-notes">{t('customers.form.notes')}</Label>
                  <textarea
                    id="customer-notes"
                    value={form.notes}
                    onChange={(event) => updateForm('notes', event.target.value)}
                    placeholder={t('customers.form.notesPlaceholder')}
                    className="min-h-20 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                </div>

                {message ? (
                  <p className="text-sm text-muted-foreground" role="status">{message}</p>
                ) : null}
              </form>
            </CardContent>
            <CardFooter>
              <div className="flex gap-2">
                <Button type="submit" form="customer-form" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? t('customers.creating') : t('customers.createCustomer')}
                </Button>
                <Button type="button" variant="outline" onClick={startNewCustomer} disabled={isSubmitting}>
                  {t('common.clear')}
                </Button>
              </div>
            </CardFooter>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
