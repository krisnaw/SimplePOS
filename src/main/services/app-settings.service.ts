import { eq } from 'drizzle-orm'
import { flushDatabase } from '../db/client'
import { appSettings } from '../db/schema/index'
import { getCheckoutRepository } from '../repositories/checkout.repository'

export type AppIdentity = {
  appName: string
  appDescription: string
}

export type BusinessProfile = {
  companyLogo: string | null
  companyName: string
  email: string
  phone: string
  address: string
  instagram: string
}

export type AppSettingsSummary = {
  appIdentity: AppIdentity
  businessProfile: BusinessProfile
}

const defaultAppSettings: AppSettingsSummary = {
  appIdentity: {
    appName: 'SimplePOS',
    appDescription: 'Car Repair Shop',
  },
  businessProfile: {
    companyLogo: null,
    companyName: 'SimplePOS',
    email: '',
    phone: '',
    address: '',
    instagram: '',
  },
}

export type AppSettingsMutationResult = {
  ok: boolean
  message: string
  settings?: AppSettingsSummary
}

function cleanString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim().replace(/\s+/g, ' ') : null
}

function cleanOptionalString(value: unknown): string | null {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : null
}

function cleanCompanyLogo(value: unknown): string | null | undefined {
  if (value === null || value === '') return null
  if (typeof value !== 'string' || value.length > 2_800_000) return undefined
  return /^data:image\/(?:png|jpeg|webp);base64,/.test(value) ? value : undefined
}

function parseBusinessProfile(value: string | undefined): Partial<BusinessProfile> {
  if (!value) return {}

  try {
    const parsed = JSON.parse(value) as Record<string, unknown>
    const companyLogo = cleanCompanyLogo(parsed.companyLogo)

    return {
      companyName: cleanOptionalString(parsed.companyName) ?? undefined,
      companyLogo: companyLogo === undefined ? undefined : companyLogo,
      email: cleanOptionalString(parsed.email) ?? undefined,
      phone: cleanOptionalString(parsed.phone) ?? undefined,
      address: cleanOptionalString(parsed.address) ?? undefined,
      instagram: cleanOptionalString(parsed.instagram) ?? undefined,
    }
  } catch {
    return {}
  }
}

async function saveSetting(key: string, value: string): Promise<void> {
  const repository = getCheckoutRepository()
  if (!repository) return

  const updatedAt = new Date().toISOString()
  const [existing] = await repository.select().from(appSettings).where(eq(appSettings.key, key)).limit(1)

  if (existing) {
    await repository.update(appSettings).set({ value, updatedAt }).where(eq(appSettings.key, key))
  } else {
    await repository.insert(appSettings).values({ key, value, updatedAt })
  }
}

export async function getAppSettings(): Promise<AppSettingsSummary> {
  const repository = getCheckoutRepository()

  if (!repository) return defaultAppSettings

  const rows = await repository.select().from(appSettings)
  const values = new Map(rows.map((row) => [row.key, row.value]))

  const appIdentity = {
    appName: values.get('appName') || defaultAppSettings.appIdentity.appName,
    appDescription: values.get('appDescription') || defaultAppSettings.appIdentity.appDescription,
  }
  const savedBusinessProfile = parseBusinessProfile(values.get('businessProfile'))

  return {
    appIdentity,
    businessProfile: {
      ...defaultAppSettings.businessProfile,
      companyName: appIdentity.appName,
      companyLogo: values.get('companyLogo') || null,
      ...savedBusinessProfile,
    },
  }
}

export async function updateAppIdentity(input: Record<string, unknown>): Promise<AppSettingsMutationResult> {
  const repository = getCheckoutRepository()

  if (!repository) return { ok: false, message: 'Database unavailable' }

  const appName = cleanString(input.appName)
  const appDescription = cleanString(input.appDescription)

  if (!appName || !appDescription) {
    return { ok: false, message: 'App name and description are required' }
  }

  await saveSetting('appName', appName)
  await saveSetting('appDescription', appDescription)

  await flushDatabase()

  return {
    ok: true,
    message: 'App identity updated',
    settings: await getAppSettings(),
  }
}

export async function updateBusinessProfile(input: Record<string, unknown>): Promise<AppSettingsMutationResult> {
  const repository = getCheckoutRepository()

  if (!repository) return { ok: false, message: 'Database unavailable' }

  const companyName = cleanString(input.companyName)
  const companyLogo = cleanCompanyLogo(input.companyLogo)
  const email = cleanOptionalString(input.email)
  const phone = cleanOptionalString(input.phone)
  const address = cleanOptionalString(input.address)
  const instagram = cleanOptionalString(input.instagram)

  if (!companyName) {
    return { ok: false, message: 'Company name is required' }
  }
  if (companyLogo === undefined) {
    return { ok: false, message: 'Company logo must be a PNG, JPEG, or WebP image up to 2 MB' }
  }
  if (email === null || phone === null || address === null || instagram === null) {
    return { ok: false, message: 'Business profile fields must be text' }
  }

  const businessProfile: BusinessProfile = {
    companyLogo,
    companyName,
    email,
    phone,
    address,
    instagram,
  }

  await saveSetting('businessProfile', JSON.stringify(businessProfile))
  await flushDatabase()

  return {
    ok: true,
    message: 'Business profile updated',
    settings: await getAppSettings(),
  }
}
