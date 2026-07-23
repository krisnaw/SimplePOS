import {Loader2, Printer} from 'lucide-react'
import {useTranslation} from 'react-i18next'
import {Button} from '@/renderer/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/renderer/components/ui/dialog'
import {type InvoiceBusinessProfile, printInvoice} from '@/renderer/lib/invoice-print'
import type {InvoiceDetail} from './InvoiceWorkspace.types'

const pressableButtonClass =
  'transition-[transform,box-shadow] duration-150 ease-out active:scale-[0.96] active:translate-y-0'

type InvoicePreviewDialogProps = {
  businessProfile: InvoiceBusinessProfile
  invoice: NonNullable<InvoiceDetail>
  open: boolean
  onOpenChange: (open: boolean) => void
  previewPdfUrl: string | null
  isLoading: boolean
}

export function InvoicePreviewDialog({
  businessProfile,
  invoice,
  open,
  onOpenChange,
  previewPdfUrl,
  isLoading,
}: InvoicePreviewDialogProps) {
  const {t} = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="min-w-4xl">
        <DialogHeader>
          <DialogTitle>{t('invoices.previewTitle')}</DialogTitle>
          <DialogDescription>
            {t('invoices.previewDescription', {invoiceNumber: invoice.invoiceNumber})}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0">
          <div className="mx-auto min-h-[80vh] aspect-210/148 w-full max-w-215 rounded-sm bg-white shadow-lg ring-1 ring-black/10">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label={t('invoices.loading')} />
              </div>
            ) : previewPdfUrl ? (
              <iframe
                src={previewPdfUrl}
                title={`Invoice ${invoice.invoiceNumber}`}
                className="h-full w-full rounded-sm border-0"
              />
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline"/>}>{t('common.close')}</DialogClose>
          <Button type="button" className={pressableButtonClass} onClick={() => printInvoice(invoice, businessProfile)}>
            <Printer data-icon="inline-start" aria-hidden="true"/>
            {t('invoices.print')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
