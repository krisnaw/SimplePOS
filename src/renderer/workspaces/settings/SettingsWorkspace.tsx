import { useEffect, useState } from 'react'
import { Database, Download, Printer, RefreshCw, Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/renderer/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/renderer/components/ui/card'
import { Input } from '@/renderer/components/ui/input'
import { cn } from '@/renderer/lib/utils'
import type { UpdateStatus } from '@/shared/types/updates'

const externalDevices = [
  {
    nameKey: 'system.database',
    descriptionKey: 'settings.devices.database.description',
    statusKey: 'common.online',
    type: 'SQLite',
    endpoint: 'simplepos.sqlite',
    icon: Database,
    connected: true,
  },
  {
    nameKey: 'system.printer',
    descriptionKey: 'settings.devices.printer.description',
    statusKey: 'common.online',
    type: 'Thermal printer',
    endpoint: 'USB / Auto detect',
    icon: Printer,
    connected: true,
  },
]

export function SettingsWorkspace() {
  const { t } = useTranslation()
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({
    state: 'idle',
    message: t('settings.updatesNotChecked'),
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
        message: error instanceof Error ? error.message : t('settings.unableToCheckUpdates'),
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
          <CardTitle>{t('settings.externalDevices')}</CardTitle>
          <CardDescription>{t('settings.devicesHint')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {externalDevices.map((device) => {
            const Icon = device.icon
            const deviceName = t(device.nameKey)

            return (
              <div key={device.nameKey} className="rounded-lg border bg-background p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <Icon aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{deviceName}</p>
                      <p className="text-xs text-muted-foreground">{t(device.descriptionKey)}</p>
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
                    {t(device.statusKey)}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    {t('settings.deviceType')}
                    <Input value={device.type} readOnly className="bg-muted" />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    {t('settings.connection')}
                    <Input value={device.endpoint} readOnly className="bg-muted" />
                  </label>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button type="button" variant="outline" size="sm">
                    <RefreshCw data-icon="inline-start" aria-hidden="true" />
                    {t('common.test')}
                  </Button>
                  <Button type="button" variant="outline" size="sm">
                    <Settings data-icon="inline-start" aria-hidden="true" />
                    {t('common.configure')}
                  </Button>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.deviceNotes')}</CardTitle>
          <CardDescription>{t('settings.notesPlaceholder')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
          <p className="text-pretty">{t('settings.printerHint')}</p>
          <p className="text-pretty">{t('settings.healthCheckHint')}</p>
          <div className="flex flex-col gap-2 rounded-lg border bg-muted p-3">
            <div className="flex items-start gap-2">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-green-500 animate-pulse" aria-hidden="true" />
              <span className="text-foreground">{t('settings.greenPulse')}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.softwareUpdates')}</CardTitle>
          <CardDescription>{t('settings.updatesHint')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="rounded-lg border bg-background p-3">
            <p className="text-sm font-medium">{updateStatus.message}</p>
            {typeof updateStatus.percent === 'number' ? (
              <p className="text-xs text-muted-foreground">
                {t('settings.percentDownloaded', { percent: Math.round(updateStatus.percent) })}
              </p>
            ) : null}
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={checkForUpdates} disabled={isCheckingUpdates}>
              <RefreshCw data-icon="inline-start" aria-hidden="true" />
              {isCheckingUpdates ? t('settings.checking') : t('settings.check')}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={installUpdate}
              disabled={updateStatus.state !== 'downloaded'}
            >
              <Download data-icon="inline-start" aria-hidden="true" />
              {t('settings.install')}
            </Button>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
