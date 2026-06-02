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
})
