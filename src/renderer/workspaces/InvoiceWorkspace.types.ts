type SimplePosApi = NonNullable<Window['simplepos']>

export type InvoiceSummary = Awaited<ReturnType<SimplePosApi['invoices']['list']>>[number]
export type InvoiceDetail = Awaited<ReturnType<SimplePosApi['invoices']['get']>>
export type InvoiceStatusFilter = 'all' | InvoiceSummary['status']
