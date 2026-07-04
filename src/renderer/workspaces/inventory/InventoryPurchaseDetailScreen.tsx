import {ArrowLeft, PencilLine, WalletCards} from 'lucide-react'
import {Button} from '@/renderer/components/ui/button'
import {Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle} from '@/renderer/components/ui/card'
import {formatCurrency, formatDate} from '@/renderer/lib/formatters'
import {cn} from '@/renderer/lib/utils'
import type {PurchaseDetail} from '@/shared/types/purchase'
import type {Feedback} from './InventoryWorkspace.types'
import {InvoiceBadge, PaymentBadge} from './InventoryPurchaseBadges'

type InventoryPurchaseDetailScreenProps = {
  feedback: Feedback | null
  pressableClass: string
  purchase: PurchaseDetail
  onEditInvoiceDetails: () => void
  onMarkPaid: () => void
  onShowList: () => void
}

export function InventoryPurchaseDetailScreen({
  feedback,
  pressableClass,
  purchase,
  onEditInvoiceDetails,
  onMarkPaid,
  onShowList,
}: InventoryPurchaseDetailScreenProps) {
  return (
    <Card className="min-h-0 overflow-hidden">
      <CardHeader>
        <CardTitle className="truncate">{purchase.purchaseNumber}</CardTitle>
        <CardDescription className="truncate">{purchase.supplierName}</CardDescription>
        <CardAction>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" className={pressableClass} onClick={onShowList}>
              <ArrowLeft data-icon="inline-start" aria-hidden="true" />
              Purchases
            </Button>
            <InvoiceBadge status={purchase.invoiceStatus} />
            <PaymentBadge status={purchase.paymentStatus} />
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-md bg-muted p-3">
            <p className="text-xs text-muted-foreground">Supplier invoice</p>
            <p className="mt-1 truncate font-medium">{purchase.supplierInvoiceNumber ?? 'Pending invoice'}</p>
          </div>
          <div className="rounded-md bg-muted p-3">
            <p className="text-xs text-muted-foreground">Invoice date</p>
            <p className="mt-1 font-medium tabular-nums">{formatDate(purchase.invoiceDate)}</p>
          </div>
          <div className="rounded-md bg-muted p-3">
            <p className="text-xs text-muted-foreground">Due date</p>
            <p className="mt-1 font-medium tabular-nums">{formatDate(purchase.dueDate)}</p>
          </div>
          <div className="rounded-md bg-muted p-3">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="mt-1 font-medium tabular-nums">{formatCurrency(purchase.total)}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">Received products</p>
          {purchase.items.map((item) => (
            <div key={item.id} className="rounded-md bg-muted/70 p-3">
              <div className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{item.productName}</span>
                  <span className="block truncate text-xs text-muted-foreground">{item.sku}</span>
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums">{formatCurrency(item.lineTotal)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground tabular-nums">{item.quantity} x {formatCurrency(item.unitCost)}</p>
            </div>
          ))}
        </div>

        {purchase.notes ? (
          <div>
            <p className="text-sm font-semibold">Notes</p>
            <p className="mt-1 text-sm text-muted-foreground text-pretty">{purchase.notes}</p>
          </div>
        ) : null}

        {feedback ? (
          <p className={cn('rounded-md px-3 py-2 text-sm text-pretty', feedback.tone === 'success' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive')} role={feedback.tone === 'error' ? 'alert' : 'status'}>
            {feedback.message}
          </p>
        ) : null}

        <div className="mt-auto flex gap-2">
          <Button type="button" variant="outline" className={cn('flex-1', pressableClass)} onClick={onEditInvoiceDetails}>
            <PencilLine data-icon="inline-start" aria-hidden="true" />
            Edit Invoice
          </Button>
          {purchase.paymentStatus === 'unpaid' ? (
            <Button type="button" className={cn('flex-1', pressableClass)} onClick={onMarkPaid}>
              <WalletCards data-icon="inline-start" aria-hidden="true" />
              Mark Paid
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
