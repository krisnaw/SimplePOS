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
  createUser,
  listUsers,
  updateUser,
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
  ipcMain.handle('auth:login', async (event, credentials: { email?: unknown; password?: unknown }) => {
    if (typeof credentials.email !== 'string' || typeof credentials.password !== 'string') {
      return {
        ok: false,
        message: 'Invalid login request',
      }
    }

    const result = await authenticateUser(credentials.email, credentials.password)

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
