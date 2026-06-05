import { app, BrowserWindow, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'

export type UpdateStatus = {
  state:
    | 'idle'
    | 'checking'
    | 'available'
    | 'not_available'
    | 'downloading'
    | 'downloaded'
    | 'error'
  message: string
  version?: string
  percent?: number
}

let currentStatus: UpdateStatus = {
  state: 'idle',
  message: 'Updates have not been checked yet',
}

function broadcastStatus(status: UpdateStatus): void {
  currentStatus = status

  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('updates:status', status)
  }
}

export function registerUpdateHandlers(): void {
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    broadcastStatus({
      state: 'checking',
      message: 'Checking for updates',
    })
  })

  autoUpdater.on('update-available', (info) => {
    broadcastStatus({
      state: 'available',
      message: `Update ${info.version} is available. Downloading now.`,
      version: info.version,
    })
  })

  autoUpdater.on('update-not-available', (info) => {
    broadcastStatus({
      state: 'not_available',
      message: 'SimplePOS is up to date',
      version: info.version,
    })
  })

  autoUpdater.on('download-progress', (progress) => {
    broadcastStatus({
      state: 'downloading',
      message: `Downloading update ${Math.round(progress.percent)}%`,
      percent: progress.percent,
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    broadcastStatus({
      state: 'downloaded',
      message: `Update ${info.version} is ready to install`,
      version: info.version,
    })
  })

  autoUpdater.on('error', (error) => {
    broadcastStatus({
      state: 'error',
      message: error.message,
    })
  })

  ipcMain.handle('updates:getStatus', () => currentStatus)
  ipcMain.handle('updates:check', async () => {
    if (!app.isPackaged) {
      const status: UpdateStatus = {
        state: 'idle',
        message: 'Updates are available only in packaged builds',
      }

      broadcastStatus(status)
      return status
    }

    await autoUpdater.checkForUpdates()
    return currentStatus
  })

  ipcMain.handle('updates:install', () => {
    if (currentStatus.state !== 'downloaded') {
      return {
        ok: false,
        message: 'No downloaded update is ready to install',
      }
    }

    autoUpdater.quitAndInstall(false, true)
    return {
      ok: true,
      message: 'Installing update',
    }
  })
}
