import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { closeDatabase, getDatabaseStatus, initializeDatabase } from './db'

function createWindow(): void {
  const win = new BrowserWindow({
    width: 420,
    height: 580,
    resizable: false,
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

app.whenReady().then(() => {
  initializeDatabase(app.getAppPath())

  ipcMain.handle('db:getStatus', () => getDatabaseStatus())

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  closeDatabase()
})
