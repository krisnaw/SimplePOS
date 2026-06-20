import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import id from './locales/id.json'

export const supportedLanguages = [
  { code: 'en', label: 'English' },
  { code: 'id', label: 'Indonesia' },
] as const

export type SupportedLanguage = (typeof supportedLanguages)[number]['code']

export const defaultLanguage: SupportedLanguage = 'id'
export const languageStorageKey = 'simplepos.language'

function getInitialLanguage(): SupportedLanguage {
  const storedLanguage = window.localStorage.getItem(languageStorageKey)

  if (storedLanguage === 'en' || storedLanguage === 'id') {
    return storedLanguage
  }

  return defaultLanguage
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    id: { translation: id },
  },
  lng: getInitialLanguage(),
  fallbackLng: defaultLanguage,
  interpolation: {
    escapeValue: false,
  },
})

i18n.on('languageChanged', (language) => {
  if (language === 'en' || language === 'id') {
    window.localStorage.setItem(languageStorageKey, language)
    document.documentElement.lang = language
  }
})

document.documentElement.lang = i18n.language

export default i18n
