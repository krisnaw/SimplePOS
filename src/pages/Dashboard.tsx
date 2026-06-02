import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type AuthenticatedUser = {
  id: number
  email: string
  name: string
  role: 'admin' | 'staff'
}

type DashboardLocationState = {
  user?: AuthenticatedUser
}

export default function Dashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = (location.state as DashboardLocationState | null)?.user

  useEffect(() => {
    if (!user) {
      navigate('/', { replace: true })
    }
  }, [navigate, user])

  if (!user) return null

  return (
    <div className="min-h-screen bg-zinc-100">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <div>
            <h1 className="text-lg font-semibold">SimplePOS</h1>
            <p className="text-sm text-muted-foreground">Car Repair Shop Management</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/', { replace: true })}>
            Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6">
        <section>
          <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
          <p className="text-sm text-muted-foreground">Signed in as {user.name}</p>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">User</CardTitle>
              <CardDescription>Current session</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 text-sm">
              <span>{user.email}</span>
              <span className="text-muted-foreground">{user.role}</span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Work Orders</CardTitle>
              <CardDescription>Today</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">0</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Inventory Alerts</CardTitle>
              <CardDescription>Needs review</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">0</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
