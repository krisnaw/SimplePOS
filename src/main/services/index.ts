export { authenticateUser } from './auth.service'
export type { LoginResult } from './auth.service'
export { createUser, listUsers, updateUser } from './user.service'
export type { UserMutationResult, UserSummary } from './user.service'
export { createProduct, listProductCategories, listProducts, updateProduct } from './product.service'
export type { ProductCategorySummary, ProductMutationResult, ProductSummary } from './product.service'
export { createService, listServices, updateService } from './service.service'
export type { ServiceMutationResult, ServiceSummary } from './service.service'
export { createCheckout } from './checkout.service'
export type { CheckoutResult, CheckoutSummary } from './checkout.service'
export { createOrResumeSalesDraft, listSalesDrafts, saveSalesDraftItems } from './sales-draft.service'
export { getInvoiceDetail, listInvoices } from './invoice.service'
export type { InvoiceDetail, InvoiceSummary } from './invoice.service'
export { getDashboardSummary, getReportSummary } from './report.service'
export type { DashboardSummary, ReportSummary } from './report.service'
export {
  addWorkOrderItem,
  checkoutWorkOrder,
  createWorkOrder,
  deleteWorkOrderItem,
  getWorkOrderDetail,
  listWorkOrders,
  updateWorkOrder,
  updateWorkOrderItem,
  updateWorkOrderStatus,
} from './work-order.service'
export type {
  WorkOrderCheckoutResult,
  WorkOrderDetail,
  WorkOrderMutationResult,
  WorkOrderSummary,
} from './work-order.service'
export {
  createCustomer,
  createVehicle,
  deleteCustomer,
  deleteVehicle,
  listCustomers,
  listVehicles,
  quickCreateVehicle,
  searchVehicles,
  updateCustomer,
  updateVehicle,
} from './customer.service'
export type {
  CustomerMutationResult,
  CustomerSummary,
  VehicleMutationResult,
  VehicleSummary,
} from './customer.service'
