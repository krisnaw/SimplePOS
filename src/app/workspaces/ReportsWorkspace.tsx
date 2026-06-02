import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

export function ReportsWorkspace() {
  const [period, setPeriod] = useState('today')
  const reportGroups = [
    {
      title: 'Sales',
      description: 'Revenue, payment methods, discounts, and cashier totals.',
      value: 'Rp0',
      helper: 'No sales recorded',
    },
    {
      title: 'Work Orders',
      description: 'Completed jobs, open repair queue, service time, and technician output.',
      value: '0',
      helper: 'No work orders completed',
    },
    {
      title: 'Inventory',
      description: 'Low stock items, part usage, adjustments, and stock value.',
      value: '0',
      helper: 'No stock alerts',
    },
    {
      title: 'Invoices',
      description: 'Paid, unpaid, overdue, and draft invoice totals.',
      value: 'Rp0',
      helper: 'No invoice activity',
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Report Filters</CardTitle>
          <CardDescription>Select a period before exporting or reviewing report data.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-2">
            <Label htmlFor="report-period">Period</Label>
            <select
              id="report-period"
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              className="h-9 min-w-48 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
            </select>
          </div>

          <div className="flex gap-2">
            <Button variant="outline">Export PDF</Button>
            <Button variant="outline">Export CSV</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {reportGroups.map((report) => (
          <Card key={report.title}>
            <CardHeader>
              <CardTitle className="text-base">{report.title}</CardTitle>
              <CardDescription>{report.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              <p className="text-3xl font-semibold">{report.value}</p>
              <p className="text-sm text-muted-foreground">{report.helper}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Report Preview</CardTitle>
            <CardDescription>Data will appear here when transactions and work orders are available.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex min-h-72 items-center justify-center rounded-lg border border-dashed bg-background p-6 text-center">
              <div className="flex max-w-md flex-col gap-2">
                <p className="text-sm font-medium">No report data yet</p>
                <p className="text-sm text-muted-foreground">
                  The report page is ready for sales, invoice, inventory, and work order data once those workflows are connected.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Saved Reports</CardTitle>
            <CardDescription>Frequently used report views</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button variant="outline">Daily Sales Summary</Button>
            <Button variant="outline">Low Stock Report</Button>
            <Button variant="outline">Unpaid Invoices</Button>
            <Button variant="outline">Work Order Status</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
