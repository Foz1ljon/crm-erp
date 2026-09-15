import { convertMinorUnits } from '@/core/utils/currency'
import {
  DEAL_STAGES,
  LEAD_SOURCES,
  LEAD_STATUSES,
  PRODUCT_CATEGORIES,
  type ActivityKind,
  type ActivityType,
  type Branch,
  type CurrencyCode,
  type CustomerLifecycleStage,
  type CustomerStatus,
  type IActivity,
  type IContact,
  type ICustomer,
  type IDeal,
  type ILead,
  type IProduct,
} from '@/types/crm'
import { BRANCHES } from '@/types/crm'

// Deterministic PRNG — the whole demo dataset (and any screenshot/test taken
// against it) is stable across reloads instead of reshuffling every mount.
// Exported so other domain mock files (erp.mock.ts, notifications.mock.ts)
// can derive their own independent-but-stable sequences from a different seed.
export function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(1337)
export const pick = <T>(items: readonly T[]): T => {
  const item = items[Math.floor(rand() * items.length)]
  if (item === undefined) throw new Error('pick() called on empty array')
  return item
}
export const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min
export const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString()
export const daysFromNow = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString()

/**
 * Generates a random amount on a USD-scale baseline, then converts it into
 * the target currency's actual magnitude. Just relabeling a USD-scale
 * random number as UZS/JPY/etc without converting would produce nonsense
 * figures (a "50,000 so'm deal" is ~$4) — this keeps every currency's
 * numbers realistic regardless of which one a given record is tagged with.
 */
export function randMoneyMinorUnits(usdMin: number, usdMax: number, currency: CurrencyCode): number {
  const usdMinorUnits = randInt(usdMin, usdMax) * 100
  return convertMinorUnits(usdMinorUnits, 'USD', currency)
}

// Weighted toward UZS — a primarily domestic Uzbek business with some
// international (import/export) deals denominated in hard currency.
const CURRENCIES: CurrencyCode[] = ['UZS', 'UZS', 'UZS', 'UZS', 'USD', 'USD', 'EUR', 'GBP', 'JPY']

export function uzPhone(): string {
  const operatorCode = pick([90, 91, 93, 94, 95, 97, 98, 99])
  return `+998 ${operatorCode} ${randInt(100, 999)} ${randInt(10, 99)} ${randInt(10, 99)}`
}

export const REPS = [
  'Aziz Karimov', 'Nodira Yusupova', 'Sardor Tashkentov', 'Malika Rahimova',
  'Otabek Nazarov', 'Dilnoza Ergasheva', 'Bekzod Abdullayev', 'Zarina Yoldasheva',
]

const INDUSTRIES = [
  'Tekstil va paxta', "Qishloq xo'jaligi", 'Qurilish', 'Turizm',
  'Oziq-ovqat sanoati', "Axborot texnologiyalari", 'Energetika', 'Konchilik va metallurgiya',
]

const COMPANY_NAMES = [
  'Zarafshon Tekstil', 'Oltin Vodiy Savdo', "Farg'ona Agro Eksport", 'Buxoro Import Kompaniyasi',
  'Samarqand Turizm Guruhi', 'Toshkent Qurilish Materiallari', 'Namangan Tekstil Fabrikasi', 'Andijon Mashinasozlik',
  'Qashqadaryo Neft-Gaz Servis', 'Xorazm Paxta Tozalash', 'Surxon Agro Mahsulot', "Sirdaryo Energiya Ta'minot",
  'Nukus Kimyo Sanoat', 'Jizzax Oziq-Ovqat Kombinati', 'Navoiy Kon-Metallurgiya',
]
const LEAD_COMPANY_NAMES = [
  'Chirchiq Metallurgiya', 'Guliston Agro Servis', "Qo'qon Tekstil Eksport", 'Termiz Chegara Savdo',
  "Marg'ilon Ipak Fabrikasi", 'Shahrisabz Turizm', "Denov Qishloq Xo'jalik Servis", 'Bekobod Sement Zavodi',
  "Yangiyo'l Oziq-Ovqat", "Kogon Temir Yo'l Logistika", "G'ijduvon Kulolchilik Eksport", 'Pop Neft Mahsulotlari',
  'Chust Pichoq Ustaxonasi', 'Rishton Keramika Savdo', "Boysun Tog' Turizmi", "Qarshi Elektr Ta'minot",
]

