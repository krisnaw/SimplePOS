import { useTranslation } from 'react-i18next'
import type { SupportedLanguage } from '@/renderer/i18n'
import { cn } from '@/renderer/lib/utils'

export function LanguageSelect({ className }: { className?: string }) {
  const { i18n, t } = useTranslation()
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language

  function changeLanguage(language: SupportedLanguage) {
    void i18n.changeLanguage(language)
  }

  return (
    <div
      className={cn('inline-flex min-h-10 items-center rounded-md bg-muted p-1 text-xs font-medium', className)}
      role="group"
      aria-label={t('settings.language')}
    >
      <button
        type="button"
        className={cn(
          'min-h-8 rounded px-2.5 transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.96]',
          currentLanguage === 'id' ? 'bg-background text-foreground shadow-border' : 'text-muted-foreground',
        )}
        aria-pressed={currentLanguage === 'id'}
        onClick={() => changeLanguage('id')}
      >
        ID
      </button>
      <span className="px-1 text-muted-foreground" aria-hidden="true">
        |
      </span>
      <button
        type="button"
        className={cn(
          'min-h-8 rounded px-2.5 transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.96]',
          currentLanguage === 'en' ? 'bg-background text-foreground shadow-border' : 'text-muted-foreground',
        )}
        aria-pressed={currentLanguage === 'en'}
        onClick={() => changeLanguage('en')}
      >
        EN
      </button>
    </div>
  )
}
