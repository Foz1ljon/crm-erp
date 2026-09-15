import { BRANCHES, type Branch, type CurrencyCode } from '@/types/crm'
import {
  DEPARTMENTS,
  PURCHASE_ORDER_STATUSES,
  SHIPMENT_STATUSES,
  TRANSACTION_CATEGORIES,
  type Department,
  type IEmployee,
  type IPurchaseOrder,
  type IPurchaseOrderLineItem,
  type IShipment,
  type ISupplier,
  type ITransaction,
  type PurchaseOrderStatus,
  type TransactionCategory,
  type TransactionStatus,
  type TransactionType,
} from '@/types/erp'
import { CONTACT_NAMES, daysAgo, daysFromNow, mulberry32, randMoneyMinorUnits, uzPhone } from './crm.mock'

// Independent seed from crm.mock's generator so ERP data is stable on its
// own regardless of how many CRM records get picked before it in a given run.
const rand = mulberry32(9001)
const pick = <T>(items: readonly T[]): T => {
  const item = items[Math.floor(rand() * items.length)]
  if (item === undefined) throw new Error('pick() called on empty array')
  return item
}
const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min

const JOB_TITLES: Record<Department, string[]> = {
  Sotuv: ['Savdo vakili', 'Savdoni rivojlantirish mutaxassisi', 'Mintaqaviy savdo menejeri'],
  Operatsiyalar: ['Operatsiyalar koordinatori', 'Operatsiyalar menejeri', 'Jarayon tahlilchisi'],
  Moliya: ['Moliyaviy tahlilchi', "To'lovlar bo'yicha mutaxassis", 'Bosh hisobchi'],
  Muhandislik: ["Dasturiy ta'minot muhandisi", 'Sifat nazorati muhandisi', 'Muhandislik menejeri'],
  Ombor: ['Ombor xodimi', 'Ombor nazoratchisi', "Yetkazib berish rahbari"],
  "Qo'llab-quvvatlash": ["Qo'llab-quvvatlash mutaxassisi", 'Mijozlar muvaffaqiyati menejeri', "Qo'llab-quvvatlash guruhi rahbari"],
  HR: ['HR mutaxassisi', 'Ishga qabul qiluvchi', 'HR biznes-hamkori'],
}

function generateEmployees(): IEmployee[] {
  return Array.from({ length: 14 }, (_, index) => {
    const department = DEPARTMENTS[index % DEPARTMENTS.length] as Department
    const { first, last } = pick(CONTACT_NAMES)
    const employmentStatus = rand() < 0.08 ? 'on_leave' : rand() < 0.05 ? 'terminated' : 'active'
    return {
      id: `emp-${index + 1}`,
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}@zarafshonholding.uz`,
      phone: uzPhone(),
      department,
      jobTitle: pick(JOB_TITLES[department]),
      employmentStatus,
      managerName: index < DEPARTMENTS.length ? null : `${pick(CONTACT_NAMES).first} ${pick(CONTACT_NAMES).last}`,
      branch: pick(BRANCHES) as Branch,
      hireDate: daysAgo(randInt(60, 1800)),
      salaryMinorUnits: randMoneyMinorUnits(6_000, 24_000, 'UZS'),
      currency: 'UZS' as CurrencyCode,
    }
  })
}

const SUPPLIER_NAMES = [
  'Zarafshon Metall Ta\'minot', "Farg'ona Elektronika Savdo", 'Buxoro Qadoqlash Materiallari', 'Toshkent Logistika Guruhi',
  "O'zbekiston Temir Yo'llari Yuk Tashish", 'Namangan Tekstil Xomashyo', 'Samarqand Dastgohlar Zavodi', 'Silk Road IT Yechimlari',
  'Andijon Avtomobilsozlik Ta\'minoti', 'Qarshi Kimyo Sanoati',
]

function generateSuppliers(): ISupplier[] {
  return SUPPLIER_NAMES.map((name, index) => {
    const { first, last } = pick(CONTACT_NAMES)
    return {
      id: `sup-${index + 1}`,
      name,
      contactName: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}@${name.replace(/\s+/g, '').toLowerCase()}.uz`,
      phone: uzPhone(),
      category: pick(['Xomashyo', 'Qadoqlash', 'Elektronika', 'Logistika', "Dasturiy ta'minot", 'Tekstil']),
      rating: randInt(3, 5),
      status: rand() < 0.15 ? 'inactive' : 'active',
      address: `${randInt(1, 200)}-uy, ${pick(['Sanoat ko\'chasi', 'Amir Temur shoh ko\'chasi', 'Bunyodkor ko\'chasi', 'Mustaqillik shoh ko\'chasi'])}, ${pick(['Toshkent', 'Samarqand', 'Buxoro', "Farg'ona", 'Andijon'])}`,
      branch: pick(BRANCHES) as Branch,
      createdAt: daysAgo(randInt(90, 900)),
    }
  })
}

const PO_PRODUCT_NAMES = [
  'Sanoat sensori to\'plami', 'Po\'lat mahkamlagich to\'plami', 'Gidravlik nasos qurilmasi', 'Muhofaza kaskasi',
  'RFID yorliq rulosi', 'Konveyer lentasi bo\'lagi', "Yuk ko'taruvchi batareyasi", 'Termoprinter lentasi',
]

