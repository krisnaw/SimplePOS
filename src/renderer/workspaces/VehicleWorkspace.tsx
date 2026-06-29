import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Car, Plus, Search, X } from 'lucide-react'
import { Button } from '@/renderer/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/renderer/components/ui/card'
import { Input } from '@/renderer/components/ui/input'
import { Label } from '@/renderer/components/ui/label'
import { cn } from '@/renderer/lib/utils'
import type { VehicleSummary } from '@/shared/types/vehicle'

const emptyForm = {
  plateNumber: '',
  brand: '',
  model: '',
  customerName: '',
  customerPhone: '',
  notes: '',
}

export function VehicleWorkspace() {
  const [vehicles, setVehicles] = useState<VehicleSummary[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [query, setQuery] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [message, setMessage] = useState('')

  async function loadVehicles() {
    const api = window.simplepos
    if (!api) return
    setVehicles(await api.vehicles.list())
  }

  useEffect(() => {
    void loadVehicles()
  }, [])

  const filtered = useMemo(() => {
    const value = query.trim().toUpperCase()
    if (!value) return vehicles
    return vehicles.filter((vehicle) =>
      [vehicle.plateNumber, vehicle.brand ?? '', vehicle.model, vehicle.customerName ?? '', vehicle.customerPhone ?? '']
        .join(' ')
        .toUpperCase()
        .includes(value),
    )
  }, [query, vehicles])

  function selectVehicle(vehicle: VehicleSummary) {
    if (selectedId === vehicle.id) {
      clearSelection()
      return
    }

    setSelectedId(vehicle.id)
    setIsCreating(false)
    setForm({
      plateNumber: vehicle.plateNumber,
      brand: vehicle.brand ?? '',
      model: vehicle.model,
      customerName: vehicle.customerName ?? '',
      customerPhone: vehicle.customerPhone ?? '',
      notes: vehicle.notes ?? '',
    })
    setMessage('')
  }

  function startNew() {
    setSelectedId(null)
    setIsCreating(true)
    setForm(emptyForm)
    setMessage('')
  }

  function clearSelection() {
    setSelectedId(null)
    setIsCreating(false)
    setForm(emptyForm)
    setMessage('')
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    const api = window.simplepos
    if (!api) return
    const input = {
      ...(selectedId ? { id: selectedId } : {}),
      plateNumber: form.plateNumber,
      brand: form.brand,
      model: form.model,
      customerName: form.customerName,
      customerPhone: form.customerPhone,
      notes: form.notes,
    }
    const result = selectedId
      ? await api.vehicles.update(input)
      : await api.vehicles.create(input)
    setMessage(result.message)
    if (result.ok && result.vehicle) {
      setSelectedId(result.vehicle.id)
      setIsCreating(false)
      await loadVehicles()
    }
  }

  function setField(field: keyof typeof emptyForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  return (
    <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(280px,0.8fr)_minmax(420px,1.2fr)]">
      <Card className="min-h-0 overflow-hidden">
        <CardHeader>
          <CardTitle>Vehicles</CardTitle>
          <CardDescription>{vehicles.length} active vehicle{vehicles.length === 1 ? '' : 's'}</CardDescription>
          <CardAction>
            <Button type="button" size="sm" onClick={startNew}>
              <Plus data-icon="inline-start" aria-hidden="true" />
              New vehicle
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search plate, model, or customer" className="pl-9" />
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-auto">
            {filtered.map((vehicle) => (
              <button
                key={vehicle.id}
                type="button"
                aria-current={selectedId === vehicle.id ? 'true' : undefined}
                onClick={() => selectVehicle(vehicle)}
                className={cn(
                  'min-h-16 rounded-lg border px-3 py-2 text-left transition-[background-color,border-color,transform] duration-150 hover:bg-muted active:scale-[0.96]',
                  selectedId === vehicle.id && 'bg-muted',
                )}
              >
                <span className="block font-semibold tabular-nums">{vehicle.plateNumber}</span>
                <span className="block text-sm text-muted-foreground">{[vehicle.brand, vehicle.model].filter(Boolean).join(' ')}</span>
                {vehicle.customerName ? <span className="block text-xs text-muted-foreground">{vehicle.customerName}</span> : null}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        {!selectedId && !isCreating ? (
          <CardContent className="flex min-h-80 flex-1 items-center justify-center p-6 text-center">
            <div className="flex max-w-sm flex-col items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Car className="size-5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-semibold text-balance">No vehicle selected</h3>
                <p className="mt-1 text-sm text-muted-foreground text-pretty">
                  Select a vehicle from the list to view and edit its details.
                </p>
              </div>
              <Button type="button" variant="outline" onClick={startNew}>
                <Plus data-icon="inline-start" aria-hidden="true" />
                Add new vehicle
              </Button>
            </div>
          </CardContent>
        ) : (
          <>
            <CardHeader>
              <CardTitle>{selectedId ? 'Edit vehicle' : 'New vehicle'}</CardTitle>
              <CardDescription>Plate and model are required. Customer details are optional.</CardDescription>
              {selectedId ? (
                <CardAction>
                  <Button type="button" size="sm" variant="outline" onClick={clearSelection}>
                    <X data-icon="inline-start" aria-hidden="true" />
                    Unselect
                  </Button>
                </CardAction>
              ) : null}
            </CardHeader>
            <CardContent>
              <form className="flex flex-col gap-4" onSubmit={save}>
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                ['plateNumber', 'Plate number', 'DK1234'],
                ['model', 'Model', 'Avanza'],
                ['brand', 'Brand (optional)', 'Toyota'],
                ['customerName', 'Customer name (optional)', 'Customer name'],
                ['customerPhone', 'Phone (optional)', '08123456789'],
                ['notes', 'Notes (optional)', 'Vehicle notes'],
              ] as const).map(([field, label, placeholder]) => (
                <div key={field} className="flex flex-col gap-1.5">
                  <Label htmlFor={`vehicle-${field}`}>{label}</Label>
                  <Input id={`vehicle-${field}`} value={form[field]} onChange={(event) => setField(field, event.target.value)} placeholder={placeholder} />
                </div>
              ))}
            </div>
            {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
                <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={clearSelection}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!form.plateNumber.trim() || !form.model.trim()}>
                <Car data-icon="inline-start" aria-hidden="true" />
                Save vehicle
              </Button>
                </div>
              </form>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  )
}
