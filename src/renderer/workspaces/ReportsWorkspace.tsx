import { useEffect, useState } from 'react'
import { BarChart3, Boxes, ClipboardList, CreditCard, Download, Receipt } from 'lucide-react'
import { Button } from '@/renderer/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/renderer/components/ui/card'
import { Label } from '@/renderer/components/ui/label'
import { BaseSelect } from '@/renderer/components/ui/base-select'

type ReportPeriod = 'today' | 'week' | 'month' | 'quarter'
type ReportSummary = Awaited<ReturnType<NonNullable<typeof window.simplepos>['reports']['getSummary']>>

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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value).replace(/^Rp[\s\u00a0]*/, 'Rp')
}

function formatDate(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
  }).format(date)
}

function formatLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function ReportsWorkspace() {
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
      title: 'Sales',
      description: 'Revenue for the selected period.',
      value: formatCurrency(report.salesTotal),
      helper: `${report.invoiceCount} invoice${report.invoiceCount === 1 ? '' : 's'}`,
      icon: BarChart3,
    },
    {
      title: 'Average Invoice',
      description: 'Mean completed invoice value.',
      value: formatCurrency(report.averageInvoiceTotal),
      helper: `${formatCurrency(report.taxTotal)} tax collected`,
      icon: Receipt,
    },
    {
      title: 'Inventory Value',
      description: 'Current active stock value.',
      value: formatCurrency(report.inventoryValue),
      helper: `${report.lowStockCount} low-stock item${report.lowStockCount === 1 ? '' : 's'}`,
      icon: Boxes,
    },
    {
      title: 'Discounts',
      description: 'Discounts applied to paid invoices.',
      value: formatCurrency(report.discountTotal),
      helper: 'Selected period',
      icon: CreditCard,
    },
    {
      title: 'Work Orders',
      description: 'Repair jobs opened in this period.',
      value: String(report.workOrderCount),
      helper: `${report.completedWorkOrderCount} completed · ${report.workOrderCompletionRate}% rate`,
      icon: ClipboardList,
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <Card className="shadow-border">
        <CardHeader>
          <CardTitle className="text-base text-balance">Report Filters</CardTitle>
          <CardDescription className="text-pretty">
            Reviewing {formatDate(report.dateFrom)} to {formatDate(report.dateTo)}.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-2">
            <Label htmlFor="report-period">Period</Label>
            <BaseSelect
              id="report-period"
              value={period}
              ariaLabel="Report period"
              options={[
                { value: 'today', label: 'Today' },
                { value: 'week', label: 'This Week' },
                { value: 'month', label: 'This Month' },
                { value: 'quarter', label: 'This Quarter' },
              ]}
              onValueChange={(value) => setPeriod(value as ReportPeriod)}
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className={pressableButtonClass}>
              <Download data-icon="inline-start" aria-hidden="true" />
              Export PDF
            </Button>
            <Button variant="outline" className={pressableButtonClass}>
              <Download data-icon="inline-start" aria-hidden="true" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {reportGroups.map((summary) => {
          const Icon = summary.icon

          return (
            <Card key={summary.title} className="shadow-border transition-[box-shadow] duration-150 ease-out hover:shadow-border-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-balance">
                  <Icon aria-hidden="true" className="size-4 text-muted-foreground" />
                  {summary.title}
                </CardTitle>
                <CardDescription className="text-pretty">{summary.description}</CardDescription>
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
        <Card className="shadow-border md:col-span-2 xl:col-span-3">
          <CardHeader>
            <CardTitle className="text-base text-balance">Top Selling Items</CardTitle>
            <CardDescription className="text-pretty">Products and services ranked by revenue.</CardDescription>
          </CardHeader>
          <CardContent>
            {report.topSellingItems.length === 0 ? (
              <div className="flex min-h-52 items-center justify-center rounded-lg border border-dashed bg-background p-6 text-center">
                <p className="text-sm text-muted-foreground text-pretty">No item sales in this period.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border bg-background">
                <div className="grid grid-cols-[minmax(0,1fr)_80px_116px] gap-3 border-b bg-muted/70 px-3 py-2 text-xs font-medium text-muted-foreground">
                  <span>Item</span>
                  <span className="text-right">Qty</span>
                  <span className="text-right">Revenue</span>
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
          <Card className="shadow-border">
            <CardHeader>
              <CardTitle className="text-base text-balance">Payment Methods</CardTitle>
              <CardDescription className="text-pretty">Paid invoices by method.</CardDescription>
            </CardHeader>
            <CardContent>
              {report.paymentMethods.length === 0 ? (
                <p className="rounded-lg border border-dashed bg-background p-4 text-center text-sm text-muted-foreground">
                  No payments in this period.
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
                        {payment.count} payment{payment.count === 1 ? '' : 's'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-border">
            <CardHeader>
              <CardTitle className="text-base text-balance">Low Stock</CardTitle>
              <CardDescription className="text-pretty">Items at or below minimum stock.</CardDescription>
            </CardHeader>
            <CardContent>
              {report.lowStockItems.length === 0 ? (
                <p className="rounded-lg border border-dashed bg-background p-4 text-center text-sm text-muted-foreground">
                  No low-stock items.
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