function generatePurchaseOrders(suppliers: ISupplier[]): IPurchaseOrder[] {
  return Array.from({ length: 10 }, (_, index) => {
    const supplier = pick(suppliers)
    const lineItemCount = randInt(1, 4)
    const lineItems: IPurchaseOrderLineItem[] = Array.from({ length: lineItemCount }, () => ({
      productName: pick(PO_PRODUCT_NAMES),
      quantity: randInt(10, 400),
      unitPriceMinorUnits: randMoneyMinorUnits(5, 900, 'UZS'),
    }))
    const totalMinorUnits = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPriceMinorUnits, 0)
    const status = PURCHASE_ORDER_STATUSES[index % PURCHASE_ORDER_STATUSES.length] as PurchaseOrderStatus
    const orderedAt = daysAgo(randInt(5, 200))
    return {
      id: `po-${index + 1}`,
      poNumber: `PO-${2024_000 + index}`,
      supplierId: supplier.id,
      supplierName: supplier.name,
      status,
      lineItems,
      totalMinorUnits,
      currency: 'UZS' as CurrencyCode,
      branch: supplier.branch,
      orderedAt,
      expectedDeliveryDate: daysFromNow(randInt(3, 45)),
    }
  })
}

const CARRIERS = ["O'zbekiston Temir Yo'llari", 'Uzavtologistika', 'Silk Road Cargo', 'Mahalliy Avtopark Xizmati', 'DHL Freight', 'FESCO Logistics']
const CITIES = ['Toshkent', 'Samarqand', 'Buxoro', "Farg'ona", 'Andijon', 'Namangan', 'Nukus', 'Qarshi', 'Termiz', 'Navoiy', 'Almaty', 'Istanbul']

function generateShipments(purchaseOrders: IPurchaseOrder[]): IShipment[] {
  return Array.from({ length: 12 }, (_, index) => {
    const status = SHIPMENT_STATUSES[index % SHIPMENT_STATUSES.length] as (typeof SHIPMENT_STATUSES)[number]
    const linkedPo = rand() < 0.6 ? pick(purchaseOrders) : null
    const dispatchedAt = daysAgo(randInt(1, 60))
    return {
      id: `ship-${index + 1}`,
      shipmentNumber: `SHP-${5000 + index}`,
      purchaseOrderId: linkedPo?.id ?? null,
      carrier: pick(CARRIERS),
      origin: pick(CITIES),
      destination: pick(CITIES),
      status,
      trackingNumber: `TRK${randInt(100000000, 999999999)}`,
      branch: pick(BRANCHES) as Branch,
      dispatchedAt,
      estimatedArrival: daysFromNow(randInt(1, 21)),
      deliveredAt: status === 'delivered' ? daysAgo(randInt(0, 5)) : null,
    }
  })
}

function generateTransactions(purchaseOrders: IPurchaseOrder[], dealIds: string[]): ITransaction[] {
  const CREATORS = ['Nodira Yusupova', 'Bekzod Abdullayev', 'Zarina Yoldasheva', 'Otabek Nazarov']
  return Array.from({ length: 16 }, (_, index) => {
    const type: TransactionType = rand() < 0.55 ? 'income' : 'expense'
    const category: TransactionCategory = type === 'income'
      ? pick(['sales_revenue', 'service_revenue'] as TransactionCategory[])
      : pick(TRANSACTION_CATEGORIES.filter((c) => c !== 'sales_revenue' && c !== 'service_revenue') as TransactionCategory[])
    const relatedPo = category === 'procurement' && rand() < 0.7 ? pick(purchaseOrders) : null
    const relatedDealId = type === 'income' && rand() < 0.6 ? pick(dealIds) : null
    return {
      id: `txn-${index + 1}`,
      type,
      category,
      description: type === 'income' ? `Tushum qabul qilindi — ${category.replace('_', ' ')}` : `Xarajat — ${category.replace('_', ' ')}`,
      amountMinorUnits: randMoneyMinorUnits(500, 85_000, 'UZS'),
      currency: 'UZS' as CurrencyCode,
      status: (rand() < 0.85 ? 'completed' : rand() < 0.6 ? 'pending' : 'failed') as TransactionStatus,
      relatedDealId,
      relatedPurchaseOrderId: relatedPo?.id ?? null,
      branch: pick(BRANCHES) as Branch,
      date: daysAgo(randInt(0, 90)),
      createdBy: pick(CREATORS),
    }
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export interface ErpDemoDataset {
  employees: IEmployee[]
  suppliers: ISupplier[]
  purchaseOrders: IPurchaseOrder[]
  shipments: IShipment[]
  transactions: ITransaction[]
}

export function generateErpDemoDataset(dealIds: string[]): ErpDemoDataset {
  const employees = generateEmployees()
  const suppliers = generateSuppliers()
  const purchaseOrders = generatePurchaseOrders(suppliers)
  const shipments = generateShipments(purchaseOrders)
  const transactions = generateTransactions(purchaseOrders, dealIds)
  return { employees, suppliers, purchaseOrders, shipments, transactions }
}
