import { type ReactNode, useState } from 'react'
import { ClipboardCheck, ClipboardList, Package, ReceiptText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/renderer/lib/utils'

export type InventoryLayoutTab = 'product' | 'purchase' | 'moving' | 'stock-count'

const inventorySectionTabs = [
  { id: 'product', labelKey: 'inventory.tabs.product', icon: Package },
  { id: 'purchase', labelKey: 'inventory.tabs.purchase', icon: ReceiptText },
  { id: 'moving', labelKey: 'inventory.tabs.moving', icon: ClipboardList },
  { id: 'stock-count', labelKey: 'inventory.tabs.stockCount', icon: ClipboardCheck },
] as const

type InventoryLayoutProps = {
  activeTab?: InventoryLayoutTab
  children?: ReactNode
  className?: string
  onTabChange?: (tab: InventoryLayoutTab) => void
}

export function InventoryLayout({ activeTab, children, className, onTabChange }: InventoryLayoutProps) {
  const { t } = useTranslation()
  const [internalTab, setInternalTab] = useState<InventoryLayoutTab>('product')
  const selectedTab = activeTab ?? internalTab
  const selectedTabLabelKey = inventorySectionTabs.find((tab) => tab.id === selectedTab)?.labelKey

  function selectTab(tab: InventoryLayoutTab) {
    setInternalTab(tab)
    onTabChange?.(tab)
  }

  return (
    <div className={cn('flex min-h-0 min-w-0 flex-col gap-3 p-1', className)}>
      <div
        role="tablist"
        aria-label={t('inventory.tabs.sectionsLabel')}
        className="flex shrink-0 items-center gap-1 rounded-lg bg-muted p-1"
      >
        {inventorySectionTabs.map((tab) => {
          const isActive = selectedTab === tab.id
          const Icon = tab.icon
          const label = t(tab.labelKey)

          return (
            <button
              key={tab.id}
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
              <span>{label}</span>
            </button>
          )
        })}
      </div>
      {children ?? (
        <div className="flex min-h-48 flex-1 items-center justify-center rounded-lg border border-dashed bg-background p-6 text-center">
          <div className="max-w-sm">
            <p className="font-medium">{selectedTabLabelKey ? t(selectedTabLabelKey) : null}</p>
            <p className="mt-1 text-sm text-muted-foreground text-pretty">
              {t('inventory.tabs.emptyContentHint')}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
