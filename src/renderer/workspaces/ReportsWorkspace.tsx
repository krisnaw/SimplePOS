import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/renderer/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/renderer/components/ui/card'
import { Label } from '@/renderer/components/ui/label'
import { BaseSelect } from '@/renderer/components/ui/base-select'
import { formatCurrency, formatDate, capitalize as formatLabel } from '@/renderer/lib/formatters'
import type { ReportPeriod, ReportSummary } from './ReportsWorkspace.types'

const emptyReport: ReportSummary = {
  period: 'today',
  dateFrom: new Date().toISOString(),
  dateTo: new Date().toISOString(),
  salesTotal: 0,
  invoiceCount: 0,
  averageInvoiceTotal: 0,
  discountTotal: 0,
  taxTotal: 0,
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
  const { t } = useTranslation()
  const [period, setPeriod] = useState<ReportPeriod>('today')
  const [report, setReport] = useState<ReportSummary>(emptyReport)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadReport() {
      setIsLoading(true)
      try {
        const nextReport = await window.simplepos?.reports?.getSummary({ period })

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

  const reportGroups = [
    {
      title: t('reports.groups.sales.title'),
      description: t('reports.groups.sales.description'),
      value: formatCurrency(report.salesTotal),
      helper: t('reports.groups.sales.helper', { count: report.invoiceCount }),
    },
    {
      title: t('reports.groups.averageInvoice.title'),
      description: t('reports.groups.averageInvoice.description'),
      value: formatCurrency(report.averageInvoiceTotal),
      helper: t('reports.groups.averageInvoice.helper', { value: formatCurrency(report.taxTotal) }),
    },
    {
      title: t('reports.groups.inventoryValue.title'),
      description: t('reports.groups.inventoryValue.description'),
      value: formatCurrency(report.inventoryValue),
      helper: t('reports.groups.inventoryValue.helper', { count: report.lowStockCount }),
    },
    {
      title: t('reports.groups.discounts.title'),
      description: t('reports.groups.discounts.description'),
      value: formatCurrency(report.discountTotal),
      helper: t('reports.groups.discounts.helper'),
    },
    {
      title: t('reports.groups.workOrders.title'),
      description: t('reports.groups.workOrders.description'),
      value: String(report.workOrderCount),
      helper: t('reports.groups.workOrders.helper', {
        count: report.completedWorkOrderCount,
        rate: report.workOrderCompletionRate,
      }),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t('reports.filters')}</CardTitle>
          <CardDescription>
            {t('reports.dateRange', { from: formatDate(report.dateFrom), to: formatDate(report.dateTo) })}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="report-period">{t('reports.period')}</Label>
            <BaseSelect
              id="report-period"
              value={period}
              ariaLabel={t('reports.period')}
              options={[
                { value: 'today', label: t('reports.periods.today') },
                { value: 'week', label: t('reports.periods.week') },
                { value: 'month', label: t('reports.periods.month') },
                { value: 'quarter', label: t('reports.periods.quarter') },
              ]}
              onValueChange={(value) => setPeriod(value as ReportPeriod)}
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className={pressableButtonClass}>
              <Download data-icon="inline-start" aria-hidden="true" />
              {t('reports.exportPdf')}
            </Button>
            <Button variant="outline" className={pressableButtonClass}>
              <Download data-icon="inline-start" aria-hidden="true" />
              {t('reports.exportCsv')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {reportGroups.map((summary) => {
          return (
            <Card key={summary.title}>
              <CardHeader>
                <CardTitle>{summary.title}</CardTitle>
                <CardDescription>{summary.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-1">
                <p className="text-2xl font-semibold tabular-nums">{isLoading ? '...' : summary.value}</p>
                <p className="text-sm text-muted-foreground text-pretty">{summary.helper}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.topSelling.title')}</CardTitle>
            <CardDescription>{t('reports.topSelling.description')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {report.topSellingItems.length === 0 ? (
              <div className="flex min-h-52 items-center justify-center rounded-lg border border-dashed bg-background p-6 text-center">
                <p className="text-sm text-muted-foreground text-pretty">{t('reports.topSelling.noSales')}</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border bg-background">
                <div className="grid grid-cols-[minmax(0,1fr)_80px_116px] gap-3 border-b bg-muted/70 px-3 py-2 text-xs font-medium text-muted-foreground">
                  <span>{t('reports.topSelling.table.item')}</span>
                  <span className="text-right">{t('reports.topSelling.table.qty')}</span>
                  <span className="text-right">{t('reports.topSelling.table.revenue')}</span>
                </div>
                <div className="divide-y">
                  {report.topSellingItems.map((item) => (
                    <div
                      key={`${item.itemType}:${item.sku ?? item.name}`}
                      className="grid grid-cols-[minmax(0,1fr)_80px_116px] gap-3 px-3 py-2.5 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-balance">{item.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {formatLabel(item.itemType)} · {item.sku ?? 'No SKU'}
                        </p>
                      </div>
                      <span className="text-right tabular-nums">{item.quantity}</span>
                      <span className="text-right font-medium tabular-nums">{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('reports.paymentMethods.title')}</CardTitle>
              <CardDescription>{t('reports.paymentMethods.description')}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {report.paymentMethods.length === 0 ? (
                <p className="rounded-lg border border-dashed bg-background p-4 text-center text-sm text-muted-foreground">
                  {t('reports.paymentMethods.noPayments')}
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {report.paymentMethods.map((payment) => (
                    <div key={payment.method} className="rounded-lg bg-muted px-3 py-2">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium">{formatLabel(payment.method)}</span>
                        <span className="tabular-nums">{formatCurrency(payment.total)}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                        {t('reports.paymentMethods.paymentCount', { count: payment.count })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('reports.lowStock.title')}</CardTitle>
              <CardDescription>{t('reports.lowStock.description')}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {report.lowStockItems.length === 0 ? (
                <p className="rounded-lg border border-dashed bg-background p-4 text-center text-sm text-muted-foreground">
                  {t('reports.lowStock.noLowStock')}
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {report.lowStockItems.map((item) => (
                    <div key={item.id} className="rounded-lg bg-muted px-3 py-2">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate font-medium">{item.name}</span>
                        <span className="shrink-0 tabular-nums">
                          {item.stockQty}/{item.minStock}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground tabular-nums">{item.sku}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
