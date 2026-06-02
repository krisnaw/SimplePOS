import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type DatabaseConnectionState = 'checking' | 'connected_existing' | 'connected_created' | 'error'

type DatabaseIndicator = {
  state: DatabaseConnectionState
  message: string
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [database, setDatabase] = useState<DatabaseIndicator>({
    state: 'checking',
    message: 'Checking database connection',
  })

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // auth logic will go here
  }

  return (
    <div className="min-h-screen bg-zinc-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">

        <div className="text-center space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">SimplePOS</h1>
          <p className="text-sm text-muted-foreground">Car Repair Shop Management</p>
        </div>

        <Card>
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-base">Sign in</CardTitle>
            <CardDescription>Enter your credentials to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
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
              <div className="space-y-2">
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
              <Button type="submit" className="w-full">
                Sign in
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          SimplePOS v1.0.0
        </p>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span
            className={[
              'h-2 w-2 rounded-full',
              database.state === 'checking' ? 'bg-amber-500' : '',
              database.state === 'connected_existing' || database.state === 'connected_created' ? 'bg-emerald-600' : '',
              database.state === 'error' ? 'bg-red-600' : '',
            ].join(' ')}
            aria-hidden="true"
          />
          <span>{database.message}</span>
        </div>

      </div>
    </div>
  )
}
