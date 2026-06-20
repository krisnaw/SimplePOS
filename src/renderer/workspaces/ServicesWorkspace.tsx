import { useEffect, useMemo, useState } from 'react'
import { Loader2, Search, Settings2, Trash2, Wrench } from 'lucide-react'
import { Button } from '@/renderer/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/renderer/components/ui/card'
import { Input } from '@/renderer/components/ui/input'
import { Label } from '@/renderer/components/ui/label'
import { cn } from '@/renderer/lib/utils'
import { formatCurrency } from '@/renderer/lib/formatters'
import type { ServiceSummary } from '@/shared/types/service'

type ServiceFormState = {
  code: string
  name: string
  description: string
  category: string
  price: string
}

const emptyForm: ServiceFormState = {
  code: '',
  name: '',
  description: '',
  category: '',
  price: '',
}

const serviceTableGrid = 'grid-cols-[minmax(0,1.15fr)_minmax(0,0.8fr)_112px_72px]'
const iconHitAreaClass =
  'relative after:absolute after:top-1/2 after:left-1/2 after:size-10 after:-translate-x-1/2 after:-translate-y-1/2'

function toServiceForm(service: ServiceSummary): ServiceFormState {
  return {
    code: service.code,
    name: service.name,
    description: service.description ?? '',
    category: service.category ?? '',
    price: String(service.price),
  }
}

