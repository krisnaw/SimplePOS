import type {FormEvent} from 'react'
import {ArrowLeft, PencilLine} from 'lucide-react'
import {Button} from '@/renderer/components/ui/button'
import {Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle} from '@/renderer/components/ui/card'
import {Field, FieldGroup, FieldLabel} from '@/renderer/components/ui/field'
import {Input} from '@/renderer/components/ui/input'
import {BaseSelect} from '@/renderer/components/ui/base-select'
import {formatCurrency} from '@/renderer/lib/formatters'
import {cn} from '@/renderer/lib/utils'
import type {PurchaseDetail, PurchasePaymentStatus} from '@/shared/types/purchase'
import type {Feedback, InvoiceForm} from './InventoryWorkspace.types'

type InventoryInvoiceFormScreenProps = {
  feedback: Feedback | null
  invoiceForm: InvoiceForm
  isSaving: boolean
  pressableClass: string
  purchase: PurchaseDetail
  onBackToDetail: () => void
  onSaveInvoiceDetails: (event: FormEvent<HTMLFormElement>) => void
  onUpdateInvoiceForm: (field: keyof InvoiceForm, value: string | PurchasePaymentStatus) => void
}

export function InventoryInvoiceFormScreen({
  feedback,
  invoiceForm,
  isSaving,
  pressableClass,
  purchase,
  onBackToDetail,
  onSaveInvoiceDetails,
  onUpdateInvoiceForm,
}: InventoryInvoiceFormScreenProps) {
  return (
    <Card className="min-h-0 overflow-hidden">
      <CardHeader>
        <CardTitle className="truncate">Invoice Details</CardTitle>
        <CardDescription className="truncate">{purchase.purchaseNumber} · {purchase.supplierName}</CardDescription>
        <CardAction>
          <Button type="button" variant="outline" size="sm" className={pressableClass} onClick={onBackToDetail}>
            <ArrowLeft data-icon="inline-start" aria-hidden="true" />
            Detail
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-y-auto">
        <form onSubmit={onSaveInvoiceDetails}>
          <FieldGroup className="mx-auto max-w-3xl">
            <div className="rounded-lg bg-muted p-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Locked stock total</span>
                <span className="font-semibold tabular-nums">{formatCurrency(purchase.total)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground text-pretty">
                Supplier, products, quantities, costs, and stock movement are locked after posting.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="invoice-edit-number">Supplier invoice number</FieldLabel>
                <Input
                  id="invoice-edit-number"
                  value={invoiceForm.supplierInvoiceNumber}
                  onChange={(event) => onUpdateInvoiceForm('supplierInvoiceNumber', event.target.value)}
                  placeholder="SUP-INV-001"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="invoice-edit-date">Invoice date</FieldLabel>
                <Input
                  id="invoice-edit-date"
                  type="date"
                  value={invoiceForm.invoiceDate}
                  onChange={(event) => onUpdateInvoiceForm('invoiceDate', event.target.value)}
                />
              </Field>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="invoice-edit-payment">Payment</FieldLabel>
                <BaseSelect
                  id="invoice-edit-payment"
                  value={invoiceForm.paymentStatus}
                  onValueChange={(value) => onUpdateInvoiceForm('paymentStatus', value as PurchasePaymentStatus)}
                  options={[
                    { value: 'unpaid', label: 'Unpaid' },
                    { value: 'paid', label: 'Paid' },
                  ]}
                />
              </Field>
              {invoiceForm.paymentStatus === 'unpaid' ? (
                <Field>
                  <FieldLabel htmlFor="invoice-edit-due">Due date</FieldLabel>
                  <Input
                    id="invoice-edit-due"
                    type="date"
                    min={invoiceForm.invoiceDate}
                    value={invoiceForm.dueDate}
                    onChange={(event) => onUpdateInvoiceForm('dueDate', event.target.value)}
                  />
                </Field>
              ) : (
                <Field>
                  <FieldLabel htmlFor="invoice-edit-paid">Paid date</FieldLabel>
                  <Input
                    id="invoice-edit-paid"
                    type="date"
                    value={invoiceForm.paidAt}
                    onChange={(event) => onUpdateInvoiceForm('paidAt', event.target.value)}
                  />
                </Field>
              )}
            </div>

            <Field>
              <FieldLabel htmlFor="invoice-edit-notes">Notes</FieldLabel>
              <Input
                id="invoice-edit-notes"
                value={invoiceForm.notes}
                onChange={(event) => onUpdateInvoiceForm('notes', event.target.value)}
                placeholder="Optional payment or supplier note"
              />
            </Field>

            {feedback ? (
              <p className={cn('rounded-md px-3 py-2 text-sm text-pretty', feedback.tone === 'success' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive')} role={feedback.tone === 'error' ? 'alert' : 'status'}>
                {feedback.message}
              </p>
            ) : null}

            <Button type="submit" className={cn('h-10 w-full', pressableClass)} disabled={isSaving}>
              <PencilLine data-icon="inline-start" aria-hidden="true" />
              {isSaving ? 'Saving...' : purchase.invoiceStatus === 'pending' ? 'Complete Invoice Details' : 'Save Invoice Details'}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