/** Gender-correct first+last name pairs — avoids mismatched Uzbek surname suffixes (-ov/-ova). */
export const CONTACT_NAMES: { first: string; last: string }[] = [
  { first: 'Aziz', last: 'Karimov' }, { first: 'Nodira', last: 'Yusupova' },
  { first: 'Sardor', last: 'Tashkentov' }, { first: 'Malika', last: 'Rahimova' },
  { first: 'Otabek', last: 'Nazarov' }, { first: 'Dilnoza', last: 'Ergasheva' },
  { first: 'Bekzod', last: 'Abdullayev' }, { first: 'Zarina', last: 'Yoldasheva' },
  { first: 'Jasur', last: 'Islomov' }, { first: 'Gulnora', last: 'Sodiqova' },
  { first: 'Farrux', last: 'Mirzayev' }, { first: 'Sevara', last: 'Qodirova' },
  { first: 'Davron', last: 'Toshpulatov' }, { first: 'Nigora', last: 'Xolmatova' },
  { first: "Ulug'bek", last: "Ne'matov" }, { first: 'Feruza', last: 'Saidova' },
]

function makeContact(companyName: string, index: number) {
  const { first, last } = pick(CONTACT_NAMES)
  return {
    id: `contact-${companyName.replace(/\s+/g, '').toLowerCase()}-${index}`,
    name: `${first} ${last}`,
    email: `${first.toLowerCase()}.${last.toLowerCase()}@${companyName.replace(/\s+/g, '').toLowerCase()}.uz`,
    phone: uzPhone(),
    role: pick(["Ta'minot bo'limi boshlig'i", 'Operatsion menejer', 'Bosh moliyachi (CFO)', 'IT direktori', 'Egasi']),
  }
}

function generateCustomers(): ICustomer[] {
  const lifecycleWeighted: CustomerLifecycleStage[] = [
    'lead', 'lead', 'prospect', 'prospect', 'opportunity', 'opportunity', 'customer', 'customer', 'customer', 'customer', 'churned',
  ]
  return COMPANY_NAMES.map((name, index) => {
    const lifecycleStage = lifecycleWeighted[index % lifecycleWeighted.length] as CustomerLifecycleStage
    const status: CustomerStatus = lifecycleStage === 'churned' ? 'inactive' : rand() < 0.12 ? 'at_risk' : 'active'
    const currency = pick(CURRENCIES)
    return {
      id: `cust-${index + 1}`,
      name,
      industry: pick(INDUSTRIES),
      lifecycleStage,
      status,
      owner: pick(REPS),
      branch: pick(BRANCHES) as Branch,
      contacts: [makeContact(name, 1), ...(rand() > 0.5 ? [makeContact(name, 2)] : [])],
      lifetimeValueMinorUnits: randMoneyMinorUnits(5_000, 480_000, currency),
      currency,
      tags: [pick(['strategik', 'yirik mijoz', "o'rta biznes", 'yangilash xavfi', 'yuqori aloqa'])],
      createdAt: daysAgo(randInt(30, 720)),
      lastActivityAt: daysAgo(randInt(0, 21)),
    }
  })
}

function generateLeads(customers: ICustomer[]): ILead[] {
  return LEAD_COMPANY_NAMES.map((company, index) => {
    const status = pick(LEAD_STATUSES)
    const { first, last } = pick(CONTACT_NAMES)
    const currency = pick(CURRENCIES)
    const convertedCustomerId = status === 'converted' ? pick(customers).id : null
    return {
      id: `lead-${index + 1}`,
      name: `${first} ${last}`,
      company,
      email: `${first.toLowerCase()}.${last.toLowerCase()}@${company.replace(/\s+/g, '').toLowerCase()}.uz`,
      phone: uzPhone(),
      source: pick(LEAD_SOURCES),
      status,
      owner: pick(REPS),
      branch: pick(BRANCHES) as Branch,
      estimatedValueMinorUnits: randMoneyMinorUnits(2_000, 150_000, currency),
      currency,
      convertedCustomerId,
      createdAt: daysAgo(randInt(1, 180)),
      lastContactedAt: daysAgo(randInt(0, 14)),
    }
  })
}

