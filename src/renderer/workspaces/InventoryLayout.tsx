import type { ReactNode } from 'react'
import { ClipboardList, Package, ReceiptText } from 'lucide-react'
import { cn } from '@/renderer/lib/utils'

export type InventoryLayoutTab = 'product' | 'purchase' | 'moving'

const inventorySectionTabs = [
  { id: 'product', label: 'Product', icon: Package },
  { id: 'purchase', label: 'Purchase', icon: ReceiptText },
  { id: 'moving', label: 'Moving', icon: ClipboardList },
] as const

type InventoryLayoutProps = {
  activeTab: InventoryLayoutTab
  children: ReactNode
  className?: string
  onTabChange: (tab: InventoryLayoutTab) => void
}

export function InventoryLayout({ activeTab, children, className, onTabChange }: InventoryLayoutProps) {
  return (
    <div className={cn('flex min-h-0 min-w-0 flex-col gap-3', className)}>
      <div
        role="tablist"
        aria-label="Inventory sections"
        className="flex shrink-0 items-center gap-1 rounded-lg bg-muted p-1"
      >
        {inventorySectionTabs.map((tab) => {
          const isActive = activeTab === tab.id
          const Icon = tab.icon

          return (
            <button
              key={tab.label}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium transition-[background-color,color,box-shadow,transform] duration-150 ease-out active:scale-[0.96]',
                isActive ? 'bg-background text-foreground shadow-border' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>
      {children}
    </div>
  )
}
