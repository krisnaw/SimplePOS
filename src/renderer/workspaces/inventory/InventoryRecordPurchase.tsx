import type {FormEvent} from 'react'
import {AlertTriangle, ArrowLeft, FileText, PackageCheck, Plus, Trash2} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogPopup,
  AlertDialogPortal,
  AlertDialogTitle,
} from '@/renderer/components/ui/alert-dialog'
import {Button} from '@/renderer/components/ui/button'
import {Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle} from '@/renderer/components/ui/card'
import {Field, FieldGroup, FieldLabel} from '@/renderer/components/ui/field'
import {Input} from '@/renderer/components/ui/input'
import {BaseSelect} from '@/renderer/components/ui/base-select'
import {formatCurrency} from '@/renderer/lib/formatters'
import {cn} from '@/renderer/lib/utils'
import type {ProductSummary} from '@/shared/types/product'
import type {PurchaseItemInput, PurchasePaymentStatus} from '@/shared/types/purchase'
import type {SupplierSummary} from '@/shared/types/supplier'
import type {Feedback, PurchaseForm} from './InventoryWorkspace.types'

type InventoryRecordPurchaseProps = {
  feedback: Feedback | null
  form: PurchaseForm
  isConfirmOpen: boolean
  isSaving: boolean
  lines: PurchaseItemInput[]
  pressableClass: string
  products: ProductSummary[]
  suppliers: SupplierSummary[]
  onAddLine: () => void
  onConfirmOpenChange: (open: boolean) => void
  onRemoveLine: (productId: number) => void
  onRequestSave: (event: FormEvent<HTMLFormElement>) => void
  onSavePurchase: () => void
  onSelectProduct: (value: string) => void
  onShowList: () => void
  onUpdateForm: (field: keyof PurchaseForm, value: string | PurchasePaymentStatus) => void
}

function lowerCostWarning(product: ProductSummary | undefined, unitCost: number): string | null {
  if (!product || product.lastPurchaseCost <= 0 || unitCost >= product.lastPurchaseCost) return null

  return `${product.name} is below the current last cost (${formatCurrency(product.lastPurchaseCost)}). Saving will update future COGS estimates.`
}

