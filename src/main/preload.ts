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
})
