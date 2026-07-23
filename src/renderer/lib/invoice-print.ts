import type {InvoiceDetail} from '@/renderer/workspaces/invoice/InvoiceWorkspace.types'
import {formatDateTime} from './formatters'

type PrintableInvoice = NonNullable<InvoiceDetail>

export type InvoiceBusinessProfile = {
  companyLogo: string | null
  companyName: string
  address: string
  phone: string
  instagram: string
}

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

export function generateReceiptHTML(
  invoice: PrintableInvoice,
  businessProfile: InvoiceBusinessProfile,
): string {
  const businessName = businessProfile.companyName.trim() || 'SimplePOS'
  const instagram = businessProfile.instagram.trim().replace(/^@+/, '')
  const businessDetails = [
    businessProfile.address.trim(),
    businessProfile.phone.trim(),
    instagram ? `Instagram: @${instagram}` : '',
  ].filter(Boolean)
  const businessLogo = businessProfile.companyLogo
    ? `<div class="business-logo-frame"><img class="business-logo" src="${escapeHtml(businessProfile.companyLogo)}" alt="${escapeHtml(businessName)} logo" /></div>`
    : ''
  const rows = invoice.items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #eee;">
          <div style="font-weight:500;line-height:1.4">${escapeHtml(item.name)}</div>
        </td>
        <td style="padding:10px 8px;text-align:right;border-bottom:1px solid #eee;white-space:nowrap">${formatReceiptCurrency(item.unitPrice)}</td>
        <td style="padding:10px 8px;text-align:center;border-bottom:1px solid #eee">${item.quantity}</td>
        <td style="padding:10px 0;text-align:right;border-bottom:1px solid #eee;white-space:nowrap;font-weight:500">${formatReceiptCurrency(item.lineTotal)}</td>
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
    body { width: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; color: #111; background: #fff; padding: 32px; margin: 0 auto; }
    h1 { font-size: 20px; font-weight: 700; }
    h2 { font-size: 14px; font-weight: 600; margin-bottom: 8px; }
    .invoice-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
    .business-identity { display: flex; min-width: 0; align-items: flex-start; gap: 12px; }
    .business-logo-frame { display: flex; width: 64px; height: 64px; flex: 0 0 64px; align-items: center; justify-content: center; overflow: hidden; }
    .business-logo { display: block; width: 100%; height: 100%; object-fit: contain; object-position: center; }
    .business-name { font-size: 18px; font-weight: 700; line-height: 1.2; }
    .business-details { margin-top: 5px; color: #555; font-size: 11px; line-height: 1.45; }
    .invoice-title { flex: 0 0 auto; color: #555; font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-align: right; text-transform: uppercase; }
    .invoice-number { margin-top: 4px; color: #111; font-size: 16px; font-weight: 700; letter-spacing: 0; text-transform: none; }
    .invoice-date { margin-top: 5px; color: #555; font-size: 11px; font-weight: 400; letter-spacing: 0; text-transform: none; }
    .divider { border: none; border-top: 1px solid #ddd; margin: 16px 0; }
    .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .meta-label { font-size: 11px; color: #666; margin-bottom: 2px; }
    .meta-value { font-weight: 500; }
    table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
    th { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.04em; padding-bottom: 6px; border-bottom: 2px solid #ddd; }
    th:not(:first-child) { text-align: right; padding-left: 8px; }
    th:nth-child(3) { text-align: center; }
    .totals { margin-left: auto; width: 240px; margin-top: 16px; }
    .totals-row { display: flex; justify-content: space-between; gap: 16px; padding: 3px 0; font-size: 13px; }
    .totals-row.total { font-size: 15px; font-weight: 700; border-top: 2px solid #111; padding-top: 8px; margin-top: 4px; }
    .footer { margin-top: 32px; text-align: center; font-size: 12px; color: #666; }
    @page { size: A5 landscape; margin: 10mm; }
    @media print { body { max-width: none; padding: 0; } }
  </style>
</head>
<body>
  <header class="invoice-header">
    <div class="business-identity">
      ${businessLogo}
      <div>
        <div class="business-name">${escapeHtml(businessName)}</div>
        ${businessDetails.length ? `<div class="business-details">${businessDetails.map(escapeHtml).join('<br>')}</div>` : ''}
      </div>
    </div>
    <div class="invoice-title">
      Invoice
      <div class="invoice-number">${escapeHtml(invoice.invoiceNumber)}</div>
      <div class="invoice-date">Date: ${escapeHtml(formatReceiptDate(invoice.issuedAt))}</div>
    </div>
  </header>


  <div class="meta-grid" style="padding-top: 2em;padding-bottom: 4em">
    <div>
      <div class="meta-label">Vehicle</div>
      <div class="meta-value">${escapeHtml([invoice.vehicleBrand, invoice.vehicleModel, invoice.vehicleYear].filter(Boolean).join(' ') || '-')}</div>
    </div>
    <div>
      <div class="meta-label">Plate Number</div>
      <div class="meta-value">${escapeHtml(invoice.vehiclePlateNumber ?? '-')}</div>
    </div>
    <div>
      <div class="meta-label">Customer</div>
      <div class="meta-value">${escapeHtml(invoice.customerName ?? 'Walk-in customer')}</div>
    </div>
    <div>
      <div class="meta-label">Phone</div>
      <div class="meta-value">${escapeHtml(invoice.customerPhone ?? invoice.customerEmail ?? '-')}</div>
    </div>
  </div>


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

export function printInvoice(invoice: PrintableInvoice, businessProfile: InvoiceBusinessProfile): void {
  const html = generateReceiptHTML(invoice, businessProfile)
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
