export type DashboardSummary = Awaited<ReturnType<NonNullable<typeof window.simplepos>['dashboard']['getSummary']>>
