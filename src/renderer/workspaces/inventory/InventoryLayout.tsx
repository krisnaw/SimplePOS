import { type ReactNode, useState } from 'react'
import { ClipboardList, Package, ReceiptText } from 'lucide-react'
import { cn } from '@/renderer/lib/utils'

export type InventoryLayoutTab = 'product' | 'purchase' | 'moving'

const inventorySectionTabs = [
  { id: 'product', label: 'Product', icon: Package },
  { id: 'purchase', label: 'Purchase', icon: ReceiptText },
  { id: 'moving', label: 'Moving', icon: ClipboardList },
] as const

type InventoryLayoutProps = {
  activeTab?: InventoryLayoutTab
  children?: ReactNode
  className?: string
  onTabChange?: (tab: InventoryLayoutTab) => void
}

export function InventoryLayout({ activeTab, children, className, onTabChange }: InventoryLayoutProps) {
  const [internalTab, setInternalTab] = useState<InventoryLayoutTab>('product')
  const selectedTab = activeTab ?? internalTab

  function selectTab(tab: InventoryLayoutTab) {
    setInternalTab(tab)
    onTabChange?.(tab)
  }

  return (
    <div className={cn('flex min-h-0 min-w-0 flex-col gap-3 p-1', className)}>
      <div
        role="tablist"
        aria-label="Inventory sections"
        className="flex shrink-0 items-center gap-1 rounded-lg bg-muted p-1"
      >
        {inventorySectionTabs.map((tab) => {
          const isActive = selectedTab === tab.id
          const Icon = tab.icon

          return (
            <button
              key={tab.label}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => selectTab(tab.id)}
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
      {children ?? (
        <div className="flex min-h-48 flex-1 items-center justify-center rounded-lg border border-dashed bg-background p-6 text-center">
          <div className="max-w-sm">
            <p className="font-medium">{inventorySectionTabs.find((tab) => tab.id === selectedTab)?.label}</p>
            <p className="mt-1 text-sm text-muted-foreground text-pretty">
              Inventory content will be attached here as each tab is migrated into the layout.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
