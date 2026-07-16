import { Package, Plus, Wrench } from 'lucide-react'
import { Button } from '@/renderer/components/ui/button'
import { formatCurrency } from '@/renderer/lib/formatters'
import { cn } from '@/renderer/lib/utils'
import { ProductCategoryBadge } from '../inventory/ProductCategoryBadge'

type SalesCatalogListItemProps = {
  itemType: 'product' | 'service'
  typeLabel: string
  name: string
  category?: string
  description?: string
  price: number
  inventoryLabel?: string
  addLabel: string
  disabled?: boolean
  onAdd: () => void
}

const pressableButtonClass =
  'transition-[transform,box-shadow] duration-150 ease-out active:scale-[0.96] active:translate-y-0'

export function SalesCatalogListItem({
  itemType,
  typeLabel,
  name,
  category,
  description,
  price,
  inventoryLabel,
  addLabel,
  disabled = false,
  onAdd,
}: SalesCatalogListItemProps) {
  const Icon = itemType === 'service' ? Wrench : Package

  return (
    <div className="flex min-h-[92px] items-center justify-between gap-3 overflow-hidden rounded-lg border bg-background p-3 text-left shadow-sm transition-[box-shadow] duration-150 ease-out hover:shadow-border-hover">
      <div className="min-w-0 flex-1">
        {itemType === 'product' && category ? (
          <ProductCategoryBadge name={category} />
        ) : (
          <span
            className={cn(
              'inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 tabular-nums',
              itemType === 'service'
                ? 'bg-amber-500/10 text-amber-700 ring-amber-500/20'
                : 'bg-sky-500/10 text-sky-700 ring-sky-500/20',
            )}
          >
            <Icon className="size-3.5" aria-hidden="true" />
            {typeLabel}
          </span>
        )}
        <div className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="min-w-0 truncate text-sm font-medium text-balance">{name}</span>
        </div>
        {description ? (
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground text-pretty">{description}</p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <div className="hidden min-w-24 flex-col items-end gap-0.5 sm:flex">
          <span className="text-sm font-semibold tabular-nums">{formatCurrency(price)}</span>
          {inventoryLabel ? (
            <span className="text-sm font-medium text-muted-foreground tabular-nums">
              {inventoryLabel}
            </span>
          ) : null}
        </div>
        <Button
          type="button"
          disabled={disabled}
          className={pressableButtonClass}
          onClick={onAdd}
        >
          <Plus data-icon="inline-start" aria-hidden="true" />
          {addLabel}
        </Button>
      </div>
    </div>
  )
}
