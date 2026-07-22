import { useMemo, useState } from 'react'
import { Check, ClipboardCheck, PackageSearch, Plus, Search, Send } from 'lucide-react'
import { Badge } from '@/renderer/components/ui/badge'
import { Button } from '@/renderer/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/renderer/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/renderer/components/ui/dialog'
import { Input } from '@/renderer/components/ui/input'
import { BaseSelect } from '@/renderer/components/ui/base-select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/renderer/components/ui/table'
import { cn } from '@/renderer/lib/utils'

type CountFilter = 'all' | 'uncounted' | 'matched' | 'shortages' | 'overages'

type CountItem = {
  id: number
  product: string
  category: string
  unit: string
  systemStock: number
  physicalStock: string
  reason: string
}

const initialItems: CountItem[] = [
  { id: 1, product: 'Engine Oil 10W-40', category: 'Engine', unit: 'Bottle', systemStock: 12, physicalStock: '10', reason: 'damaged' },
  { id: 2, product: 'Oil Filter Toyota', category: 'Engine', unit: 'Piece', systemStock: 8, physicalStock: '8', reason: '' },
  { id: 3, product: 'Brake Pad Set', category: 'Brakes', unit: 'Set', systemStock: 6, physicalStock: '', reason: '' },
  { id: 4, product: 'Coolant Green', category: 'Fluids', unit: 'Bottle', systemStock: 15, physicalStock: '16', reason: 'extra-stock' },
  { id: 5, product: 'Spark Plug NGK', category: 'Engine', unit: 'Piece', systemStock: 24, physicalStock: '22', reason: 'missing' },
  { id: 6, product: 'Brake Cleaner', category: 'Fluids', unit: 'Can', systemStock: 9, physicalStock: '9', reason: '' },
]

const reasonOptions = [
  { value: 'damaged', label: 'Damaged' },
  { value: 'expired', label: 'Expired' },
  { value: 'internal-use', label: 'Internal workshop use' },
  { value: 'missing', label: 'Missing or lost' },
  { value: 'unrecorded-sale', label: 'Unrecorded sale' },
  { value: 'extra-stock', label: 'Extra stock found' },
  { value: 'other', label: 'Other' },
]

function getVariance(item: CountItem) {
  if (item.physicalStock === '') return null
  return Number(item.physicalStock) - item.systemStock
}

function formatVariance(variance: number | null) {
  if (variance === null) return '—'
  return variance > 0 ? `+${variance}` : String(variance)
}

