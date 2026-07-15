import {useEffect, useState} from 'react'
import {format} from 'date-fns'
import {enUS, id as idLocale} from 'date-fns/locale'
import {Download} from 'lucide-react'
import type {DateRange} from 'react-day-picker'
import {useTranslation} from 'react-i18next'
import {DateRangePicker} from '@/renderer/components/DateRangePicker'
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
import {formatCurrency, formatDate, formatDateTime} from '@/renderer/lib/formatters'
import type {AuthenticatedUser} from '@/shared/types/user'
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
  inventoryRetailValue: 0,
  inventoryEstimatedCostValue: 0,
  cogsTotal: 0,
  grossProfit: 0,
  grossMarginPercent: 0,
  legacyCostMissingCount: 0,
  hasLegacyCostGaps: false,
  lowStockCount: 0,
  vehicleCount: 0,
  workOrderCount: 0,
  completedWorkOrderCount: 0,
  invoicedWorkOrderCount: 0,
  workOrderCompletionRate: 0,
  paymentMethods: [],
  categorySales: [],
  lowStockItems: [],
  topSellingItems: [],
}

const pressableButtonClass =
  'transition-[transform,box-shadow] duration-150 ease-out active:scale-[0.96] active:translate-y-0'

const fallbackCategoryLabels = ['Bengkel', 'Cuci', 'Mesin', 'Minuman']

function normalizeReportCategory(value: string | null | undefined): string | null {
  if (!value) return null

  const normalized = value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('id-ID')
  return fallbackCategoryLabels.find((category) => category.toLocaleLowerCase('id-ID') === normalized) ?? null
}

function formatPercent(value: number): string {
  return `${value.toLocaleString(undefined, {maximumFractionDigits: 1})}%`
}

function ReportPeriodFilter({
  period,
  customRange,
  onPeriodChange,
  onCustomRangeChange,
}: {
  period: ReportPeriod
  customRange: DateRange | undefined
  onPeriodChange: (period: ReportPeriod) => void
  onCustomRangeChange: (range: DateRange | undefined) => void
}) {
  const {t, i18n} = useTranslation()

  return (
    <>
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
            {value: 'custom', label: t('reports.periods.custom')},
          ]}
          onValueChange={(value) => onPeriodChange(value as ReportPeriod)}
        />
      </div>
      {period === 'custom' ? (
        <div className="w-72">
          <DateRangePicker
            value={customRange}
            onValueChange={onCustomRangeChange}
            placeholder={t('reports.customRangePlaceholder')}
            ariaLabel={t('reports.periods.custom')}
            locale={i18n.resolvedLanguage?.startsWith('id') ? idLocale : enUS}
            className="max-w-none"
          />
        </div>
      ) : null}
    </>
  )
}

