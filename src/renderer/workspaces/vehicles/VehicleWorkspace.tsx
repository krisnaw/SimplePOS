import {type FormEvent, type KeyboardEvent, useEffect, useId, useMemo, useState} from 'react'
import {Car, Plus, Search} from 'lucide-react'
import {useTranslation} from 'react-i18next'
import {Button} from '@/renderer/components/ui/button'
import {Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle} from '@/renderer/components/ui/card'
import {Input} from '@/renderer/components/ui/input'
import {Label} from '@/renderer/components/ui/label'
import {cn} from '@/renderer/lib/utils'
import vehicleBrands from '@/shared/data/vehicle-brands-indonesia.json'
import type {VehicleSummary} from '@/shared/types/vehicle'

const emptyForm = {
  plateNumber: '',
  brand: '',
  model: '',
  customerName: '',
  customerPhone: '',
  notes: '',
}

export function VehicleWorkspace() {
  const {t} = useTranslation()
  const brandListId = useId()
  const [vehicles, setVehicles] = useState<VehicleSummary[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [query, setQuery] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [message, setMessage] = useState('')
  const [isBrandSuggestionsOpen, setIsBrandSuggestionsOpen] = useState(false)
  const [activeBrandIndex, setActiveBrandIndex] = useState(0)

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

  const brandSuggestions = useMemo(() => {
    const value = form.brand.trim().toLocaleLowerCase('id-ID')
    if (!value) return []

    return vehicleBrands
      .filter((brand) => brand.toLocaleLowerCase('id-ID').includes(value))
      .sort((a, b) => {
        const aStartsWith = a.toLocaleLowerCase('id-ID').startsWith(value)
        const bStartsWith = b.toLocaleLowerCase('id-ID').startsWith(value)

        if (aStartsWith === bStartsWith) return a.localeCompare(b, 'id-ID')
        return aStartsWith ? -1 : 1
      })
      .slice(0, 8)
  }, [form.brand])

  useEffect(() => {
    setActiveBrandIndex(0)
  }, [brandSuggestions])

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

  function selectBrand(brand: string) {
    setField('brand', brand)
    setIsBrandSuggestionsOpen(false)
  }

  function handleBrandKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!isBrandSuggestionsOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      setIsBrandSuggestionsOpen(brandSuggestions.length > 0)
      return
    }

    if (!isBrandSuggestionsOpen || brandSuggestions.length === 0) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveBrandIndex((current) => (current + 1) % brandSuggestions.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveBrandIndex((current) => (current - 1 + brandSuggestions.length) % brandSuggestions.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      selectBrand(brandSuggestions[activeBrandIndex])
    } else if (event.key === 'Escape') {
      setIsBrandSuggestionsOpen(false)
    }
  }

  return (
    <div className="grid h-full min-h-0 gap-3 p-1 lg:grid-cols-[minmax(280px,0.8fr)_minmax(420px,1.2fr)]">
      <Card className="min-h-0 overflow-hidden">
        <CardHeader>
          <CardTitle>{t('vehicles.title')}</CardTitle>
          <CardDescription>{t('vehicles.activeCount', {count: vehicles.length})}</CardDescription>
          <CardAction>
            <Button type="button" size="sm" onClick={startNew}>
              <Plus data-icon="inline-start" aria-hidden="true" />
              {t('vehicles.newVehicle')}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('vehicles.searchPlaceholder')} className="pl-9" />
          </div>
          <div className="scroll-fade flex min-h-0 flex-1 flex-col gap-1.5 overflow-auto">
            {filtered.map((vehicle) => (
              <button
                key={vehicle.id}
                type="button"
                aria-current={selectedId === vehicle.id ? 'true' : undefined}
                onClick={() => selectVehicle(vehicle)}
                className={cn(
                  'min-h-20 min-w-0 rounded-lg border px-3 py-2.5 text-left transition-[background-color,border-color,transform] duration-150 hover:bg-muted active:scale-[0.96]',
                  selectedId === vehicle.id && 'bg-muted',
                )}
              >
                <span className="block truncate font-semibold tabular-nums">{vehicle.plateNumber}</span>
                <span className="block truncate text-sm text-muted-foreground">{[vehicle.brand, vehicle.model].filter(Boolean).join(' ')}</span>
                {vehicle.customerName || vehicle.customerPhone ? (
                  <span className="block truncate text-xs text-muted-foreground">
                    {[vehicle.customerName, vehicle.customerPhone].filter(Boolean).join(' · ')}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="min-h-0 overflow-hidden">
        {!selectedId && !isCreating ? (
          <CardContent className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-6 text-center">
            <div className="flex max-w-sm flex-col items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Car className="size-5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-semibold text-balance">{t('vehicles.noSelection')}</h3>
                <p className="mt-1 text-sm text-muted-foreground text-pretty">
                  {t('vehicles.noSelectionHint')}
                </p>
              </div>
              <Button type="button" variant="outline" onClick={startNew}>
                <Plus data-icon="inline-start" aria-hidden="true" />
                {t('vehicles.addNewVehicle')}
              </Button>
            </div>
          </CardContent>
        ) : (
          <>
            <CardHeader>
              <CardTitle>{selectedId ? t('vehicles.editVehicle') : t('vehicles.newVehicle')}</CardTitle>
              <CardDescription>{t('vehicles.formHint')}</CardDescription>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-y-auto">
              <form className="flex flex-col gap-4" onSubmit={save}>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {([
                    ['model', t('vehicles.fields.model'), 'Avanza'],
                    ['plateNumber', t('vehicles.fields.plateNumber'), 'DK1234'],
                    ['brand', t('vehicles.fields.brandOptional'), 'Toyota'],
                    ['customerName', t('vehicles.fields.customerNameOptional'), t('vehicles.placeholders.customerName')],
                    ['customerPhone', t('vehicles.fields.phoneOptional'), '08123456789'],
                    ['notes', t('vehicles.fields.notesOptional'), t('vehicles.placeholders.notes')],
                  ] as const).map(([field, label, placeholder]) => (
                    <div key={field} className="flex flex-col gap-1.5">
                      <Label htmlFor={`vehicle-${field}`}>{label}</Label>
                      {field === 'brand' ? (
                        <div className="relative">
                          <Input
                            id="vehicle-brand"
                            value={form.brand}
                            onChange={(event) => {
                              setField('brand', event.target.value)
                              setIsBrandSuggestionsOpen(true)
                            }}
                            onFocus={() => setIsBrandSuggestionsOpen(brandSuggestions.length > 0)}
                            onBlur={() => setIsBrandSuggestionsOpen(false)}
                            onKeyDown={handleBrandKeyDown}
                            placeholder={placeholder}
                            role="combobox"
                            aria-autocomplete="list"
                            aria-expanded={isBrandSuggestionsOpen && brandSuggestions.length > 0}
                            aria-controls={brandListId}
                            aria-activedescendant={
                              isBrandSuggestionsOpen && brandSuggestions[activeBrandIndex]
                                ? `${brandListId}-${activeBrandIndex}`
                                : undefined
                            }
                          />
                          {isBrandSuggestionsOpen && brandSuggestions.length > 0 ? (
                            <div
                              id={brandListId}
                              role="listbox"
                              className="absolute top-full right-0 left-0 z-10 mt-1 overflow-hidden rounded-md bg-popover py-1 text-popover-foreground shadow-lg ring-1 ring-border"
                            >
                              {brandSuggestions.map((brand, index) => (
                                <button
                                  key={brand}
                                  id={`${brandListId}-${index}`}
                                  type="button"
                                  role="option"
                                  aria-selected={index === activeBrandIndex}
                                  onMouseEnter={() => setActiveBrandIndex(index)}
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={() => selectBrand(brand)}
                                  className={cn(
                                    'flex min-h-10 w-full items-center px-3 text-left text-sm transition-[background-color] duration-150',
                                    index === activeBrandIndex && 'bg-muted',
                                  )}
                                >
                                  {brand}
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <Input
                          id={`vehicle-${field}`}
                          value={form[field]}
                          onChange={(event) => setField(field, event.target.value)}
                          placeholder={placeholder}
                        />
                      )}
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
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={!form.plateNumber.trim() || !form.model.trim()}>
                    <Car data-icon="inline-start" aria-hidden="true" />
                    {t('vehicles.saveVehicle')}
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
