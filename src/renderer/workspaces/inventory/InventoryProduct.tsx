import {useEffect, useMemo, useState} from 'react'
import {Loader2, PackagePlus, Plus, Trash2} from 'lucide-react'
import {useTranslation} from 'react-i18next'
import {Button} from '@/renderer/components/ui/button'
import {Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from '@/renderer/components/ui/card'
import {Input} from '@/renderer/components/ui/input'
import {Label} from '@/renderer/components/ui/label'
import {BaseSelect} from '@/renderer/components/ui/base-select'
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/renderer/components/ui/table'
import {cn} from '@/renderer/lib/utils'
import {formatCurrency} from '@/renderer/lib/formatters'
import type {AuthenticatedUser} from '@/shared/types/user'
import type {ProductCategorySummary, ProductSummary} from '@/shared/types/product'
import type {ProductFormState} from './InventoryWorkspace.types'
import {ProductCategoryBadge} from './ProductCategoryBadge'

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

function isLowStock(product: ProductSummary): boolean {
  return product.stockQty <= product.minStock
}

function estimatedMarginPercent(product: ProductSummary): number | null {
  if (product.unitPrice <= 0) return null

  return Math.round(((product.unitPrice - product.lastPurchaseCost) / product.unitPrice) * 1000) / 10
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

export function InventoryProduct({ currentUser }: { currentUser: AuthenticatedUser }) {
  const {t} = useTranslation()
  const canViewCost = currentUser.role === 'admin'
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
  const inventoryCostValue = products.reduce((total, p) => total + p.stockQty * p.lastPurchaseCost, 0)

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
    <div className="flex min-h-0 flex-1 flex-col gap-2">

      <div className={cn('grid shrink-0 gap-2', canViewCost ? 'grid-cols-4' : 'grid-cols-3')}>
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

        {canViewCost ? (
          <Card>
            <CardHeader>
              <CardTitle>{t('inventory.estimatedCostValue')}</CardTitle>
              <CardDescription>{t('inventory.latestCostEstimate')}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{formatCurrency(inventoryCostValue)}</p>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-12 gap-2">
        <div className="col-span-8 min-h-0">
          <Card className="h-full min-h-0">
            <CardHeader>
              <CardTitle>{t('inventory.productList')}</CardTitle>
              <CardDescription>
                {canViewCost
                  ? t('inventory.stockValueHintWithCost', {
                    retailValue: formatCurrency(inventoryValue),
                    costValue: formatCurrency(inventoryCostValue),
                  })
                  : t('inventory.stockValueHint', {value: formatCurrency(inventoryValue)})}
              </CardDescription>
              <CardAction>
                <Button type="button" size="sm" onClick={resetForm}>
                  <Plus data-icon="inline-start" aria-hidden="true" />
                  {t('inventory.newProduct')}
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden pt-1">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('inventory.searchPlaceholder')}
                className="shrink-0"
              />
              <div className="min-h-0 flex-1 rounded-lg border bg-background">
                <Table containerClassName="h-full overflow-auto" className={canViewCost ? 'min-w-220' : 'min-w-180'}>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky top-0 z-10 rounded-tl-lg bg-muted/95 backdrop-blur">{t('inventory.table.product')}</TableHead>
                      <TableHead className="sticky top-0 z-10 bg-muted/95 backdrop-blur">{t('inventory.table.category')}</TableHead>
                      <TableHead className="sticky top-0 z-10 bg-muted/95 text-right backdrop-blur">{t('inventory.table.price')}</TableHead>
                      {canViewCost ? (
                        <TableHead className="sticky top-0 z-10 bg-muted/95 text-right backdrop-blur">{t('inventory.table.lastCost')}</TableHead>
                      ) : null}
                      <TableHead className="sticky top-0 z-10 bg-muted/95 backdrop-blur">{t('inventory.table.stock')}</TableHead>
                      <TableHead className="sticky top-0 z-10 rounded-tr-lg bg-muted/95 backdrop-blur">{t('inventory.table.status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={canViewCost ? 6 : 5}>
                        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                          <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true"/>
                          <p className="text-sm text-muted-foreground">{t('inventory.loading')}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={canViewCost ? 6 : 5} className="h-24 text-muted-foreground">
                        {products.length === 0 ? t('inventory.noProducts') : t('inventory.noMatchingProducts')}
                      </TableCell>
                    </TableRow>
                  ) : null}

                  {!isLoading && filteredProducts.map((product) => {
                    const categoryName = categories.find((c) => c.id === product.categoryId)?.name ?? '—'
                    const lowStock = isLowStock(product)
                    const marginPercent = estimatedMarginPercent(product)

                    return (
                      <TableRow
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
                          'cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                          editingProduct?.id === product.id && 'bg-muted/60',
                        )}
                      >
                        <TableCell>
                          <span className="block truncate font-medium">{product.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">{product.sku}</span>
                        </TableCell>
                        <TableCell>
                          <ProductCategoryBadge name={categoryName} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(product.unitPrice)}</TableCell>
                        {canViewCost ? (
                          <TableCell className="text-right tabular-nums">
                            <span className="block">{formatCurrency(product.lastPurchaseCost)}</span>
                            {marginPercent !== null ? (
                              <span className="block text-xs text-muted-foreground">
                                {t('inventory.estimatedMargin', {value: marginPercent})}
                              </span>
                            ) : null}
                          </TableCell>
                        ) : null}
                        <TableCell className="tabular-nums">
                          {product.stockQty} {product.unitType}
                        </TableCell>
                        <TableCell>
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
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="col-span-4 min-h-0">
          <Card className="h-full min-h-0">
            <CardHeader>
              <CardTitle>
                {editingProduct ? t('inventory.editProduct') : t('inventory.createProduct')}
              </CardTitle>
              <CardDescription className="truncate">
                {editingProduct
                  ? t('inventory.selectedProduct', {name: editingProduct.name})
                  : t('inventory.createProductHint')}
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

                {canViewCost && editingProduct ? (
                  <div className="rounded-lg bg-muted/60 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">{t('inventory.lastPurchaseCost')}</span>
                      <span className="font-medium tabular-nums">{formatCurrency(editingProduct.lastPurchaseCost)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">{t('inventory.purchaseHistory')}</span>
                      <span className="font-medium">
                        {editingProduct.hasPurchaseHistory ? t('common.yes') : t('common.no')}
                      </span>
                    </div>
                  </div>
                ) : null}

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


    </div>
  )
}
