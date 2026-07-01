import { desc, eq } from 'drizzle-orm'
import { invoices, payments, productCategories, products, saleItems, workOrders } from '../db/schema/index'
import type { PaymentMethod, SaleItemType } from '../db/schema/index'
import { getCheckoutRepository } from '../repositories/checkout.repository'

export type ReportPeriod = 'today' | 'week' | 'month' | 'quarter'

export type DashboardRecentTransaction = {
  invoiceId: number
  invoiceNumber: string
  total: number
  paymentMethod: PaymentMethod | null
  issuedAt: string
}

export type DashboardSummary = {
  paidSalesTotal: number
  paidInvoiceCount: number
  lowStockCount: number
  openWorkOrderCount: number
  inProgressWorkOrderCount: number
  completedWorkOrderCount: number
  recentTransactions: DashboardRecentTransaction[]
}

export type PaymentMethodSummary = {
  method: PaymentMethod
  count: number
  total: number
}

export type TopSellingItemSummary = {
  itemType: SaleItemType
  name: string
  sku: string | null
  category: string | null
  quantity: number
  total: number
}

export type LowStockItemSummary = {
  id: number
  sku: string
  name: string
  stockQty: number
  minStock: number
}

export type ReportSummary = {
  period: ReportPeriod
  dateFrom: string
  dateTo: string
  salesTotal: number
  invoiceCount: number
  averageInvoiceTotal: number
  inventoryValue: number
  lowStockCount: number
  workOrderCount: number
  completedWorkOrderCount: number
  invoicedWorkOrderCount: number
  workOrderCompletionRate: number
  paymentMethods: PaymentMethodSummary[]
  lowStockItems: LowStockItemSummary[]
  topSellingItems: TopSellingItemSummary[]
}

