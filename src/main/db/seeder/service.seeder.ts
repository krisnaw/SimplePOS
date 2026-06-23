import type { Database as SqlJsDatabase, SqlValue } from 'sql.js'

type ServiceSeed = {
  code: string
  name: string
  description: string | null
  category: string
  price: number
}

const serviceSeeds: ServiceSeed[] = [
  {
    code: 'SVC-GANTI-OLI-MOTOR',
    name: 'Ganti Oli Motor',
    description: 'Jasa penggantian oli mesin motor matic, bebek, atau sport.',
    category: 'Servis Motor',
    price: 25000,
  },
  {
    code: 'SVC-GANTI-OLI-MOBIL',
    name: 'Ganti Oli Mobil',
    description: 'Jasa penggantian oli mesin mobil termasuk pengecekan dasar.',
    category: 'Servis Mobil',
    price: 75000,
  },
  {
    code: 'SVC-TUNE-UP-MOTOR',
    name: 'Tune Up Motor Injeksi',
    description: 'Pembersihan throttle body, pengecekan busi, dan setelan dasar.',
    category: 'Servis Motor',
    price: 90000,
  },
  {
    code: 'SVC-TUNE-UP-MOBIL',
    name: 'Tune Up Mobil Bensin',
    description: 'Pengecekan busi, filter, throttle body, dan performa mesin.',
    category: 'Servis Mobil',
    price: 250000,
  },
  {
    code: 'SVC-GANTI-KAMPAS-MOTOR',
    name: 'Ganti Kampas Rem Motor',
    description: 'Jasa penggantian kampas rem depan atau belakang motor.',
    category: 'Rem',
    price: 35000,
  },
  {
    code: 'SVC-GANTI-KAMPAS-MOBIL',
    name: 'Ganti Kampas Rem Mobil',
    description: 'Jasa penggantian kampas rem mobil per roda.',
    category: 'Rem',
    price: 125000,
  },
  {
    code: 'SVC-TAMBAL-BAN-TUBELESS',
    name: 'Tambal Ban Tubeless',
    description: 'Jasa tambal ban tubeless motor atau mobil.',
    category: 'Ban',
    price: 25000,
  },
  {
    code: 'SVC-BALANCING-BAN',
    name: 'Balancing Ban Mobil',
    description: 'Jasa balancing ban mobil per roda.',
    category: 'Ban',
    price: 50000,
  },
  {
    code: 'SVC-CHECK-AKI',
    name: 'Cek Aki dan Kelistrikan',
    description: 'Pengecekan kondisi aki, pengisian, dan kelistrikan dasar.',
    category: 'Kelistrikan',
    price: 50000,
  },
  {
    code: 'SVC-SERVICE-AC-MOBIL',
    name: 'Service AC Mobil Ringan',
    description: 'Pengecekan tekanan AC, kebocoran ringan, dan pembersihan filter kabin.',
    category: 'AC Mobil',
    price: 175000,
  },
]

export function seedServiceCatalog(database: SqlJsDatabase): void {
  for (const service of serviceSeeds) {
    const params: SqlValue[] = [
      service.code,
      service.name,
      service.description,
      service.category,
      service.price,
      service.code,
    ]

    database.run(
      `
        INSERT INTO services (code, name, description, category, price, is_active)
        SELECT ?, ?, ?, ?, ?, 1
        WHERE NOT EXISTS (SELECT 1 FROM services WHERE code = ?)
      `,
      params,
    )
  }
}
