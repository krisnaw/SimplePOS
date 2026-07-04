import {useEffect, useState} from 'react'
import {Download} from 'lucide-react'
import {useTranslation} from 'react-i18next'
import {Button} from '@/renderer/components/ui/button'
import {Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle} from '@/renderer/components/ui/card'
import {BaseSelect} from '@/renderer/components/ui/base-select'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/renderer/components/ui/dialog'
import {Separator} from '@/renderer/components/ui/separator'
import {cn} from '@/renderer/lib/utils'
import {formatCurrency, formatDate, formatDateTime, formatPaymentMethod} from '@/renderer/lib/formatters'
import type {ReportPeriod, ReportSummary} from './ReportsWorkspace.types'
import {ProductCategoryBadge} from '../inventory/ProductCategoryBadge'

const emptyReport: ReportSummary = {
  period: 'today',
  dateFrom: new Date().toISOString(),
  dateTo: new Date().toISOString(),
  salesTotal: 0,
  invoiceCount: 0,
  averageInvoiceTotal: 0,
  inventoryValue: 0,
  lowStockCount: 0,
  workOrderCount: 0,
  completedWorkOrderCount: 0,
  invoicedWorkOrderCount: 0,
  workOrderCompletionRate: 0,
  paymentMethods: [],
  lowStockItems: [],
  topSellingItems: [],
}

const pressableButtonClass =
  'transition-[transform,box-shadow] duration-150 ease-out active:scale-[0.96] active:translate-y-0'

