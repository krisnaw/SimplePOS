import { EntitySchema } from 'typeorm'

export type AppDatabaseStatus = {
  id: number
  initializedAt: string
}

export const AppDatabaseStatusEntity = new EntitySchema<AppDatabaseStatus>({
  name: 'AppDatabaseStatus',
  tableName: 'app_database_status',
  columns: {
    id: {
      type: 'integer',
      primary: true,
    },
    initializedAt: {
      name: 'initialized_at',
      type: 'text',
      nullable: false,
      default: () => 'CURRENT_TIMESTAMP',
    },
  },
})


//   - Email: admin@simplepos.com
// - Password: admin123