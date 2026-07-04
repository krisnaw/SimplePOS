import {Loader2, Plus, ReceiptText, Search, X} from 'lucide-react'
import {Button} from '@/renderer/components/ui/button'
import {Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle} from '@/renderer/components/ui/card'
import {Input} from '@/renderer/components/ui/input'
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/renderer/components/ui/table'
import {formatCurrency, formatDate} from '@/renderer/lib/formatters'
import type {InventoryView} from './InventoryWorkspace.types'
import type {PurchaseSummary} from '@/shared/types/purchase'
import {InvoiceBadge, PaymentBadge} from './InventoryPurchaseBadges'

type InventoryPurchaseListProps = {
  filteredPurchases: PurchaseSummary[]
  isLoading: boolean
  pressableClass: string
  search: string
  view: InventoryView
  onClearSearch: () => void
  onSearchChange: (value: string) => void
  onShowPurchase: (id: number) => void
  onStartNewPurchase: () => void
}

export function InventoryPurchaseList({
  filteredPurchases,
  isLoading,
  pressableClass,
  search,
  view,
  onClearSearch,
  onSearchChange,
  onShowPurchase,
  onStartNewPurchase,
}: InventoryPurchaseListProps) {
  return (
    <Card className="h-full min-h-0">
      <CardHeader>
        <CardTitle>Purchase</CardTitle>
        <CardDescription>
          Receive supplier stock and track paid or unpaid invoices.
        </CardDescription>
        <CardAction>
          <Button type="button" size="sm" className={pressableClass} onClick={onStartNewPurchase}>
            <Plus data-icon="inline-start" aria-hidden="true" />
            Record Purchase
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
        <div className="relative min-w-0 shrink-0">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search purchase, supplier, or invoice"
            className="h-10 pl-10 pr-10"
          />
          {search ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={onClearSearch}
              className="absolute inset-y-0 right-0 flex size-10 items-center justify-center rounded-md text-muted-foreground transition-[background-color,color,transform] duration-150 ease-out hover:bg-muted hover:text-foreground active:scale-[0.96]"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 rounded-lg border bg-background">
          <Table containerClassName="h-full overflow-auto" className="min-w-[720px]">
            <TableHeader>
              <TableRow>
                <TableHead className="sticky top-0 z-10 rounded-tl-lg bg-muted/95 backdrop-blur">Purchase</TableHead>
                <TableHead className="sticky top-0 z-10 bg-muted/95 backdrop-blur">Supplier invoice</TableHead>
                <TableHead className="sticky top-0 z-10 bg-muted/95 text-right backdrop-blur">Total</TableHead>
                <TableHead className="sticky top-0 z-10 bg-muted/95 backdrop-blur">Invoice</TableHead>
                <TableHead className="sticky top-0 z-10 bg-muted/95 backdrop-blur">Payment</TableHead>
                <TableHead className="sticky top-0 z-10 rounded-tr-lg bg-muted/95 backdrop-blur">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="size-6 animate-spin" aria-hidden="true" />
                      <p className="text-sm">Loading purchasing data...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredPurchases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <div className="flex min-h-48 flex-col items-center justify-center gap-2 p-6 text-center">
                      <ReceiptText className="size-7 text-muted-foreground" aria-hidden="true" />
                      <p className="font-medium">{view === 'pending' ? 'No pending invoices' : view === 'unpaid' ? 'No unpaid invoices' : 'No purchases yet'}</p>
                      <p className="text-sm text-muted-foreground text-pretty">
                        {view === 'pending' ? 'All received goods have supplier invoice details.' : view === 'unpaid' ? 'All supplier invoices are paid.' : 'Record a purchase to receive inventory.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : null}

              {!isLoading && filteredPurchases.map((purchase) => (
                <TableRow
                  key={purchase.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onShowPurchase(purchase.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onShowPurchase(purchase.id)
                    }
                  }}
                  className="cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <TableCell>
                    <span className="block truncate font-medium">{purchase.purchaseNumber}</span>
                    <span className="block truncate text-xs text-muted-foreground">{purchase.supplierName}</span>
                  </TableCell>
                  <TableCell>
                    <span className="block truncate">{purchase.supplierInvoiceNumber ?? 'Pending invoice'}</span>
                    <span className="block text-xs text-muted-foreground">{purchase.itemCount} product{purchase.itemCount === 1 ? '' : 's'}</span>
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{formatCurrency(purchase.total)}</TableCell>
                  <TableCell>
                    <InvoiceBadge status={purchase.invoiceStatus} />
                  </TableCell>
                  <TableCell>
                    <PaymentBadge status={purchase.paymentStatus} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground tabular-nums">{formatDate(purchase.invoiceDate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
