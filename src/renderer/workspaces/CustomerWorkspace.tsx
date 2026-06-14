import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, Mail, MapPin, Pencil, Phone, Plus, Search, UserRound } from 'lucide-react'
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
import { cn } from '@/renderer/lib/utils'

type CustomerSummary = {
  id: number
  name: string
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  isActive: boolean
  createdAt?: string
  updatedAt: string
}

type CustomerFormState = {
  name: string
  phone: string
  email: string
  address: string
  notes: string
}

type VehicleSummary = {
  id: number
  customerId: number
  plateNumber: string
  brand: string
  model: string
  year: number | null
  vin: string | null
  color: string | null
  notes: string | null
  isActive: boolean
  createdAt?: string
  updatedAt: string
}

type VehicleFormState = {
  plateNumber: string
  brand: string
  model: string
  year: string
  vin: string
  color: string
  notes: string
}

const customerSeeds: CustomerSummary[] = [
  {
    id: 1,
    name: 'Budi Santoso',
    phone: '+62 812-4455-1901',
    email: 'budi.santoso@example.com',
    address: 'Jl. Ahmad Yani No. 18',
    notes: 'Prefers WhatsApp updates before repair approval.',
    isActive: true,
    updatedAt: '2026-06-08T09:30:00.000Z',
  },
  {
    id: 2,
    name: 'Maya Putri',
    phone: '+62 813-7721-8400',
    email: 'maya.putri@example.com',
    address: 'Jl. Gatot Subroto No. 42',
    notes: 'Fleet contact for monthly maintenance.',
    isActive: true,
    updatedAt: '2026-06-07T14:10:00.000Z',
  },
  {
    id: 3,
    name: 'CV Nusantara Logistik',
    phone: '+62 361-555-0188',
    email: 'ops@nusantaralogistik.example',
    address: 'Jl. Cargo Permai Blok C7',
    notes: 'Business account, invoice after service completion.',
    isActive: true,
    updatedAt: '2026-06-05T11:45:00.000Z',
  },
]

const emptyForm: CustomerFormState = {
  name: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
}

const vehicleSeeds: VehicleSummary[] = [
  {
    id: 1,
    customerId: 1,
    plateNumber: 'DK 1842 AB',
    brand: 'Toyota',
    model: 'Avanza',
    year: 2019,
    vin: 'MHKM5EA3JKK001842',
    color: 'Silver',
    notes: 'Routine service every 5,000 km.',
    isActive: true,
    updatedAt: '2026-06-08T10:15:00.000Z',
  },
  {
    id: 2,
    customerId: 2,
    plateNumber: 'DK 9021 MP',
    brand: 'Honda',
    model: 'Brio',
    year: 2021,
    vin: 'MHRDD1850MJ009021',
    color: 'White',
    notes: 'Customer reported brake noise on last visit.',
    isActive: true,
    updatedAt: '2026-06-07T15:20:00.000Z',
  },
  {
    id: 3,
    customerId: 3,
    plateNumber: 'DK 7710 NL',
    brand: 'Mitsubishi',
    model: 'L300',
    year: 2018,
    vin: 'MMBJNK740JK007710',
    color: 'Black',
    notes: 'Fleet vehicle, inspect suspension each visit.',
    isActive: true,
    updatedAt: '2026-06-05T13:00:00.000Z',
  },
]

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
    brand: vehicle.brand,
    model: vehicle.model,
    year: vehicle.year ? String(vehicle.year) : '',
    vin: vehicle.vin ?? '',
    color: vehicle.color ?? '',
    notes: vehicle.notes ?? '',
  }
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function RequiredMark() {
  return <span className="ml-0.5 text-destructive" aria-hidden="true">*</span>
}

