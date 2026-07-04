import {CalendarClock, Check, ReceiptText} from 'lucide-react'
import {Badge} from '@/renderer/components/ui/badge'
import type {PurchaseInvoiceStatus, PurchasePaymentStatus} from '@/shared/types/purchase'

export function PaymentBadge({ status }: { status: PurchasePaymentStatus }) {
  return (
    <Badge variant={status === 'paid' ? 'secondary' : 'destructive'}>
      {status === 'paid' ? <Check data-icon="inline-start" aria-hidden="true" /> : <CalendarClock data-icon="inline-start" aria-hidden="true" />}
      {status === 'paid' ? 'Paid' : 'Unpaid'}
    </Badge>
  )
}

export function InvoiceBadge({ status }: { status: PurchaseInvoiceStatus }) {
  return (
    <Badge variant={status === 'received' ? 'secondary' : 'outline'}>
      {status === 'received' ? <ReceiptText data-icon="inline-start" aria-hidden="true" /> : <CalendarClock data-icon="inline-start" aria-hidden="true" />}
      {status === 'received' ? 'Invoice received' : 'Needs invoice'}
    </Badge>
  )
}
