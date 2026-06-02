import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type DatabaseConnectionState = 'checking' | 'connected_existing' | 'connected_created' | 'error'

type DatabaseIndicator = {
  state: DatabaseConnectionState
  message: string
}

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [database, setDatabase] = useState<DatabaseIndicator>({
    state: 'checking',
    message: 'Checking database connection',
  })
  const [authMessage, setAuthMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let isMounted = true

    window.simplepos?.db.getStatus()
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
          message: error instanceof Error ? error.message : 'Database unavailable',
        })
      })

    return () => {
      isMounted = false
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setIsSubmitting(true)
    setAuthMessage('')

    try {
      const result = await window.simplepos?.auth.login({ email, password })

      setAuthMessage(result?.message ?? 'Authentication unavailable')

      if (result?.ok && result.user) {
        navigate('/dashboard', {
          replace: true,
          state: {
            user: result.user,
          },
        })
      }
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'Authentication unavailable')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm flex flex-col gap-6">

        <div className="text-center flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">SimplePOS</h1>
          <p className="text-sm text-muted-foreground">Car Repair Shop Management</p>
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-1 pb-4">
            <CardTitle className="text-base">Sign in</CardTitle>
            <CardDescription>Enter your credentials to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@simplepos.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {authMessage ? (
                <p className="text-sm text-muted-foreground" role="status">
                  {authMessage}
                </p>
              ) : null}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Signing in' : 'Sign in'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          SimplePOS v1.0.0
        </p>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span
            className={cn(
              'h-2 w-2 rounded-full',
              database.state === 'checking' && 'bg-amber-500',
              (database.state === 'connected_existing' || database.state === 'connected_created') && 'bg-emerald-600',
              database.state === 'error' && 'bg-red-600',
            )}
            aria-hidden="true"
          />
          <span>{database.message}</span>
        </div>

      </div>
    </div>
  )
}
