import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/renderer/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/renderer/components/ui/card'
import { BaseSelect } from '@/renderer/components/ui/base-select'
import { cn } from '@/renderer/lib/utils'
import { formatCurrency, formatDate } from '@/renderer/lib/formatters'
import type { ReportPeriod, ReportSummary } from './ReportsWorkspace.types'
import { ProductCategoryBadge } from './ProductCategoryBadge'

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

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t('reports.filters')}</CardTitle>
          <CardDescription>
            {t('reports.dateRange', { from: formatDate(report.dateFrom), to: formatDate(report.dateTo) })}
          </CardDescription>
          <CardAction className="flex flex-wrap items-center gap-2">
            <div className="w-40">
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
            <Button variant="outline" className={cn('h-10', pressableButtonClass)}>
              <Download data-icon="inline-start" aria-hidden="true" />
              {t('reports.exportPdf')}
            </Button>
            <Button variant="outline" className={cn('h-10', pressableButtonClass)}>
              <Download data-icon="inline-start" aria-hidden="true" />
              {t('reports.exportCsv')}
            </Button>
          </CardAction>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('reports.topSelling.title')}</CardTitle>
          <CardDescription>{t('reports.topSelling.description')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {!isLoading && report.topSellingItems.length === 0 ? (
            <div className="flex min-h-52 items-center justify-center rounded-lg border border-dashed bg-background p-6 text-center">
              <p className="text-sm text-muted-foreground text-pretty">{t('reports.topSelling.noSales')}</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border bg-background">
              <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(120px,1fr)_100px_132px] gap-3 border-b bg-muted/70 px-3 py-2 text-xs font-medium text-muted-foreground">
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
                      <ProductCategoryBadge name={item.category} />
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
