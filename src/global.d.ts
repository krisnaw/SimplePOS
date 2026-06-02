export {}

type DatabaseConnectionState = 'connected_existing' | 'connected_created' | 'error'

type DatabaseStatus = {
  state: DatabaseConnectionState
  path: string
  existsBeforeOpen: boolean
  message: string
  checkedAt: string
}

declare global {
  interface Window {
    simplepos?: {
      db: {
        getStatus: () => Promise<DatabaseStatus>
      }
    }
  }
}
