import { useEffect, useState } from 'react'
import { Database, Download, FolderTree, Printer, RefreshCw, Settings, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/renderer/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/renderer/components/ui/card'
import { Input } from '@/renderer/components/ui/input'
import { cn } from '@/renderer/lib/utils'
import type { AuthenticatedUser } from '@/shared/types/user'
import type { UpdateStatus } from '@/shared/types/updates'
import { UserManagement } from '@/renderer/workspaces/users/UserManagement'
import { ProductCategorySettingsScreen } from './ProductCategorySettingsScreen'

type AppSettingsForm = {
  appName: string
  appDescription: string
}

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

type SettingsTab = 'devices' | 'product-categories' | 'users' | 'updates'

const settingsTabs = [
  { id: 'devices', labelKey: 'settings.tabs.devices', icon: Settings },
  { id: 'product-categories', labelKey: 'settings.tabs.productCategories', icon: FolderTree },
  { id: 'users', labelKey: 'settings.tabs.users', icon: Users },
  { id: 'updates', labelKey: 'settings.tabs.updates', icon: Download },
] as const

export function SettingsWorkspace({
  currentUser,
  appSettings,
  onAppSettingsChange,
}: {
  currentUser: AuthenticatedUser
  appSettings: AppSettingsForm
  onAppSettingsChange: (settings: AppSettingsForm) => void
}) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<SettingsTab>('devices')
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
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-1">
      <div
        role="tablist"
        aria-label={t('settings.tabs.sectionsLabel')}
        className="flex shrink-0 items-center gap-1 overflow-x-auto rounded-lg bg-muted p-1"
      >
        {settingsTabs.map((tab) => {
          const isActive = activeTab === tab.id
          const Icon = tab.icon

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex h-9 min-w-44 flex-1 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium transition-[background-color,color,box-shadow,transform] duration-150 ease-out active:scale-[0.96]',
                isActive ? 'bg-background text-foreground shadow-border' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              <span className="truncate">{t(tab.labelKey)}</span>
            </button>
          )
        })}
      </div>

      {activeTab === 'devices' ? (
        <DeviceSettingsPanel appSettings={appSettings} onAppSettingsChange={onAppSettingsChange} />
      ) : null}
      {activeTab === 'product-categories' ? <ProductCategorySettingsScreen /> : null}
      {activeTab === 'users' ? <UserManagement currentUser={currentUser} /> : null}
      {activeTab === 'updates' ? (
        <UpdateSettingsPanel
          updateStatus={updateStatus}
          isCheckingUpdates={isCheckingUpdates}
          onCheckForUpdates={checkForUpdates}
          onInstallUpdate={installUpdate}
        />
      ) : null}
    </div>
  )
}

function DeviceSettingsPanel({
  appSettings,
  onAppSettingsChange,
}: {
  appSettings: AppSettingsForm
  onAppSettingsChange: (settings: AppSettingsForm) => void
}) {
  const { t } = useTranslation()
  const [form, setForm] = useState(appSettings)
  const [message, setMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setForm(appSettings)
  }, [appSettings])

  async function saveAppSettings() {
    if (isSaving) return

    setIsSaving(true)
    const result = await window.simplepos?.settings?.updateApp(form)
    setIsSaving(false)

    if (!result) {
      setMessage(t('settings.appIdentity.unavailable'))
      return
    }

    setMessage(result.message)
    if (result.ok && result.settings) onAppSettingsChange(result.settings)
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t('settings.appIdentity.title')}</CardTitle>
          <CardDescription>{t('settings.appIdentity.description')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              {t('settings.appIdentity.name')}
              <Input
                value={form.appName}
                onChange={(event) => setForm((current) => ({ ...current, appName: event.target.value }))}
                placeholder={t('settings.appIdentity.namePlaceholder')}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              {t('settings.appIdentity.descriptionLabel')}
              <Input
                value={form.appDescription}
                onChange={(event) => setForm((current) => ({ ...current, appDescription: event.target.value }))}
                placeholder={t('settings.appIdentity.descriptionPlaceholder')}
              />
            </label>
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="min-h-5 text-sm text-muted-foreground" role="status">{message}</p>
            <Button
              type="button"
              size="sm"
              onClick={saveAppSettings}
              disabled={isSaving || !form.appName.trim() || !form.appDescription.trim()}
            >
              {isSaving ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="w-full">
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

      <Card className="w-full">
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
    </div>
  )
}

function UpdateSettingsPanel({
  updateStatus,
  isCheckingUpdates,
  onCheckForUpdates,
  onInstallUpdate,
}: {
  updateStatus: UpdateStatus
  isCheckingUpdates: boolean
  onCheckForUpdates: () => void
  onInstallUpdate: () => void
}) {
  const { t } = useTranslation()

  return (
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
          <Button type="button" variant="outline" size="sm" onClick={onCheckForUpdates} disabled={isCheckingUpdates}>
            <RefreshCw data-icon="inline-start" aria-hidden="true" />
            {isCheckingUpdates ? t('settings.checking') : t('settings.check')}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onInstallUpdate}
            disabled={updateStatus.state !== 'downloaded'}
          >
            <Download data-icon="inline-start" aria-hidden="true" />
            {t('settings.install')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
