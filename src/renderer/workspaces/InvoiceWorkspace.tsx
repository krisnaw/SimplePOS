import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Download, Loader2, Printer, Receipt, RefreshCw, Search } from 'lucide-react'
import { Button } from '@/renderer/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/renderer/components/ui/card'
import { Input } from '@/renderer/components/ui/input'
import { Label } from '@/renderer/components/ui/label'
import { BaseSelect } from '@/renderer/components/ui/base-select'
import { cn } from '@/renderer/lib/utils'
import { formatCurrency, formatDateTime, formatPaymentMethod } from '@/renderer/lib/formatters'
import type { InvoiceSummary, InvoiceDetail, InvoiceStatusFilter } from './InvoiceWorkspace.types'

const pressableButtonClass =
  'transition-[transform,box-shadow] duration-150 ease-out active:scale-[0.96] active:translate-y-0'

function statusClass(status: string | null): string {
  if (status === 'paid') return 'bg-emerald-500/10 text-emerald-700'
  if (status === 'refunded') return 'bg-amber-500/15 text-amber-700'
  if (status === 'void') return 'bg-destructive/10 text-destructive'
  return 'bg-muted text-muted-foreground'
}

function InvoiceStatusBadge({
  status,
  size = 'sm',
}: {
  status: string | null
  size?: 'xs' | 'sm'
}) {
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center rounded-full px-2 py-0.5 font-medium uppercase',
        size === 'xs' ? 'text-[10px]' : 'text-xs',
        statusClass(status),
      )}
    >
      {status ?? 'unrecorded'}
    </span>
  )
}