export function InventoryRecordPurchase({
  feedback,
  form,
  isConfirmOpen,
  isSaving,
  lines,
  pressableClass,
  products,
  suppliers,
  onAddLine,
  onConfirmOpenChange,
  onRemoveLine,
  onRequestSave,
  onSavePurchase,
  onSelectProduct,
  onShowList,
  onUpdateForm,
}: InventoryRecordPurchaseProps) {
  const purchaseTotal = lines.reduce((sum, line) => sum + line.quantity * line.unitCost, 0)
  const receivedUnits = lines.reduce((sum, line) => sum + line.quantity, 0)
  const selectedPurchaseProduct = products.find((item) => item.id === Number(form.productId))
  const selectedUnitCost = Number(form.unitCost)
  const selectedLowerCostWarning = Number.isInteger(selectedUnitCost)
    ? lowerCostWarning(selectedPurchaseProduct, selectedUnitCost)
    : null
  const lowerCostWarnings = lines
    .map((line) => lowerCostWarning(products.find((product) => product.id === line.productId), line.unitCost))
    .filter((warning): warning is string => Boolean(warning))

  return (
    <Card className="min-h-0 overflow-hidden">
      <CardHeader>
        <CardTitle>Record Purchase</CardTitle>
        <CardDescription>
          Saving receives stock immediately. Supplier invoice details can be completed later.
        </CardDescription>
        <CardAction>
          <Button type="button" variant="outline" size="sm" className={pressableClass} onClick={onShowList}>
            <ArrowLeft data-icon="inline-start" aria-hidden="true" />
            Purchases
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-y-auto">
        <form onSubmit={onRequestSave}>
          <FieldGroup className="mx-auto max-w-3xl">
            <div className="grid gap-3 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="purchase-supplier">Supplier</FieldLabel>
                <BaseSelect
                  id="purchase-supplier"
                  value={form.supplierId}
                  onValueChange={(value) => onUpdateForm('supplierId', value)}
                  placeholder={suppliers.length ? 'Choose supplier' : 'Add a supplier first'}
                  disabled={suppliers.length === 0}
                  options={suppliers.map((supplier) => ({ value: String(supplier.id), label: supplier.name }))}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="purchase-invoice">Supplier invoice number <span className="text-muted-foreground">Optional</span></FieldLabel>
                <Input id="purchase-invoice" value={form.supplierInvoiceNumber} onChange={(event) => onUpdateForm('supplierInvoiceNumber', event.target.value)} placeholder="SUP-INV-001" />
              </Field>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="purchase-date">Invoice date <span className="text-muted-foreground">Optional</span></FieldLabel>
                <Input id="purchase-date" type="date" value={form.invoiceDate} onChange={(event) => onUpdateForm('invoiceDate', event.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="purchase-status">Payment</FieldLabel>
                <BaseSelect
                  id="purchase-status"
                  value={form.paymentStatus}
                  onValueChange={(value) => onUpdateForm('paymentStatus', value as PurchasePaymentStatus)}
                  options={[
                    { value: 'unpaid', label: 'Unpaid' },
                    { value: 'paid', label: 'Paid' },
                  ]}
                />
              </Field>
              {form.paymentStatus === 'unpaid' ? (
                <Field>
                  <FieldLabel htmlFor="purchase-due">Due date</FieldLabel>
                  <Input id="purchase-due" type="date" min={form.invoiceDate || undefined} value={form.dueDate} onChange={(event) => onUpdateForm('dueDate', event.target.value)} />
                </Field>
              ) : null}
            </div>

            <div className="rounded-lg border bg-background p-3">
              <p className="text-sm font-semibold">Products received</p>
              <p className="mt-0.5 text-xs text-muted-foreground text-pretty">Add existing products with the received quantity and purchase cost.</p>
              <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_120px_140px_auto] md:items-end">
                <Field>
                  <FieldLabel htmlFor="purchase-product">Product</FieldLabel>
                  <BaseSelect
                    id="purchase-product"
                    value={form.productId}
                    onValueChange={onSelectProduct}
                    placeholder="Choose product"
                    options={products.map((product) => ({
                      value: String(product.id),
                      label: product.name,
                      disabled: lines.some((line) => line.productId === product.id),
                    }))}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="purchase-quantity">Quantity</FieldLabel>
                  <Input id="purchase-quantity" type="number" min="1" step="1" value={form.quantity} onChange={(event) => onUpdateForm('quantity', event.target.value)} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="purchase-cost">Unit cost</FieldLabel>
                  <Input id="purchase-cost" type="number" min="0" step="1" value={form.unitCost} onChange={(event) => onUpdateForm('unitCost', event.target.value)} placeholder="0" />
                </Field>
                <Button type="button" variant="outline" className={cn('h-10', pressableClass)} onClick={onAddLine}>
                  <Plus data-icon="inline-start" aria-hidden="true" />
                  Add
                </Button>
              </div>
              {selectedLowerCostWarning ? (
                <div className="mt-2 flex items-start gap-2 rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-800 text-pretty">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  <span>{selectedLowerCostWarning}</span>
                </div>
              ) : null}

              <div className="mt-3 flex flex-col gap-2">
                {lines.length === 0 ? (
                  <p className="rounded-md border border-dashed p-3 text-center text-sm text-muted-foreground">No products added.</p>
                ) : lines.map((line) => {
                  const product = products.find((item) => item.id === line.productId)
                  const warning = lowerCostWarning(product, line.unitCost)
                  return (
                    <div key={line.productId} className="rounded-md bg-muted/70 p-2.5">
                      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_90px_130px_120px_auto] md:items-center">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{product?.name}</span>
                        </span>
                        <span className="text-sm tabular-nums text-muted-foreground">
                          Qty {line.quantity}
                        </span>
                        <span className="text-sm tabular-nums text-muted-foreground">
                          {formatCurrency(line.unitCost)}
                        </span>
                        <span className="text-sm font-semibold tabular-nums">
                          {formatCurrency(line.quantity * line.unitCost)}
                        </span>
                        <Button type="button" variant="ghost" size="icon-sm" className={pressableClass} onClick={() => onRemoveLine(line.productId)} aria-label={`Remove ${product?.name}`}>
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </div>
                      {warning ? (
                        <div className="mt-2 flex items-start gap-2 rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-800 text-pretty">
                          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                          <span>{warning}</span>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>

            <Field>
              <FieldLabel htmlFor="purchase-notes">Notes</FieldLabel>
              <Input id="purchase-notes" value={form.notes} onChange={(event) => onUpdateForm('notes', event.target.value)} placeholder="Optional payment or delivery notes" />
            </Field>

            <div className="rounded-lg bg-muted p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Products received</span>
                <span className="tabular-nums">{receivedUnits}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-base font-semibold">
                <span>Invoice total</span>
                <span className="tabular-nums">{formatCurrency(purchaseTotal)}</span>
              </div>
            </div>

            {feedback ? (
              <p className={cn('rounded-md px-3 py-2 text-sm text-pretty', feedback.tone === 'success' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive')} role={feedback.tone === 'error' ? 'alert' : 'status'}>
                {feedback.message}
              </p>
            ) : null}

            <AlertDialog open={isConfirmOpen} onOpenChange={onConfirmOpenChange}>
              <Button type="submit" className={cn('h-10 w-full', pressableClass)} disabled={isSaving || suppliers.length === 0}>
                <FileText data-icon="inline-start" aria-hidden="true" />
                {isSaving ? 'Saving...' : 'Review and Save'}
              </Button>
              <AlertDialogPortal>
                <AlertDialogBackdrop />
                <AlertDialogPopup>
                  <AlertDialogTitle>Receive this purchase into inventory?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will add {receivedUnits} unit{receivedUnits === 1 ? '' : 's'} to stock and record a {formatCurrency(purchaseTotal)} purchase. Invoice details can be completed later, but posted products, quantities, and costs cannot be changed.
                  </AlertDialogDescription>
                  {lowerCostWarnings.length > 0 ? (
                    <div className="mt-4 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-800">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                        <div className="min-w-0">
                          <p className="font-medium">Lower cost warning</p>
                          <ul className="mt-1 list-disc space-y-1 pl-4 text-pretty">
                            {lowerCostWarnings.map((warning) => (
                              <li key={warning}>{warning}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ) : null}
                  <div className="mt-5 flex justify-end gap-2">
                    <AlertDialogClose render={<Button type="button" variant="outline" className={pressableClass}>Cancel</Button>} />
                    <Button type="button" className={pressableClass} onClick={onSavePurchase} disabled={isSaving}>
                      <PackageCheck data-icon="inline-start" aria-hidden="true" />
                      {isSaving ? 'Receiving...' : 'Receive Stock'}
                    </Button>
                  </div>
                </AlertDialogPopup>
              </AlertDialogPortal>
            </AlertDialog>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