export function ReportsWorkspace({
  currentUser,
  appSettings,
}: {
  currentUser: AuthenticatedUser
  appSettings: { appName: string; appDescription: string }
}) {
  const {t} = useTranslation()
  const canViewProfit = currentUser.role === 'admin'
  const [period, setPeriod] = useState<ReportPeriod>('today')
  const [customRange, setCustomRange] = useState<DateRange | undefined>()
  const [report, setReport] = useState<ReportSummary>(emptyReport)
  const [isLoading, setIsLoading] = useState(true)
  const vehicleCount = report.vehicleCount ?? 0
  const categorySalesByName = new Map(fallbackCategoryLabels.map((category) => [category, 0]))

  for (const categorySales of report.categorySales ?? []) {
    const category = normalizeReportCategory(categorySales.category)
    if (!category) continue

    categorySalesByName.set(category, (categorySalesByName.get(category) ?? 0) + categorySales.total)
  }

  const categorySalesMetrics = fallbackCategoryLabels.map((category) => {

    return {
      label: category,
      isCategory: true,
      value: formatCurrency(categorySalesByName.get(category) ?? 0),
      helper: t('reports.groups.categorySales.helper'),
    }
  })
  const reportMetrics = [
    {
      label: t('reports.groups.vehicles.title'),
      isCategory: false,
      value: vehicleCount.toLocaleString(),
      helper: t('reports.groups.vehicles.helper'),
    },
    ...categorySalesMetrics,
  ]

  useEffect(() => {
    let isMounted = true

    async function loadReport() {
      let reportInput: {period: ReportPeriod; dateFrom?: string; dateTo?: string}

      if (period === 'custom') {
        const dateFrom = customRange?.from
        const dateTo = customRange?.to
        if (!dateFrom || !dateTo) return

        reportInput = {
          period,
          dateFrom: format(dateFrom, 'yyyy-MM-dd'),
          dateTo: format(dateTo, 'yyyy-MM-dd'),
        }
      } else {
        reportInput = {period}
      }

      setIsLoading(true)
      try {
        const nextReport = await window.simplepos?.reports?.getSummary(reportInput)

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
  }, [customRange, period])

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
            <ReportPeriodFilter
              period={period}
              customRange={customRange}
              onPeriodChange={setPeriod}
              onCustomRangeChange={setCustomRange}
            />
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
              <DialogContent className="flex max-h-[calc(100vh-2rem)] min-h-0 flex-col overflow-hidden sm:max-w-5xl">
                <DialogHeader>
                  <DialogTitle>{t('reports.pdfPreview.title')}</DialogTitle>
                  <DialogDescription>{t('reports.pdfPreview.description')}</DialogDescription>
                </DialogHeader>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-8 pb-6 sm:px-8 sm:pt-10">
                  <article
                    className="mx-auto flex aspect-210/148 w-full max-w-215 flex-col gap-5 rounded-sm bg-white p-6 text-zinc-950 shadow-lg ring-1 ring-black/10 sm:p-8">
                    <header className="flex items-start justify-between gap-6">
                      <div className="flex flex-col gap-1">
                        <p className="text-xl font-semibold tracking-tight">{appSettings.appName}</p>
                        <p className="text-xs text-zinc-500">{appSettings.appDescription}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 text-right">
                        <h2 className="text-lg font-semibold">{t('reports.pdfPreview.reportTitle')}</h2>
                        <p className="text-xs text-zinc-500">
                          {formatDate(report.dateFrom)} – {formatDate(report.dateTo)}
                        </p>
                      </div>
                    </header>

                    <Separator className="bg-zinc-200"/>

                    <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                      {reportMetrics.map((metric) => (
                        <div key={metric.label} className="flex flex-col gap-1 rounded-md bg-zinc-100 p-3">
                          {metric.isCategory ? (
                            <ProductCategoryBadge name={metric.label}/>
                          ) : (
                            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">{metric.label}</p>
                          )}
                          <p className="text-sm font-semibold tabular-nums">{metric.value}</p>
                        </div>
                      ))}
                    </section>

                    {canViewProfit && report.hasLegacyCostGaps ? (
                      <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        {t('reports.legacyCostWarning', {count: report.legacyCostMissingCount})}
                      </p>
                    ) : null}

                    <section className="flex flex-col gap-3">
                      <div className="overflow-hidden rounded-md ring-1 ring-zinc-200">
                        <div
                          className={cn(
                            'grid gap-3 bg-zinc-100 px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-zinc-500',
                            canViewProfit
                              ? 'grid-cols-[minmax(0,1fr)_56px_96px_96px]'
                              : 'grid-cols-[minmax(0,1fr)_56px_112px]',
                          )}
                        >
                          <span>{t('reports.topSelling.table.productName')}</span>
                          <span className="text-right">{t('reports.topSelling.table.totalUnit')}</span>
                          <span className="text-right">{t('reports.topSelling.table.sales')}</span>
                          {canViewProfit ? (
                            <span className="text-right">{t('reports.topSelling.table.profit')}</span>
                          ) : null}
                        </div>
                        {report.topSellingItems.length === 0 ? (
                          <p className="px-3 py-4 text-xs text-zinc-500">{t('reports.topSelling.noSales')}</p>
                        ) : (
                          report.topSellingItems.slice(0, 8).map((item) => (
                            <div
                              key={`${item.itemType}:${item.sku ?? item.name}`}
                              className={cn(
                                'grid gap-3 border-t border-zinc-200 px-3 py-2 text-xs',
                                canViewProfit
                                  ? 'grid-cols-[minmax(0,1fr)_56px_96px_96px]'
                                  : 'grid-cols-[minmax(0,1fr)_56px_112px]',
                              )}
                            >
                              <span className="min-w-0 wrap-break-word leading-snug">{item.name}</span>
                              <span className="text-right tabular-nums">{item.quantity}</span>
                              <span className="text-right font-medium tabular-nums">{formatCurrency(item.total)}</span>
                              {canViewProfit ? (
                                <span className="text-right font-medium tabular-nums">{formatCurrency(item.grossProfit)}</span>
                              ) : null}
                            </div>
                          ))
                        )}
                      </div>
                    </section>

                    <footer
                      className="mt-auto flex items-center justify-between gap-4 border-t border-zinc-200 pt-4 text-[10px] text-zinc-500">
                      <span>{t('reports.pdfPreview.generatedAt', {date: formatDateTime(new Date().toISOString())})}</span>
                      <span>{t('reports.pdfPreview.pageNumber', {page: 1})}</span>
                    </footer>
                  </article>
                </div>

                <DialogFooter>
                  <DialogClose render={<Button variant="outline"/>}>
                    {t('common.close')}
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid gap-2 md:grid-cols-5">
            {reportMetrics.map((metric) => (
              <div key={metric.label} className="rounded-lg border bg-background px-3 py-2.5">
                {metric.isCategory ? (
                  <ProductCategoryBadge name={metric.label}/>
                ) : (
                  <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
                )}
                <p className="mt-1 text-lg font-semibold tabular-nums">{metric.value}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{metric.helper}</p>
              </div>
            ))}
          </div>

          {canViewProfit && report.hasLegacyCostGaps ? (
            <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-800 text-pretty" role="status">
              {t('reports.legacyCostWarning', {count: report.legacyCostMissingCount})}
            </p>
          ) : null}

          {!isLoading && report.topSellingItems.length === 0 ? (
            <div
              className="flex min-h-52 items-center justify-center rounded-lg border border-dashed bg-background p-6 text-center">
              <p className="text-sm text-muted-foreground text-pretty">{t('reports.topSelling.noSales')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border bg-background">
              <div
                className={cn(
                  'grid min-w-max gap-3 border-b bg-muted/70 px-3 py-2 text-xs font-medium text-muted-foreground',
                  canViewProfit
                    ? 'grid-cols-[minmax(220px,1.5fr)_minmax(120px,1fr)_80px_120px_120px_120px_90px]'
                    : 'grid-cols-[minmax(220px,1.5fr)_minmax(120px,1fr)_100px_132px]',
                )}
              >
                <span>{t('reports.topSelling.table.productName')}</span>
                <span>{t('reports.topSelling.table.category')}</span>
                <span className="text-right">{t('reports.topSelling.table.totalUnit')}</span>
                <span className="text-right">{t('reports.topSelling.table.sales')}</span>
                {canViewProfit ? (
                  <>
                    <span className="text-right">{t('reports.topSelling.table.cogs')}</span>
                    <span className="text-right">{t('reports.topSelling.table.profit')}</span>
                    <span className="text-right">{t('reports.topSelling.table.margin')}</span>
                  </>
                ) : null}
              </div>
              <div className="divide-y">
                {report.topSellingItems.map((item) => (
                  <div
                    key={`${item.itemType}:${item.sku ?? item.name}`}
                    className={cn(
                      'grid min-w-max items-center gap-3 px-3 py-2.5 text-sm',
                      canViewProfit
                        ? 'grid-cols-[minmax(220px,1.5fr)_minmax(120px,1fr)_80px_120px_120px_120px_90px]'
                        : 'grid-cols-[minmax(220px,1.5fr)_minmax(120px,1fr)_100px_132px]',
                    )}
                  >
                    <p className="truncate font-medium text-balance">{item.name}</p>
                    {item.category ? (
                      <ProductCategoryBadge name={item.category}/>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                    <span className="text-right tabular-nums">{item.quantity}</span>
                    <span className="text-right font-medium tabular-nums">{formatCurrency(item.total)}</span>
                    {canViewProfit ? (
                      <>
                        <span className="text-right tabular-nums">{formatCurrency(item.cogsTotal)}</span>
                        <span className="text-right font-medium tabular-nums">{formatCurrency(item.grossProfit)}</span>
                        <span className="text-right tabular-nums">{formatPercent(item.grossMarginPercent)}</span>
                      </>
                    ) : null}
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
