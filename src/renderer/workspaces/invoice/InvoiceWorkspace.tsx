import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Eye, Loader2, Printer, RefreshCw, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/renderer/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/renderer/components/ui/card'
import { Input } from '@/renderer/components/ui/input'
import { Label } from '@/renderer/components/ui/label'
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogClose,
  AlertDialogPortal,
  AlertDialogPopup,
} from '@/renderer/components/ui/alert-dialog'
import { cn } from '@/renderer/lib/utils'
import { formatCurrency, formatDateTime, formatPaymentMethod } from '@/renderer/lib/formatters'
import { generateReceiptHTML, printInvoice } from '@/renderer/lib/invoice-print'
import type { InvoiceSummary, InvoiceDetail } from './InvoiceWorkspace.types'
import { ProductCategoryBadge } from '../inventory/ProductCategoryBadge'

const pressableButtonClass =
  'transition-[transform,box-shadow] duration-150 ease-out active:scale-[0.96] active:translate-y-0'

function statusClass(status: string | null): string {
  if (status === 'paid') return 'bg-emerald-500/10 text-emerald-700'
  if (status === 'refunded') return 'bg-amber-500/15 text-amber-700'
  if (status === 'void') return 'bg-destructive/10 text-destructive'
  return 'bg-muted text-muted-foreground'
}

function formatInvoiceVehicle(invoice: InvoiceSummary): string {
  return [invoice.vehicleBrand, invoice.vehicleModel, invoice.vehicleYear].filter(Boolean).join(' ')
}

function InvoiceStatusBadge({
  status,
  label,
  size = 'sm',
}: {
  status: string | null
  label: string
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
      {label}
    </span>
  )
}

