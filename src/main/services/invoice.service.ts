import { desc, eq } from 'drizzle-orm'
import {
  customers,
  invoices,
  payments,
  productCategories,
  products,
  saleItems,
  sales,
  services,
  vehicles,
  workOrders,
} from '../db/schema/index'
import type { InvoiceStatus, PaymentMethod, PaymentStatus, SaleItemType } from '../db/schema/index'
import { getCheckoutRepository } from '../repositories/checkout.repository'

export type InvoiceListInput = {
  search?: unknown
  status?: unknown
  dateFrom?: unknown
  dateTo?: unknown
}

export type InvoiceSummary = {
  id: number
  saleId: number
  workOrderId: number | null
  workOrderNumber: string | null
  invoiceNumber: string
  status: InvoiceStatus
  customerName: string | null
  vehiclePlateNumber: string | null
  vehicleBrand: string | null
  vehicleModel: string | null
  vehicleYear: number | null
  vehicleColor: string | null
  paymentMethod: PaymentMethod | null
  paymentStatus: PaymentStatus | null
  itemCount: number
  subtotal: number
  total: number
  issuedAt: string
}

export type InvoiceLineItemSummary = {
  id: number
  itemType: SaleItemType
  productId: number | null
  serviceId: number | null
  name: string
  sku: string | null
  category: string | null
  quantity: number
  unitPrice: number
  lineTotal: number
}

export type InvoicePaymentSummary = {
  id: number
  method: PaymentMethod
  status: PaymentStatus
  amount: number
  paidAt: string
}

