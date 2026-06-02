import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { sectionDetails } from '@/app/navigation'
import type { AppSection } from '@/app/types'

export function SectionWorkspace({ section }: { section: AppSection }) {
  const details = sectionDetails[section]

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{details.title} Workspace</CardTitle>
          <CardDescription>Primary tools and records will appear here.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex min-h-72 items-center justify-center rounded-lg border border-dashed bg-background p-6 text-center">
            <div className="flex max-w-sm flex-col gap-2">
              <p className="text-sm font-medium">No records yet</p>
              <p className="text-sm text-muted-foreground">
                This area is ready for the {details.title.toLowerCase()} workflow.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
          <CardDescription>Common actions for this section</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button variant="outline">Create New</Button>
          <Button variant="outline">Search Records</Button>
          <Button variant="outline">View Reports</Button>
        </CardContent>
      </Card>
    </div>
  )
}
