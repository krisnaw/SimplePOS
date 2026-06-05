export type UpdateStatus = {
  state: 'idle' | 'checking' | 'available' | 'not_available' | 'downloading' | 'downloaded' | 'error'
  message: string
  version?: string
  percent?: number
}
