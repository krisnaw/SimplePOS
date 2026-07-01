import path from 'path'
import { closeDatabase, initializeDatabase } from './client'

async function migrate(): Promise<void> {
  const databaseDirectory = path.resolve(process.argv[2] ?? process.cwd())
  const status = await initializeDatabase(databaseDirectory)

  if (status.state === 'error') {
    throw new Error(status.message)
  }

  await closeDatabase()
  console.log(`Database migration complete: ${status.path}`)
}

migrate().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
