import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('simplepos', {
  db: {
    getStatus: () => ipcRenderer.invoke('db:getStatus'),
  },
})