function generateContacts(customers: ICustomer[]): IContact[] {
  const contacts: IContact[] = []
  customers.forEach((customer, customerIndex) => {
    const contactCount = customerIndex % 3 === 0 ? 2 : 1
    for (let i = 0; i < contactCount; i++) {
      const { first, last } = pick(CONTACT_NAMES)
      contacts.push({
        id: `contact-${customer.id}-${i + 1}`,
        customerId: customer.id,
        customerName: customer.name,
        name: `${first} ${last}`,
        role: pick(["Ta'minot bo'limi boshlig'i", 'Operatsion menejer', 'Bosh moliyachi (CFO)', 'IT direktori', 'Egasi', 'Savdo bo\'yicha vitse-prezident', "Operatsiyalar rahbari"]),
        email: `${first.toLowerCase()}.${last.toLowerCase()}@${customer.name.replace(/\s+/g, '').toLowerCase()}.uz`,
        phone: uzPhone(),
        isPrimary: i === 0,
        tags: [pick(['qaror qabul qiluvchi', 'texnik mutaxassis', "moliya bo'yicha", "loyihaning tarafdori"])],
        createdAt: daysAgo(randInt(20, 600)),
        lastContactedAt: daysAgo(randInt(0, 30)),
      })
    }
  })
  return contacts
}

function generateDeals(customers: ICustomer[]): IDeal[] {
  const dealTypes = ['Shartnomani yangilash', 'Kengaytirish', 'Yangi hamkorlik', 'Qo\'shimcha xarid', "Ko'p yillik shartnoma"]
  return Array.from({ length: 22 }, (_, index) => {
    const customer = pick(customers)
    const stage = pick(DEAL_STAGES)
    const createdAt = daysAgo(randInt(10, 260))
    const closeOffset = stage === 'closed_won' || stage === 'closed_lost' ? -randInt(1, 40) : randInt(5, 75)
    return {
      id: `deal-${index + 1}`,
      title: `${customer.name} — ${pick(dealTypes)}`,
      customerId: customer.id,
      customerName: customer.name,
      stage,
      amountMinorUnits: randMoneyMinorUnits(4_000, 320_000, customer.currency),
      currency: customer.currency,
      probability: stage === 'closed_won' ? 100 : stage === 'closed_lost' ? 0 : randInt(15, 85),
      owner: customer.owner,
      branch: customer.branch,
      expectedCloseDate: closeOffset < 0 ? daysAgo(-closeOffset) : daysFromNow(closeOffset),
      createdAt,
      updatedAt: daysAgo(randInt(0, 9)),
    }
  })
}

function generateProducts(): IProduct[] {
  const productNames = [
    'Sanoat sensori to\'plami', 'Po\'lat mahkamlagich to\'plami', 'ERP litsenziyasi', 'Ombor poddon ko\'targichi',
    'Karton qadoqlash qutisi', 'CRM ishga tushirish paketi', 'Gidravlik nasos qurilmasi', 'Muhofaza kaskasi',
    'RFID yorliq rulosi', 'Konveyer lentasi bo\'lagi', 'Shtrix-kod skaneri', "Yuk ko'taruvchi batareyasi",
    'Konsalting xizmati (soat)', 'Maxsus qadoqlash detali', 'Diagnostika dasturi litsenziyasi', 'Termoprinter lentasi',
    "Paxta tolasi (tuk)", "Ipak ip to'plami",
  ]
  return productNames.map((name, index) => {
    const category = PRODUCT_CATEGORIES[index % PRODUCT_CATEGORIES.length]!
    const reorderThreshold = randInt(10, 60)
    const stockOnHand = rand() < 0.22 ? randInt(0, reorderThreshold) : randInt(reorderThreshold + 5, 800)
    const currency: CurrencyCode = 'UZS'
    return {
      id: `prod-${index + 1}`,
      sku: `SKU-${1000 + index}`,
      name,
      category,
      unitPriceMinorUnits: randMoneyMinorUnits(5, 4200, currency),
      currency,
      stockOnHand,
      reorderThreshold,
      reorderQuantity: reorderThreshold * 3,
      warehouse: pick(['A ombori', 'B ombori', "Sharqiy taqsimot markazi", "G'arbiy taqsimot markazi"]),
      branch: pick(BRANCHES) as Branch,
      updatedAt: daysAgo(randInt(0, 14)),
    }
  })
}