export function ServicesWorkspace() {
  const [services, setServices] = useState<ServiceSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [form, setForm] = useState<ServiceFormState>(emptyForm)
  const [editingService, setEditingService] = useState<ServiceSummary | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadServices() {
      setIsLoading(true)
      const serviceList = await window.simplepos?.services.list()

      if (!isMounted) return

      setServices(serviceList ?? [])
      setIsLoading(false)
    }

    void loadServices().catch(() => {
      if (isMounted) setIsLoading(false)
    })

    return () => {
      isMounted = false
    }
  }, [])

  const filteredServices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    if (!query) return services

    return services.filter((service) =>
      [service.name, service.code, service.category ?? '', service.description ?? ''].some((value) =>
        value.toLowerCase().includes(query),
      ),
    )
  }, [searchQuery, services])

  const categoryCount = new Set(services.map((service) => service.category).filter(Boolean)).size
  const averagePrice = services.length
    ? Math.round(services.reduce((total, service) => total + service.price, 0) / services.length)
    : 0

  function updateForm<K extends keyof ServiceFormState>(field: K, value: ServiceFormState[K]) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }))
  }

  function resetForm() {
    setForm(emptyForm)
    setEditingService(null)
    setMessage('')
  }

  function handleEdit(service: ServiceSummary) {
    setEditingService(service)
    setForm(toServiceForm(service))
    setMessage('')
  }

  async function refreshServices() {
    const serviceList = await window.simplepos?.services.list()
    setServices(serviceList ?? [])
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const price = Number(form.price)

    if (!form.code.trim() || !form.name.trim() || price < 0) {
      setMessage('Enter service code, name, and a valid price.')
      return
    }

    setIsSubmitting(true)

    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      description: form.description.trim() || null,
      category: form.category.trim() || null,
      price,
    }

    const result = editingService
      ? await window.simplepos?.services.update({
          ...payload,
          id: editingService.id,
          isActive: editingService.isActive,
        })
      : await window.simplepos?.services.create(payload)

    setIsSubmitting(false)

    if (!result) {
      setMessage('Unable to reach the database.')
      return
    }

    if (!result.ok) {
      setMessage(result.message)
      return
    }

    setMessage(result.message)
    resetForm()
    await refreshServices()
  }

  async function handleDeactivate(service: ServiceSummary) {
    await window.simplepos?.services.update({ ...service, isActive: false })
    await refreshServices()
  }

  return (
    <div className="grid h-full min-h-0 min-w-0 gap-3 overflow-hidden xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex min-h-0 min-w-0 flex-col gap-3 overflow-hidden">
        <div className="grid shrink-0 gap-3 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Total Services</CardTitle>
              <CardDescription>Active service SKUs</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{services.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Categories</CardTitle>
              <CardDescription>Service groups</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{categoryCount}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Average Price</CardTitle>
              <CardDescription>Across active services</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{formatCurrency(averagePrice)}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="min-h-0 flex-1 overflow-hidden">
          <CardHeader>
            <CardTitle>Service List</CardTitle>
            <CardDescription>Labor and service charges available in Sales and Work Orders.</CardDescription>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
            <div className="relative shrink-0">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search services"
                className="pl-9"
              />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border bg-background">
              <div
                className={cn(
                  'sticky top-0 z-10 grid shrink-0 items-center gap-3 border-b bg-muted/95 px-3 py-2 text-xs font-medium text-muted-foreground backdrop-blur',
                  'rounded-t-[calc(var(--radius-lg)-1px)]',
                  serviceTableGrid,
                )}
              >
                <span>Service</span>
                <span>Category</span>
                <span className="text-right">Price</span>
                <span className="text-center">Remove</span>
              </div>

              <div className="divide-y">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
                    <p className="text-sm text-muted-foreground">Loading services...</p>
                  </div>
                ) : filteredServices.length === 0 ? (
                  <div className="px-3 py-6 text-sm text-muted-foreground">
                    {services.length === 0 ? 'No services yet. Add one using the form.' : 'No services match this search.'}
                  </div>
                ) : null}

                {!isLoading &&
                  filteredServices.map((service) => (
                    <div
                      key={service.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleEdit(service)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          handleEdit(service)
                        }
                      }}
                      className={cn(
                        'grid min-h-12 w-full cursor-pointer items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                        serviceTableGrid,
                        editingService?.id === service.id && 'bg-muted/60',
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{service.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{service.code}</span>
                      </span>
                      <span className="min-w-0 truncate">{service.category ?? '-'}</span>
                      <span className="truncate text-right tabular-nums">{formatCurrency(service.price)}</span>
                      <span className="flex justify-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={cn('text-muted-foreground hover:text-destructive active:scale-[0.96]', iconHitAreaClass)}
                          onClick={(event) => {
                            event.stopPropagation()
                            void handleDeactivate(service)
                          }}
                          aria-label={`Remove ${service.name}`}
                          title={`Remove ${service.name}`}
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="min-h-0 overflow-hidden">
        <CardHeader>
          <CardTitle>{editingService ? 'Edit Service' : 'Create Service'}</CardTitle>
          <CardDescription>
            {editingService
              ? `Update ${editingService.name} details and price.`
              : 'Add labor, inspection, or service charges to the catalog.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="service-code">Code</Label>
              <Input
                id="service-code"
                value={form.code}
                onChange={(event) => updateForm('code', event.target.value)}
                placeholder="SVC-OIL-CHANGE"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="service-name">Service Name</Label>
              <Input
                id="service-name"
                value={form.name}
                onChange={(event) => updateForm('name', event.target.value)}
                placeholder="Oil Change Labor"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="service-category">Category</Label>
              <Input
                id="service-category"
                value={form.category}
                onChange={(event) => updateForm('category', event.target.value)}
                placeholder="Maintenance"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="service-price">Price (IDR)</Label>
              <Input
                id="service-price"
                type="number"
                min="0"
                value={form.price}
                onChange={(event) => updateForm('price', event.target.value)}
                placeholder="100000"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="service-description">Description</Label>
              <Input
                id="service-description"
                value={form.description}
                onChange={(event) => updateForm('description', event.target.value)}
                placeholder="Labor charge for routine engine oil replacement"
              />
            </div>

            {message ? (
              <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground text-pretty" role="status">
                {message}
              </p>
            ) : null}

            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {editingService ? <Settings2 data-icon="inline-start" aria-hidden="true" /> : <Wrench data-icon="inline-start" aria-hidden="true" />}
                {isSubmitting ? (editingService ? 'Saving...' : 'Creating...') : editingService ? 'Save Changes' : 'Create'}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                {editingService ? 'Cancel' : 'Clear'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
