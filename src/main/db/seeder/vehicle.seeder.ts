import type { Database as SqlJsDatabase, SqlValue } from 'sql.js'

type VehicleSeed = {
  customerName: string
  customerPhone: string
  plateNumber: string
  brand: string
  model: string
  year: number
  color: string
  notes: string
}

const vehicleSeeds: VehicleSeed[] = [
  {
    customerName: 'Budi Santoso',
    customerPhone: '081234567890',
    plateNumber: 'DK1234AB',
    brand: 'Toyota',
    model: 'Avanza',
    year: 2019,
    color: 'Silver',
    notes: 'Pelanggan rutin servis bulanan.',
  },
  {
    customerName: 'Sari Dewi',
    customerPhone: '081298765432',
    plateNumber: 'DK5678CD',
    brand: 'Honda',
    model: 'Brio',
    year: 2021,
    color: 'Merah',
    notes: 'Sering mengambil paket cuci.',
  },
  {
    customerName: 'Agus Wijaya',
    customerPhone: '081355501122',
    plateNumber: 'DK9012EF',
    brand: 'Daihatsu',
    model: 'Xenia',
    year: 2018,
    color: 'Hitam',
    notes: 'Cek oli dan rem setiap kunjungan.',
  },
  {
    customerName: 'Made Putra',
    customerPhone: '081246801357',
    plateNumber: 'DK3456GH',
    brand: 'Suzuki',
    model: 'Ertiga',
    year: 2020,
    color: 'Putih',
    notes: 'Kendaraan keluarga.',
  },
  {
    customerName: 'Ni Luh Ayu',
    customerPhone: '081377788899',
    plateNumber: 'DK7890JK',
    brand: 'Mitsubishi',
    model: 'Xpander',
    year: 2022,
    color: 'Abu-abu',
    notes: 'Prioritas cuci dan detailing ringan.',
  },
  {
    customerName: 'Kadek Arimbawa',
    customerPhone: '081388990011',
    plateNumber: 'DK1122LM',
    brand: 'Nissan',
    model: 'Livina',
    year: 2017,
    color: 'Cokelat',
    notes: 'Sering servis AC sebelum perjalanan jauh.',
  },
  {
    customerName: 'Wayan Sutama',
    customerPhone: '081399001122',
    plateNumber: 'DK3344NP',
    brand: 'Toyota',
    model: 'Rush',
    year: 2021,
    color: 'Hitam',
    notes: 'Cek kaki-kaki dan spooring rutin.',
  },
  {
    customerName: 'Komang Pratiwi',
    customerPhone: '081300112233',
    plateNumber: 'DK5566QR',
    brand: 'Honda',
    model: 'HR-V',
    year: 2020,
    color: 'Putih',
    notes: 'Pelanggan detailing interior.',
  },
  {
    customerName: 'Ketut Mahendra',
    customerPhone: '081311223344',
    plateNumber: 'DK7788ST',
    brand: 'Daihatsu',
    model: 'Terios',
    year: 2019,
    color: 'Merah',
    notes: 'Periksa ban dan rem setiap 10.000 km.',
  },
  {
    customerName: 'Luh Putu Candra',
    customerPhone: '081322334455',
    plateNumber: 'DK9900UV',
    brand: 'Suzuki',
    model: 'Ignis',
    year: 2018,
    color: 'Biru',
    notes: 'Ganti oli menggunakan paket reguler.',
  },
  {
    customerName: 'Nyoman Adi',
    customerPhone: '081333445566',
    plateNumber: 'DK1357WX',
    brand: 'Hyundai',
    model: 'Stargazer',
    year: 2023,
    color: 'Silver',
    notes: 'Kendaraan baru, riwayat servis lengkap.',
  },
  {
    customerName: 'Putu Sriani',
    customerPhone: '081344556677',
    plateNumber: 'DK2468YZ',
    brand: 'Kia',
    model: 'Sonet',
    year: 2022,
    color: 'Kuning',
    notes: 'Paket cuci premium setiap akhir pekan.',
  },
  {
    customerName: 'Gede Wirawan',
    customerPhone: '081355667788',
    plateNumber: 'DK1020AA',
    brand: 'Wuling',
    model: 'Almaz',
    year: 2021,
    color: 'Abu-abu',
    notes: 'Cek kelistrikan saat servis berkala.',
  },
  {
    customerName: 'Ayu Saraswati',
    customerPhone: '081366778899',
    plateNumber: 'DK3040BB',
    brand: 'Mazda',
    model: 'CX-3',
    year: 2019,
    color: 'Merah',
    notes: 'Gunakan oli sintetis penuh.',
  },
  {
    customerName: 'Made Surya',
    customerPhone: '081377889900',
    plateNumber: 'DK5060CC',
    brand: 'Isuzu',
    model: 'Panther',
    year: 2016,
    color: 'Hijau',
    notes: 'Kendaraan operasional usaha.',
  },
]

export function seedVehicleCatalog(database: SqlJsDatabase): void {
  for (const vehicle of vehicleSeeds) {
    const params: SqlValue[] = [
      vehicle.customerName,
      vehicle.customerPhone,
      vehicle.plateNumber,
      vehicle.brand,
      vehicle.model,
      vehicle.year,
      vehicle.color,
      vehicle.notes,
      vehicle.plateNumber,
    ]

    database.run(
      `
        INSERT INTO vehicles (
          customer_name,
          customer_phone,
          plate_number,
          brand,
          model,
          year,
          color,
          notes,
          is_active
        )
        SELECT ?, ?, ?, ?, ?, ?, ?, ?, 1
        WHERE NOT EXISTS (SELECT 1 FROM vehicles WHERE plate_number = ?)
      `,
      params,
    )
  }
}
