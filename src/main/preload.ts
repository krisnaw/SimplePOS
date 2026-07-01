import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('simplepos', {
  db: {
    getStatus: () => ipcRenderer.invoke('db:getStatus'),
  },
  auth: {
    login: (credentials: { email: string; password: string }) => {
      return ipcRenderer.invoke('auth:login', credentials)
    },
  },
  users: {
    list: () => ipcRenderer.invoke('users:list'),
    create: (input: { email: string; name: string; role: 'admin' | 'cashier'; password: string }) => {
      return ipcRenderer.invoke('users:create', input)
    },
    update: (input: {
      id: number
      email: string
      name: string
      role: 'admin' | 'cashier'
      isActive: boolean
      password?: string
    }) => {
      return ipcRenderer.invoke('users:update', input)
    },
  },
  categories: {
    list: () => ipcRenderer.invoke('categories:list'),
    create: (input: { name: string }) => ipcRenderer.invoke('categories:create', input),
  },
  products: {
    list: () => ipcRenderer.invoke('products:list'),
    create: (input: Record<string, unknown>) => ipcRenderer.invoke('products:create', input),
    update: (input: Record<string, unknown>) => ipcRenderer.invoke('products:update', input),
  },
  suppliers: {
    list: (input?: { includeInactive?: boolean }) => ipcRenderer.invoke('suppliers:list', input ?? {}),
    create: (input: Record<string, unknown>) => ipcRenderer.invoke('suppliers:create', input),
    update: (input: Record<string, unknown>) => ipcRenderer.invoke('suppliers:update', input),
  },
  purchases: {
    list: (input?: Record<string, unknown>) => ipcRenderer.invoke('purchases:list', input ?? {}),
    get: (input: { id: number }) => ipcRenderer.invoke('purchases:get', input),
    create: (input: Record<string, unknown>) => ipcRenderer.invoke('purchases:create', input),
    markPaid: (input: { id: number }) => ipcRenderer.invoke('purchases:markPaid', input),
    updateInvoice: (input: Record<string, unknown>) => ipcRenderer.invoke('purchases:updateInvoice', input),
  },
  services: {
    list: () => ipcRenderer.invoke('services:list'),
    create: (input: Record<string, unknown>) => ipcRenderer.invoke('services:create', input),
    update: (input: Record<string, unknown>) => ipcRenderer.invoke('services:update', input),
  },
  checkout: {
    create: (input: Record<string, unknown>) => ipcRenderer.invoke('checkout:create', input),
  },
  salesDrafts: {
    list: () => ipcRenderer.invoke('salesDrafts:list'),
    create: (input: Record<string, unknown>) => ipcRenderer.invoke('salesDrafts:create', input),
    delete: (input: Record<string, unknown>) => ipcRenderer.invoke('salesDrafts:delete', input),
    saveItems: (input: Record<string, unknown>) => ipcRenderer.invoke('salesDrafts:saveItems', input),
  },
  dashboard: {
    getSummary: () => ipcRenderer.invoke('dashboard:getSummary'),
  },
  reports: {
    getSummary: (input?: Record<string, unknown>) => ipcRenderer.invoke('reports:getSummary', input ?? {}),
  },
  invoices: {
    list: (input?: Record<string, unknown>) => ipcRenderer.invoke('invoices:list', input ?? {}),
    get: (input: { id: number }) => ipcRenderer.invoke('invoices:get', input),
  },
  workOrders: {
    list: (input?: Record<string, unknown>) => ipcRenderer.invoke('workOrders:list', input ?? {}),
    get: (input: { id: number }) => ipcRenderer.invoke('workOrders:get', input),
    create: (input: Record<string, unknown>) => ipcRenderer.invoke('workOrders:create', input),
    update: (input: Record<string, unknown>) => ipcRenderer.invoke('workOrders:update', input),
    updateStatus: (input: Record<string, unknown>) => ipcRenderer.invoke('workOrders:updateStatus', input),
    addItem: (input: Record<string, unknown>) => ipcRenderer.invoke('workOrders:addItem', input),
    updateItem: (input: Record<string, unknown>) => ipcRenderer.invoke('workOrders:updateItem', input),
    deleteItem: (input: { id: number }) => ipcRenderer.invoke('workOrders:deleteItem', input),
    checkout: (input: Record<string, unknown>) => ipcRenderer.invoke('workOrders:checkout', input),
  },
  customers: {
    list: () => ipcRenderer.invoke('customers:list'),
    create: (input: Record<string, unknown>) => ipcRenderer.invoke('customers:create', input),
    update: (input: Record<string, unknown>) => ipcRenderer.invoke('customers:update', input),
    delete: (input: { id: number }) => ipcRenderer.invoke('customers:delete', input),
  },
  vehicles: {
    list: () => ipcRenderer.invoke('vehicles:list'),
    search: (input: Record<string, unknown>) => ipcRenderer.invoke('vehicles:search', input),
    quickCreate: (input: Record<string, unknown>) => ipcRenderer.invoke('vehicles:quickCreate', input),
    create: (input: Record<string, unknown>) => ipcRenderer.invoke('vehicles:create', input),
    update: (input: Record<string, unknown>) => ipcRenderer.invoke('vehicles:update', input),
    delete: (input: { id: number }) => ipcRenderer.invoke('vehicles:delete', input),
  },
  updates: {
    getStatus: () => ipcRenderer.invoke('updates:getStatus'),
    check: () => ipcRenderer.invoke('updates:check'),
    install: () => ipcRenderer.invoke('updates:install'),
    onStatus: (callback: (status: unknown) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, status: unknown) => callback(status)

      ipcRenderer.on('updates:status', listener)

      return () => ipcRenderer.removeListener('updates:status', listener)
    },
  },
})
