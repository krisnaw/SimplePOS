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
  },
  products: {
    list: () => ipcRenderer.invoke('products:list'),
    create: (input: Record<string, unknown>) => ipcRenderer.invoke('products:create', input),
    update: (input: Record<string, unknown>) => ipcRenderer.invoke('products:update', input),
  },
  customers: {
    list: () => ipcRenderer.invoke('customers:list'),
    create: (input: Record<string, unknown>) => ipcRenderer.invoke('customers:create', input),
    update: (input: Record<string, unknown>) => ipcRenderer.invoke('customers:update', input),
    delete: (input: { id: number }) => ipcRenderer.invoke('customers:delete', input),
  },
  vehicles: {
    list: () => ipcRenderer.invoke('vehicles:list'),
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
