import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/main/db/schema',
  out: './src/main/db/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: './simplepos.sqlite',
  },
})
