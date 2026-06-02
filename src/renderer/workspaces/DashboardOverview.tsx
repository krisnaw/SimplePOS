import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/renderer/components/ui/card'
import type { AuthenticatedUser } from '@/shared/types/app'

export function DashboardOverview({ user }: { user: AuthenticatedUser }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">User</CardTitle>
          <CardDescription>Current session</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm">
          <span>{user.email}</span>
          <span className="capitalize text-muted-foreground">{user.role}</span>
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
  )
}
