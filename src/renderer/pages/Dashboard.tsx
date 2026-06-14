import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Barcode, Database, FileText, LogOut, Printer } from 'lucide-react'
import { Button } from '@/renderer/components/ui/button'
import { navigationItems, sectionDetails } from '@/renderer/navigation'
import type { AppSection } from '@/shared/types/app'
import type { AuthenticatedUser } from '@/shared/types/user'
import { CustomerWorkspace } from '@/renderer/workspaces/CustomerWorkspace'
import { DashboardOverview } from '@/renderer/workspaces/DashboardOverview'
import { InvoiceWorkspace } from '@/renderer/workspaces/InvoiceWorkspace'
import { InventoryWorkspace } from '@/renderer/workspaces/InventoryWorkspace'
import { ReportsWorkspace } from '@/renderer/workspaces/ReportsWorkspace'
import { SalesWorkspace } from '@/renderer/workspaces/SalesWorkspace'
import { SectionWorkspace } from '@/renderer/workspaces/SectionWorkspace'
import { SettingsWorkspace } from '@/renderer/workspaces/SettingsWorkspace'
import { UserGuideWorkspace } from '@/renderer/workspaces/UserGuideWorkspace'
import { UserManagement } from '@/renderer/workspaces/UserManagement'
import { WorkOrderWorkspace } from '@/renderer/workspaces/WorkOrderWorkspace'
import { cn } from '@/renderer/lib/utils'
import type { DashboardLocationState } from './Dashboard.types'

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
      <div className="grid h-full min-h-0 lg:grid-cols-[224px_1fr]">
        <aside className="min-h-0 border-b bg-background lg:border-b-0 lg:border-r">
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex h-14 shrink-0 items-center gap-2.5 border-b px-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <FileText aria-hidden="true" data-icon="inline-start" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-base font-semibold text-balance">SimplePOS</h1>
                <p className="truncate text-[11px] leading-4 text-muted-foreground text-pretty">Car Repair Shop</p>
              </div>
            </div>

            <nav className="flex min-h-0 gap-1.5 overflow-x-auto p-2 lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden">
              {navigationItems.map((item) => {
                const Icon = item.icon
                const isActive = item.id === activeSection

                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => setActiveSection(item.id)}
                    title={item.description}
                    className={cn(
                      'flex min-h-10 min-w-36 items-center gap-2.5 rounded-md px-2.5 text-left text-sm transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.96] lg:min-w-0',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <Icon aria-hidden="true" className="size-4 shrink-0" data-icon="inline-start" />
                    <span className="min-w-0 truncate font-medium">{item.label}</span>
                  </button>
                )
              })}
            </nav>

            <div className="hidden border-t px-2 py-2 lg:block">
              <div className="flex flex-col gap-1.5">
                <p className="px-1 text-[10px] font-medium uppercase leading-4 tracking-wide text-muted-foreground">
                  System
                </p>
                <div className="flex flex-col gap-1">
                  {systemIndicators.map((item) => {
                    const Icon = item.icon

                    return (
                      <div
                        key={item.label}
                        className="flex min-h-8 items-center justify-between gap-2 rounded-md px-1.5 text-xs"
                      >
                        <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                          <Icon aria-hidden="true" className="size-3.5 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2 text-xs font-medium">
                          <span
                            className={cn(
                              'size-2 shrink-0 rounded-full',
                              item.tone,
                              item.connected ? 'status-dot-pulse' : null,
                            )}
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

            <div className="mt-auto hidden border-t p-2 lg:block">
              <div className="flex flex-col gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{user.name}</p>
                  <p className="truncate text-[11px] leading-4 text-muted-foreground">{user.email}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="transition-[transform,box-shadow] duration-150 ease-out active:scale-[0.96] active:translate-y-0"
                  onClick={() => navigate('/', { replace: true })}
                >
                  <LogOut data-icon="inline-start" aria-hidden="true" />
                  Sign out
                </Button>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-col">
          <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b bg-background px-3 md:px-4">
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground text-pretty leading-none">
                {activeDetails.eyebrow}
              </p>
              <h2 className="truncate text-base font-semibold tracking-tight text-balance leading-none">
                {activeDetails.title}
              </h2>
            </div>
            <Button
              className="hidden transition-[transform,box-shadow] duration-150 ease-out active:scale-[0.96] active:translate-y-0 md:inline-flex"
              variant="outline"
              onClick={() => navigate('/', { replace: true })}
            >
              <LogOut data-icon="inline-start" aria-hidden="true" />
              Sign out
            </Button>
          </header>

          <div className="flex min-h-0 flex-1 flex-col overflow-auto p-3 md:p-4">
            <div
              key={activeSection}
              className={cn('flex flex-col gap-4', activeSection !== 'dashboard' && 'content-enter')}
            >
              {activeSection === 'dashboard' ? <DashboardOverview user={user} /> : null}
              {activeSection === 'sales' ? <SalesWorkspace currentUser={user} /> : null}
              {activeSection === 'inventory' ? <InventoryWorkspace /> : null}
              {activeSection === 'work-orders' ? <WorkOrderWorkspace currentUser={user} /> : null}
              {activeSection === 'customers' ? <CustomerWorkspace /> : null}
              {activeSection === 'invoices' ? <InvoiceWorkspace /> : null}
              {activeSection === 'users' ? <UserManagement currentUser={user} /> : null}
              {activeSection === 'reports' ? <ReportsWorkspace /> : null}
              {activeSection === 'user-guide' ? <UserGuideWorkspace /> : null}
              {activeSection === 'settings' ? <SettingsWorkspace /> : null}
              {activeSection !== 'dashboard' &&
              activeSection !== 'sales' &&
              activeSection !== 'inventory' &&
              activeSection !== 'work-orders' &&
              activeSection !== 'customers' &&
              activeSection !== 'invoices' &&
              activeSection !== 'users' &&
              activeSection !== 'reports' &&
              activeSection !== 'user-guide' &&
              activeSection !== 'settings' ? (
                <SectionWorkspace section={activeSection} />
              ) : null}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
