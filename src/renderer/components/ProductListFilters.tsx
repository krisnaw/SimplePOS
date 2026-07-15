import {BaseSelect, type BaseSelectOption} from '@/renderer/components/ui/base-select'
import {Input} from '@/renderer/components/ui/input'

type ProductListFiltersProps = {
  searchId: string
  searchQuery: string
  searchPlaceholder: string
  onSearchQueryChange: (query: string) => void
  categoryFilterId: string
  categoryFilter: string
  categoryFilterLabel: string
  categoryOptions: BaseSelectOption[]
  onCategoryFilterChange: (category: string) => void
}

export function ProductListFilters({
  searchId,
  searchQuery,
  searchPlaceholder,
  onSearchQueryChange,
  categoryFilterId,
  categoryFilter,
  categoryFilterLabel,
  categoryOptions,
  onCategoryFilterChange,
}: ProductListFiltersProps) {
  return (
    <div className="grid shrink-0 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,16rem)]">
      <Input
        id={searchId}
        type="search"
        value={searchQuery}
        onChange={(event) => onSearchQueryChange(event.target.value)}
        placeholder={searchPlaceholder}
        aria-label={searchPlaceholder}
      />
      <BaseSelect
        id={categoryFilterId}
        value={categoryFilter}
        ariaLabel={categoryFilterLabel}
        options={categoryOptions}
        onValueChange={onCategoryFilterChange}
      />
    </div>
  )
}
