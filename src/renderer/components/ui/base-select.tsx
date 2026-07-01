import { type ReactNode } from 'react'
import { Select } from '@base-ui/react/select'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/renderer/lib/utils'

export type BaseSelectOption = {
  value: string
  label: ReactNode
  disabled?: boolean
}

export function BaseSelect({
  id,
  value,
  options,
  onValueChange,
  placeholder = 'Select',
  disabled,
  ariaLabel,
}: {
  id?: string
  value: string
  options: BaseSelectOption[]
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  ariaLabel?: string
}) {
  const selectedOption = options.find((option) => option.value === value)

  return (
    <Select.Root
      id={id}
      value={value || null}
      onValueChange={(nextValue) => onValueChange(typeof nextValue === 'string' ? nextValue : '')}
      disabled={disabled}
      items={options}
    >
      <Select.Trigger
        aria-label={ariaLabel}
        className={cn(
          'flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-md border bg-background px-3 text-left text-sm outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
          !selectedOption && 'text-muted-foreground',
        )}
      >
        <Select.Value className="min-w-0 flex-1 overflow-hidden" placeholder={placeholder}>
          {() => <span className="block truncate">{selectedOption?.label ?? placeholder}</span>}
        </Select.Value>
        <Select.Icon className="flex shrink-0 text-muted-foreground">
          <ChevronDown className="size-4" aria-hidden="true" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner sideOffset={4} alignItemWithTrigger={false} className="outline-none">
          <Select.Popup className="max-h-64 w-[var(--anchor-width)] max-w-[calc(100vw-2rem)] overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-border">
            {options.map((option) => (
              <Select.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className="flex min-h-9 min-w-0 cursor-default items-center rounded-sm px-2.5 py-1.5 text-sm outline-none transition-[background-color,color] duration-150 ease-out data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-muted data-[selected]:font-medium"
              >
                <Select.ItemText className="min-w-0 flex-1 overflow-hidden">
                  <span className="block truncate">{option.label}</span>
                </Select.ItemText>
              </Select.Item>
            ))}
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  )
}
