import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Building2, MapPin, Pencil, Plus, Search } from 'lucide-react'
import { Button } from '@/renderer/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/renderer/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/renderer/components/ui/field'
import { Input } from '@/renderer/components/ui/input'
import { cn } from '@/renderer/lib/utils'
import type { SupplierSummary } from '@/shared/types/supplier'

type SupplierForm = {
  name: string
  contactName: string
  phone: string
  address: string
  notes: string
}

type SupplierFeedback = {
  message: string
  tone: 'success' | 'error'
}

const emptyForm: SupplierForm = {
  name: '',
  contactName: '',
  phone: '',
  address: '',
  notes: '',
}

const pressableClass =
  'transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out active:scale-[0.96]'

function toForm(supplier: SupplierSummary): SupplierForm {
  return {
    name: supplier.name,
    contactName: supplier.contactName ?? '',
    phone: supplier.phone ?? '',
    address: supplier.address ?? '',
    notes: supplier.notes ?? '',
  }
}

export function SupplierManagement() {
  const [suppliers, setSuppliers] = useState<SupplierSummary[]>([])
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<SupplierForm>(emptyForm)
  const [editing, setEditing] = useState<SupplierSummary | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState<SupplierFeedback | null>(null)

  async function loadSuppliers() {
    const api = window.simplepos?.suppliers
    if (!api) {
      setFeedback({ message: 'Supplier service is unavailable.', tone: 'error' })
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setSuppliers(await api.list({ includeInactive: true }))
    setIsLoading(false)
  }

  useEffect(() => {
    void loadSuppliers()
  }, [])

  useEffect(() => {
    if (feedback?.tone !== 'success') return

    const timeout = window.setTimeout(() => {
      setFeedback((current) => current === feedback ? null : current)
    }, 3000)

    return () => window.clearTimeout(timeout)
  }, [feedback])

  const filteredSuppliers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    if (!query) return suppliers

    return suppliers.filter((supplier) =>
      [supplier.name, supplier.contactName, supplier.phone, supplier.address]
        .some((value) => value?.toLocaleLowerCase().includes(query)),
    )
  }, [search, suppliers])

  function updateForm(field: keyof SupplierForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function resetForm() {
    setEditing(null)
    setIsCreating(false)
    setForm(emptyForm)
    setFeedback(null)
  }

  function startCreating() {
    setEditing(null)
    setIsCreating(true)
    setForm(emptyForm)
    setFeedback(null)
  }

  function startEditing(supplier: SupplierSummary) {
    setEditing(supplier)
    setIsCreating(false)
    setForm(toForm(supplier))
    setFeedback(null)
  }

  async function saveSupplier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const api = window.simplepos?.suppliers
    if (!api || isSaving) return

    setIsSaving(true)
    const result = editing
      ? await api.update({ id: editing.id, ...form, isActive: editing.isActive })
      : await api.create(form)
    setIsSaving(false)
    setFeedback({ message: result.message, tone: result.ok ? 'success' : 'error' })

    if (result.ok) {
      resetForm()
      setFeedback({ message: result.message, tone: 'success' })
      await loadSuppliers()
    }
  }

  return (
    <div className="grid h-full min-h-0 gap-3 overflow-hidden xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card className="min-h-0 overflow-hidden">
        <CardHeader>
          <div className="min-w-0">
            <CardTitle className="text-balance">Suppliers</CardTitle>
            <CardDescription className="text-pretty">
              Reusable supplier records for inventory purchases.
            </CardDescription>
          </div>
          <CardAction>
            <Button type="button" size="sm" className={pressableClass} onClick={startCreating}>
              <Plus data-icon="inline-start" aria-hidden="true" />
              New supplier
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
          <div className="relative shrink-0">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search supplier, contact, phone, or address"
              className="h-10 pl-10"
              aria-label="Search suppliers"
            />
          </div>

          <div className="min-h-0 flex-1 overflow-auto rounded-lg border bg-background">
            {isLoading ? (
              <p className="p-6 text-center text-sm text-muted-foreground">Loading suppliers...</p>
            ) : filteredSuppliers.length === 0 ? (
              <div className="flex min-h-48 flex-col items-center justify-center gap-2 p-6 text-center">
                <Building2 className="size-7 text-muted-foreground" aria-hidden="true" />
                <p className="font-medium">{suppliers.length === 0 ? 'No suppliers yet' : 'No matching suppliers'}</p>
                <p className="max-w-sm text-sm text-muted-foreground text-pretty">
                  {suppliers.length === 0
                    ? 'Add the first supplier using the form.'
                    : 'Try a different search term.'}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredSuppliers.map((supplier) => (
                  <div
                    key={supplier.id}
                    className="grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{supplier.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[supplier.contactName, supplier.phone].filter(Boolean).join(' · ') || 'No contact details'}
                      </p>
                      {supplier.address ? (
                        <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="size-3 shrink-0" aria-hidden="true" />
                          <span className="truncate">{supplier.address}</span>
                        </p>
                      ) : null}
                    </div>
                    <Button type="button" variant="ghost" size="icon-sm" className={pressableClass} onClick={() => startEditing(supplier)} aria-label={`Edit ${supplier.name}`}>
                      <Pencil aria-hidden="true" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="min-h-0 overflow-hidden">
        {!editing && !isCreating ? (
          <CardContent className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-6 text-center">
            <div className="flex max-w-sm flex-col items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Building2 aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-semibold text-balance">No supplier selected</h3>
                <p className="mt-1 text-sm text-muted-foreground text-pretty">
                  Edit a supplier from the list or create a new supplier record.
                </p>
              </div>
              {feedback ? (
                <p className="text-sm text-muted-foreground text-pretty" role="status">
                  {feedback.message}
                </p>
              ) : null}
              <Button type="button" variant="outline" className={pressableClass} onClick={startCreating}>
                <Plus data-icon="inline-start" aria-hidden="true" />
                Add new supplier
              </Button>
            </div>
          </CardContent>
        ) : (
          <>
            <CardHeader>
              <CardTitle>{editing ? 'Edit Supplier' : 'New Supplier'}</CardTitle>
              <CardDescription className="text-pretty">
                {editing ? `Update ${editing.name} or change its contact details.` : 'Create a supplier for future purchase records.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-y-auto">
              <form onSubmit={saveSupplier}>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="supplier-name">Supplier name</FieldLabel>
                    <Input id="supplier-name" value={form.name} onChange={(event) => updateForm('name', event.target.value)} placeholder="Bali Motor Supply" required />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="supplier-contact">Contact name</FieldLabel>
                    <Input id="supplier-contact" value={form.contactName} onChange={(event) => updateForm('contactName', event.target.value)} placeholder="Wayan" />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="supplier-phone">Phone</FieldLabel>
                    <Input id="supplier-phone" value={form.phone} onChange={(event) => updateForm('phone', event.target.value)} placeholder="0812..." />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="supplier-address">Address</FieldLabel>
                    <Input id="supplier-address" value={form.address} onChange={(event) => updateForm('address', event.target.value)} placeholder="Supplier address" />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="supplier-notes">Notes</FieldLabel>
                    <Input id="supplier-notes" value={form.notes} onChange={(event) => updateForm('notes', event.target.value)} placeholder="Delivery or payment notes" />
                  </Field>

                  {feedback ? (
                    <p
                      className={cn(
                        'rounded-md px-3 py-2 text-sm text-pretty',
                        feedback.tone === 'success'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-destructive/10 text-destructive',
                      )}
                      role={feedback.tone === 'error' ? 'alert' : 'status'}
                    >
                      {feedback.message}
                    </p>
                  ) : null}

                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className={cn('flex-1', pressableClass)} onClick={resetForm}>
                      Cancel
                    </Button>
                    <Button type="submit" className={cn('flex-1', pressableClass)} disabled={isSaving}>
                      <Plus data-icon="inline-start" aria-hidden="true" />
                      {isSaving ? 'Saving...' : editing ? 'Save Changes' : 'Add Supplier'}
                    </Button>
                  </div>
                </FieldGroup>
              </form>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  )
}
