import { scryptSync } from 'crypto'
import { MigrationInterface, QueryRunner } from 'typeorm'

const defaultAdminEmail = 'admin@simplepos.com'
const defaultAdminPassword = 'admin123'
const defaultAdminSalt = 'simplepos-default-admin-salt'

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString('hex')
}

export class CreateUserSchema1717300000000 implements MigrationInterface {
  name = 'CreateUserSchema1717300000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS app_database_status (
        id integer PRIMARY KEY NOT NULL,
        initialized_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP)
      )
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        email text NOT NULL,
        name text NOT NULL,
        role text NOT NULL DEFAULT ('cashier'),
        password_hash text NOT NULL,
        password_salt text NOT NULL,
        is_active boolean NOT NULL DEFAULT (1),
        created_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        updated_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        last_login_at text,
        CONSTRAINT UQ_users_email UNIQUE (email)
      )
    `)

    await queryRunner.query(
      `
        INSERT INTO users (email, name, role, password_hash, password_salt, is_active)
        SELECT ?, ?, ?, ?, ?, 1
        WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = ?)
      `,
      [
        defaultAdminEmail,
        'Administrator',
        'admin',
        hashPassword(defaultAdminPassword, defaultAdminSalt),
        defaultAdminSalt,
        defaultAdminEmail,
      ],
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS users')
    await queryRunner.query('DROP TABLE IF EXISTS app_database_status')
  }
}
