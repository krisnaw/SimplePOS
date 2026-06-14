import { Checkbox as BaseCheckboxPrimitive } from '@base-ui/react/checkbox'
import { Check } from 'lucide-react'

import { cn } from '@/renderer/lib/utils'

function Checkbox({
  className,
  ...props
}: BaseCheckboxPrimitive.Root.Props) {
  return (
    <BaseCheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'inline-flex size-4 shrink-0 items-center justify-center rounded border border-input bg-background text-primary-foreground outline-none transition-[background-color,border-color,box-shadow,color] duration-150 ease-out focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 data-[checked]:border-primary data-[checked]:bg-primary',
        className,
      )}
      {...props}
    >
      <BaseCheckboxPrimitive.Indicator className="flex items-center justify-center">
        <Check className="size-3" aria-hidden="true" />
      </BaseCheckboxPrimitive.Indicator>
    </BaseCheckboxPrimitive.Root>
  )
}

export { Checkbox }
