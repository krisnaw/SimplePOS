import {useTranslation} from 'react-i18next'
import {Button} from '@/renderer/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/renderer/components/ui/dialog'
import {Field, FieldDescription, FieldError, FieldLabel} from '@/renderer/components/ui/field'
import {Input} from '@/renderer/components/ui/input'
import {formatCurrency} from '@/renderer/lib/formatters'
import type {SaleLineItem} from './SalesWorkspace.types'

const pressableClass =
  'transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out active:scale-[0.96]'

type PriceOverrideDialogProps = {
  item: SaleLineItem | null
  draft: string
  error: string
  onDraftChange: (draft: string) => void
  onCancel: () => void
  onSave: (item: SaleLineItem) => Promise<void>
}

export function PriceOverrideDialog({
  item,
  draft,
  error,
  onDraftChange,
  onCancel,
  onSave,
}: PriceOverrideDialogProps) {
  const {t} = useTranslation()
  const draftUnitPrice = Number(draft)
  const resultingLineTotal = draft.trim() && Number.isFinite(draftUnitPrice)
    ? draftUnitPrice * (item?.quantity ?? 0)
    : 0

  return (
    <Dialog
      open={Boolean(item)}
      onOpenChange={(open) => {
        if (!open) onCancel()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            if (item) void onSave(item)
          }}
        >
          <DialogHeader>
            <DialogTitle>{t('sales.overrideUnitPriceTitle')}</DialogTitle>
            <DialogDescription>
              {item ? t('sales.overrideUnitPriceDescription', {name: item.name}) : null}
            </DialogDescription>
          </DialogHeader>

          {item ? (
            <div className="my-5 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/60 p-3 text-sm">
                <div>
                  <p className="text-muted-foreground">{t('sales.catalogUnitPrice')}</p>
                  <p className="mt-1 font-medium tabular-nums">{formatCurrency(item.basePrice)}</p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground">{t('sales.qty')}</p>
                  <p className="mt-1 font-medium tabular-nums">{item.quantity}</p>
                </div>
              </div>

              <Field data-invalid={Boolean(error)}>
                <FieldLabel htmlFor="sale-unit-price">{t('sales.unitPrice')}</FieldLabel>
                <Input
                  id="sale-unit-price"
                  type="number"
                  min={item.type === 'product' ? item.basePrice : 0}
                  step="1"
                  value={draft}
                  onChange={(event) => onDraftChange(event.target.value)}
                  className="tabular-nums"
                  aria-invalid={Boolean(error)}
                  autoFocus
                />
                <FieldDescription className="flex items-center justify-between gap-3">
                  <span>{t('sales.resultingLineTotal')}</span>
                  <span className="font-medium text-foreground tabular-nums">
                    {formatCurrency(resultingLineTotal)}
                  </span>
                </FieldDescription>
                {error ? <FieldError>{error}</FieldError> : null}
              </Field>
            </div>
          ) : null}

          <DialogFooter className="mx-0 mb-0 border-t-0 bg-transparent p-0">
            <Button type="button" variant="outline" className={pressableClass} onClick={onCancel}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" className={pressableClass}>
              {t('sales.saveUnitPrice')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
