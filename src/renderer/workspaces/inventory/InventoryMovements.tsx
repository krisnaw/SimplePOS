import {ClipboardList, Loader2} from 'lucide-react'
import {useTranslation} from 'react-i18next'
import {Badge} from '@/renderer/components/ui/badge'
import {Button} from '@/renderer/components/ui/button'
import {BaseSelect} from '@/renderer/components/ui/base-select'
import {Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle} from '@/renderer/components/ui/card'
import {Input} from '@/renderer/components/ui/input'
import {formatDateTime} from '@/renderer/lib/formatters'
import type {ProductSummary} from '@/shared/types/product'
import type {StockMovementListResult, StockMovementType} from '@/shared/types/stock-movement'
import type {MovementFilters} from './InventoryWorkspace.types'

type InventoryMovementsViewProps = {
  filters: MovementFilters
  isLoading: boolean
  isMovementsLoading: boolean
  movementPage: number
  movementPageSize: number
  movements: StockMovementListResult
  pressableClass: string
  products: ProductSummary[]
  onFiltersChange: (next: Partial<MovementFilters>) => void
  onPageChange: (nextPage: number | ((page: number) => number)) => void
  onRefresh: () => void
}

function movementBadgeVariant(type: StockMovementType): 'secondary' | 'outline' | 'destructive' {
  if (type === 'sale') return 'destructive'
  if (type === 'opening') return 'outline'
  return 'secondary'
}

export function InventoryMovements({
  filters,
  isLoading,
  isMovementsLoading,
  movementPage,
  movementPageSize,
  movements,
  pressableClass,
  products,
  onFiltersChange,
  onPageChange,
  onRefresh,
}: InventoryMovementsViewProps) {
  const { t } = useTranslation()
  const movementNet = movements.totalIn - movements.totalOut
  const movementLastPage = Math.max(0, Math.ceil(movements.total / movementPageSize) - 1)

  function movementTypeLabel(type: StockMovementType): string {
    return t(`inventory.movements.types.${type}`)
  }

  return (
    <Card className="min-h-0 flex-1 overflow-hidden">
      <CardHeader>
        <CardTitle>{t('inventory.movements.title')}</CardTitle>
        <CardDescription>
          Review stock changes across purchases, sales, adjustments, and opening balances.
        </CardDescription>
        <CardAction>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={pressableClass}
            onClick={onRefresh}
          >
            <ClipboardList data-icon="inline-start" aria-hidden="true" />
            {t('inventory.movements.refresh')}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
        <div className="w-full shrink-0 sm:max-w-xs">
          <BaseSelect
            value={filters.productId}
            ariaLabel={t('inventory.movements.productFilter')}
            placeholder={t('inventory.movements.allProducts')}
            options={[
              { value: '', label: t('inventory.movements.allProducts') },
              ...products.map((product) => ({ value: String(product.id), label: product.name })),
            ]}
            onValueChange={(value) => onFiltersChange({ productId: value })}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-hidden rounded-lg border bg-background">
        {isLoading ? (
          <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" aria-hidden="true" />
            <p className="text-sm">Loading purchasing data...</p>
          </div>
        ) : (
          <div className="flex h-full min-h-0 flex-col">
            <div className="grid shrink-0 gap-2 border-b bg-background p-3 sm:grid-cols-3">
              {[
                { label: t('inventory.movements.stockIn'), value: movements.totalIn },
                { label: t('inventory.movements.stockOut'), value: movements.totalOut },
                { label: t('inventory.movements.netChange'), value: movementNet },
              ].map((item) => (
                <div key={item.label} className="rounded-lg bg-muted/70 px-3 py-2">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">{item.value}</p>
                </div>
              ))}
            </div>
            {isMovementsLoading ? (
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="size-6 animate-spin" aria-hidden="true" />
                <p className="text-sm">{t('inventory.movements.loading')}</p>
              </div>
            ) : movements.items.length === 0 ? (
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
                <ClipboardList className="size-7 text-muted-foreground" aria-hidden="true" />
                <p className="font-medium">{t('inventory.movements.emptyTitle')}</p>
                <p className="text-sm text-muted-foreground text-pretty">{t('inventory.movements.emptyHint')}</p>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="grid min-w-245 shrink-0 grid-cols-[135px_minmax(0,1fr)_110px_minmax(0,1fr)_90px_90px_100px_120px] gap-3 border-b bg-muted/95 px-3 py-2 text-xs font-medium text-muted-foreground backdrop-blur">
                  <span>{t('inventory.movements.table.date')}</span>
                  <span>{t('inventory.movements.table.product')}</span>
                  <span>{t('inventory.movements.table.type')}</span>
                  <span>{t('inventory.movements.table.reference')}</span>
                  <span className="text-right">{t('inventory.movements.table.in')}</span>
                  <span className="text-right">{t('inventory.movements.table.out')}</span>
                  <span className="text-right">{t('inventory.movements.table.balance')}</span>
                  <span>{t('inventory.movements.table.user')}</span>
                </div>
                <div className="min-h-0 flex-1 overflow-auto">
                  <div className="min-w-245 divide-y">
                    {movements.items.map((movement) => (
                      <div
                        key={movement.id}
                        className="grid min-h-14 grid-cols-[135px_minmax(0,1fr)_110px_minmax(0,1fr)_90px_90px_100px_120px] items-center gap-3 px-3 py-2 text-sm"
                      >
                        <span className="text-xs text-muted-foreground tabular-nums">{formatDateTime(movement.createdAt)}</span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{movement.productName}</span>
                        </span>
                        <Badge variant={movementBadgeVariant(movement.movementType)}>
                          {movementTypeLabel(movement.movementType)}
                        </Badge>
                        <span className="min-w-0">
                          <span className="block truncate">{movement.referenceNumber ?? t('inventory.movements.noReference')}</span>
                          {movement.reason ? <span className="block truncate text-xs text-muted-foreground">{movement.reason}</span> : null}
                        </span>
                        <span className="text-right tabular-nums">
                          {movement.quantityDelta > 0 ? `${movement.quantityDelta} ${movement.unitType}` : '—'}
                        </span>
                        <span className="text-right tabular-nums">
                          {movement.quantityDelta < 0 ? `${Math.abs(movement.quantityDelta)} ${movement.unitType}` : '—'}
                        </span>
                        <span className="text-right font-medium tabular-nums">{movement.balanceAfter} {movement.unitType}</span>
                        <span className="truncate text-xs text-muted-foreground">{movement.createdByName ?? t('system.label')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div className="flex shrink-0 items-center justify-between gap-3 border-t bg-background px-3 py-2 text-xs text-muted-foreground">
              <span className="tabular-nums">
                {t('inventory.movements.pagination', {
                  start: movements.total === 0 ? 0 : movementPage * movementPageSize + 1,
                  end: Math.min(movements.total, (movementPage + 1) * movementPageSize),
                  total: movements.total,
                })}
              </span>
              <span className="flex gap-2">
                <Button type="button" variant="outline" size="sm" className={pressableClass} disabled={movementPage === 0} onClick={() => onPageChange((page) => Math.max(0, page - 1))}>
                  {t('inventory.movements.previous')}
                </Button>
                <Button type="button" variant="outline" size="sm" className={pressableClass} disabled={movementPage >= movementLastPage} onClick={() => onPageChange((page) => Math.min(movementLastPage, page + 1))}>
                  {t('inventory.movements.next')}
                </Button>
              </span>
            </div>
          </div>
        )}
        </div>
      </CardContent>
    </Card>
  )
}
