import { Cog, CupSoda, Droplets, Tag, Wrench } from 'lucide-react'
import { cn } from '@/renderer/lib/utils'

export function ProductCategoryBadge({ name }: { name: string }) {
  const category = {
    Cuci: {
      icon: Droplets,
      classes: 'bg-cyan-500/10 text-cyan-700 ring-cyan-500/20',
    },
    Mesin: {
      icon: Cog,
      classes: 'bg-violet-500/10 text-violet-700 ring-violet-500/20',
    },
    Bengkel: {
      icon: Wrench,
      classes: 'bg-amber-500/10 text-amber-700 ring-amber-500/20',
    },
    Minuman: {
      icon: CupSoda,
      classes: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20',
    },
  }[name]
  const Icon = category?.icon ?? Tag

  return (
    <span
      className={cn(
        'inline-flex w-fit shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1',
        category?.classes ?? 'bg-muted text-muted-foreground ring-border',
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {name}
    </span>
  )
}