export function CustomerWorkspace() {
  const [customers, setCustomers] = useState<CustomerSummary[]>(customerSeeds)
  const [vehicles, setVehicles] = useState<VehicleSummary[]>(vehicleSeeds)
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null)
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [form, setForm] = useState<CustomerFormState>(emptyForm)
  const [vehicleForm, setVehicleForm] = useState<VehicleFormState>(emptyVehicleForm)
  const [message, setMessage] = useState('')
  const [vehicleMessage, setVehicleMessage] = useState('')
  const [isEditingCustomer, setIsEditingCustomer] = useState(false)
  const [isEditingVehicle, setIsEditingVehicle] = useState(false)
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
      const [customerList, vehicleList] = await Promise.all([
        window.simplepos?.customers.list(),
        window.simplepos?.vehicles.list(),
      ])

      if (!isMounted || !customerList || !vehicleList) return

      setCustomers(customerList)
      setVehicles(vehicleList)
    }

    void loadRecords().catch((error) => {
      if (!isMounted) return
      setMessage(error instanceof Error ? error.message : 'Unable to load customers')
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
  }

  function goBackToList() {
    setView('list')
    setIsEditingCustomer(false)
    setIsEditingVehicle(false)
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const name = form.name.trim()
    const phone = form.phone.trim()
    const email = form.email.trim()
    const address = form.address.trim()
    const notes = form.notes.trim()

    if (!name || !phone) {
      setMessage('Name and phone are required.')
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
      setMessage(result?.message ?? 'Customer updated')
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
    setMessage(result?.message ?? 'Customer created')
    setIsEditingCustomer(false)
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

  async function handleVehicleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedCustomer) {
      setVehicleMessage('Select a customer before adding a vehicle.')
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
      setVehicleMessage('Plate number, brand, and model are required.')
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
      setVehicleMessage(result?.message ?? 'Vehicle updated')
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
    setVehicleMessage(result?.message ?? 'Vehicle created')
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
    setVehicleMessage(result?.message ?? 'Vehicle deleted')
  }

  if (view === 'detail' && selectedCustomer) {
    return (
      <div className="flex min-h-0 flex-col gap-4">
        <nav className="flex items-center gap-2 text-sm" aria-label="Breadcrumb">
          <button
            type="button"
            onClick={goBackToList}
            className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            Customers
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
                <CardDescription>Updated {formatDate(selectedCustomer.updatedAt)}</CardDescription>
                {!isEditingCustomer ? (
                  <CardAction>
                    <Button size="sm" variant="outline" onClick={() => setIsEditingCustomer(true)}>
                      <Pencil data-icon="inline-start" aria-hidden="true" />
                      Edit
                    </Button>
                  </CardAction>
                ) : null}
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Phone className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="truncate">{selectedCustomer.phone ?? 'No phone'}</span>
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
                    <span className="text-sm text-muted-foreground">Delete this customer?</span>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteCustomer}
                    >
                      Yes, delete
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmingDelete(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteCustomer}
                  >
                    Delete Customer
                  </Button>
                )}
              </CardFooter>
            </Card>

            {/* Vehicles card */}
            <Card>
              <CardHeader>
                <CardTitle>Vehicles</CardTitle>
                <CardDescription>
                  {selectedCustomerVehicles.length === 0
                    ? 'No vehicles linked.'
                    : `${selectedCustomerVehicles.length} vehicle${selectedCustomerVehicles.length !== 1 ? 's' : ''} linked.`}
                </CardDescription>
                <CardAction>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Add vehicle"
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
                      <p className="text-sm font-medium">No vehicles yet</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">Click + to link a vehicle to this customer.</p>
                    </div>
                    <Button type="button" size="sm" variant="outline" onClick={startNewVehicle}>
                      <Plus data-icon="inline-start" aria-hidden="true" />
                      Add Vehicle
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
                  <CardTitle>Edit Customer</CardTitle>
                  <CardDescription>Update contact details for future work orders.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form id="customer-form" onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="customer-name">
                        Name <RequiredMark />
                      </Label>
                      <Input
                        id="customer-name"
                        value={form.name}
                        onChange={(event) => updateForm('name', event.target.value)}
                        placeholder="Customer name"
                        autoComplete="name"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="customer-phone">
                        Phone <RequiredMark />
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
                          placeholder="+62 812..."
                          className="pl-8"
                          autoComplete="tel"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="customer-email">Email</Label>
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
                          placeholder="customer@example.com"
                          className="pl-8"
                          autoComplete="email"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="customer-address">Address</Label>
                      <div className="relative">
                        <MapPin
                          className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <Input
                          id="customer-address"
                          value={form.address}
                          onChange={(event) => updateForm('address', event.target.value)}
                          placeholder="Street, area, city"
                          className="pl-8"
                          autoComplete="street-address"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="customer-notes">Notes</Label>
                      <textarea
                        id="customer-notes"
                        value={form.notes}
                        onChange={(event) => updateForm('notes', event.target.value)}
                        placeholder="Service preferences, billing notes..."
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
                      {isSubmitting ? 'Saving...' : 'Update'}
                    </Button>
                    <Button type="button" variant="outline" onClick={cancelEdit} disabled={isSubmitting}>
                      Cancel
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ) : null}

            {/* Vehicle form: shown only when actively editing/creating */}
            {isEditingVehicle ? (
              <Card>
                <CardHeader>
                  <CardTitle>{selectedVehicle ? 'Edit Vehicle' : 'Add Vehicle'}</CardTitle>
                  <CardDescription>Linked to {selectedCustomer.name}.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form id="vehicle-form" onSubmit={handleVehicleSubmit} className="flex flex-col gap-3" noValidate>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="vehicle-plate">
                        Plate Number <RequiredMark />
                      </Label>
                      <Input
                        id="vehicle-plate"
                        value={vehicleForm.plateNumber}
                        onChange={(event) => updateVehicleForm('plateNumber', event.target.value)}
                        placeholder="DK 1234 AB"
                        required
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="vehicle-brand">
                          Brand <RequiredMark />
                        </Label>
                        <Input
                          id="vehicle-brand"
                          value={vehicleForm.brand}
                          onChange={(event) => updateVehicleForm('brand', event.target.value)}
                          placeholder="Toyota"
                          required
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <Label htmlFor="vehicle-model">
                          Model <RequiredMark />
                        </Label>
                        <Input
                          id="vehicle-model"
                          value={vehicleForm.model}
                          onChange={(event) => updateVehicleForm('model', event.target.value)}
                          placeholder="Avanza"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="vehicle-year">Year</Label>
                        <Input
                          id="vehicle-year"
                          inputMode="numeric"
                          value={vehicleForm.year}
                          onChange={(event) => updateVehicleForm('year', event.target.value)}
                          placeholder="2021"
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <Label htmlFor="vehicle-color">Color</Label>
                        <Input
                          id="vehicle-color"
                          value={vehicleForm.color}
                          onChange={(event) => updateVehicleForm('color', event.target.value)}
                          placeholder="Silver"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="vehicle-vin">VIN</Label>
                      <Input
                        id="vehicle-vin"
                        value={vehicleForm.vin}
                        onChange={(event) => updateVehicleForm('vin', event.target.value)}
                        placeholder="Optional chassis/VIN"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="vehicle-notes">Notes</Label>
                      <textarea
                        id="vehicle-notes"
                        value={vehicleForm.notes}
                        onChange={(event) => updateVehicleForm('notes', event.target.value)}
                        placeholder="Service intervals, known issues..."
                        className="min-h-20 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      />
                    </div>

                    {vehicleMessage ? (
                      <p className="text-sm text-muted-foreground" role="status">{vehicleMessage}</p>
                    ) : null}

                    <div className="flex gap-2">
                      <Button type="submit" form="vehicle-form" className="flex-1" disabled={isVehicleSubmitting}>
                        {isVehicleSubmitting ? 'Saving...' : selectedVehicle ? 'Update' : 'Add Vehicle'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={cancelVehicleEdit}
                        disabled={isVehicleSubmitting}
                      >
                        Cancel
                      </Button>
                    </div>

                    {selectedVehicle ? (
                      <div className="border-t pt-3">
                        {confirmingVehicleDelete ? (
                          <div className="flex items-center gap-2">
                            <span className="flex-1 text-xs text-muted-foreground">Remove this vehicle?</span>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={handleDeleteVehicle}
                            >
                              Yes, remove
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setConfirmingVehicleDelete(false)}
                            >
                              No
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
                            Remove vehicle
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
    <div className="grid h-full min-h-0 gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex min-h-0 flex-col gap-3">
        <div className="grid gap-3 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Customers</CardTitle>
              <CardDescription>Active records</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{activeCustomers}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contacts</CardTitle>
              <CardDescription>Email available</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{customersWithEmail}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Vehicles</CardTitle>
              <CardDescription>Registered assets</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{activeVehicles}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Customer List</CardTitle>
            <CardDescription>
              {searchQuery.trim()
                ? `${filteredCustomers.length} of ${customers.length} customers`
                : `${customers.length} customer${customers.length !== 1 ? 's' : ''}`}
            </CardDescription>
            <CardAction>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Create customer"
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
                placeholder="Search customers"
                className="pl-8"
                aria-label="Search customers"
              />
            </div>

            {customers.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-background py-12 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                  <UserRound className="size-5 text-muted-foreground" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-medium">No customers yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">Add your first customer using the form on the right.</p>
                </div>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col overflow-x-auto">
                <div className="flex min-h-0 min-w-190 flex-1 flex-col rounded-lg border bg-background">
                  <div className="grid shrink-0 grid-cols-[minmax(220px,1.2fr)_minmax(150px,0.8fr)_minmax(220px,1fr)_minmax(120px,0.6fr)] items-center gap-3 border-b bg-muted/60 px-3 py-2 text-xs font-medium text-muted-foreground">
                    <span>Customer</span>
                    <span>Phone</span>
                    <span>Address</span>
                    <span className="text-right">Updated</span>
                  </div>

                  <div className="min-h-0 flex-1 divide-y overflow-y-auto">
                    {filteredCustomers.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
                        <p className="text-sm font-medium">No results for "{searchQuery}"</p>
                        <p className="text-xs text-muted-foreground">Try a different name, phone, or address.</p>
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
                          <span className="block truncate text-xs text-muted-foreground">{customer.email || 'No email'}</span>
                        </span>
                        <span className="truncate tabular-nums">{customer.phone}</span>
                        <span className="truncate text-muted-foreground">{customer.address || 'No address'}</span>
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
        <Card>
          <CardHeader>
            <CardTitle>Create Customer</CardTitle>
            <CardDescription>Add a customer before linking vehicles.</CardDescription>
          </CardHeader>
          <CardContent>
            <form id="customer-form" onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
              <p className="text-xs text-muted-foreground">
                Fields marked <span className="text-destructive">*</span> are required.
              </p>

              <div className="flex flex-col gap-2">
                <Label htmlFor="customer-name">
                  Name <RequiredMark />
                </Label>
                <Input
                  id="customer-name"
                  value={form.name}
                  onChange={(event) => updateForm('name', event.target.value)}
                  placeholder="Budi Santoso"
                  autoComplete="name"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="customer-phone">
                  Phone <RequiredMark />
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
                    placeholder="+62 812..."
                    className="pl-8"
                    autoComplete="tel"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="customer-email">Email</Label>
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
                    placeholder="customer@example.com"
                    className="pl-8"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="customer-address">Address</Label>
                <div className="relative">
                  <MapPin
                    className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id="customer-address"
                    value={form.address}
                    onChange={(event) => updateForm('address', event.target.value)}
                    placeholder="Street, area, city"
                    className="pl-8"
                    autoComplete="street-address"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="customer-notes">Notes</Label>
                <textarea
                  id="customer-notes"
                  value={form.notes}
                  onChange={(event) => updateForm('notes', event.target.value)}
                  placeholder="Service preferences, billing notes..."
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
                {isSubmitting ? 'Creating...' : 'Create Customer'}
              </Button>
              <Button type="button" variant="outline" onClick={startNewCustomer} disabled={isSubmitting}>
                Clear
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
