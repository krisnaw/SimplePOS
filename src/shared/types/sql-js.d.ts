declare module 'sql.js' {
  export type SqlValue = string | number | Uint8Array | null

  export class Database {
    constructor(data?: Uint8Array | Buffer)
    run(sql: string, params?: SqlValue[]): void
    export(): Uint8Array
    close(): void
  }

  export type SqlJsStatic = {
    Database: typeof Database
  }

  export default function initSqlJs(): Promise<SqlJsStatic>
}