export function InventoryStockCount() {
  const [items, setItems] = useState(initialItems)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<CountFilter>('all')
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const summary = useMemo(() => {
    const counted = items.filter((item) => item.physicalStock !== '')
    const variances = counted.map(getVariance).filter((value): value is number => value !== null)
    const shortages = variances.filter((value) => value < 0)
    const overages = variances.filter((value) => value > 0)

    return {
      counted: counted.length,
      matched: variances.filter((value) => value === 0).length,
      shortages: shortages.length,
      overages: overages.length,
      totalDecrease: Math.abs(shortages.reduce((total, value) => total + value, 0)),
      totalIncrease: overages.reduce((total, value) => total + value, 0),
    }
  }, [items])

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return items.filter((item) => {
      const variance = getVariance(item)
      const matchesQuery = !normalizedQuery || [item.product, item.category].some((value) => value.toLowerCase().includes(normalizedQuery))
      if (!matchesQuery) return false

      if (filter === 'uncounted') return variance === null
      if (filter === 'matched') return variance === 0
      if (filter === 'shortages') return variance !== null && variance < 0
      if (filter === 'overages') return variance !== null && variance > 0
      return true
    })
  }, [filter, items, query])

  const missingReason = items.some((item) => {
    const variance = getVariance(item)
    return variance !== null && variance !== 0 && !item.reason
  })
  const canSubmit = summary.counted === items.length && !missingReason

  function updateItem(id: number, update: Partial<CountItem>) {
    setItems((currentItems) => currentItems.map((item) => item.id === id ? { ...item, ...update } : item))
    setSubmitted(false)
  }

  function submitCount() {
    setShowConfirm(false)
    setSubmitted(true)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <Card>
        <CardHeader className="gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <ClipboardCheck className="size-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-balance">Stock Count</CardTitle>
              <CardDescription>SC-20260716-01 · Wednesday, 16 July 2026</CardDescription>
            </div>
          </div>
          <CardAction>
            <Badge variant={submitted ? 'secondary' : 'outline'}>{submitted ? 'Submitted' : 'Draft'}</Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <CountMetric label="Counted" value={`${summary.counted} of ${items.length}`} />
          <CountMetric label="Matched" value={summary.matched} tone="text-primary" />
          <CountMetric label="Shortages" value={summary.shortages} tone="text-destructive" />
          <CountMetric label="Overages" value={summary.overages} tone="text-primary" />
        </CardContent>
        <CardFooter className="justify-between gap-3 border-t pt-4">
          <p className="max-w-2xl text-sm text-muted-foreground text-pretty">
            Enter the quantity physically on hand. A deduction reason is required whenever physical stock is lower than system stock.
          </p>
          <Button type="button" size="sm" variant="outline" className="shrink-0" onClick={() => setItems(initialItems)}>
            <Plus data-icon="inline-start" aria-hidden="true" />
            Reset demo
          </Button>
        </CardFooter>
      </Card>

      <Card className="min-h-0 flex-1">
        <CardHeader>
          <CardTitle>Count products</CardTitle>
          <CardDescription>System stock is shown after physical stock is entered.</CardDescription>
          <CardAction>
            <Button type="button" size="sm" disabled={!canSubmit || submitted} onClick={() => setShowConfirm(true)}>
              <Send data-icon="inline-start" aria-hidden="true" />
              {submitted ? 'Submitted' : 'Submit count'}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="relative block min-w-0 flex-1">
              <span className="sr-only">Search products</span>
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products" className="pl-9" />
            </label>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 sm:flex">
              {([
                ['all', 'All'],
                ['uncounted', 'Uncounted'],
                ['matched', 'Matched'],
                ['shortages', 'Shortages'],
                ['overages', 'Overages'],
              ] as const).map(([value, label]) => (
                <Button
                  key={value}
                  type="button"
                  variant={filter === value ? 'secondary' : 'ghost'}
                  size="xs"
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          <Table containerClassName="min-h-0 flex-1 rounded-md border">
            <TableHeader className="sticky top-0 z-10 bg-muted/70 backdrop-blur-sm">
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">System stock</TableHead>
                <TableHead className="w-36">Physical stock</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead className="min-w-52">Deduction reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => {
                const variance = getVariance(item)
                const needsReason = variance !== null && variance !== 0
                const hasError = needsReason && !item.reason

                return (
                  <TableRow key={item.id} className={cn(hasError && 'bg-destructive/5 hover:bg-destructive/10')}>
                    <TableCell>
                      <div className="font-medium">{item.product}</div>
                      <div className="text-xs text-muted-foreground">{item.unit}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.category}</TableCell>
                    <TableCell className="text-right tabular-nums">{item.physicalStock === '' ? 'Hidden' : item.systemStock}</TableCell>
                    <TableCell>
                      <label className="sr-only" htmlFor={`physical-stock-${item.id}`}>Physical stock for {item.product}</label>
                      <Input
                        id={`physical-stock-${item.id}`}
                        type="number"
                        min="0"
                        inputMode="numeric"
                        value={item.physicalStock}
                        aria-invalid={hasError}
                        onChange={(event) => updateItem(item.id, { physicalStock: event.target.value })}
                        placeholder="Enter qty"
                        className="h-9 text-right tabular-nums"
                      />
                    </TableCell>
                    <TableCell className={cn('text-right font-medium tabular-nums', variance !== null && variance < 0 && 'text-destructive', variance !== null && variance > 0 && 'text-primary')}>
                      {formatVariance(variance)}
                    </TableCell>
                    <TableCell>
                      {needsReason ? (
                        <BaseSelect
                          value={item.reason}
                          options={reasonOptions}
                          onValueChange={(reason) => updateItem(item.id, { reason })}
                          placeholder={variance && variance < 0 ? 'Select deduction reason' : 'Explain overage'}
                          ariaLabel={`Reason for ${item.product}`}
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground">{variance === null ? 'Enter physical stock first' : 'No reason needed'}</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          {!filteredItems.length ? (
            <div className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-md border border-dashed p-6 text-center">
              <PackageSearch className="size-5 text-muted-foreground" aria-hidden="true" />
              <p className="font-medium">No products match this view</p>
              <p className="text-sm text-muted-foreground">Try another filter or search term.</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit stock count?</DialogTitle>
            <DialogDescription>This UI preview will only change the on-screen status. It will not update inventory.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-3 text-sm">
            <span className="text-muted-foreground">Units to deduct</span>
            <span className="text-right font-medium tabular-nums">{summary.totalDecrease}</span>
            <span className="text-muted-foreground">Units to add</span>
            <span className="text-right font-medium tabular-nums">{summary.totalIncrease}</span>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowConfirm(false)}>Cancel</Button>
            <Button type="button" onClick={submitCount}>
              <Check data-icon="inline-start" aria-hidden="true" />
              Confirm submission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CountMetric({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="rounded-md bg-muted/60 px-3 py-2.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={cn('mt-1 text-lg font-semibold tabular-nums', tone)}>{value}</p>
    </div>
  )
}
