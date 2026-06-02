import { EntitySchema } from 'typeorm'

export type UserRole = 'admin' | 'cashier'

export type User = {
  id: number
  email: string
  name: string
  role: UserRole
  passwordHash: string
  passwordSalt: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  lastLoginAt: string | null
}

export const UserEntity = new EntitySchema<User>({
  name: 'User',
  tableName: 'users',
  columns: {
    id: {
      type: 'integer',
      primary: true,
      generated: true,
    },
    email: {
      type: 'text',
      unique: true,
      nullable: false,
    },
    name: {
      type: 'text',
      nullable: false,
    },
    role: {
      type: 'text',
      nullable: false,
      default: "'cashier'",
    },
    passwordHash: {
      name: 'password_hash',
      type: 'text',
      nullable: false,
    },
    passwordSalt: {
      name: 'password_salt',
      type: 'text',
      nullable: false,
    },
    isActive: {
      name: 'is_active',
      type: 'boolean',
      nullable: false,
      default: true,
    },
    createdAt: {
      name: 'created_at',
      type: 'text',
      nullable: false,
      default: () => 'CURRENT_TIMESTAMP',
    },
    updatedAt: {
      name: 'updated_at',
      type: 'text',
      nullable: false,
      default: () => 'CURRENT_TIMESTAMP',
    },
    lastLoginAt: {
      name: 'last_login_at',
      type: 'text',
      nullable: true,
    },
  },
})
