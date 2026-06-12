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
export { getInvoiceDetail, listInvoices } from './invoice.service'
export type { InvoiceDetail, InvoiceSummary } from './invoice.service'
export {
  createCustomer,
  createVehicle,
  deleteCustomer,
  deleteVehicle,
  listCustomers,
  listVehicles,
  updateCustomer,
  updateVehicle,
} from './customer.service'
export type {
  CustomerMutationResult,
  CustomerSummary,
  VehicleMutationResult,
  VehicleSummary,
} from './customer.service'