function generateActivities(customers: ICustomer[], leads: ILead[], contacts: IContact[], deals: IDeal[]): IActivity[] {
  type Template = { type: ActivityType; kind: ActivityKind; build: () => { message: string; relatedType: IActivity['relatedType']; relatedId: string; relatedLabel: string } }
  const templates: Template[] = [
    {
      type: 'deal_created',
      kind: 'system',
      build: () => {
        const deal = pick(deals)
        return { message: `Yangi bitim ochildi: ${deal.title}`, relatedType: 'deal', relatedId: deal.id, relatedLabel: deal.title }
      },
    },
    {
      type: 'deal_stage_changed',
      kind: 'system',
      build: () => {
        const deal = pick(deals)
        return {
          message: `${deal.title} bosqichi o'zgardi: ${pick(DEAL_STAGES).replace('_', ' ')}`,
          relatedType: 'deal',
          relatedId: deal.id,
          relatedLabel: deal.title,
        }
      },
    },
    {
      type: 'customer_created',
      kind: 'system',
      build: () => {
        const customer = pick(customers)
        return { message: `Yangi mijoz qo'shildi: ${customer.name}`, relatedType: 'customer', relatedId: customer.id, relatedLabel: customer.name }
      },
    },
    {
      type: 'invoice_paid',
      kind: 'system',
      build: () => {
        const customer = pick(customers)
        return { message: `${customer.name} tomonidan hisob-faktura to'landi`, relatedType: 'customer', relatedId: customer.id, relatedLabel: customer.name }
      },
    },
    {
      type: 'stock_reorder',
      kind: 'system',
      build: () => ({ message: "Kam qolgan mahsulot uchun buyurtma yaratildi", relatedType: 'product', relatedId: 'prod-1', relatedLabel: 'Ombor' }),
    },
    {
      type: 'lead_created',
      kind: 'system',
      build: () => {
        const lead = pick(leads)
        return { message: `Yangi lid qo'shildi: ${lead.name} (${lead.company})`, relatedType: 'lead', relatedId: lead.id, relatedLabel: lead.company }
      },
    },
    {
      type: 'lead_converted',
      kind: 'system',
      build: () => {
        const lead = pick(leads)
        return { message: `Lid mijozga aylantirildi: ${lead.company}`, relatedType: 'lead', relatedId: lead.id, relatedLabel: lead.company }
      },
    },
    {
      type: 'call_logged',
      kind: 'call',
      build: () => {
        const contact = pick(contacts)
        return { message: `${contact.name} (${contact.customerName}) bilan qo'ng'iroq`, relatedType: 'contact', relatedId: contact.id, relatedLabel: contact.name }
      },
    },
    {
      type: 'email_sent',
      kind: 'email',
      build: () => {
        const contact = pick(contacts)
        return { message: `${contact.name}ga xat yuborildi`, relatedType: 'contact', relatedId: contact.id, relatedLabel: contact.name }
      },
    },
    {
      type: 'meeting_scheduled',
      kind: 'meeting',
      build: () => {
        const deal = pick(deals)
        return { message: `${deal.title} bo'yicha uchrashuv rejalashtirildi`, relatedType: 'deal', relatedId: deal.id, relatedLabel: deal.title }
      },
    },
    {
      type: 'note_added',
      kind: 'note',
      build: () => {
        const customer = pick(customers)
        return { message: `${customer.name} uchun izoh qo'shildi`, relatedType: 'customer', relatedId: customer.id, relatedLabel: customer.name }
      },
    },
  ]
  return Array.from({ length: 26 }, (_, index) => {
    const template = pick(templates)
    const built = template.build()
    return {
      id: `activity-${index + 1}`,
      type: template.type,
      kind: template.kind,
      message: built.message,
      actor: pick(REPS),
      relatedType: built.relatedType,
      relatedId: built.relatedId,
      relatedLabel: built.relatedLabel,
      createdAt: daysAgo(randInt(0, 30)),
    }
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

/**
 * Illustrative "last period" baseline for KPI trend arrows. In demo mode
 * this stands in for what a real backend would return from a
 * previous-period rollup query — static here, but consumed the same way a
 * live value would be.
 */
export interface PreviousPeriodBaseline {
  revenueMinorUnitsUsd: number
  activeDeals: number
  conversionRatePercent: number
  inventoryTurnoverRatio: number
  churnRatePercent: number
}

export const PREVIOUS_PERIOD_BASELINE: PreviousPeriodBaseline = {
  revenueMinorUnitsUsd: 412_000 * 100,
  activeDeals: 15,
  conversionRatePercent: 24.5,
  inventoryTurnoverRatio: 4.1,
  churnRatePercent: 6.8,
}

export interface DemoDataset {
  customers: ICustomer[]
  leads: ILead[]
  contacts: IContact[]
  deals: IDeal[]
  products: IProduct[]
  activities: IActivity[]
}

export function generateDemoDataset(): DemoDataset {
  const customers = generateCustomers()
  const leads = generateLeads(customers)
  const contacts = generateContacts(customers)
  const deals = generateDeals(customers)
  const products = generateProducts()
  const activities = generateActivities(customers, leads, contacts, deals)
  return { customers, leads, contacts, deals, products, activities }
}
