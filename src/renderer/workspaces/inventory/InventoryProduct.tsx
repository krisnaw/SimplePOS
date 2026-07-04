import {useEffect, useMemo, useState} from 'react'
import {Loader2, PackagePlus, Trash2} from 'lucide-react'
import {useTranslation} from 'react-i18next'
import {Button} from '@/renderer/components/ui/button'
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from '@/renderer/components/ui/card'
import {Input} from '@/renderer/components/ui/input'
import {Label} from '@/renderer/components/ui/label'
import {BaseSelect} from '@/renderer/components/ui/base-select'
import {cn} from '@/renderer/lib/utils'
import {formatCurrency} from '@/renderer/lib/formatters'
import type {ProductSummary, ProductCategorySummary} from '@/shared/types/product'
import type {ProductFormState} from './InventoryWorkspace.types'

const emptyForm: ProductFormState = {
  sku: '',
  barcode: '',
  name: '',
  description: '',
  categoryId: '',
  unitPrice: '',
  unitType: 'piece',
  stockQty: '',
  minStock: '',
}

const unitTypes: ProductFormState['unitType'][] = ['piece', 'litre', 'set', 'box']
const productTableGrid =
  'grid-cols-[minmax(0,1.35fr)_minmax(0,0.75fr)_104px_88px_84px]'
const inventoryTabs = ['Product', 'Purchase', 'Moving'] as const

function isLowStock(product: ProductSummary): boolean {
  return product.stockQty <= product.minStock
}

function toProductForm(product: ProductSummary): ProductFormState {
  return {
    sku: product.sku,
    barcode: product.barcode ?? '',
    name: product.name,
    description: product.description ?? '',
    categoryId: product.categoryId ? String(product.categoryId) : '',
    unitPrice: String(product.unitPrice),
    unitType: product.unitType,
    stockQty: String(product.stockQty),
    minStock: String(product.minStock),
  }
}

