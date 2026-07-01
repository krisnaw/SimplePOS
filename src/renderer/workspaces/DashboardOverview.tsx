import { useEffect, useState } from 'react'
import { AlertTriangle, ClipboardList, Receipt, UserRound, WalletCards } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle} from '@/renderer/components/ui/card'
import { formatCurrency, formatTime, formatPaymentMethod } from '@/renderer/lib/formatters'
import type { AuthenticatedUser } from '@/shared/types/user'
import type { DashboardSummary } from './DashboardOverview.types'


const emptySummary: DashboardSummary = {
  paidSalesTotal: 0,
  paidInvoiceCount: 0,
  lowStockCount: 0,
  openWorkOrderCount: 0,
  inProgressWorkOrderCount: 0,
  completedWorkOrderCount: 0,
  recentTransactions: [],
}

export function DashboardOverview({ user }: { user: AuthenticatedUser }) {
  const { t } = useTranslation()
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
              {t('dashboard.user')}
            </CardTitle>
            <CardDescription>{t('dashboard.currentSession')}</CardDescription>
            <CardAction>
              <UserRound aria-hidden="true" className="size-4 text-muted-foreground" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col">
              <span className="truncate text-pretty">@{user.username}</span>
              <span className="capitalize text-muted-foreground text-pretty">{user.role}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {t('dashboard.workOrders')}
            </CardTitle>
            <CardDescription>{t('dashboard.activeJobs')}</CardDescription>
            <CardAction>
              <ClipboardList aria-hidden="true" className="size-4 text-muted-foreground" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">
              {isLoading ? '...' : summary.openWorkOrderCount + summary.inProgressWorkOrderCount}
            </p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {t('dashboard.readyForCheckout', { count: summary.completedWorkOrderCount })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>

              {t('dashboard.sales')}
            </CardTitle>
            <CardDescription>{t('dashboard.paidInvoices')}</CardDescription>
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
              {t('dashboard.invoices')}
            </CardTitle>
            <CardDescription>{t('dashboard.paidStatus')}</CardDescription>
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
              {t('dashboard.lowStock')}
            </CardTitle>
            <CardDescription>{t('dashboard.needsReview')}</CardDescription>
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
          <CardTitle>{t('dashboard.recentTransactions')}</CardTitle>
          <CardDescription>{t('dashboard.transactionsHint')}</CardDescription>
        </CardHeader>
        <CardContent>
          {summary.recentTransactions.length === 0 ? (
            <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed bg-background p-5 text-center">
              <p className="text-sm text-muted-foreground text-pretty">{t('dashboard.noActivity')}</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border bg-background">
              <div className="grid grid-cols-[minmax(0,1fr)_100px_120px_72px] gap-3 border-b bg-muted/70 px-3 py-2 text-xs font-medium text-muted-foreground">
                <span>{t('dashboard.table.invoice')}</span>
                <span>{t('dashboard.table.payment')}</span>
                <span className="text-right">{t('dashboard.table.total')}</span>
                <span className="text-right">{t('dashboard.table.time')}</span>
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
