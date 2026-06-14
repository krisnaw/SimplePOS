export type DatabaseConnectionState = 'checking' | 'connected_existing' | 'connected_created' | 'error'

export type DatabaseIndicator = {
  state: DatabaseConnectionState
  message: string
}
