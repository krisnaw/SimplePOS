import { useEffect, useMemo, useState } from 'react'
import { Car, Mail, MapPin, Phone, Plus, Search, UserRound } from 'lucide-react'
import { Button } from '@/renderer/components/ui/button'
import {Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle} from '@/renderer/components/ui/card'
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

export function CustomerWorkspace() {
  const [customers, setCustomers] = useState<CustomerSummary[]>(customerSeeds)
  const [vehicles, setVehicles] = useState<VehicleSummary[]>(vehicleSeeds)
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(customerSeeds[0]?.id ?? null)
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(
    vehicleSeeds.find((vehicle) => vehicle.customerId === customerSeeds[0]?.id)?.id ?? null,
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [form, setForm] = useState<CustomerFormState>(() => {
    const firstCustomer = customerSeeds[0]

    if (!firstCustomer) return emptyForm

    return {
      name: firstCustomer.name,
      phone: firstCustomer.phone ?? '',
      email: firstCustomer.email ?? '',
      address: firstCustomer.address ?? '',
      notes: firstCustomer.notes ?? '',
    }
  })
  const [vehicleForm, setVehicleForm] = useState<VehicleFormState>(() => {
    const firstVehicle = vehicleSeeds.find((vehicle) => vehicle.customerId === customerSeeds[0]?.id)

    return firstVehicle ? toVehicleForm(firstVehicle) : emptyVehicleForm
  })
  const [message, setMessage] = useState('')
  const [vehicleMessage, setVehicleMessage] = useState('')

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

      const firstCustomer = customerList[0] ?? null
      const firstVehicle = firstCustomer
        ? vehicleList.find((vehicle) => vehicle.customerId === firstCustomer.id && vehicle.isActive) ?? null
        : null

      setSelectedCustomerId(firstCustomer?.id ?? null)
      setSelectedVehicleId(firstVehicle?.id ?? null)
      setForm(firstCustomer
        ? {
            name: firstCustomer.name,
            phone: firstCustomer.phone ?? '',
            email: firstCustomer.email ?? '',
            address: firstCustomer.address ?? '',
            notes: firstCustomer.notes ?? '',
          }
        : emptyForm)
      setVehicleForm(firstVehicle ? toVehicleForm(firstVehicle) : emptyVehicleForm)
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
  }

  function startNewCustomer() {
    setSelectedCustomerId(null)
    setSelectedVehicleId(null)
    setForm(emptyForm)
    setVehicleForm(emptyVehicleForm)
    setMessage('')
    setVehicleMessage('')
  }

  function selectVehicle(vehicle: VehicleSummary) {
    setSelectedVehicleId(vehicle.id)
    setVehicleForm(toVehicleForm(vehicle))
    setVehicleMessage('')
  }

  function startNewVehicle() {
    setSelectedVehicleId(null)
    setVehicleForm(emptyVehicleForm)
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

    if (selectedCustomer) {
      const result = await window.simplepos?.customers.update({
        id: selectedCustomer.id,
        name,
        phone,
        email,
        address,
        notes,
      })

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
      return
    }

    const result = await window.simplepos?.customers.create({
      name,
      phone,
      email,
      address,
      notes,
    })

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
  }

  async function handleDeleteCustomer() {
    if (!selectedCustomer) return

    const result = await window.simplepos?.customers.delete({ id: selectedCustomer.id })

    if (result && !result.ok) {
      setMessage(result.message)
      return
    }

    setCustomers((current) => current.filter((customer) => customer.id !== selectedCustomer.id))
    setVehicles((current) => current.filter((vehicle) => vehicle.customerId !== selectedCustomer.id))
    setSelectedCustomerId(null)
    setSelectedVehicleId(null)
    setForm(emptyForm)
    setVehicleForm(emptyVehicleForm)
    setMessage(result?.message ?? 'Customer deleted')
    setVehicleMessage('')
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
  }

  async function handleDeleteVehicle() {
    if (!selectedVehicle) return

    const result = await window.simplepos?.vehicles.delete({ id: selectedVehicle.id })

    if (result && !result.ok) {
      setVehicleMessage(result.message)
      return
    }

    setVehicles((current) => current.filter((vehicle) => vehicle.id !== selectedVehicle.id))
    setSelectedVehicleId(null)
    setVehicleForm(emptyVehicleForm)
    setVehicleMessage(result?.message ?? 'Vehicle deleted')
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
            <CardDescription>Find customers by name, phone, email, or address.</CardDescription>
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
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>

              </div>
              <div className="flex gap-2">


              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="relative min-w-56">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search customers"
                  className="pl-8"
                />
              </div>
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
                      <div className="px-3 py-6 text-sm text-muted-foreground">No customers match this search.</div>
                    ) : null}

                    {filteredCustomers.map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        onClick={() => selectCustomer(customer)}
                        className={cn(
                          'grid min-h-12 w-full grid-cols-[minmax(220px,1.2fr)_minmax(150px,0.8fr)_minmax(220px,1fr)_minmax(120px,0.6fr)] items-center gap-3 px-3 py-2.5 text-left text-sm transition-[background-color,color,transform] duration-150 ease-out hover:bg-muted/60 active:scale-[0.99]',
                          selectedCustomerId === customer.id && 'bg-muted',
                        )}
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
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vehicle List</CardTitle>
            <CardDescription>
              {selectedCustomer ? `Vehicles linked to ${selectedCustomer.name}.` : 'Select a customer to manage vehicles.'}
            </CardDescription>
            <CardAction>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Create vehicle"
                disabled={!selectedCustomer}
                onClick={startNewVehicle}
              >
                <Plus aria-hidden="true" />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden pb-4">
            <div className="flex min-h-0 flex-1 flex-col overflow-x-auto">
              <div className="flex min-h-0 min-w-190 flex-1 flex-col rounded-lg border bg-background">
                <div className="grid shrink-0 grid-cols-[minmax(180px,1fr)_minmax(140px,0.8fr)_minmax(120px,0.7fr)_minmax(120px,0.7fr)] items-center gap-3 border-b bg-muted/60 px-3 py-2 text-xs font-medium text-muted-foreground">
                  <span>Vehicle</span>
                  <span>Plate</span>
                  <span>Color</span>
                  <span className="text-right">Updated</span>
                </div>

                <div className="min-h-0 flex-1 divide-y overflow-y-auto">
                  {!selectedCustomer ? (
                    <div className="px-3 py-6 text-sm text-muted-foreground">Select a customer first.</div>
                  ) : null}

                  {selectedCustomer && selectedCustomerVehicles.length === 0 ? (
                    <div className="px-3 py-6 text-sm text-muted-foreground">No vehicles linked to this customer.</div>
                  ) : null}

                  {selectedCustomerVehicles.map((vehicle) => (
                    <button
                      key={vehicle.id}
                      type="button"
                      onClick={() => selectVehicle(vehicle)}
                      className={cn(
                        'grid min-h-12 w-full grid-cols-[minmax(180px,1fr)_minmax(140px,0.8fr)_minmax(120px,0.7fr)_minmax(120px,0.7fr)] items-center gap-3 px-3 py-2.5 text-left text-sm transition-[background-color,color,transform] duration-150 ease-out hover:bg-muted/60 active:scale-[0.99]',
                        selectedVehicleId === vehicle.id && 'bg-muted',
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {vehicle.brand} {vehicle.model}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {vehicle.year || 'Year unknown'} {vehicle.vin ? `- ${vehicle.vin}` : ''}
                        </span>
                      </span>
                      <span className="truncate font-medium tabular-nums">{vehicle.plateNumber}</span>
                      <span className="truncate text-muted-foreground">{vehicle.color || 'No color'}</span>
                      <span className="truncate text-right text-xs text-muted-foreground tabular-nums">
                        {formatDate(vehicle.updatedAt)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex min-h-0 flex-col gap-3 overflow-auto">
        <Card>
          <CardHeader>
            <CardTitle>
              <UserRound aria-hidden="true" />
              {selectedCustomer ? 'Edit Customer' : 'Create Customer'}
            </CardTitle>
            <CardDescription>
              {selectedCustomer ? 'Update contact details for future work orders.' : 'Add a customer before linking vehicles.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-0 overflow-auto">
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="customer-name">Name</Label>
                <Input
                  id="customer-name"
                  value={form.name}
                  onChange={(event) => updateForm('name', event.target.value)}
                  placeholder="Customer name"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="customer-phone">Phone</Label>
                <div className="relative">
                  <Phone
                    className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id="customer-phone"
                    value={form.phone}
                    onChange={(event) => updateForm('phone', event.target.value)}
                    placeholder="+62 812..."
                    className="pl-8"
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
                <p className="text-sm text-muted-foreground" role="status">
                  {message}
                </p>
              ) : null}

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {selectedCustomer ? 'Update' : 'Create'}
                </Button>
                {selectedCustomer ? (
                  <Button type="button" variant="destructive" onClick={handleDeleteCustomer}>
                    Delete
                  </Button>
                ) : null}
                <Button type="button" variant="outline" onClick={startNewCustomer}>
                  Clear
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <Car aria-hidden="true" />
              {selectedVehicle ? 'Edit Vehicle' : 'Create Vehicle'}
            </CardTitle>
            <CardDescription>
              {selectedCustomer ? `Linked to ${selectedCustomer.name}.` : 'Select a customer before adding a vehicle.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-0 overflow-auto">
            <form onSubmit={handleVehicleSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="vehicle-plate">Plate Number</Label>
                <Input
                  id="vehicle-plate"
                  value={vehicleForm.plateNumber}
                  onChange={(event) => updateVehicleForm('plateNumber', event.target.value)}
                  placeholder="DK 1234 AB"
                  disabled={!selectedCustomer}
                  required
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="vehicle-brand">Brand</Label>
                  <Input
                    id="vehicle-brand"
                    value={vehicleForm.brand}
                    onChange={(event) => updateVehicleForm('brand', event.target.value)}
                    placeholder="Toyota"
                    disabled={!selectedCustomer}
                    required
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="vehicle-model">Model</Label>
                  <Input
                    id="vehicle-model"
                    value={vehicleForm.model}
                    onChange={(event) => updateVehicleForm('model', event.target.value)}
                    placeholder="Avanza"
                    disabled={!selectedCustomer}
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
                    disabled={!selectedCustomer}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="vehicle-color">Color</Label>
                  <Input
                    id="vehicle-color"
                    value={vehicleForm.color}
                    onChange={(event) => updateVehicleForm('color', event.target.value)}
                    placeholder="Silver"
                    disabled={!selectedCustomer}
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
                  disabled={!selectedCustomer}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="vehicle-notes">Notes</Label>
                <textarea
                  id="vehicle-notes"
                  value={vehicleForm.notes}
                  onChange={(event) => updateVehicleForm('notes', event.target.value)}
                  placeholder="Service intervals, known issues..."
                  disabled={!selectedCustomer}
                  className="min-h-20 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              {vehicleMessage ? (
                <p className="text-sm text-muted-foreground" role="status">
                  {vehicleMessage}
                </p>
              ) : null}

              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={!selectedCustomer}>
                  {selectedVehicle ? 'Update' : 'Create'}
                </Button>
                {selectedVehicle ? (
                  <Button type="button" variant="destructive" onClick={handleDeleteVehicle}>
                    Delete
                  </Button>
                ) : null}
                <Button type="button" variant="outline" disabled={!selectedCustomer} onClick={startNewVehicle}>
                  Clear
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