export function InvoiceWorkspace() {
  const { t } = useTranslation()
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([])
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetail>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [isLoadingList, setIsLoadingList] = useState(false)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [refreshCount, setRefreshCount] = useState(0)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadInvoices() {
      setIsLoadingList(true)
      setLoadError('')

      try {
        if (!window.simplepos?.invoices) {
          throw new Error(t('invoices.messages.bridgeUnavailable'))
        }

        const list = await window.simplepos.invoices.list({
          search: '',
          status: 'all',
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
        setLoadError(error instanceof Error ? error.message : t('invoices.messages.loadFailed'))
      } finally {
        if (isMounted) setIsLoadingList(false)
      }
    }

    void loadInvoices()

    return () => {
      isMounted = false
    }
  }, [dateFrom, dateTo, refreshCount])

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

  function handlePreview() {
    if (!selectedInvoice) return
    const html = generateReceiptHTML(selectedInvoice)
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    setPreviewUrl(url)
    setIsPreviewOpen(true)
  }

  function handlePreviewClose() {
    setIsPreviewOpen(false)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
  }

  function handlePrint() {
    if (!selectedInvoice) return
    printInvoice(selectedInvoice)
  }

  const totals = useMemo(() => {
    return invoices.reduce(
      (summary, invoice) => ({
        count: summary.count + 1,
        total: summary.total + invoice.total,
      }),
      { count: 0, total: 0 },
    )
  }, [invoices])

  return (
    <div className="grid h-full min-h-0 min-w-0 gap-3 p-1 xl:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
      <Card className="min-h-0 overflow-hidden">
        <CardHeader>
          <CardTitle>{t('invoices.invoiceHistory')}</CardTitle>
          <CardDescription>
            {isLoadingList ? t('invoices.loading') : t('invoices.invoiceCount', { count: totals.count })}
          </CardDescription>
          <CardAction>
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              className={pressableButtonClass}
              onClick={() => setRefreshCount((count) => count + 1)}
              disabled={isLoadingList}
              aria-label={t('invoices.refresh')}
            >
              <RefreshCw aria-hidden="true" className={isLoadingList ? 'animate-spin' : undefined} />
            </Button>
          </CardAction>
        </CardHeader>

        <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
          <div className="grid grid-cols-4 gap-2">
            <div className="col-span-2">
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                {t('workOrders.fromDate')}
                <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
              </label>
            </div>

            <div className="col-span-2">
              <label className="col-span-2 flex flex-col gap-1 text-xs text-muted-foreground">
                {t('workOrders.toDate')}
                <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
              </label>
            </div>
          </div>


          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
            <div className="grid shrink-0 grid-cols-2 gap-2">
              <div className="rounded-lg bg-muted px-3 py-2">
                <p className="text-xs text-muted-foreground">{t('invoices.totalInvoices')}</p>
                <p className="text-lg font-semibold tabular-nums">{totals.count}</p>
              </div>
              <div className="rounded-lg bg-muted px-3 py-2">
                <p className="text-xs text-muted-foreground">{t('sales.total')}</p>
                <p className="text-lg font-semibold tabular-nums">{formatCurrency(totals.total)}</p>
              </div>
            </div>

            <div className="scroll-fade -mx-1 min-h-0 flex-1 overflow-auto px-1 py-1">
              {isLoadingList ? (
                <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-background p-5 text-center">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
                  <p className="text-sm text-muted-foreground">{t('invoices.loadingWithDots')}</p>
                </div>
              ) : loadError ? (
                <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed bg-background p-5 text-center">
                  <div className="max-w-xs">
                    <p className="text-sm font-medium text-balance">{t('invoices.unableToLoad')}</p>
                    <p className="mt-1 text-sm text-muted-foreground text-pretty">{loadError}</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn('mt-3', pressableButtonClass)}
                      onClick={() => setRefreshCount((count) => count + 1)}
                    >
                      <RefreshCw data-icon="inline-start" aria-hidden="true" />
                      {t('invoices.retry')}
                    </Button>
                  </div>
                </div>
              ) : invoices.length === 0 ? (
                <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed bg-background p-5 text-center">
                  <div className="max-w-xs">
                    <p className="text-sm font-medium text-balance">{t('invoices.noInvoicesFound')}</p>
                    <p className="text-sm text-muted-foreground text-pretty">
                      {t('invoices.noInvoicesHint')}
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
                          <span className="block truncate text-sm font-semibold tabular-nums">
                            {invoice.vehiclePlateNumber ?? invoice.invoiceNumber}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground tabular-nums">
                            {invoice.vehiclePlateNumber ? invoice.invoiceNumber : t('invoices.vehicleNotRecorded')}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            {formatInvoiceVehicle(invoice) || invoice.customerName || t('invoices.walkInCustomer')}
                          </span>
                        </span>
                        <InvoiceStatusBadge
                          status={invoice.status}
                          label={t(`invoices.statuses.${invoice.status ?? 'unrecorded'}`)}
                          size="xs"
                        />
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
              <CardTitle>{t('invoices.invoiceDetail')}</CardTitle>
              <CardDescription>
                {selectedInvoice.invoiceNumber} · {formatDateTime(selectedInvoice.issuedAt)}
              </CardDescription>
              <CardAction className="flex gap-2">
                <Button type="button" variant="outline" size="sm" className={pressableButtonClass} onClick={handlePreview}>
                  <Eye data-icon="inline-start" aria-hidden="true" />
                  {t('invoices.preview')}
                </Button>
                <Button type="button" variant="outline" size="sm" className={pressableButtonClass} onClick={handlePrint}>
                  <Printer data-icon="inline-start" aria-hidden="true" />
                  {t('invoices.print')}
                </Button>
              </CardAction>

              <AlertDialog open={isPreviewOpen} onOpenChange={(open) => { if (!open) handlePreviewClose() }}>
                <AlertDialogPortal>
                  <AlertDialogBackdrop />
                  <AlertDialogPopup className="flex max-h-[90vh] w-[90vw] max-w-3xl flex-col gap-0 p-0">
                    <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
                      <p className="text-sm font-semibold">{selectedInvoice.invoiceNumber}</p>
                      <AlertDialogClose
                        render={
                          <Button type="button" variant="ghost" size="icon-sm" className={pressableButtonClass} aria-label="Close preview">
                            <X aria-hidden="true" />
                          </Button>
                        }
                      />
                    </div>
                    <div className="min-h-0 flex-1">
                      {previewUrl ? (
                        <iframe
                          src={previewUrl}
                          title={`Invoice ${selectedInvoice.invoiceNumber}`}
                          className="h-full w-full rounded-b-xl border-0"
                          style={{ minHeight: '70vh' }}
                        />
                      ) : null}
                    </div>
                  </AlertDialogPopup>
                </AlertDialogPortal>
              </AlertDialog>
            </CardHeader>

            <CardContent className="min-h-0 flex-1 overflow-auto">
              <div className="flex min-w-0 flex-col gap-4">
                  <div className="rounded-lg border bg-background p-4">
                    <div className="grid gap-3 md:grid-cols-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">{t('invoices.plateNumber')}</Label>
                        <p className="mt-1 text-sm font-semibold tabular-nums">
                          {selectedInvoice.vehiclePlateNumber ?? t('invoices.vehicleNotRecorded')}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">{t('invoices.vehicle')}</Label>
                        {formatInvoiceVehicle(selectedInvoice) || selectedInvoice.vehicleColor ? (
                          <p className="mt-1 text-sm font-medium text-pretty">
                            {[formatInvoiceVehicle(selectedInvoice), selectedInvoice.vehicleColor].filter(Boolean).join(' · ')}
                          </p>
                        ) : (
                          <p className="mt-1 text-sm">{t('invoices.notRecorded')}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">{t('customers.table.customer')}</Label>
                        <p className="mt-1 text-sm font-medium text-pretty">
                          {selectedInvoice.customerName ?? t('invoices.walkInCustomer')}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">{t('invoices.contact')}</Label>
                        <p className="mt-1 text-sm text-pretty">
                          {selectedInvoice.customerPhone ?? selectedInvoice.customerEmail ?? t('invoices.notRecorded')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-lg border bg-background">
                    <div className="grid grid-cols-[minmax(0,1fr)_minmax(100px,160px)_96px_72px_104px] gap-3 border-b bg-muted/70 px-3 py-2 text-xs font-medium text-muted-foreground">
                      <span>{t('invoices.item')}</span>
                      <span>{t('invoices.category')}</span>
                      <span className="text-right">{t('services.table.price')}</span>
                      <span className="text-right">{t('invoices.qty')}</span>
                      <span className="text-right">{t('sales.total')}</span>
                    </div>
                    <div className="divide-y">
                      {selectedInvoice.items.map((item) => (
                        <div
                          key={item.id}
                          className="grid grid-cols-[minmax(0,1fr)_minmax(100px,160px)_96px_72px_104px] items-center gap-3 px-3 py-2.5 text-sm"
                        >
                          <p className="truncate font-medium text-balance">{item.name}</p>
                          {item.category ? (
                            <ProductCategoryBadge name={item.category} />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                          <span className="text-right tabular-nums">{formatCurrency(item.unitPrice)}</span>
                          <span className="text-right tabular-nums">{item.quantity}</span>
                          <span className="text-right font-medium tabular-nums">{formatCurrency(item.lineTotal)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-3 text-sm">
                        <span className="w-20 text-muted-foreground">{t('invoices.totalItems')}</span>
                        <span className="tabular-nums">
                          {selectedInvoice.items.reduce((count, item) => count + item.quantity, 0)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="w-20 text-muted-foreground">{t('invoices.payment')}</span>
                        <span>{formatPaymentMethod(selectedInvoice.payment?.method ?? null)}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-6 text-lg font-semibold sm:justify-end">
                      <span>{t('sales.total')}</span>
                      <span className="tabular-nums">{formatCurrency(selectedInvoice.total)}</span>
                    </div>
                  </div>
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex min-h-0 flex-1 items-center justify-center overflow-auto">
            <div className="max-w-sm text-center">
              <p className="text-sm font-medium text-balance">
                {isLoadingDetail ? t('invoices.loadingInvoice') : t('invoices.selectInvoice')}
              </p>
              <p className="mt-1 text-sm text-muted-foreground text-pretty">
                {t('invoices.detailEmptyHint')}
              </p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
