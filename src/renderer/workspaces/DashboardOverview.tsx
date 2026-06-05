import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/renderer/components/ui/card'
import type { AuthenticatedUser } from '@/shared/types/app'

export function DashboardOverview({ user }: { user: AuthenticatedUser }) {
  return (
    <div className="stagger-children grid gap-4 md:grid-cols-3">
      <Card className="border-0 shadow-border transition-[box-shadow] duration-150 ease-out hover:shadow-border-hover">
        <CardHeader>
          <CardTitle className="text-base text-balance">User</CardTitle>
          <CardDescription className="text-pretty">Current session</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm">
          <span className="text-pretty">{user.email}</span>
          <span className="capitalize text-muted-foreground text-pretty">{user.role}</span>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-border transition-[box-shadow] duration-150 ease-out hover:shadow-border-hover">
        <CardHeader>
          <CardTitle className="text-base text-balance">Work Orders</CardTitle>
          <CardDescription className="text-pretty">Today</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold tabular-nums">0</p>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-border transition-[box-shadow] duration-150 ease-out hover:shadow-border-hover">
        <CardHeader>
          <CardTitle className="text-base text-balance">Inventory Alerts</CardTitle>
          <CardDescription className="text-pretty">Needs review</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold tabular-nums">0</p>
        </CardContent>
      </Card>
    </div>
  )
}
