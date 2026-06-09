import { sql } from 'drizzle-orm'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const appDatabaseStatus = sqliteTable('app_database_status', {
  id: integer('id').primaryKey(),
  initializedAt: text('initialized_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
})
