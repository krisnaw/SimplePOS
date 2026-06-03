import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export type UserRole = 'admin' | 'cashier'

export const appDatabaseStatus = sqliteTable('app_database_status', {
  id: integer('id').primaryKey(),
  initializedAt: text('initialized_at').notNull().default('CURRENT_TIMESTAMP'),
})

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: text('role').notNull().$type<UserRole>().default('cashier'),
  passwordHash: text('password_hash').notNull(),
  passwordSalt: text('password_salt').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
  updatedAt: text('updated_at').notNull().default('CURRENT_TIMESTAMP'),
  lastLoginAt: text('last_login_at'),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
