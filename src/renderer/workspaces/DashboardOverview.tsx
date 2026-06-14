import { useEffect, useState } from 'react'
import { AlertTriangle, ClipboardList, Receipt, UserRound, WalletCards } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/renderer/components/ui/card'
import type { AuthenticatedUser } from '@/shared/types/app'

type DashboardSummary = Awaited<ReturnType<NonNullable<typeof window.simplepos>['dashboard']['getSummary']>>

const emptySummary: DashboardSummary = {
  paidSalesTotal: 0,
  paidInvoiceCount: 0,
  lowStockCount: 0,
  openWorkOrderCount: 0,
  inProgressWorkOrderCount: 0,
  completedWorkOrderCount: 0,
  recentTransactions: [],
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value).replace(/^Rp[\s\u00a0]*/, 'Rp')
}

function formatTime(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatPaymentMethod(value: string | null): string {
  if (!value) return 'Unrecorded'
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function DashboardOverview({ user }: { user: AuthenticatedUser }) {
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadSummary() {
      try {
        const nextSummary = await window.simplepos?.dashboard?.getSummary()

        if (!isMounted) return

        setSummary(nextSummary ?? emptySummary)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    void loadSummary()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div className="stagger-children grid gap-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card className="border-0 shadow-border transition-[box-shadow] duration-150 ease-out hover:shadow-border-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-balance">
              <UserRound aria-hidden="true" className="size-4 text-muted-foreground" />
              User
            </CardTitle>
            <CardDescription className="text-pretty">Current session</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            <span className="truncate text-pretty">{user.email}</span>
            <span className="capitalize text-muted-foreground text-pretty">{user.role}</span>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-border transition-[box-shadow] duration-150 ease-out hover:shadow-border-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-balance">
              <ClipboardList aria-hidden="true" className="size-4 text-muted-foreground" />
              Work Orders
            </CardTitle>
            <CardDescription className="text-pretty">Active jobs</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <p className="text-3xl font-semibold tabular-nums">
              {isLoading ? '...' : summary.openWorkOrderCount + summary.inProgressWorkOrderCount}
            </p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {summary.completedWorkOrderCount} ready for checkout
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-border transition-[box-shadow] duration-150 ease-out hover:shadow-border-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-balance">
              <WalletCards aria-hidden="true" className="size-4 text-muted-foreground" />
              Sales
            </CardTitle>
            <CardDescription className="text-pretty">Paid invoices</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {isLoading ? '...' : formatCurrency(summary.paidSalesTotal)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-border transition-[box-shadow] duration-150 ease-out hover:shadow-border-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-balance">
              <Receipt aria-hidden="true" className="size-4 text-muted-foreground" />
              Invoices
            </CardTitle>
            <CardDescription className="text-pretty">Paid status</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">
              {isLoading ? '...' : summary.paidInvoiceCount}
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-border transition-[box-shadow] duration-150 ease-out hover:shadow-border-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-balance">
              <AlertTriangle aria-hidden="true" className="size-4 text-muted-foreground" />
              Low Stock
            </CardTitle>
            <CardDescription className="text-pretty">Needs review</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">
              {isLoading ? '...' : summary.lowStockCount}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-border">
        <CardHeader>
          <CardTitle className="text-base text-balance">Recent Transactions</CardTitle>
          <CardDescription className="text-pretty">Latest completed invoices and payments.</CardDescription>
        </CardHeader>
        <CardContent>
          {summary.recentTransactions.length === 0 ? (
            <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed bg-background p-5 text-center">
              <p className="text-sm text-muted-foreground text-pretty">No checkout activity recorded yet.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border bg-background">
              <div className="grid grid-cols-[minmax(0,1fr)_100px_120px_72px] gap-3 border-b bg-muted/70 px-3 py-2 text-xs font-medium text-muted-foreground">
                <span>Invoice</span>
                <span>Payment</span>
                <span className="text-right">Total</span>
                <span className="text-right">Time</span>
              </div>
              <div className="divide-y">
                {summary.recentTransactions.map((transaction) => (
                  <div
                    key={transaction.invoiceId}
                    className="grid grid-cols-[minmax(0,1fr)_100px_120px_72px] gap-3 px-3 py-2.5 text-sm"
                  >
                    <span className="truncate font-medium tabular-nums">{transaction.invoiceNumber}</span>
                    <span className="text-muted-foreground">{formatPaymentMethod(transaction.paymentMethod)}</span>
                    <span className="text-right font-medium tabular-nums">{formatCurrency(transaction.total)}</span>
                    <span className="text-right text-muted-foreground tabular-nums">
                      {formatTime(transaction.issuedAt)}
                    </span>
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
