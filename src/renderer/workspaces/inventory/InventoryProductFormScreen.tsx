import type {FormEvent} from 'react'
import {ArrowLeft, PackagePlus, PencilLine, Trash2} from 'lucide-react'
import {useTranslation} from 'react-i18next'
import {Button} from '@/renderer/components/ui/button'
import {Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle} from '@/renderer/components/ui/card'
import {Field, FieldDescription, FieldGroup, FieldLabel} from '@/renderer/components/ui/field'
import {Input} from '@/renderer/components/ui/input'
import {BaseSelect} from '@/renderer/components/ui/base-select'
import {cn} from '@/renderer/lib/utils'
import type {ProductCategorySummary, ProductSummary} from '@/shared/types/product'
import type {Feedback, ProductFormState} from './InventoryWorkspace.types'

type InventoryProductFormScreenProps = {
  categories: ProductCategorySummary[]
  editingProduct: ProductSummary | null
  formattedProductPrice: string
  isProductSaving: boolean
  pressableClass: string
  productFeedback: Feedback | null
  productForm: ProductFormState
  unitTypes: ProductFormState['unitType'][]
  onDeactivateProduct: (product: ProductSummary) => void
  onOpenAdjustment: (product: ProductSummary) => void
  onResetProductForm: () => void
  onSaveProduct: (event: FormEvent<HTMLFormElement>) => void
  onShowList: () => void
  onUpdateProductForm: (field: keyof ProductFormState, value: string) => void
}

export function InventoryProductFormScreen({
  categories,
  editingProduct,
  formattedProductPrice,
  isProductSaving,
  pressableClass,
  productFeedback,
  productForm,
  unitTypes,
  onDeactivateProduct,
  onOpenAdjustment,
  onResetProductForm,
  onSaveProduct,
  onShowList,
  onUpdateProductForm,
}: InventoryProductFormScreenProps) {
  const { t } = useTranslation()

  return (
    <Card className="min-h-0 overflow-hidden">
      <CardHeader>
        <CardTitle>{editingProduct ? 'Edit Product' : 'Create Product'}</CardTitle>
        <CardDescription>
          {editingProduct
            ? `Update ${editingProduct.name} for sales and purchasing.`
            : 'Add products here before receiving them in Record Purchase.'}
        </CardDescription>
        <CardAction>
          <Button type="button" variant="outline" size="sm" className={pressableClass} onClick={onShowList}>
            <ArrowLeft data-icon="inline-start" aria-hidden="true" />
            Products
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-y-auto">
        <form onSubmit={onSaveProduct}>
          <FieldGroup className="mx-auto max-w-3xl">
            <Field>
              <FieldLabel htmlFor="inventory-name">Product name</FieldLabel>
              <Input
                id="inventory-name"
                value={productForm.name}
                onChange={(event) => onUpdateProductForm('name', event.target.value)}
                placeholder="Brake Pad Front"
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="inventory-category">Category</FieldLabel>
              <BaseSelect
                id="inventory-category"
                value={productForm.categoryId}
                placeholder="Select category"
                options={categories.map((category) => ({
                  value: String(category.id),
                  label: category.name,
                }))}
                onValueChange={(value) => onUpdateProductForm('categoryId', value)}
              />
            </Field>

            <div className="grid gap-3 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="inventory-price">Sell price</FieldLabel>
                <Input
                  id="inventory-price"
                  type="number"
                  min="0"
                  step="1"
                  value={productForm.unitPrice}
                  onChange={(event) => onUpdateProductForm('unitPrice', event.target.value)}
                  placeholder="120000"
                  required
                />
                <FieldDescription className="tabular-nums" aria-live="polite">
                  {formattedProductPrice}
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="inventory-unit">Unit type</FieldLabel>
                <BaseSelect
                  id="inventory-unit"
                  value={productForm.unitType}
                  options={unitTypes.map((unitType) => ({
                    value: unitType,
                    label: unitType,
                  }))}
                  onValueChange={(value) => onUpdateProductForm('unitType', value as ProductFormState['unitType'])}
                />
              </Field>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="inventory-stock">{editingProduct ? t('inventory.adjustment.currentStock') : t('inventory.openingStock')}</FieldLabel>
                <Input
                  id="inventory-stock"
                  type="number"
                  min="0"
                  step="1"
                  value={productForm.stockQty}
                  onChange={(event) => onUpdateProductForm('stockQty', event.target.value)}
                  placeholder="0"
                  readOnly={Boolean(editingProduct)}
                  className={cn(editingProduct && 'bg-muted text-muted-foreground')}
                  required
                />
                {editingProduct ? (
                  <FieldDescription>{t('inventory.adjustment.editHint')}</FieldDescription>
                ) : null}
              </Field>

              <Field>
                <FieldLabel htmlFor="inventory-min-stock">Minimum stock</FieldLabel>
                <Input
                  id="inventory-min-stock"
                  type="number"
                  min="0"
                  step="1"
                  value={productForm.minStock}
                  onChange={(event) => onUpdateProductForm('minStock', event.target.value)}
                  placeholder="4"
                  required
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="inventory-description">Description <span className="text-muted-foreground">Optional</span></FieldLabel>
              <Input
                id="inventory-description"
                value={productForm.description}
                onChange={(event) => onUpdateProductForm('description', event.target.value)}
                placeholder="Short product note"
              />
            </Field>

            {productFeedback ? (
              <p className={cn('rounded-md px-3 py-2 text-sm text-pretty', productFeedback.tone === 'success' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive')} role={productFeedback.tone === 'error' ? 'alert' : 'status'}>
                {productFeedback.message}
              </p>
            ) : null}

            <div className="flex gap-2">
              <Button type="submit" className={cn('h-10 flex-1', pressableClass)} disabled={isProductSaving}>
                <PackagePlus data-icon="inline-start" aria-hidden="true" />
                {isProductSaving ? 'Saving...' : editingProduct ? 'Save Changes' : 'Create'}
              </Button>
              {editingProduct ? (
                <Button type="button" variant="outline" className={cn('h-10', pressableClass)} onClick={() => onOpenAdjustment(editingProduct)}>
                  <PencilLine data-icon="inline-start" aria-hidden="true" />
                  {t('inventory.adjustment.action')}
                </Button>
              ) : null}
              <Button type="button" variant="outline" className={cn('h-10', pressableClass)} onClick={editingProduct ? onShowList : onResetProductForm}>
                {editingProduct ? 'Cancel' : 'Clear'}
              </Button>
            </div>

            {editingProduct ? (
              <Button
                type="button"
                variant="destructive"
                className={cn('h-10 w-full', pressableClass)}
                onClick={() => onDeactivateProduct(editingProduct)}
                disabled={isProductSaving}
              >
                <Trash2 data-icon="inline-start" aria-hidden="true" />
                Delete Product
              </Button>
            ) : null}
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