function isReportPeriod(value: unknown): value is ReportPeriod {
  return value === 'today' || value === 'week' || value === 'month' || value === 'quarter'
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function periodRange(period: ReportPeriod, now = new Date()): { dateFrom: Date; dateTo: Date } {
  const todayStart = startOfDay(now)

  if (period === 'week') {
    const day = todayStart.getDay()
    const daysSinceMonday = day === 0 ? 6 : day - 1
    return { dateFrom: addDays(todayStart, -daysSinceMonday), dateTo: endOfDay(now) }
  }

  if (period === 'month') {
    return { dateFrom: new Date(now.getFullYear(), now.getMonth(), 1), dateTo: endOfDay(now) }
  }

  if (period === 'quarter') {
    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3
    return { dateFrom: new Date(now.getFullYear(), quarterStartMonth, 1), dateTo: endOfDay(now) }
  }

  return { dateFrom: todayStart, dateTo: endOfDay(now) }
}

function isWithinRange(value: string, dateFrom: Date, dateTo: Date): boolean {
  const time = new Date(value).getTime()
  return Number.isFinite(time) && time >= dateFrom.getTime() && time <= dateTo.getTime()
}

async function listLowStockItems(): Promise<LowStockItemSummary[]> {
  const repository = getCheckoutRepository()

  if (!repository) return []

  const list = await repository.select().from(products).where(eq(products.isActive, true))

  return list
    .filter((product) => product.stockQty <= product.minStock)
    .map((product) => ({
      id: product.id,
      sku: product.sku,
      name: product.name,
      stockQty: product.stockQty,
      minStock: product.minStock,
    }))
    .sort((a, b) => a.stockQty - b.stockQty || a.name.localeCompare(b.name))
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const repository = getCheckoutRepository()

  if (!repository) {
    return {
      paidSalesTotal: 0,
      paidInvoiceCount: 0,
      lowStockCount: 0,
      openWorkOrderCount: 0,
      inProgressWorkOrderCount: 0,
      completedWorkOrderCount: 0,
      recentTransactions: [],
    }
  }

  const invoiceRows = await repository.select().from(invoices).where(eq(invoices.status, 'paid'))
  const lowStockItems = await listLowStockItems()
  const workOrderRows = await repository.select().from(workOrders)

  const recentRows = await repository
    .select({
      invoiceId: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      total: invoices.total,
      paymentMethod: payments.method,
      issuedAt: invoices.issuedAt,
    })
    .from(invoices)
    .leftJoin(payments, eq(payments.invoiceId, invoices.id))
    .orderBy(desc(invoices.issuedAt))
    .limit(5)

  return {
    paidSalesTotal: invoiceRows.reduce((total, invoice) => total + invoice.total, 0),
    paidInvoiceCount: invoiceRows.length,
    lowStockCount: lowStockItems.length,
    openWorkOrderCount: workOrderRows.filter((workOrder) => workOrder.status === 'open').length,
    inProgressWorkOrderCount: workOrderRows.filter((workOrder) => workOrder.status === 'in_progress').length,
    completedWorkOrderCount: workOrderRows.filter((workOrder) => workOrder.status === 'completed').length,
    recentTransactions: recentRows,
  }
}

export async function getReportSummary(input: { period?: unknown } = {}): Promise<ReportSummary> {
  const repository = getCheckoutRepository()
  const period = isReportPeriod(input.period) ? input.period : 'today'
  const { dateFrom, dateTo } = periodRange(period)
  const emptySummary: ReportSummary = {
    period,
    dateFrom: dateFrom.toISOString(),
    dateTo: dateTo.toISOString(),
    salesTotal: 0,
    invoiceCount: 0,
    averageInvoiceTotal: 0,
    inventoryValue: 0,
    lowStockCount: 0,
    workOrderCount: 0,
    completedWorkOrderCount: 0,
    invoicedWorkOrderCount: 0,
    workOrderCompletionRate: 0,
    paymentMethods: [],
    lowStockItems: [],
    topSellingItems: [],
  }

  if (!repository) return emptySummary

  const [invoiceRows, paymentRows, itemRows, productRows, categoryRows, workOrderRows, lowStockItems] = await Promise.all([
    repository.select().from(invoices).where(eq(invoices.status, 'paid')),
    repository.select().from(payments).where(eq(payments.status, 'paid')),
    repository.select().from(saleItems),
    repository.select().from(products).where(eq(products.isActive, true)),
    repository.select().from(productCategories),
    repository.select().from(workOrders),
    listLowStockItems(),
  ])

  const periodInvoices = invoiceRows.filter((invoice) => isWithinRange(invoice.issuedAt, dateFrom, dateTo))
  const saleIds = new Set(periodInvoices.map((invoice) => invoice.saleId))
  const invoiceIds = new Set(periodInvoices.map((invoice) => invoice.id))
  const periodPayments = paymentRows.filter((payment) => invoiceIds.has(payment.invoiceId))
  const periodItems = itemRows.filter((item) => saleIds.has(item.saleId))
  const salesTotal = periodInvoices.reduce((total, invoice) => total + invoice.total, 0)
  const inventoryValue = productRows.reduce((total, product) => total + product.stockQty * product.unitPrice, 0)
  const periodWorkOrders = workOrderRows.filter((workOrder) => isWithinRange(workOrder.createdAt, dateFrom, dateTo))
  const completedWorkOrderCount = periodWorkOrders.filter((workOrder) =>
    workOrder.status === 'completed' || workOrder.status === 'invoiced',
  ).length
  const invoicedWorkOrderCount = periodWorkOrders.filter((workOrder) => workOrder.status === 'invoiced').length
  const paymentByMethod = new Map<PaymentMethod, PaymentMethodSummary>()
  const itemByKey = new Map<string, TopSellingItemSummary>()
  const categoryNameById = new Map(categoryRows.map((category) => [category.id, category.name]))
  const categoryByProductId = new Map(
    productRows.map((product) => [
      product.id,
      product.categoryId === null ? null : (categoryNameById.get(product.categoryId) ?? null),
    ]),
  )

  for (const payment of periodPayments) {
    const current = paymentByMethod.get(payment.method) ?? {
      method: payment.method,
      count: 0,
      total: 0,
    }

    current.count += 1
    current.total += payment.amount
    paymentByMethod.set(payment.method, current)
  }

  for (const item of periodItems) {
    if (item.itemType !== 'product') continue

    const key = `${item.itemType}:${item.productId ?? item.serviceId ?? item.name}`
    const current = itemByKey.get(key) ?? {
      itemType: item.itemType,
      name: item.name,
      sku: item.sku,
      category: item.productId === null ? null : (categoryByProductId.get(item.productId) ?? null),
      quantity: 0,
      total: 0,
    }

    current.quantity += item.quantity
    current.total += item.lineTotal
    itemByKey.set(key, current)
  }

  return {
    period,
    dateFrom: dateFrom.toISOString(),
    dateTo: dateTo.toISOString(),
    salesTotal,
    invoiceCount: periodInvoices.length,
    averageInvoiceTotal: periodInvoices.length > 0 ? Math.round(salesTotal / periodInvoices.length) : 0,
    inventoryValue,
    lowStockCount: lowStockItems.length,
    workOrderCount: periodWorkOrders.length,
    completedWorkOrderCount,
    invoicedWorkOrderCount,
    workOrderCompletionRate: periodWorkOrders.length > 0
      ? Math.round((completedWorkOrderCount / periodWorkOrders.length) * 100)
      : 0,
    paymentMethods: [...paymentByMethod.values()].sort((a, b) => b.total - a.total),
    lowStockItems: lowStockItems.slice(0, 8),
    topSellingItems: [...itemByKey.values()].sort((a, b) => b.total - a.total),
  }
}
