import path from 'path'
import initSqlJs from 'sql.js'
import { closeDatabase, initializeDatabase } from '../client'

async function main(): Promise<void> {
  const databaseDirectory = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd()
  const status = await initializeDatabase(databaseDirectory)

  if (status.state === 'error') {
    throw new Error(status.message)
  }

  await closeDatabase()

  const SQL = await initSqlJs()
  const database = new SQL.Database(await import('fs').then((fs) => fs.readFileSync(status.path)))
  const productCount = database.exec('SELECT COUNT(*) FROM products')[0]?.values[0]?.[0] ?? 0
  const categoryCount = database.exec('SELECT COUNT(*) FROM product_categories')[0]?.values[0]?.[0] ?? 0
  const serviceCount = database.exec('SELECT COUNT(*) FROM services')[0]?.values[0]?.[0] ?? 0
  const supplierCount = database.exec('SELECT COUNT(*) FROM suppliers')[0]?.values[0]?.[0] ?? 0
  const vehicleCount = database.exec('SELECT COUNT(*) FROM vehicles')[0]?.values[0]?.[0] ?? 0

  database.close()

  console.log(`Seeded ${productCount} products, ${categoryCount} product categories, ${serviceCount} services, ${supplierCount} suppliers, and ${vehicleCount} vehicles in ${status.path}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Unable to seed products')
  process.exit(1)
})
