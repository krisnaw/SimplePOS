declare module 'sql.js' {
  export type SqlValue = string | number | Uint8Array | null
  export type QueryExecResult = {
    columns: string[]
    values: SqlValue[][]
  }

  export class Database {
    constructor(data?: Uint8Array | Buffer)
    run(sql: string, params?: SqlValue[]): void
    exec(sql: string): QueryExecResult[]
    export(): Uint8Array
    close(): void
  }

  export type SqlJsStatic = {
    Database: typeof Database
  }

  export default function initSqlJs(): Promise<SqlJsStatic>
}
