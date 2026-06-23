import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Loader2, Printer, RefreshCw, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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

function generateReceiptHTML(invoice: NonNullable<InvoiceDetail>): string {
  const fmt = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
      .format(n)
      .replace(/^Rp[\s ]*/, 'Rp')

  const fmtDate = (s: string | null) => {
    if (!s) return '-'
    const d = new Date(s)
    return Number.isNaN(d.getTime())
      ? s
      : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(d)
  }

  const rows = invoice.items
    .map(
      (item) => `
      <tr>
        <td style="padding:4px 0;border-bottom:1px solid #eee;">
          <div style="font-weight:500">${item.name}</div>
          <div style="font-size:11px;color:#666">${item.sku ?? '-'} · ${item.itemType === 'service' ? 'Service' : 'Product'}</div>
        </td>
        <td style="padding:4px 8px;text-align:center;border-bottom:1px solid #eee">${item.quantity}</td>
        <td style="padding:4px 8px;text-align:right;border-bottom:1px solid #eee;white-space:nowrap">${fmt(item.unitPrice)}</td>
        <td style="padding:4px 0;text-align:right;border-bottom:1px solid #eee;white-space:nowrap;font-weight:500">${fmt(item.lineTotal)}</td>
      </tr>`,
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; color: #111; background: #fff; padding: 32px; max-width: 640px; margin: 0 auto; }
    h1 { font-size: 20px; font-weight: 700; }
    h2 { font-size: 14px; font-weight: 600; margin-bottom: 8px; }
    .divider { border: none; border-top: 1px solid #ddd; margin: 16px 0; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .meta-label { font-size: 11px; color: #666; margin-bottom: 2px; }
    .meta-value { font-weight: 500; }
    table { width: 100%; border-collapse: collapse; }
    th { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.04em; padding-bottom: 6px; border-bottom: 2px solid #ddd; }
    th:not(:first-child) { text-align: right; padding-left: 8px; }
    th:nth-child(2) { text-align: center; }
    .totals { margin-left: auto; width: 240px; margin-top: 16px; }
    .totals-row { display: flex; justify-content: space-between; gap: 16px; padding: 3px 0; font-size: 13px; }
    .totals-row.total { font-size: 15px; font-weight: 700; border-top: 2px solid #111; padding-top: 8px; margin-top: 4px; }
    .footer { margin-top: 32px; text-align: center; font-size: 12px; color: #666; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>SimplePOS</h1>
  <p style="color:#666;margin-top:2px;font-size:12px">Bengkel / Car Repair Shop</p>

  <hr class="divider">

  <div class="meta-grid">
    <div>
      <div class="meta-label">Invoice</div>
      <div class="meta-value">${invoice.invoiceNumber}</div>
    </div>
    <div>
      <div class="meta-label">Date</div>
      <div class="meta-value">${fmtDate(invoice.issuedAt)}</div>
    </div>
    <div>
      <div class="meta-label">Customer</div>
      <div class="meta-value">${invoice.customerName ?? 'Walk-in customer'}</div>
    </div>
    <div>
      <div class="meta-label">Contact</div>
      <div class="meta-value">${invoice.customerPhone ?? invoice.customerEmail ?? '-'}</div>
    </div>
    ${invoice.workOrderNumber ? `<div><div class="meta-label">Work Order</div><div class="meta-value">${invoice.workOrderNumber}</div></div>` : ''}
    <div>
      <div class="meta-label">Payment</div>
      <div class="meta-value" style="text-transform:capitalize">${invoice.payment?.method ?? '-'}</div>
    </div>
  </div>

  <hr class="divider">

  <table>
    <thead>
      <tr>
        <th style="text-align:left">Item</th>
        <th>Qty</th>
        <th style="text-align:right;padding-left:8px">Unit Price</th>
        <th style="text-align:right">Total</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <div class="totals-row"><span style="color:#666">Subtotal</span><span>${fmt(invoice.subtotal)}</span></div>
    ${invoice.discount > 0 ? `<div class="totals-row"><span style="color:#666">Discount</span><span>-${fmt(invoice.discount)}</span></div>` : ''}
    <div class="totals-row"><span style="color:#666">Tax (11%)</span><span>${fmt(invoice.tax)}</span></div>
    <div class="totals-row total"><span>Total</span><span>${fmt(invoice.total)}</span></div>
  </div>

  <div class="footer">
    <p>Thank you for your business!</p>
    <p style="margin-top:4px">Printed on ${fmtDate(new Date().toISOString())}</p>
  </div>
</body>
</html>`
}

function statusClass(status: string | null): string {
  if (status === 'paid') return 'bg-emerald-500/10 text-emerald-700'
  if (status === 'refunded') return 'bg-amber-500/15 text-amber-700'
  if (status === 'void') return 'bg-destructive/10 text-destructive'
  return 'bg-muted text-muted-foreground'
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
          throw new Error(t('invoices.messages.bridgeUnavailable'))
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
        setLoadError(error instanceof Error ? error.message : t('invoices.messages.loadFailed'))
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

  function handlePrint() {
    if (!selectedInvoice) return

    const html = generateReceiptHTML(selectedInvoice)
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'
    document.body.appendChild(iframe)

    const doc = iframe.contentDocument ?? iframe.contentWindow?.document
    if (!doc) {
      document.body.removeChild(iframe)
      return
    }

    doc.open()
    doc.write(html)
    doc.close()

    iframe.contentWindow?.focus()
    iframe.contentWindow?.print()

    setTimeout(() => document.body.removeChild(iframe), 1000)
  }

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
            <div className="col-span-3">
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                {t('common.search')}
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={t('invoices.searchPlaceholder')}
                />
              </label>
            </div>
            <div>
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                {t('common.status')}
                <BaseSelect
                  value={statusFilter}
                  ariaLabel={t('invoices.invoiceStatus')}
                  options={[
                    { value: 'all', label: t('common.all') },
                    { value: 'paid', label: t('invoices.statuses.paid') },
                    { value: 'void', label: t('invoices.statuses.void') },
                  ]}
                  onValueChange={(value) => setStatusFilter(value as InvoiceStatusFilter)}
                />
              </label>
            </div>

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
                <p className="text-xs text-muted-foreground">{t('invoices.paid')}</p>
                <p className="text-lg font-semibold tabular-nums">{totals.paidCount}</p>
              </div>
              <div className="rounded-lg bg-muted px-3 py-2">
                <p className="text-xs text-muted-foreground">{t('sales.total')}</p>
                <p className="text-lg font-semibold tabular-nums">{formatCurrency(totals.total)}</p>
              </div>
            </div>

            <div className="-mx-1 min-h-0 flex-1 overflow-auto px-1 py-1">
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
                          <span className="block truncate text-sm font-medium tabular-nums">
                            {invoice.invoiceNumber}
                          </span>
                          <span className="mt-1 block truncate text-xs text-muted-foreground">
                            {invoice.customerName ?? t('invoices.walkInCustomer')}
                          </span>
                          {invoice.workOrderNumber ? (
                            <span className="mt-0.5 block truncate text-xs text-muted-foreground tabular-nums">
                              {t('invoices.workOrderNumber', { number: invoice.workOrderNumber })}
                            </span>
                          ) : null}
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
              <CardTitle>{selectedInvoice.invoiceNumber}</CardTitle>
              <CardDescription>
                {selectedInvoice.customerName ?? t('invoices.walkInCustomer')} · {formatDateTime(selectedInvoice.issuedAt)}
              </CardDescription>
              <CardAction className="flex gap-2">
                <Button type="button" variant="outline" size="sm" className={pressableButtonClass} onClick={handlePrint}>
                  <Printer data-icon="inline-start" aria-hidden="true" />
                  {t('invoices.print')}
                </Button>
              </CardAction>
            </CardHeader>

            <CardContent className="min-h-0 flex-1 overflow-auto">
              <div className="flex min-w-0 flex-col gap-4">
                  <div className="rounded-lg border bg-background p-4">
                    <div className="grid gap-3 md:grid-cols-3">
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
                      <div>
                        <Label className="text-xs text-muted-foreground">{t('invoices.payment')}</Label>
                        <p className="mt-1 text-sm font-medium">
                          {formatPaymentMethod(selectedInvoice.payment?.method ?? null)}
                        </p>
                      </div>
                      <div className="md:col-span-3">
                        <Label className="text-xs text-muted-foreground">{t('invoices.workOrder')}</Label>
                        <p className="mt-1 break-all text-sm font-medium tabular-nums text-pretty">
                          {selectedInvoice.workOrderNumber ?? t('invoices.directSale')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-lg border bg-background">
                    <div className="grid grid-cols-[minmax(0,1fr)_72px_96px_104px] gap-3 border-b bg-muted/70 px-3 py-2 text-xs font-medium text-muted-foreground">
                      <span>{t('invoices.item')}</span>
                      <span className="text-right">{t('invoices.qty')}</span>
                      <span className="text-right">{t('services.table.price')}</span>
                      <span className="text-right">{t('sales.total')}</span>
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
                              {item.itemType === 'service' ? t('sales.service') : t('sales.product')} · {item.sku ?? t('invoices.noSku')}
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
                      <p className="text-sm font-semibold text-balance">{t('invoices.paymentDetails')}</p>
                      <div className="mt-3 flex flex-col gap-2 text-sm">
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">{t('common.status')}</span>
                          <InvoiceStatusBadge
                            status={selectedInvoice.payment?.status ?? null}
                            label={t(`invoices.statuses.${selectedInvoice.payment?.status ?? 'unrecorded'}`)}
                          />
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">{t('invoices.method')}</span>
                          <span>{formatPaymentMethod(selectedInvoice.payment?.method ?? null)}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">{t('invoices.amount')}</span>
                          <span className="tabular-nums">
                            {formatCurrency(selectedInvoice.payment?.amount ?? selectedInvoice.total)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border bg-background p-4">
                      <p className="text-sm font-semibold text-balance">{t('invoices.receiptPreview')}</p>
                      <div className="mt-4 flex flex-col gap-2 text-sm">
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">{t('sales.subtotal')}</span>
                          <span className="tabular-nums">{formatCurrency(selectedInvoice.subtotal)}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">{t('workOrders.form.discount')}</span>
                          <span className="tabular-nums">{formatCurrency(selectedInvoice.discount)}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">{t('invoices.tax')}</span>
                          <span className="tabular-nums">{formatCurrency(selectedInvoice.tax)}</span>
                        </div>
                        <div className="mt-2 flex justify-between gap-3 border-t pt-3 text-base font-semibold">
                          <span>{t('sales.total')}</span>
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
