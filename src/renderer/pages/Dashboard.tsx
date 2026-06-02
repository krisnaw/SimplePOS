import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Barcode, Database, FileText, LogOut, Printer } from 'lucide-react'
import { Button } from '@/renderer/components/ui/button'
import { navigationItems, sectionDetails } from '@/renderer/navigation'
import type { AppSection, AuthenticatedUser } from '@/shared/types/app'
import { DashboardOverview } from '@/renderer/workspaces/DashboardOverview'
import { InventoryWorkspace } from '@/renderer/workspaces/InventoryWorkspace'
import { ReportsWorkspace } from '@/renderer/workspaces/ReportsWorkspace'
import { SalesWorkspace } from '@/renderer/workspaces/SalesWorkspace'
import { SectionWorkspace } from '@/renderer/workspaces/SectionWorkspace'
import { SettingsWorkspace } from '@/renderer/workspaces/SettingsWorkspace'
import { UserManagement } from '@/renderer/workspaces/UserManagement'
import { cn } from '@/renderer/lib/utils'

type DashboardLocationState = {
  user?: AuthenticatedUser
}

const systemIndicators = [
  {
    label: 'Database',
    status: 'Online',
    icon: Database,
    tone: 'bg-green-500',
    connected: true,
  },
  {
    label: 'Printer',
    status: 'Online',
    icon: Printer,
    tone: 'bg-green-500',
    connected: true,
  },
  {
    label: 'Barcode Scanner',
    status: 'Standby',
    icon: Barcode,
    tone: 'bg-muted-foreground',
    connected: false,
  },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = (location.state as DashboardLocationState | null)?.user
  const [activeSection, setActiveSection] = useState<AppSection>('dashboard')
  const activeDetails = sectionDetails[activeSection]

  useEffect(() => {
    if (!user) {
      navigate('/', { replace: true })
    }
  }, [navigate, user])

  if (!user) return null

  return (
    <div className="h-screen overflow-hidden bg-muted/40 text-foreground">
      <div className="grid h-full min-h-0 lg:grid-cols-[280px_1fr]">
        <aside className="min-h-0 border-b bg-background lg:border-b-0 lg:border-r">
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex h-16 shrink-0 items-center gap-3 border-b px-4">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <FileText aria-hidden="true" data-icon="inline-start" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-base font-semibold">SimplePOS</h1>
                <p className="truncate text-xs text-muted-foreground">Car Repair Shop</p>
              </div>
            </div>

            <nav className="flex min-h-0 gap-2 overflow-x-auto p-3 lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden">
              {navigationItems.map((item) => {
                const Icon = item.icon
                const isActive = item.id === activeSection

                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => setActiveSection(item.id)}
                    className={cn(
                      'flex min-w-44 items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors lg:min-w-0',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <Icon aria-hidden="true" className="shrink-0" data-icon="inline-start" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{item.label}</span>
                      <span
                        className={cn(
                          'block truncate text-xs',
                          isActive ? 'text-primary-foreground/70' : 'text-muted-foreground',
                        )}
                      >
                        {item.description}
                      </span>
                    </span>
                  </button>
                )
              })}
            </nav>

            <div className="hidden border-t px-4 py-3 lg:block">
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium uppercase text-muted-foreground">System</p>
                <div className="flex flex-col gap-1">
                  {systemIndicators.map((item) => {
                    const Icon = item.icon

                    return (
                      <div
                        key={item.label}
                        className="flex min-h-9 items-center justify-between gap-3 rounded-md px-2 text-sm"
                      >
                        <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                          <Icon aria-hidden="true" className="size-4 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2 text-xs font-medium">
                          <span
                            className={cn('size-2 rounded-full', item.tone, item.connected ? 'animate-pulse' : null)}
                            aria-hidden="true"
                          />
                          {item.status}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="mt-auto hidden border-t p-4 lg:block">
              <div className="flex flex-col gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/', { replace: true })}>
                  <LogOut data-icon="inline-start" aria-hidden="true" />
                  Sign out
                </Button>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-col">
          <header className="flex min-h-16 shrink-0 items-center justify-between gap-4 border-b bg-background px-4 py-3 md:px-6">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase text-muted-foreground">{activeDetails.eyebrow}</p>
              <h2 className="truncate text-xl font-semibold tracking-tight">{activeDetails.title}</h2>
            </div>
            <Button className="hidden md:inline-flex" variant="outline" onClick={() => navigate('/', { replace: true })}>
              <LogOut data-icon="inline-start" aria-hidden="true" />
              Sign out
            </Button>
          </header>

          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-auto p-4 md:p-6">
            {activeSection === 'dashboard' ? <DashboardOverview user={user} /> : null}
            {activeSection === 'sales' ? <SalesWorkspace /> : null}
            {activeSection === 'inventory' ? <InventoryWorkspace /> : null}
            {activeSection === 'users' ? <UserManagement currentUser={user} /> : null}
            {activeSection === 'reports' ? <ReportsWorkspace /> : null}
            {activeSection === 'settings' ? <SettingsWorkspace /> : null}
            {activeSection !== 'dashboard' &&
            activeSection !== 'sales' &&
            activeSection !== 'inventory' &&
            activeSection !== 'users' &&
            activeSection !== 'reports' &&
            activeSection !== 'settings' ? (
              <SectionWorkspace section={activeSection} />
            ) : null}
          </div>
        </main>
      </div>
    </div>
  )
}
