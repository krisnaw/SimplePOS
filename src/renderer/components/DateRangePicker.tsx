import { useState } from 'react'
import { format, type Locale } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { Button } from '@/renderer/components/ui/button'
import { Calendar } from '@/renderer/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/renderer/components/ui/popover'
import { cn } from '@/renderer/lib/utils'

export type DateRangePickerProps = {
  value?: DateRange
  defaultValue?: DateRange
  onValueChange?: (value: DateRange | undefined) => void
  placeholder?: string
  ariaLabel?: string
  dateFormat?: string
  locale?: Locale
  numberOfMonths?: number
  disabled?: boolean
  className?: string
}

export function DateRangePicker(props: DateRangePickerProps) {
  const {
    value,
    defaultValue,
    onValueChange,
    placeholder = 'Pick a date range',
    ariaLabel = placeholder,
    dateFormat = 'LLL dd, y',
    locale,
    numberOfMonths = 2,
    disabled = false,
    className,
  } = props
  const [internalValue, setInternalValue] = useState<DateRange | undefined>(defaultValue)
  const isControlled = Object.prototype.hasOwnProperty.call(props, 'value')
  const selectedRange = isControlled ? value : internalValue

  function handleSelect(nextValue: DateRange | undefined) {
    if (!isControlled) setInternalValue(nextValue)
    onValueChange?.(nextValue)
  }

  function rangeLabel() {
    if (!selectedRange?.from) return placeholder
    if (!selectedRange.to) return format(selectedRange.from, dateFormat, { locale })

    return `${format(selectedRange.from, dateFormat, { locale })} - ${format(selectedRange.to, dateFormat, { locale })}`
  }

  return (
    <Popover>
      <PopoverTrigger
        disabled={disabled}
        render={
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            data-empty={!selectedRange?.from}
            aria-label={ariaLabel}
            className={cn(
              'h-10 w-full max-w-sm justify-start px-3 text-left font-normal data-[empty=true]:text-muted-foreground',
              className,
            )}
          />
        }
      >
        <CalendarIcon data-icon="inline-start" aria-hidden="true" />
        <span className="truncate">{rangeLabel()}</span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="range"
          defaultMonth={selectedRange?.from}
          selected={selectedRange}
          onSelect={handleSelect}
          numberOfMonths={numberOfMonths}
          locale={locale}
        />
      </PopoverContent>
    </Popover>
  )
}
