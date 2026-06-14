import { LayoutDashboard } from 'lucide-react'

export type GuideSection = {
  id: string
  title: string
  description: string
  steps: string[]
}

export type QuickLink = {
  id: string
  label: string
  icon: typeof LayoutDashboard
}
