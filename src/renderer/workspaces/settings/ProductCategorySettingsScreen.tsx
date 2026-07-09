import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { FolderTree, Loader2, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/renderer/components/ui/badge'
import { Button } from '@/renderer/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/renderer/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/renderer/components/ui/field'
import { Input } from '@/renderer/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/renderer/components/ui/table'
import { cn } from '@/renderer/lib/utils'
import type { ProductCategorySummary, ProductSummary } from '@/shared/types/product'

export function ProductCategorySettingsScreen() {
  const { t } = useTranslation()
  const [categories, setCategories] = useState<ProductCategorySummary[]>([])
  const [products, setProducts] = useState<ProductSummary[]>([])
  const [categoryName, setCategoryName] = useState('')
  const [editingCategory, setEditingCategory] = useState<ProductCategorySummary | null>(null)
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(null)

  async function loadCategories() {
    setIsLoading(true)

    try {
      const [categoryList, productList] = await Promise.all([
        window.simplepos?.categories.list(),
        window.simplepos?.products.list(),
      ])

      setCategories(categoryList ?? [])
      setProducts(productList ?? [])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadCategories()
  }, [])

  const productCountsByCategoryId = useMemo(() => {
    return products.reduce<Map<number, number>>((counts, product) => {
      if (product.categoryId === null) return counts

      counts.set(product.categoryId, (counts.get(product.categoryId) ?? 0) + 1)
      return counts
    }, new Map())
  }, [products])

  const totalAssignedProducts = useMemo(
    () => Array.from(productCountsByCategoryId.values()).reduce((total, count) => total + count, 0),
    [productCountsByCategoryId],
  )

  function resetForm() {
    setCategoryName('')
    setEditingCategory(null)
    setMessage('')
  }

  function startEditing(category: ProductCategorySummary) {
    setEditingCategory(category)
    setCategoryName(category.name)
    setMessage('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!categoryName.trim()) {
      setMessage(t('settings.productCategories.messages.nameRequired'))
      return
    }

    setIsSubmitting(true)

    const result = editingCategory
      ? await window.simplepos?.categories.update({
        id: editingCategory.id,
        name: categoryName,
      })
      : await window.simplepos?.categories.create({ name: categoryName })

    setIsSubmitting(false)

    if (!result) {
      setMessage(t('common.unableToReachDb'))
      return
    }

    setMessage(result.message)

    if (result.ok) {
      resetForm()
      await loadCategories()
    }
  }

  async function handleDelete(category: ProductCategorySummary) {
    const productCount = productCountsByCategoryId.get(category.id) ?? 0

    if (productCount > 0) {
      setMessage(t('settings.productCategories.messages.deleteBlocked', { count: productCount }))
      return
    }

    const confirmed = window.confirm(t('settings.productCategories.deleteConfirm', { name: category.name }))
    if (!confirmed) return

    setDeletingCategoryId(category.id)

    const result = await window.simplepos?.categories.delete({ id: category.id })

    setDeletingCategoryId(null)

    if (!result) {
      setMessage(t('common.unableToReachDb'))
      return
    }

    setMessage(result.message)

    if (result.ok) {
      if (editingCategory?.id === category.id) resetForm()
      await loadCategories()
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-1">
      <div className="grid shrink-0 gap-3 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.productCategories.metrics.total')}</CardTitle>
            <CardDescription>{t('settings.productCategories.metrics.totalHint')}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{categories.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.productCategories.metrics.assigned')}</CardTitle>
            <CardDescription>{t('settings.productCategories.metrics.assignedHint')}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{totalAssignedProducts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.productCategories.metrics.empty')}</CardTitle>
            <CardDescription>{t('settings.productCategories.metrics.emptyHint')}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {categories.filter((category) => !productCountsByCategoryId.has(category.id)).length}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="min-h-0">
          <CardHeader>
            <CardTitle>{t('settings.productCategories.listTitle')}</CardTitle>
            <CardDescription>{t('settings.productCategories.listHint')}</CardDescription>
            <CardAction>
              <Button type="button" size="sm" variant="outline" onClick={() => void loadCategories()} disabled={isLoading}>
                <RefreshCw data-icon="inline-start" aria-hidden="true" />
                {t('common.refresh')}
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-hidden">
            <div className="min-h-0 rounded-lg border bg-background">
              <Table containerClassName="max-h-[calc(100vh-22rem)] overflow-auto" className="min-w-120">
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky top-0 z-10 rounded-tl-lg bg-muted/95 backdrop-blur">
                      {t('settings.productCategories.table.category')}
                    </TableHead>
                    <TableHead className="sticky top-0 z-10 bg-muted/95 text-right backdrop-blur">
                      {t('settings.productCategories.table.products')}
                    </TableHead>
                    <TableHead className="sticky top-0 z-10 rounded-tr-lg bg-muted/95 text-right backdrop-blur">
                      {t('settings.productCategories.table.actions')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={3}>
                        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                          <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
                          <p className="text-sm text-muted-foreground">{t('settings.productCategories.loading')}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : categories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-muted-foreground">
                        {t('settings.productCategories.empty')}
                      </TableCell>
                    </TableRow>
                  ) : null}

                  {!isLoading && categories.map((category) => {
                    const productCount = productCountsByCategoryId.get(category.id) ?? 0
                    const isEditing = editingCategory?.id === category.id

                    return (
                      <TableRow
                        key={category.id}
                        className={cn(isEditing && 'bg-muted/60')}
                      >
                        <TableCell>
                          <div className="flex min-w-0 items-center gap-2">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                              <FolderTree className="size-4" aria-hidden="true" />
                            </div>
                            <div className="min-w-0">
                              <span className="block truncate font-medium">{category.name}</span>
                              <span className="text-xs text-muted-foreground tabular-nums">
                                {t('settings.productCategories.categoryId', { id: category.id })}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={productCount > 0 ? 'secondary' : 'outline'} className="tabular-nums">
                            {t('settings.productCategories.productCount', { count: productCount })}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1.5">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              aria-label={t('settings.productCategories.editCategory', { name: category.name })}
                              onClick={() => startEditing(category)}
                            >
                              <Pencil aria-hidden="true" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              aria-label={t('settings.productCategories.deleteCategory', { name: category.name })}
                              disabled={deletingCategoryId === category.id}
                              onClick={() => void handleDelete(category)}
                            >
                              {deletingCategoryId === category.id ? (
                                <Loader2 className="animate-spin" aria-hidden="true" />
                              ) : (
                                <Trash2 aria-hidden="true" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>
              {editingCategory
                ? t('settings.productCategories.editTitle')
                : t('settings.productCategories.createTitle')}
            </CardTitle>
            <CardDescription>
              {editingCategory
                ? t('settings.productCategories.editHint', { name: editingCategory.name })
                : t('settings.productCategories.createHint')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="product-category-name">
                    {t('settings.productCategories.nameLabel')}
                  </FieldLabel>
                  <Input
                    id="product-category-name"
                    value={categoryName}
                    onChange={(event) => setCategoryName(event.target.value)}
                    placeholder={t('settings.productCategories.namePlaceholder')}
                    required
                  />
                  <FieldDescription>
                    {t('settings.productCategories.nameHint')}
                  </FieldDescription>
                </Field>
              </FieldGroup>

              {message ? (
                <p className="text-sm text-muted-foreground" role="status">
                  {message}
                </p>
              ) : null}

              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" />
                  ) : editingCategory ? (
                    <Pencil data-icon="inline-start" aria-hidden="true" />
                  ) : (
                    <Plus data-icon="inline-start" aria-hidden="true" />
                  )}
                  {isSubmitting
                    ? t('common.saving')
                    : editingCategory
                      ? t('common.saveChanges')
                      : t('common.create')}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  {editingCategory ? (
                    <X data-icon="inline-start" aria-hidden="true" />
                  ) : null}
                  {editingCategory ? t('common.cancel') : t('common.clear')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
