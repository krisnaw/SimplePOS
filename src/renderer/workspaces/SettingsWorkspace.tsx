import { useEffect, useState } from 'react'
import { Barcode, Database, Download, Printer, RefreshCw, Settings } from 'lucide-react'
import { Button } from '@/renderer/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/renderer/components/ui/card'
import { Input } from '@/renderer/components/ui/input'
import { cn } from '@/renderer/lib/utils'
import type { UpdateStatus } from '@/shared/types/updates'

const externalDevices = [
  {
    name: 'Database',
    description: 'Local POS data storage',
    status: 'Online',
    type: 'SQLite',
    endpoint: 'simplepos.sqlite',
    icon: Database,
    connected: true,
  },
  {
    name: 'Printer',
    description: 'Default receipt output device',
    status: 'Online',
    type: 'Thermal printer',
    endpoint: 'USB / Auto detect',
    icon: Printer,
    connected: true,
  },
  {
    name: 'Barcode Scanner',
    description: 'Product lookup input device',
    status: 'Not configured',
    type: 'HID scanner',
    endpoint: 'Keyboard wedge / USB',
    icon: Barcode,
    connected: false,
  },
]

export function SettingsWorkspace() {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({
    state: 'idle',
    message: 'Updates have not been checked yet',
  })
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false)

  useEffect(() => {
    let isMounted = true

    window.simplepos?.updates.getStatus().then((status) => {
      if (!isMounted) return
      setUpdateStatus(status)
    })

    const unsubscribe = window.simplepos?.updates.onStatus((status) => {
      setUpdateStatus(status)
      setIsCheckingUpdates(status.state === 'checking' || status.state === 'downloading')
    })

    return () => {
      isMounted = false
      unsubscribe?.()
    }
  }, [])

  async function checkForUpdates() {
    setIsCheckingUpdates(true)

    try {
      const status = await window.simplepos?.updates.check()

      if (status) {
        setUpdateStatus(status)
      }
    } catch (error) {
      setUpdateStatus({
        state: 'error',
        message: error instanceof Error ? error.message : 'Unable to check for updates',
      })
    } finally {
      setIsCheckingUpdates(false)
    }
  }

  async function installUpdate() {
    const result = await window.simplepos?.updates.install()

    if (result) {
      setUpdateStatus({
        state: result.ok ? 'downloaded' : 'error',
        message: result.message,
      })
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">External Devices</CardTitle>
          <CardDescription>Manage hardware and service connections used by the POS.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {externalDevices.map((device) => {
            const Icon = device.icon

            return (
              <div key={device.name} className="rounded-lg border bg-background p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <Icon aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{device.name}</p>
                      <p className="text-xs text-muted-foreground">{device.description}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-xs font-medium">
                    <span
                      className={cn(
                        'size-2 rounded-full',
                        device.connected ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground',
                      )}
                      aria-hidden="true"
                    />
                    {device.status}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    Device type
                    <Input value={device.type} readOnly className="bg-muted" />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    Connection
                    <Input value={device.endpoint} readOnly className="bg-muted" />
                  </label>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button type="button" variant="outline" size="sm">
                    <RefreshCw data-icon="inline-start" aria-hidden="true" />
                    Test
                  </Button>
                  <Button type="button" variant="outline" size="sm">
                    <Settings data-icon="inline-start" aria-hidden="true" />
                    Configure
                  </Button>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Device Notes</CardTitle>
          <CardDescription>Configuration placeholders for later integration.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
          <p>Printer and barcode scanner actions are UI-only until device discovery is connected.</p>
          <p>Connected indicators can be wired to IPC health checks when the hardware layer is added.</p>
          <div className="flex flex-col gap-2 rounded-lg border bg-background p-3">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-green-500 animate-pulse" aria-hidden="true" />
              <span>Green pulse means the device is connected.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-muted-foreground" aria-hidden="true" />
              <span>Muted dot means the device is standby or not configured.</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="xl:col-start-2">
        <CardHeader>
          <CardTitle className="text-base">Software Updates</CardTitle>
          <CardDescription>Updates are delivered from GitHub Releases.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="rounded-lg border bg-background p-3">
            <p className="text-sm font-medium">{updateStatus.message}</p>
            {typeof updateStatus.percent === 'number' ? (
              <p className="text-xs text-muted-foreground">{Math.round(updateStatus.percent)}% downloaded</p>
            ) : null}
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={checkForUpdates} disabled={isCheckingUpdates}>
              <RefreshCw data-icon="inline-start" aria-hidden="true" />
              {isCheckingUpdates ? 'Checking' : 'Check'}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={installUpdate}
              disabled={updateStatus.state !== 'downloaded'}
            >
              <Download data-icon="inline-start" aria-hidden="true" />
              Install
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