export function InvoiceWorkspace() {
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([])
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetail>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<InvoiceStatusFilter>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [isLoadingList, setIsLoadingList] = useState(false)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [refreshCount, setRefreshCount] = useState(0)

  useEffect(() => {
    let isMounted = true

    async function loadInvoices() {
      setIsLoadingList(true)
      setLoadError('')

      try {
        if (!window.simplepos?.invoices) {
          throw new Error('Invoice records are unavailable. Restart SimplePOS to load the latest app bridge.')
        }

        const list = await window.simplepos.invoices.list({
          search: searchQuery,
          status: statusFilter === 'all' ? 'all' : statusFilter,
          dateFrom,
          dateTo,
        })

        if (!isMounted) return

        const nextInvoices = list ?? []
        setInvoices(nextInvoices)
        setSelectedInvoiceId((currentId) => {
          if (currentId && nextInvoices.some((invoice) => invoice.id === currentId)) return currentId
          return nextInvoices[0]?.id ?? null
        })
      } catch (error) {
        if (!isMounted) return

        setInvoices([])
        setSelectedInvoiceId(null)
        setLoadError(error instanceof Error ? error.message : 'Unable to load invoice records.')
      } finally {
        if (isMounted) setIsLoadingList(false)
      }
    }

    void loadInvoices()

    return () => {
      isMounted = false
    }
  }, [dateFrom, dateTo, refreshCount, searchQuery, statusFilter])

  useEffect(() => {
    let isMounted = true

    async function loadInvoiceDetail() {
      if (!selectedInvoiceId) {
        setSelectedInvoice(null)
        return
      }

      setIsLoadingDetail(true)
      const invoice = await window.simplepos?.invoices.get({ id: selectedInvoiceId })

      if (!isMounted) return

      setSelectedInvoice(invoice ?? null)
      setIsLoadingDetail(false)
    }

    void loadInvoiceDetail()

    return () => {
      isMounted = false
    }
  }, [selectedInvoiceId])

  const totals = useMemo(() => {
    return invoices.reduce(
      (summary, invoice) => ({
        count: summary.count + 1,
        paidCount: summary.paidCount + (invoice.status === 'paid' ? 1 : 0),
        total: summary.total + invoice.total,
      }),
      { count: 0, paidCount: 0, total: 0 },
    )
  }, [invoices])

  return (
    <div className="grid h-full min-h-0 min-w-0 gap-3 overflow-hidden xl:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
      <Card className="min-h-0 overflow-hidden">
        <CardHeader>
          <CardTitle>Invoice History</CardTitle>
          <CardDescription>
            {isLoadingList ? 'Loading invoices' : `${totals.count} invoice${totals.count === 1 ? '' : 's'}`}
          </CardDescription>
          <CardAction>
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              className={pressableButtonClass}
              onClick={() => setRefreshCount((count) => count + 1)}
              disabled={isLoadingList}
              aria-label="Refresh invoices"
            >
              <RefreshCw aria-hidden="true" className={isLoadingList ? 'animate-spin' : undefined} />
            </Button>
          </CardAction>
        </CardHeader>

        <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
          <div className="grid grid-cols-4 gap-2">
            <div className="col-span-3">
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Search
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search invoice, work order, customer, payment"
                />
              </label>
            </div>
            <div>
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Status
                <BaseSelect
                  value={statusFilter}
                  ariaLabel="Invoice status"
                  options={[
                    { value: 'all', label: 'All' },
                    { value: 'paid', label: 'Paid' },
                    { value: 'void', label: 'Void' },
                  ]}
                  onValueChange={(value) => setStatusFilter(value as InvoiceStatusFilter)}
                />
              </label>
            </div>

            <div className="col-span-2">
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                From
                <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
              </label>
            </div>

            <div className="col-span-2">
              <label className="col-span-2 flex flex-col gap-1 text-xs text-muted-foreground">
                To
                <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
              </label>
            </div>
          </div>


          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
            <div className="grid shrink-0 grid-cols-2 gap-2">
              <div className="rounded-lg bg-muted px-3 py-2">
                <p className="text-xs text-muted-foreground">Paid</p>
                <p className="text-lg font-semibold tabular-nums">{totals.paidCount}</p>
              </div>
              <div className="rounded-lg bg-muted px-3 py-2">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-semibold tabular-nums">{formatCurrency(totals.total)}</p>
              </div>
            </div>

            <div className="-mx-1 min-h-0 flex-1 overflow-auto px-1 py-1">
              {isLoadingList ? (
                <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-background p-5 text-center">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
                  <p className="text-sm text-muted-foreground">Loading invoices...</p>
                </div>
              ) : loadError ? (
                <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed bg-background p-5 text-center">
                  <div className="max-w-xs">
                    <p className="text-sm font-medium text-balance">Unable to load invoices</p>
                    <p className="mt-1 text-sm text-muted-foreground text-pretty">{loadError}</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn('mt-3', pressableButtonClass)}
                      onClick={() => setRefreshCount((count) => count + 1)}
                    >
                      <RefreshCw data-icon="inline-start" aria-hidden="true" />
                      Retry
                    </Button>
                  </div>
                </div>
              ) : invoices.length === 0 ? (
                <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed bg-background p-5 text-center">
                  <div className="max-w-xs">
                    <p className="text-sm font-medium text-balance">No invoices found</p>
                    <p className="text-sm text-muted-foreground text-pretty">
                      Completed checkouts will appear here once they match the current filters.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {invoices.map((invoice) => {
                    const isSelected = invoice.id === selectedInvoiceId

                    return (
                      <button
                        key={invoice.id}
                        type="button"
                        aria-current={isSelected ? 'true' : undefined}
                        onClick={() => setSelectedInvoiceId(invoice.id)}
                        className={cn(
                          'min-h-20 rounded-lg border bg-background p-3 text-left shadow-sm transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out active:scale-[0.96]',
                          isSelected
                            ? 'border-primary/50 bg-primary/5 shadow-border-hover'
                            : 'hover:border-primary/30 hover:shadow-border-hover',
                        )}
                      >
                      <span className="flex items-start justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium tabular-nums">
                            {invoice.invoiceNumber}
                          </span>
                          <span className="mt-1 block truncate text-xs text-muted-foreground">
                            {invoice.customerName ?? 'Walk-in customer'}
                          </span>
                          {invoice.workOrderNumber ? (
                            <span className="mt-0.5 block truncate text-xs text-muted-foreground tabular-nums">
                              Work Order {invoice.workOrderNumber}
                            </span>
                          ) : null}
                        </span>
                        <InvoiceStatusBadge status={invoice.status} size="xs" />
                      </span>
                        <span className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <CalendarDays aria-hidden="true" className="size-3.5 shrink-0" />
                          <span className="truncate">{formatDateTime(invoice.issuedAt)}</span>
                        </span>
                        <span className="shrink-0 font-medium text-foreground tabular-nums">
                          {formatCurrency(invoice.total)}
                        </span>
                      </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

        </CardContent>
      </Card>

      <Card className="min-h-0 overflow-hidden">
        {selectedInvoice ? (
          <>
            <CardHeader>
              <CardTitle>{selectedInvoice.invoiceNumber}</CardTitle>
              <CardDescription>
                {selectedInvoice.customerName ?? 'Walk-in customer'} · {formatDateTime(selectedInvoice.issuedAt)}
              </CardDescription>
              <CardAction className="flex gap-2">
                <Button type="button" variant="outline" size="sm" className={pressableButtonClass}>
                  <Printer data-icon="inline-start" aria-hidden="true" />
                  Print
                </Button>
                <Button type="button" variant="outline" size="sm" className={pressableButtonClass}>
                  <Download data-icon="inline-start" aria-hidden="true" />
                  Export
                </Button>
              </CardAction>
            </CardHeader>

            <CardContent className="min-h-0 flex-1 overflow-auto">
              <div className="flex min-w-0 flex-col gap-4">
                  <div className="rounded-lg border bg-background p-4">
                    <div className="grid gap-3 md:grid-cols-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Customer</Label>
                        <p className="mt-1 text-sm font-medium text-pretty">
                          {selectedInvoice.customerName ?? 'Walk-in customer'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Contact</Label>
                        <p className="mt-1 text-sm text-pretty">
                          {selectedInvoice.customerPhone ?? selectedInvoice.customerEmail ?? 'Not recorded'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Payment</Label>
                        <p className="mt-1 text-sm font-medium">
                          {formatPaymentMethod(selectedInvoice.payment?.method ?? null)}
                        </p>
                      </div>
                      <div className="md:col-span-3">
                        <Label className="text-xs text-muted-foreground">Work Order</Label>
                        <p className="mt-1 break-all text-sm font-medium tabular-nums text-pretty">
                          {selectedInvoice.workOrderNumber ?? 'Direct sale'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-lg border bg-background">
                    <div className="grid grid-cols-[minmax(0,1fr)_72px_96px_104px] gap-3 border-b bg-muted/70 px-3 py-2 text-xs font-medium text-muted-foreground">
                      <span>Item</span>
                      <span className="text-right">Qty</span>
                      <span className="text-right">Price</span>
                      <span className="text-right">Total</span>
                    </div>
                    <div className="divide-y">
                      {selectedInvoice.items.map((item) => (
                        <div
                          key={item.id}
                          className="grid grid-cols-[minmax(0,1fr)_72px_96px_104px] gap-3 px-3 py-2.5 text-sm"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium text-balance">{item.name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {item.itemType === 'service' ? 'Service' : 'Product'} · {item.sku ?? 'No SKU'}
                            </p>
                          </div>
                          <span className="text-right tabular-nums">{item.quantity}</span>
                          <span className="text-right tabular-nums">{formatCurrency(item.unitPrice)}</span>
                          <span className="text-right font-medium tabular-nums">{formatCurrency(item.lineTotal)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-lg border bg-background p-4">
                      <p className="text-sm font-semibold text-balance">Payment Details</p>
                      <div className="mt-3 flex flex-col gap-2 text-sm">
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">Status</span>
                          <InvoiceStatusBadge status={selectedInvoice.payment?.status ?? null} />
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">Method</span>
                          <span>{formatPaymentMethod(selectedInvoice.payment?.method ?? null)}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">Amount</span>
                          <span className="tabular-nums">
                            {formatCurrency(selectedInvoice.payment?.amount ?? selectedInvoice.total)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border bg-background p-4">
                      <p className="text-sm font-semibold text-balance">Receipt Preview</p>
                      <div className="mt-4 flex flex-col gap-2 text-sm">
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span className="tabular-nums">{formatCurrency(selectedInvoice.subtotal)}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">Discount</span>
                          <span className="tabular-nums">{formatCurrency(selectedInvoice.discount)}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">Tax</span>
                          <span className="tabular-nums">{formatCurrency(selectedInvoice.tax)}</span>
                        </div>
                        <div className="mt-2 flex justify-between gap-3 border-t pt-3 text-base font-semibold">
                          <span>Total</span>
                          <span className="tabular-nums">{formatCurrency(selectedInvoice.total)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex min-h-0 flex-1 items-center justify-center overflow-auto">
            <div className="max-w-sm text-center">
              <p className="text-sm font-medium text-balance">
                {isLoadingDetail ? 'Loading invoice' : 'Select an invoice'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground text-pretty">
                Completed sales will show line items, totals, and payment details here.
              </p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
