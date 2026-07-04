type SimplePosApi = NonNullable<Window['simplepos']>

export type ReportPeriod = 'today' | 'week' | 'month' | 'quarter'
export type ReportSummary = Awaited<ReturnType<SimplePosApi['reports']['getSummary']>>