export function InventoryProduct() {
  const {t} = useTranslation()
  const [products, setProducts] = useState<ProductSummary[]>([])
  const [categories, setCategories] = useState<ProductCategorySummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [form, setForm] = useState<ProductFormState>(emptyForm)
  const [editingProduct, setEditingProduct] = useState<ProductSummary | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadInventory() {
      setIsLoading(true)
      const [productList, categoryList] = await Promise.all([
        window.simplepos?.products.list(),
        window.simplepos?.categories.list(),
      ])

      if (!isMounted) return

      if (productList) setProducts(productList)
      if (categoryList) {
        setCategories(categoryList)
        if (categoryList[0]) setForm((f) => ({...f, categoryId: String(categoryList[0].id)}))
      }

      setIsLoading(false)
    }

    void loadInventory().catch(() => {
      if (isMounted) setIsLoading(false)
    })

    return () => {
      isMounted = false
    }
  }, [])

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    if (!query) return products

    return products.filter((product) =>
      [product.name, product.sku, product.barcode ?? ''].some((value) =>
        value.toLowerCase().includes(query),
      ),
    )
  }, [products, searchQuery])

  const lowStockCount = products.filter(isLowStock).length
  const totalUnits = products.reduce((total, p) => total + p.stockQty, 0)
  const inventoryValue = products.reduce((total, p) => total + p.stockQty * p.unitPrice, 0)

  function updateForm<K extends keyof ProductFormState>(field: K, value: ProductFormState[K]) {
    setForm((f) => ({...f, [field]: value}))
  }

  function resetForm() {
    setForm((f) => ({...emptyForm, categoryId: f.categoryId}))
    setEditingProduct(null)
    setMessage('')
  }

  function handleEdit(product: ProductSummary) {
    setEditingProduct(product)
    setForm(toProductForm(product))
    setMessage('')
  }

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()

    const unitPrice = Number(form.unitPrice)
    const stockQty = Number(form.stockQty)
    const minStock = Number(form.minStock)

    if (!form.sku.trim() || !form.name.trim() || unitPrice < 0 || stockQty < 0 || minStock < 0) {
      setMessage(t('inventory.messages.invalidProduct'))
      return
    }

    setIsSubmitting(true)

    const payload = {
      sku: form.sku.trim(),
      barcode: form.barcode.trim() || null,
      name: form.name.trim(),
      description: form.description.trim() || null,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      unitPrice,
      unitType: form.unitType,
      stockQty,
      minStock,
    }

    const result = editingProduct
      ? await window.simplepos?.products.update({
        ...payload,
        id: editingProduct.id,
        isActive: editingProduct.isActive,
      })
      : await window.simplepos?.products.create(payload)

    setIsSubmitting(false)

    if (!result) {
      setMessage(t('common.unableToReachDb'))
      return
    }

    if (!result.ok) {
      setMessage(result.message)
      return
    }

    setMessage(result.message)
    resetForm()
    void window.simplepos?.products.list().then(setProducts)
  }

  async function handleDeactivate(product: ProductSummary) {
    await window.simplepos?.products.update({...product, isActive: false})
    void window.simplepos?.products.list().then(setProducts)
    if (editingProduct?.id === product.id) resetForm()
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-3 overflow-hidden p-1">


      <div
        role="tablist"
        aria-label="Inventory sections"
        className="flex shrink-0 items-center gap-1 rounded-xl bg-muted p-1 shadow-border"
      >
        {inventoryTabs.map((tab, index) => {
          const isActive = index === 0

          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={tab}
              disabled={!isActive}
              className={cn(
                'flex h-9 min-w-0 flex-1 items-center justify-center rounded-lg px-3 text-sm font-medium transition-[background-color,color,transform,box-shadow] duration-150 ease-out',
                'disabled:cursor-default disabled:opacity-100',
                isActive
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab}
            </button>
          )
        })}
      </div>

      <div className="grid min-h-0 min-w-0 flex-1 gap-3 overflow-hidden xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-h-0 min-w-0 flex-col gap-3 overflow-hidden">
          <div className="grid shrink-0 gap-3 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>{t('inventory.totalItems')}</CardTitle>
                <CardDescription>{t('inventory.activeSkus')}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums">{products.length}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('inventory.stockUnits')}</CardTitle>
                <CardDescription>{t('inventory.availableQty')}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums">{totalUnits}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('inventory.lowStock')}</CardTitle>
                <CardDescription>{t('inventory.atMinimum')}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums">{lowStockCount}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="min-h-0 flex-1 overflow-hidden">
            <CardHeader>
              <CardTitle>{t('inventory.productList')}</CardTitle>
              <CardDescription>{t('inventory.stockValueHint', {value: formatCurrency(inventoryValue)})}</CardDescription>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden pt-1">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('inventory.searchPlaceholder')}
                className="shrink-0"
              />
              <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border bg-background">
                <div
                  className={cn(
                    'sticky top-0 z-10 grid shrink-0 items-center gap-3 border-b bg-muted/95 px-3 py-2 text-xs font-medium text-muted-foreground backdrop-blur',
                    'rounded-t-[calc(var(--radius-lg)-1px)]',
                    productTableGrid,
                  )}
                >
                  <span>{t('inventory.table.product')}</span>
                  <span>{t('inventory.table.category')}</span>
                  <span className="text-right">{t('inventory.table.price')}</span>
                  <span>{t('inventory.table.stock')}</span>
                  <span>{t('inventory.table.status')}</span>
                </div>

                <div className="divide-y">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                      <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true"/>
                      <p className="text-sm text-muted-foreground">{t('inventory.loading')}</p>
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="px-3 py-6 text-sm text-muted-foreground">
                      {products.length === 0 ? t('inventory.noProducts') : t('inventory.noMatchingProducts')}
                    </div>
                  ) : null}

                  {!isLoading && filteredProducts.map((product) => {
                    const categoryName = categories.find((c) => c.id === product.categoryId)?.name ?? '—'
                    const lowStock = isLowStock(product)

                    return (
                      <div
                        key={product.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleEdit(product)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            handleEdit(product)
                          }
                        }}
                        className={cn(
                          'grid min-h-12 w-full cursor-pointer items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                          productTableGrid,
                          editingProduct?.id === product.id && 'bg-muted/60',
                        )}
                      >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{product.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{product.sku}</span>
                      </span>
                        <span className="min-w-0 truncate">{categoryName}</span>
                        <span className="truncate text-right tabular-nums">{formatCurrency(product.unitPrice)}</span>
                        <span className="truncate tabular-nums">
                        {product.stockQty} {product.unitType}
                      </span>
                        <span
                          className={cn(
                            'w-fit rounded-full px-2 py-0.5 text-[10px] font-medium tabular-nums',
                            lowStock
                              ? 'bg-destructive/10 text-destructive'
                              : 'bg-emerald-500/15 text-emerald-700',
                          )}
                        >
                        {lowStock ? t('inventory.lowStockStatus') : t('inventory.inStock')}
                      </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="min-h-0 overflow-hidden">
          <CardHeader>
            <CardTitle>
              {editingProduct ? t('inventory.editProduct') : t('inventory.createProduct')}
            </CardTitle>
            <CardDescription>
              {editingProduct
                ? t('inventory.editHint', {name: editingProduct.name})
                : t('inventory.createHint')}
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-y-auto">
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="inventory-sku">{t('inventory.sku')}</Label>
                <Input
                  id="inventory-sku"
                  value={form.sku}
                  onChange={(e) => updateForm('sku', e.target.value)}
                  placeholder="BRK-PAD-FRONT"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="inventory-name">{t('inventory.productName')}</Label>
                <Input
                  id="inventory-name"
                  value={form.name}
                  onChange={(e) => updateForm('name', e.target.value)}
                  placeholder="Brake Pad Front"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="inventory-barcode">{t('inventory.barcode')} <span
                  className="text-muted-foreground">{t('inventory.optional')}</span></Label>
                <Input
                  id="inventory-barcode"
                  value={form.barcode}
                  onChange={(e) => updateForm('barcode', e.target.value)}
                  placeholder="8991234567890"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="inventory-category">{t('inventory.table.category')}</Label>
                <BaseSelect
                  id="inventory-category"
                  value={form.categoryId}
                  ariaLabel={t('inventory.table.category')}
                  placeholder={t('inventory.noCategory')}
                  options={[
                    {value: '', label: t('inventory.noCategory')},
                    ...categories.map((category) => ({
                      value: String(category.id),
                      label: category.name,
                    })),
                  ]}
                  onValueChange={(value) => updateForm('categoryId', value)}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="inventory-price">{t('inventory.unitPrice')}</Label>
                  <Input
                    id="inventory-price"
                    type="number"
                    min="0"
                    value={form.unitPrice}
                    onChange={(e) => updateForm('unitPrice', e.target.value)}
                    placeholder="120000"
                    required
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="inventory-unit">{t('inventory.unitType')}</Label>
                  <BaseSelect
                    id="inventory-unit"
                    value={form.unitType}
                    ariaLabel={t('inventory.unitType')}
                    options={unitTypes.map((unitType) => ({
                      value: unitType,
                      label: t(`inventory.units.${unitType}`),
                    }))}
                    onValueChange={(value) => updateForm('unitType', value as ProductFormState['unitType'])}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="inventory-stock">{t('inventory.openingStock')}</Label>
                  <Input
                    id="inventory-stock"
                    type="number"
                    min="0"
                    value={form.stockQty}
                    onChange={(e) => updateForm('stockQty', e.target.value)}
                    placeholder="12"
                    required
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="inventory-min-stock">{t('inventory.minimumStock')}</Label>
                  <Input
                    id="inventory-min-stock"
                    type="number"
                    min="0"
                    value={form.minStock}
                    onChange={(e) => updateForm('minStock', e.target.value)}
                    placeholder="4"
                    required
                  />
                </div>
              </div>

              {message ? (
                <p className="text-sm text-muted-foreground" role="status">
                  {message}
                </p>
              ) : null}

              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  <PackagePlus data-icon="inline-start" aria-hidden="true"/>
                  {isSubmitting ? (editingProduct ? t('common.saving') : t('inventory.creating')) : editingProduct ? t('common.saveChanges') : t('common.create')}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  {editingProduct ? t('common.cancel') : t('common.clear')}
                </Button>
              </div>
            </form>
          </CardContent>
          {editingProduct ? (
            <CardFooter className="border-t">
              <Button
                type="button"
                variant="destructive"
                className="w-full"
                onClick={() => void handleDeactivate(editingProduct)}
              >
                <Trash2 data-icon="inline-start" aria-hidden="true"/>
                {t('inventory.deleteProduct')}
              </Button>
            </CardFooter>
          ) : null}
        </Card>
      </div>
    </div>
  )
}