export type InvoiceDetail = InvoiceSummary & {
  customerPhone: string | null
  customerEmail: string | null
  customerAddress: string | null
  notes: string | null
  items: InvoiceLineItemSummary[]
  payment: InvoicePaymentSummary | null
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function isInvoiceStatus(value: unknown): value is InvoiceStatus {
  return value === 'paid' || value === 'void'
}

function toInvoiceDateValue(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  return value.trim()
}

export async function listInvoices(input: InvoiceListInput = {}): Promise<InvoiceSummary[]> {
  const repository = getCheckoutRepository()

  if (!repository) return []

  const rows = await repository
    .select({
      id: invoices.id,
      saleId: invoices.saleId,
      workOrderId: invoices.workOrderId,
      workOrderNumber: workOrders.orderNumber,
      invoiceNumber: invoices.invoiceNumber,
      status: invoices.status,
      customerNameSnapshot: sales.customerNameSnapshot,
      customerName: customers.name,
      vehiclePlateNumber: vehicles.plateNumber,
      vehicleBrand: vehicles.brand,
      vehicleModel: vehicles.model,
      vehicleYear: vehicles.year,
      vehicleColor: vehicles.color,
      paymentMethod: payments.method,
      paymentStatus: payments.status,
      subtotal: invoices.subtotal,
      total: invoices.total,
      issuedAt: invoices.issuedAt,
    })
    .from(invoices)
    .innerJoin(sales, eq(invoices.saleId, sales.id))
    .leftJoin(workOrders, eq(invoices.workOrderId, workOrders.id))
    .leftJoin(customers, eq(sales.customerId, customers.id))
    .leftJoin(vehicles, eq(sales.vehicleId, vehicles.id))
    .leftJoin(payments, eq(payments.invoiceId, invoices.id))
    .orderBy(desc(invoices.issuedAt))

  const itemRows = await repository
    .select({
      saleId: saleItems.saleId,
      id: saleItems.id,
    })
    .from(saleItems)

  const itemCountBySaleId = new Map<number, number>()

  for (const item of itemRows) {
    itemCountBySaleId.set(item.saleId, (itemCountBySaleId.get(item.saleId) ?? 0) + 1)
  }

  const search = optionalString(input.search)?.toLowerCase() ?? null
  const status = isInvoiceStatus(input.status) ? input.status : null
  const dateFrom = toInvoiceDateValue(input.dateFrom)
  const dateTo = toInvoiceDateValue(input.dateTo)

  return rows
    .map<InvoiceSummary>((invoice) => ({
      id: invoice.id,
      saleId: invoice.saleId,
      workOrderId: invoice.workOrderId,
      workOrderNumber: invoice.workOrderNumber,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      customerName: invoice.customerNameSnapshot ?? invoice.customerName,
      vehiclePlateNumber: invoice.vehiclePlateNumber,
      vehicleBrand: invoice.vehicleBrand,
      vehicleModel: invoice.vehicleModel,
      vehicleYear: invoice.vehicleYear,
      vehicleColor: invoice.vehicleColor,
      paymentMethod: invoice.paymentMethod,
      paymentStatus: invoice.paymentStatus,
      itemCount: itemCountBySaleId.get(invoice.saleId) ?? 0,
      subtotal: invoice.subtotal,
      total: invoice.total,
      issuedAt: invoice.issuedAt,
    }))
    .filter((invoice) => {
      if (status && invoice.status !== status) return false
      if (dateFrom && invoice.issuedAt.slice(0, 10) < dateFrom) return false
      if (dateTo && invoice.issuedAt.slice(0, 10) > dateTo) return false

      if (!search) return true

      return [
        invoice.invoiceNumber,
        invoice.workOrderNumber ?? '',
        invoice.customerName ?? '',
        invoice.vehiclePlateNumber ?? '',
        invoice.vehicleBrand ?? '',
        invoice.vehicleModel ?? '',
        invoice.paymentMethod ?? '',
        invoice.paymentStatus ?? '',
      ].some((value) => value.toLowerCase().includes(search))
    })
}

export async function getInvoiceDetail(input: { id?: unknown }): Promise<InvoiceDetail | null> {
  const repository = getCheckoutRepository()

  if (!repository || typeof input.id !== 'number') return null

  const [invoice] = await repository
    .select({
      id: invoices.id,
      saleId: invoices.saleId,
      workOrderId: invoices.workOrderId,
      workOrderNumber: workOrders.orderNumber,
      invoiceNumber: invoices.invoiceNumber,
      status: invoices.status,
      customerNameSnapshot: sales.customerNameSnapshot,
      customerPhoneSnapshot: sales.customerPhoneSnapshot,
      customerName: customers.name,
      customerPhone: customers.phone,
      customerEmail: customers.email,
      customerAddress: customers.address,
      vehiclePlateNumber: vehicles.plateNumber,
      vehicleBrand: vehicles.brand,
      vehicleModel: vehicles.model,
      vehicleYear: vehicles.year,
      vehicleColor: vehicles.color,
      paymentMethod: payments.method,
      paymentStatus: payments.status,
      paymentId: payments.id,
      paymentAmount: payments.amount,
      paymentPaidAt: payments.paidAt,
      subtotal: invoices.subtotal,
      total: invoices.total,
      issuedAt: invoices.issuedAt,
      notes: sales.notes,
    })
    .from(invoices)
    .innerJoin(sales, eq(invoices.saleId, sales.id))
    .leftJoin(workOrders, eq(invoices.workOrderId, workOrders.id))
    .leftJoin(customers, eq(sales.customerId, customers.id))
    .leftJoin(vehicles, eq(sales.vehicleId, vehicles.id))
    .leftJoin(payments, eq(payments.invoiceId, invoices.id))
    .where(eq(invoices.id, input.id))
    .limit(1)

  if (!invoice) return null

  const items = await repository
    .select({
      id: saleItems.id,
      itemType: saleItems.itemType,
      productId: saleItems.productId,
      serviceId: saleItems.serviceId,
      name: saleItems.name,
      sku: saleItems.sku,
      productCategory: productCategories.name,
      serviceCategory: services.category,
      quantity: saleItems.quantity,
      unitPrice: saleItems.unitPrice,
      lineTotal: saleItems.lineTotal,
    })
    .from(saleItems)
    .leftJoin(products, eq(saleItems.productId, products.id))
    .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
    .leftJoin(services, eq(saleItems.serviceId, services.id))
    .where(eq(saleItems.saleId, invoice.saleId))

  const invoiceItems: InvoiceLineItemSummary[] = items.map((item) => ({
    id: item.id,
    itemType: item.itemType,
    productId: item.productId,
    serviceId: item.serviceId,
    name: item.name,
    sku: item.sku,
    category: item.itemType === 'product' ? item.productCategory : item.serviceCategory,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    lineTotal: item.lineTotal,
  }))

  return {
    id: invoice.id,
    saleId: invoice.saleId,
    workOrderId: invoice.workOrderId,
    workOrderNumber: invoice.workOrderNumber,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    customerName: invoice.customerNameSnapshot ?? invoice.customerName,
    vehiclePlateNumber: invoice.vehiclePlateNumber,
    vehicleBrand: invoice.vehicleBrand,
    vehicleModel: invoice.vehicleModel,
    vehicleYear: invoice.vehicleYear,
    vehicleColor: invoice.vehicleColor,
    customerPhone: invoice.customerPhoneSnapshot ?? invoice.customerPhone,
    customerEmail: invoice.customerEmail,
    customerAddress: invoice.customerAddress,
    paymentMethod: invoice.paymentMethod,
    paymentStatus: invoice.paymentStatus,
    itemCount: invoiceItems.length,
    subtotal: invoice.subtotal,
    total: invoice.total,
    issuedAt: invoice.issuedAt,
    notes: invoice.notes,
    items: invoiceItems,
    payment:
      invoice.paymentId && invoice.paymentMethod && invoice.paymentStatus
        ? {
            id: invoice.paymentId,
            method: invoice.paymentMethod,
            status: invoice.paymentStatus,
            amount: invoice.paymentAmount ?? 0,
            paidAt: invoice.paymentPaidAt ?? invoice.issuedAt,
          }
        : null,
  }
}
