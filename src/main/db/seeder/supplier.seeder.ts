import type { Database as SqlJsDatabase, SqlValue } from 'sql.js'

type SupplierSeed = {
  name: string
  contactName: string
  phone: string
  address: string
  notes: string
}

const supplierSeeds: SupplierSeed[] = [
  {
    name: 'Bali Motor Parts',
    contactName: 'Komang Wira',
    phone: '081239001122',
    address: 'Jl. Gatot Subroto Barat No. 18, Denpasar',
    notes: 'Supplier spare part bengkel umum.',
  },
  {
    name: 'Dewata Oli Mandiri',
    contactName: 'Made Arya',
    phone: '081246002233',
    address: 'Jl. Imam Bonjol No. 45, Denpasar',
    notes: 'Supplier oli dan cairan kendaraan.',
  },
  {
    name: 'Cuci Pro Supplies',
    contactName: 'Ni Kadek Sari',
    phone: '081257003344',
    address: 'Jl. Teuku Umar Barat No. 12, Denpasar',
    notes: 'Supplier shampoo, microfiber, dan detailing ringan.',
  },
  {
    name: 'Tirta Ban Bali',
    contactName: 'Putu Yoga',
    phone: '081268004455',
    address: 'Jl. Mahendradatta No. 30, Denpasar',
    notes: 'Supplier ban dan perlengkapan roda.',
  },
  {
    name: 'Warung Minuman Grosir',
    contactName: 'Ayu Lestari',
    phone: '081279005566',
    address: 'Jl. Cokroaminoto No. 9, Denpasar',
    notes: 'Supplier minuman untuk ruang tunggu.',
  },
  {
    name: 'Prima Filter Bali',
    contactName: 'Gede Mahendra',
    phone: '081280006677',
    address: 'Jl. Nangka Selatan No. 22, Denpasar',
    notes: 'Supplier filter oli, udara, dan kabin.',
  },
  {
    name: 'Surya Aki Center',
    contactName: 'Kadek Agus',
    phone: '081291007788',
    address: 'Jl. Sunset Road No. 88, Kuta',
    notes: 'Supplier aki mobil dan pengecekan kelistrikan.',
  },
  {
    name: 'Mandiri Brake Parts',
    contactName: 'Wayan Raka',
    phone: '081202008899',
    address: 'Jl. Pulau Kawe No. 14, Denpasar',
    notes: 'Supplier kampas rem, cakram, dan minyak rem.',
  },
  {
    name: 'Bali Autochem',
    contactName: 'Putu Sinta',
    phone: '081213009900',
    address: 'Jl. Cargo Permai No. 6, Denpasar',
    notes: 'Supplier coolant, additive, dan cairan pembersih.',
  },
  {
    name: 'Nusa Jaya Tools',
    contactName: 'Komang Adi',
    phone: '081224110011',
    address: 'Jl. Gunung Agung No. 52, Denpasar',
    notes: 'Supplier alat bengkel dan perlengkapan teknisi.',
  },
  {
    name: 'Sinar Lampu Mobil',
    contactName: 'Luh Citra',
    phone: '081235221122',
    address: 'Jl. Diponegoro No. 71, Denpasar',
    notes: 'Supplier bohlam, lampu LED, dan aksesori kelistrikan.',
  },
  {
    name: 'Duta Bearing Bali',
    contactName: 'Nyoman Satria',
    phone: '081246332233',
    address: 'Jl. Tangkuban Perahu No. 19, Kerobokan',
    notes: 'Supplier bearing, seal, dan komponen roda.',
  },
  {
    name: 'Kencana Body Paint',
    contactName: 'Made Dwi',
    phone: '081257443344',
    address: 'Jl. By Pass Ngurah Rai No. 120, Sanur',
    notes: 'Supplier cat, compound, dan bahan poles.',
  },
  {
    name: 'UD Karya Baut',
    contactName: 'Ketut Sujana',
    phone: '081268554455',
    address: 'Jl. Buluh Indah No. 4, Denpasar',
    notes: 'Supplier baut, mur, klem, dan fastener.',
  },
  {
    name: 'Garuda Sparepart Grosir',
    contactName: 'Ayu Permata',
    phone: '081279665566',
    address: 'Jl. Raya Dalung No. 35, Badung',
    notes: 'Supplier spare part umum untuk stok cepat.',
  },
]

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US')
}

export function seedSupplierCatalog(database: SqlJsDatabase): void {
  for (const supplier of supplierSeeds) {
    const normalizedName = normalizeName(supplier.name)
    const params: SqlValue[] = [
      supplier.name,
      normalizedName,
      supplier.contactName,
      supplier.phone,
      supplier.address,
      supplier.notes,
      normalizedName,
    ]

    database.run(
      `
        INSERT INTO suppliers (
          name,
          normalized_name,
          contact_name,
          phone,
          address,
          notes,
          is_active
        )
        SELECT ?, ?, ?, ?, ?, ?, 1
        WHERE NOT EXISTS (SELECT 1 FROM suppliers WHERE normalized_name = ?)
      `,
      params,
    )
  }
}
