import type { InvoiceDetail } from '@/renderer/workspaces/invoice/InvoiceWorkspace.types'
import { formatDateTime } from './formatters'

type PrintableInvoice = NonNullable<InvoiceDetail>

function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function formatReceiptCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
    .format(amount)
    .replace(/^Rp[\s ]*/, 'Rp')
}

function formatReceiptDate(value: string | null): string {
  return value ? formatDateTime(value) : '-'
}

export function generateReceiptHTML(invoice: PrintableInvoice): string {
  const rows = invoice.items
    .map(
      (item) => `
      <tr>
        <td style="padding:4px 0;border-bottom:1px solid #eee;">
          <div style="font-weight:500">${escapeHtml(item.name)}</div>
          <div style="font-size:11px;color:#666">${escapeHtml(item.sku ?? '-')} · ${item.itemType === 'service' ? 'Service' : 'Product'}</div>
        </td>
        <td style="padding:4px 8px;text-align:right;border-bottom:1px solid #eee;white-space:nowrap">${formatReceiptCurrency(item.unitPrice)}</td>
        <td style="padding:4px 8px;text-align:center;border-bottom:1px solid #eee">${item.quantity}</td>
        <td style="padding:4px 0;text-align:right;border-bottom:1px solid #eee;white-space:nowrap;font-weight:500">${formatReceiptCurrency(item.lineTotal)}</td>
      </tr>`,
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${escapeHtml(invoice.invoiceNumber)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; color: #111; background: #fff; padding: 32px; max-width: 640px; margin: 0 auto; }
    h1 { font-size: 20px; font-weight: 700; }
    h2 { font-size: 14px; font-weight: 600; margin-bottom: 8px; }
    .divider { border: none; border-top: 1px solid #ddd; margin: 16px 0; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .meta-label { font-size: 11px; color: #666; margin-bottom: 2px; }
    .meta-value { font-weight: 500; }
    table { width: 100%; border-collapse: collapse; }
    th { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.04em; padding-bottom: 6px; border-bottom: 2px solid #ddd; }
    th:not(:first-child) { text-align: right; padding-left: 8px; }
    th:nth-child(3) { text-align: center; }
    .totals { margin-left: auto; width: 240px; margin-top: 16px; }
    .totals-row { display: flex; justify-content: space-between; gap: 16px; padding: 3px 0; font-size: 13px; }
    .totals-row.total { font-size: 15px; font-weight: 700; border-top: 2px solid #111; padding-top: 8px; margin-top: 4px; }
    .footer { margin-top: 32px; text-align: center; font-size: 12px; color: #666; }
    @page { size: A4 landscape; margin: 12mm; }
    @media print { body { max-width: none; padding: 0; } }
  </style>
</head>
<body>
  <h1>SimplePOS</h1>
  <p style="color:#666;margin-top:2px;font-size:12px">Bengkel / Car Repair Shop</p>

  <hr class="divider">

  <div class="meta-grid">
    <div>
      <div class="meta-label">Invoice</div>
      <div class="meta-value">${escapeHtml(invoice.invoiceNumber)}</div>
    </div>
    <div>
      <div class="meta-label">Date</div>
      <div class="meta-value">${escapeHtml(formatReceiptDate(invoice.issuedAt))}</div>
    </div>
    <div>
      <div class="meta-label">Vehicle</div>
      <div class="meta-value">${escapeHtml(invoice.vehiclePlateNumber ?? '-')}</div>
      <div style="font-size:11px;color:#666">${escapeHtml([invoice.vehicleBrand, invoice.vehicleModel, invoice.vehicleYear].filter(Boolean).join(' ') || '-')}</div>
    </div>
    <div>
      <div class="meta-label">Customer</div>
      <div class="meta-value">${escapeHtml(invoice.customerName ?? 'Walk-in customer')}</div>
    </div>
    <div>
      <div class="meta-label">Phone</div>
      <div class="meta-value">${escapeHtml(invoice.customerPhone ?? invoice.customerEmail ?? '-')}</div>
    </div>
    <div>
      <div class="meta-label">Payment</div>
      <div class="meta-value" style="text-transform:capitalize">${escapeHtml(invoice.payment?.method ?? '-')}</div>
    </div>
  </div>

  <hr class="divider">

  <table>
    <thead>
      <tr>
        <th style="text-align:left">Item</th>
        <th style="text-align:right;padding-left:8px">Unit Price</th>
        <th>Qty</th>
        <th style="text-align:right">Total</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <div class="totals-row"><span style="color:#666">Subtotal</span><span>${formatReceiptCurrency(invoice.subtotal)}</span></div>
    <div class="totals-row total"><span>Total</span><span>${formatReceiptCurrency(invoice.total)}</span></div>
  </div>

  <div class="footer">
    <p>Thank you for your business!</p>
    <p style="margin-top:4px">Printed on ${escapeHtml(formatReceiptDate(new Date().toISOString()))}</p>
  </div>
</body>
</html>`
}

export function printInvoice(invoice: PrintableInvoice): void {
  const html = generateReceiptHTML(invoice)
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument ?? iframe.contentWindow?.document
  if (!doc) {
    document.body.removeChild(iframe)
    return
  }

  doc.open()
  doc.write(html)
  doc.close()

  iframe.contentWindow?.focus()
  iframe.contentWindow?.print()

  setTimeout(() => document.body.removeChild(iframe), 1000)
}
