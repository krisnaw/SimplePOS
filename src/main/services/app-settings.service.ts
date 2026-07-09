import { eq } from 'drizzle-orm'
import { flushDatabase } from '../db/client'
import { appSettings } from '../db/schema/index'
import { getCheckoutRepository } from '../repositories/checkout.repository'

const defaultAppSettings = {
  appName: 'SimplePOS',
  appDescription: 'Car Repair Shop',
}

export type AppSettingsSummary = typeof defaultAppSettings

export type AppSettingsMutationResult = {
  ok: boolean
  message: string
  settings?: AppSettingsSummary
}

function cleanString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim().replace(/\s+/g, ' ') : null
}

export async function getAppSettings(): Promise<AppSettingsSummary> {
  const repository = getCheckoutRepository()

  if (!repository) return defaultAppSettings

  const rows = await repository.select().from(appSettings)
  const values = new Map(rows.map((row) => [row.key, row.value]))

  return {
    appName: values.get('appName') || defaultAppSettings.appName,
    appDescription: values.get('appDescription') || defaultAppSettings.appDescription,
  }
}

export async function updateAppSettings(input: Record<string, unknown>): Promise<AppSettingsMutationResult> {
  const repository = getCheckoutRepository()

  if (!repository) return { ok: false, message: 'Database unavailable' }

  const appName = cleanString(input.appName)
  const appDescription = cleanString(input.appDescription)

  if (!appName || !appDescription) {
    return { ok: false, message: 'App name and description are required' }
  }

  const updatedAt = new Date().toISOString()

  for (const [key, value] of Object.entries({ appName, appDescription })) {
    const [existing] = await repository.select().from(appSettings).where(eq(appSettings.key, key)).limit(1)

    if (existing) {
      await repository.update(appSettings).set({ value, updatedAt }).where(eq(appSettings.key, key))
    } else {
      await repository.insert(appSettings).values({ key, value, updatedAt })
    }
  }

  await flushDatabase()

  return {
    ok: true,
    message: 'App identity updated',
    settings: { appName, appDescription },
  }
}