export function ReportsWorkspace() {
  const {t} = useTranslation()
  const [period, setPeriod] = useState<ReportPeriod>('today')
  const [report, setReport] = useState<ReportSummary>(emptyReport)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadReport() {
      setIsLoading(true)
      try {
        const nextReport = await window.simplepos?.reports?.getSummary({period})

        if (!isMounted) return

        setReport(nextReport ?? emptyReport)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    void loadReport()

    return () => {
      isMounted = false
    }
  }, [period])

  return (
    <div className="p-1">
      <Card>
        <CardHeader>
          <CardTitle>{t('reports.topSelling.title')}</CardTitle>
          <CardDescription>
            {t('reports.topSelling.description')} ·{' '}
            {t('reports.dateRange', {from: formatDate(report.dateFrom), to: formatDate(report.dateTo)})}
          </CardDescription>
          <CardAction className="flex flex-wrap items-center gap-2">
            <div className="w-40">
              <BaseSelect
                id="report-period"
                value={period}
                ariaLabel={t('reports.period')}
                options={[
                  {value: 'today', label: t('reports.periods.today')},
                  {value: 'week', label: t('reports.periods.week')},
                  {value: 'month', label: t('reports.periods.month')},
                  {value: 'quarter', label: t('reports.periods.quarter')},
                ]}
                onValueChange={(value) => setPeriod(value as ReportPeriod)}
              />
            </div>
            <Dialog>
              <DialogTrigger
                render={(
                  <Button
                    variant="outline"
                    className={cn('h-10', pressableButtonClass)}
                    disabled={isLoading}
                  />
                )}
              >
                <Download data-icon="inline-start" aria-hidden="true"/>
                {t('reports.exportPdf')}
              </DialogTrigger>
              <DialogContent className="max-h-[calc(100vh-2rem)] overflow-hidden p-0 sm:max-w-5xl">
                <DialogHeader className="px-5 pt-5">
                  <DialogTitle>{t('reports.pdfPreview.title')}</DialogTitle>
                  <DialogDescription>{t('reports.pdfPreview.description')}</DialogDescription>
                </DialogHeader>

                <div className="min-h-0 overflow-y-auto bg-muted/60 px-4 py-5 sm:px-8">
                  <article
                    className="mx-auto flex min-h-[920px] w-full max-w-[720px] flex-col gap-7 rounded-sm bg-white p-8 text-zinc-950 shadow-lg ring-1 ring-black/10 sm:p-10">
                    <header className="flex items-start justify-between gap-6">
                      <div className="flex flex-col gap-1">
                        <p className="text-xl font-semibold tracking-tight">SimplePOS</p>
                        <p className="text-xs text-zinc-500">{t('app.subtitle')}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 text-right">
                        <h2 className="text-lg font-semibold">{t('reports.pdfPreview.reportTitle')}</h2>
                        <p className="text-xs text-zinc-500">
                          {formatDate(report.dateFrom)} – {formatDate(report.dateTo)}
                        </p>
                      </div>
                    </header>

                    <Separator className="bg-zinc-200"/>

                    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        [t('reports.groups.sales.title'), formatCurrency(report.salesTotal)],
                        [t('reports.groups.averageInvoice.title'), formatCurrency(report.averageInvoiceTotal)],
                        [t('reports.groups.inventoryValue.title'), formatCurrency(report.inventoryValue)],
                        [t('reports.groups.workOrders.title'), String(report.workOrderCount)],
                      ].map(([label, value]) => (
                        <div key={label} className="flex flex-col gap-1 rounded-md bg-zinc-100 p-3">
                          <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">{label}</p>
                          <p className="text-sm font-semibold tabular-nums">{value}</p>
                        </div>
                      ))}
                    </section>

                    <section className="grid gap-6 sm:grid-cols-2">
                      <div className="flex flex-col gap-3">
                        <div>
                          <h3 className="text-sm font-semibold">{t('reports.pdfPreview.activityTitle')}</h3>
                          <p className="text-xs text-zinc-500">{t('reports.pdfPreview.activityDescription')}</p>
                        </div>
                        <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-xs">
                          <dt className="text-zinc-600">{t('reports.pdfPreview.paidInvoices')}</dt>
                          <dd className="font-medium tabular-nums">{report.invoiceCount}</dd>
                          <dt className="text-zinc-600">{t('reports.pdfPreview.completedWorkOrders')}</dt>
                          <dd className="font-medium tabular-nums">{report.completedWorkOrderCount}</dd>
                          <dt className="text-zinc-600">{t('reports.pdfPreview.invoicedWorkOrders')}</dt>
                          <dd className="font-medium tabular-nums">{report.invoicedWorkOrderCount}</dd>
                          <dt className="text-zinc-600">{t('reports.pdfPreview.completionRate')}</dt>
                          <dd className="font-medium tabular-nums">{report.workOrderCompletionRate}%</dd>
                        </dl>
                      </div>

                      <div className="flex flex-col gap-3">
                        <div>
                          <h3 className="text-sm font-semibold">{t('reports.paymentMethods.title')}</h3>
                          <p className="text-xs text-zinc-500">{t('reports.paymentMethods.description')}</p>
                        </div>
                        {report.paymentMethods.length === 0 ? (
                          <p className="text-xs text-zinc-500">{t('reports.paymentMethods.noPayments')}</p>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {report.paymentMethods.map((payment) => (
                              <div key={payment.method} className="grid grid-cols-[1fr_auto_auto] gap-3 text-xs">
                                <span>{formatPaymentMethod(payment.method)}</span>
                                <span className="text-zinc-500 tabular-nums">
                                {t('reports.paymentMethods.paymentCount', {count: payment.count})}
                              </span>
                                <span className="font-medium tabular-nums">{formatCurrency(payment.total)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </section>

                    <section className="flex flex-col gap-3">
                      <div>
                        <h3 className="text-sm font-semibold">{t('reports.topSelling.title')}</h3>
                        <p className="text-xs text-zinc-500">{t('reports.topSelling.description')}</p>
                      </div>
                      <div className="overflow-hidden rounded-md ring-1 ring-zinc-200">
                        <div
                          className="grid grid-cols-[minmax(0,1fr)_70px_110px] gap-3 bg-zinc-100 px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                          <span>{t('reports.topSelling.table.productName')}</span>
                          <span className="text-right">{t('reports.topSelling.table.totalUnit')}</span>
                          <span className="text-right">{t('reports.topSelling.table.total')}</span>
                        </div>
                        {report.topSellingItems.length === 0 ? (
                          <p className="px-3 py-4 text-xs text-zinc-500">{t('reports.topSelling.noSales')}</p>
                        ) : (
                          report.topSellingItems.slice(0, 8).map((item) => (
                            <div
                              key={`${item.itemType}:${item.sku ?? item.name}`}
                              className="grid grid-cols-[minmax(0,1fr)_70px_110px] gap-3 border-t border-zinc-200 px-3 py-2 text-xs"
                            >
                              <span className="truncate">{item.name}</span>
                              <span className="text-right tabular-nums">{item.quantity}</span>
                              <span className="text-right font-medium tabular-nums">{formatCurrency(item.total)}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </section>

                    <section className="flex flex-col gap-3">
                      <div>
                        <h3 className="text-sm font-semibold">{t('reports.lowStock.title')}</h3>
                        <p className="text-xs text-zinc-500">{t('reports.lowStock.description')}</p>
                      </div>
                      {report.lowStockItems.length === 0 ? (
                        <p className="text-xs text-zinc-500">{t('reports.lowStock.noLowStock')}</p>
                      ) : (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {report.lowStockItems.slice(0, 6).map((item) => (
                            <div key={item.id}
                                 className="flex items-center justify-between gap-4 rounded-md bg-zinc-100 px-3 py-2 text-xs">
                              <span className="truncate">{item.name}</span>
                              <span className="shrink-0 text-zinc-600 tabular-nums">
                              {item.stockQty} / {item.minStock}
                            </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>

                    <footer
                      className="mt-auto flex items-center justify-between gap-4 border-t border-zinc-200 pt-4 text-[10px] text-zinc-500">
                      <span>{t('reports.pdfPreview.generatedAt', {date: formatDateTime(new Date().toISOString())})}</span>
                      <span>{t('reports.pdfPreview.pageNumber', {page: 1})}</span>
                    </footer>
                  </article>
                </div>

                <DialogFooter className="mx-0 mb-0 rounded-b-xl">
                  <DialogClose render={<Button variant="outline"/>}>
                    {t('common.close')}
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {!isLoading && report.topSellingItems.length === 0 ? (
            <div
              className="flex min-h-52 items-center justify-center rounded-lg border border-dashed bg-background p-6 text-center">
              <p className="text-sm text-muted-foreground text-pretty">{t('reports.topSelling.noSales')}</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border bg-background">
              <div
                className="grid grid-cols-[minmax(0,1.5fr)_minmax(120px,1fr)_100px_132px] gap-3 border-b bg-muted/70 px-3 py-2 text-xs font-medium text-muted-foreground">
                <span>{t('reports.topSelling.table.productName')}</span>
                <span>{t('reports.topSelling.table.category')}</span>
                <span className="text-right">{t('reports.topSelling.table.totalUnit')}</span>
                <span className="text-right">{t('reports.topSelling.table.total')}</span>
              </div>
              <div className="divide-y">
                {report.topSellingItems.map((item) => (
                  <div
                    key={`${item.itemType}:${item.sku ?? item.name}`}
                    className="grid grid-cols-[minmax(0,1.5fr)_minmax(120px,1fr)_100px_132px] items-center gap-3 px-3 py-2.5 text-sm"
                  >
                    <p className="truncate font-medium text-balance">{item.name}</p>
                    {item.category ? (
                      <ProductCategoryBadge name={item.category}/>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                    <span className="text-right tabular-nums">{item.quantity}</span>
                    <span className="text-right font-medium tabular-nums">{formatCurrency(item.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
