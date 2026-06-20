import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LanguageSelect } from '@/renderer/components/LanguageSelect'
import { Button } from '@/renderer/components/ui/button'
import { Input } from '@/renderer/components/ui/input'
import { Label } from '@/renderer/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/renderer/components/ui/card'
import { cn } from '@/renderer/lib/utils'
import type { DatabaseConnectionState, DatabaseIndicator } from './Login.types'

export default function Login() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [database, setDatabase] = useState<DatabaseIndicator>({
    state: 'checking',
    message: t('login.dbChecking'),
  })
  const [authMessage, setAuthMessage] = useState('')
  const [authIsError, setAuthIsError] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let isMounted = true

    const promise = window.simplepos?.db?.getStatus()

    if (!promise) {
      setDatabase({ state: 'error', message: t('login.dbUnavailable') })
      return
    }

    promise
      .then((status) => {
        if (!isMounted) return

        setDatabase({
          state: status.state,
          message: status.message,
        })
      })
      .catch((error) => {
        if (!isMounted) return

        setDatabase({
          state: 'error',
          message: error instanceof Error ? error.message : t('login.dbUnavailable'),
        })
      })

    return () => {
      isMounted = false
    }
  }, [t])

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault()

    setIsSubmitting(true)
    setAuthMessage('')
    setAuthIsError(false)

    try {
      const result = await window.simplepos?.auth.login({ email, password })

      setAuthMessage(result?.message ?? t('login.authUnavailable'))
      setAuthIsError(!result?.ok)

      if (result?.ok && result.user) {
        navigate('/dashboard', {
          replace: true,
          state: {
            user: result.user,
          },
        })
      }
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : t('login.authUnavailable'))
      setAuthIsError(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm flex flex-col gap-6 login-stagger">

        <div className="text-center flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">{t('login.title')}</h1>
          <p className="text-sm text-muted-foreground text-pretty">{t('login.subtitle')}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('login.signIn')}</CardTitle>
            <CardDescription>{t('login.credentialsHint')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">{t('login.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@simplepos.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">{t('login.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>

              <div
                className={cn(
                  'grid transition-[grid-template-rows,opacity] duration-150 ease-in',
                  authMessage ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                )}
              >
                <div className="overflow-hidden">
                  <p
                    className={cn(
                      'text-sm transition-[transform] duration-150 ease-in',
                      authIsError ? 'text-destructive' : 'text-muted-foreground',
                      authMessage ? 'translate-y-0' : '-translate-y-3',
                    )}
                    role="status"
                    aria-live="polite"
                  >
                    {authMessage || '\u00a0'}
                  </p>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-10 transition-[transform,box-shadow] duration-150 ease-out active:scale-[0.96] active:translate-y-0"
                disabled={isSubmitting}
              >
                <span className="relative flex items-center justify-center gap-2 min-h-4">
                  <span
                    className={cn(
                      'flex items-center gap-2 transition-[opacity,filter,scale] duration-300 ease-[cubic-bezier(0.2,0,0,1)]',
                      isSubmitting
                        ? 'absolute scale-[0.25] opacity-0 blur-[4px]'
                        : 'scale-100 opacity-100 blur-0',
                    )}
                  >
                    {t('login.signIn')}
                  </span>
                  <span
                    className={cn(
                      'flex items-center gap-2 transition-[opacity,filter,scale] duration-300 ease-[cubic-bezier(0.2,0,0,1)]',
                      isSubmitting
                        ? 'scale-100 opacity-100 blur-0'
                        : 'absolute scale-[0.25] opacity-0 blur-[4px]',
                    )}
                  >
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    {t('login.signingIn')}
                  </span>
                </span>
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground text-pretty">
          {t('login.version')}
        </p>

        <LanguageSelect className="flex items-center justify-center gap-2" />

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span
            className={cn(
              'relative size-2 shrink-0 rounded-full transition-[background-color,scale] duration-300 ease-out',
              database.state === 'checking' && 'bg-amber-500 status-dot-pulse',
              (database.state === 'connected_existing' || database.state === 'connected_created') &&
                'bg-emerald-600',
              database.state === 'error' && 'bg-red-600',
            )}
            aria-hidden="true"
          />
          <span className="text-pretty transition-opacity duration-300 ease-out">{database.message}</span>
        </div>

      </div>
    </div>
  )
}
