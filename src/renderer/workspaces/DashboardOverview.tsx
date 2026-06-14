import { useEffect, useState } from 'react'
import { AlertTriangle, ClipboardList, Receipt, UserRound, WalletCards } from 'lucide-react'
import {Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle} from '@/renderer/components/ui/card'
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
        <Card>
          <CardHeader>
            <CardTitle>
              User
            </CardTitle>
            <CardDescription>Current session</CardDescription>
            <CardAction>
              <UserRound aria-hidden="true" className="size-4 text-muted-foreground" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col">
              <span className="truncate text-pretty">{user.email}</span>
              <span className="capitalize text-muted-foreground text-pretty">{user.role}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Work Orders
            </CardTitle>
            <CardDescription>Active jobs</CardDescription>
            <CardAction>
              <ClipboardList aria-hidden="true" className="size-4 text-muted-foreground" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">
              {isLoading ? '...' : summary.openWorkOrderCount + summary.inProgressWorkOrderCount}
            </p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {summary.completedWorkOrderCount} ready for checkout
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>

              Sales
            </CardTitle>
            <CardDescription>Paid invoices</CardDescription>
            <CardAction>
              <WalletCards aria-hidden="true" className="size-4 text-muted-foreground" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {isLoading ? '...' : formatCurrency(summary.paidSalesTotal)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Invoices
            </CardTitle>
            <CardDescription>Paid status</CardDescription>
            <CardAction>
              <Receipt aria-hidden="true" className="size-4 text-muted-foreground" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">
              {isLoading ? '...' : summary.paidInvoiceCount}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Low Stock
            </CardTitle>
            <CardDescription>Needs review</CardDescription>
            <CardAction>
              <AlertTriangle aria-hidden="true" className="size-4 text-muted-foreground" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">
              {isLoading ? '...' : summary.lowStockCount}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Latest completed invoices and payments.</CardDescription>
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
