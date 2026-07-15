import { app, BrowserWindow, ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import {
  closeDatabase,
  getDatabaseStatus,
  initializeDatabase,
} from './db/client'
import {
  authenticateUser,
  createCustomer,
  createCheckout,
  createSalesDraft,
  createProduct,
  createProductCategory,
  createService,
  createWorkOrder,
  createUser,
  createVehicle,
  addWorkOrderItem,
  checkoutWorkOrder,
  deleteCustomer,
  deleteProductCategory,
  deleteSalesDraft,
  deleteVehicle,
  deleteWorkOrderItem,
  getDashboardSummary,
  getAppSettings,
  getInvoiceDetail,
  getWorkOrderDetail,
  getReportSummary,
  listCustomers,
  listInvoices,
  listProductCategories,
  listProducts,
  listServices,
  listSalesDrafts,
  listUsers,
  listVehicles,
  listWorkOrders,
  quickCreateVehicle,
  searchVehicles,
  saveSalesDraftItems,
  updateCustomer,
  updateProduct,
  updateProductCategory,
  updateService,
  updateUser,
  updateVehicle,
  updateWorkOrder,
  updateWorkOrderItem,
  updateWorkOrderStatus,
  createSupplier,
  listSuppliers,
  updateSupplier,
  updateAppIdentity,
  updateBusinessProfile,
  createPurchase,
  getPurchaseDetail,
  listPurchases,
  markPurchasePaid,
  updatePurchaseInvoice,
  adjustStock,
  listStockMovements,
} from './services'
import { registerUpdateHandlers } from './services/update.service'

function expandWindowForDashboard(win: BrowserWindow): void {
  win.setResizable(true)
  win.setMinimumSize(900, 640)
  win.setFullScreen(true)
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 420,
    height: 580,
    fullscreen: true,
    resizable: true,
    minWidth: 420,
    minHeight: 580,
    center: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.ELECTRON_DEV === 'true') {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()

    win.webContents.on('did-fail-load', () => {
      setTimeout(() => win.loadURL('http://localhost:5173'), 1000)
    })
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

function prepareDatabaseDirectory(): string {
  const databaseDirectory = app.getPath('userData')
  const databasePath = path.join(databaseDirectory, 'simplepos.sqlite')
  const legacyDatabasePath = path.join(app.getAppPath(), 'simplepos.sqlite')

  if (!fs.existsSync(databasePath) && fs.existsSync(legacyDatabasePath)) {
    fs.mkdirSync(databaseDirectory, { recursive: true })
    fs.copyFileSync(legacyDatabasePath, databasePath)
  }

  return databaseDirectory
}

let isClosingDatabase = false

app.whenReady().then(async () => {
  await initializeDatabase(prepareDatabaseDirectory())
  registerUpdateHandlers()

  ipcMain.handle('db:getStatus', () => getDatabaseStatus())
  ipcMain.handle('settings:getApp', () => getAppSettings())
  ipcMain.handle('settings:updateAppIdentity', (_event, input: unknown) => updateAppIdentity(input as Record<string, unknown>))
  ipcMain.handle('settings:updateBusinessProfile', (_event, input: unknown) => updateBusinessProfile(input as Record<string, unknown>))
  ipcMain.handle('categories:list', () => listProductCategories())
  ipcMain.handle('categories:create', (_event, input: unknown) => (
    createProductCategory(input as { name?: unknown })
  ))
  ipcMain.handle('categories:update', (_event, input: unknown) => (
    updateProductCategory(input as { id?: unknown; name?: unknown })
  ))
  ipcMain.handle('categories:delete', (_event, input: unknown) => (
    deleteProductCategory(input as { id?: unknown })
  ))
  ipcMain.handle('products:list', () => listProducts())
  ipcMain.handle('products:create', (_event, input: unknown) => createProduct(input as Record<string, unknown>))
  ipcMain.handle('products:update', (_event, input: unknown) => updateProduct(input as Record<string, unknown>))
  ipcMain.handle('suppliers:list', (_event, input: unknown) => listSuppliers(input as Record<string, unknown>))
  ipcMain.handle('suppliers:create', (_event, input: unknown) => createSupplier(input as Record<string, unknown>))
  ipcMain.handle('suppliers:update', (_event, input: unknown) => updateSupplier(input as Record<string, unknown>))
  ipcMain.handle('purchases:list', (_event, input: unknown) => listPurchases(input as Record<string, unknown>))
  ipcMain.handle('purchases:get', (_event, input: unknown) => getPurchaseDetail(input as { id?: unknown }))
  ipcMain.handle('purchases:create', (_event, input: unknown) => createPurchase(input as Record<string, unknown>))
  ipcMain.handle('purchases:markPaid', (_event, input: unknown) => markPurchasePaid(input as { id?: unknown }))
  ipcMain.handle('purchases:updateInvoice', (_event, input: unknown) => updatePurchaseInvoice(input as Record<string, unknown>))
  ipcMain.handle('stockMovements:list', (_event, input: unknown) => listStockMovements(input as Record<string, unknown>))
  ipcMain.handle('stockMovements:adjust', (_event, input: unknown) => adjustStock(input as Record<string, unknown>))
  ipcMain.handle('services:list', () => listServices())
  ipcMain.handle('services:create', (_event, input: unknown) => createService(input as Record<string, unknown>))
  ipcMain.handle('services:update', (_event, input: unknown) => updateService(input as Record<string, unknown>))
  ipcMain.handle('checkout:create', (_event, input: unknown) => createCheckout(input as Record<string, unknown>))
  ipcMain.handle('salesDrafts:list', () => listSalesDrafts())
  ipcMain.handle('salesDrafts:create', (_event, input: unknown) => createSalesDraft(input as Record<string, unknown>))
  ipcMain.handle('salesDrafts:delete', (_event, input: unknown) => deleteSalesDraft(input as Record<string, unknown>))
  ipcMain.handle('salesDrafts:saveItems', (_event, input: unknown) => saveSalesDraftItems(input as Record<string, unknown>))
  ipcMain.handle('invoices:list', (_event, input: unknown) => listInvoices(input as Record<string, unknown>))
  ipcMain.handle('invoices:get', (_event, input: unknown) => getInvoiceDetail(input as { id?: unknown }))
  ipcMain.handle('dashboard:getSummary', () => getDashboardSummary())
  ipcMain.handle('reports:getSummary', (_event, input: unknown) => getReportSummary(input as Record<string, unknown>))
  ipcMain.handle('workOrders:list', (_event, input: unknown) => listWorkOrders(input as Record<string, unknown>))
  ipcMain.handle('workOrders:get', (_event, input: unknown) => getWorkOrderDetail(input as { id?: unknown }))
  ipcMain.handle('workOrders:create', (_event, input: unknown) => createWorkOrder(input as Record<string, unknown>))
  ipcMain.handle('workOrders:update', (_event, input: unknown) => updateWorkOrder(input as Record<string, unknown>))
  ipcMain.handle('workOrders:updateStatus', (_event, input: unknown) => updateWorkOrderStatus(input as Record<string, unknown>))
  ipcMain.handle('workOrders:addItem', (_event, input: unknown) => addWorkOrderItem(input as Record<string, unknown>))
  ipcMain.handle('workOrders:updateItem', (_event, input: unknown) => updateWorkOrderItem(input as Record<string, unknown>))
  ipcMain.handle('workOrders:deleteItem', (_event, input: unknown) => deleteWorkOrderItem(input as Record<string, unknown>))
  ipcMain.handle('workOrders:checkout', (_event, input: unknown) => checkoutWorkOrder(input as Record<string, unknown>))
  ipcMain.handle('customers:list', () => listCustomers())
  ipcMain.handle('customers:create', (_event, input: unknown) => createCustomer(input as Record<string, unknown>))
  ipcMain.handle('customers:update', (_event, input: unknown) => updateCustomer(input as Record<string, unknown>))
  ipcMain.handle('customers:delete', (_event, input: unknown) => deleteCustomer(input as Record<string, unknown>))
  ipcMain.handle('vehicles:list', () => listVehicles())
  ipcMain.handle('vehicles:search', (_event, input: unknown) => searchVehicles(input as Record<string, unknown>))
  ipcMain.handle('vehicles:quickCreate', (_event, input: unknown) => quickCreateVehicle(input as Record<string, unknown>))
  ipcMain.handle('vehicles:create', (_event, input: unknown) => createVehicle(input as Record<string, unknown>))
  ipcMain.handle('vehicles:update', (_event, input: unknown) => updateVehicle(input as Record<string, unknown>))
  ipcMain.handle('vehicles:delete', (_event, input: unknown) => deleteVehicle(input as Record<string, unknown>))
  ipcMain.handle('users:list', () => listUsers())
  ipcMain.handle('users:create', async (_event, input: unknown) => {
    if (!input || typeof input !== 'object') {
      return {
        ok: false,
        message: 'Invalid user request',
      }
    }

    return createUser(input)
  })
  ipcMain.handle('users:update', async (_event, input: unknown) => {
    if (!input || typeof input !== 'object') {
      return {
        ok: false,
        message: 'Invalid user request',
      }
    }

    return updateUser(input)
  })
  ipcMain.handle('auth:login', async (event, credentials: { username?: unknown; password?: unknown }) => {
    if (typeof credentials.username !== 'string' || typeof credentials.password !== 'string') {
      return {
        ok: false,
        message: 'Invalid login request',
      }
    }

    const result = await authenticateUser(credentials.username, credentials.password)

    if (result.ok) {
      const win = BrowserWindow.fromWebContents(event.sender)

      if (win) {
        expandWindowForDashboard(win)
      }
    }

    return result
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', (event) => {
  if (isClosingDatabase) return

  event.preventDefault()
  isClosingDatabase = true

  void closeDatabase().finally(() => {
    app.quit()
  })
})
