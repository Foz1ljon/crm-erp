/**
 * Universal CRM + ERP + Analytics domain models.
 * Deliberately industry-agnostic: `industry`, `branch`, and `category`
 * are free-form/enum strings a tenant configures, not hardcoded verticals.
 */

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'UZS'

export const CURRENCIES: { code: CurrencyCode; symbol: string; label: string }[] = [
  { code: 'UZS', symbol: 'so\'m', label: 'Uzbek Som' },
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
  { code: 'JPY', symbol: '¥', label: 'Japanese Yen' },
]

export const BRANCHES = ["Toshkent — Bosh ofis", 'Samarqand filiali', 'Buxoro filiali', "Farg'ona filiali", 'Andijon filiali'] as const
export type Branch = (typeof BRANCHES)[number]

// ---------------------------------------------------------------------------
// CRM: Customers
// ---------------------------------------------------------------------------

export const CUSTOMER_LIFECYCLE_STAGES = ['lead', 'prospect', 'opportunity', 'customer', 'churned'] as const
export type CustomerLifecycleStage = (typeof CUSTOMER_LIFECYCLE_STAGES)[number]

export type CustomerStatus = 'active' | 'inactive' | 'at_risk'

export interface IContactPerson {
  id: string
  name: string
  email: string
  phone: string
  role: string
}

export interface ICustomer {
  id: string
  name: string
  industry: string
  lifecycleStage: CustomerLifecycleStage
  status: CustomerStatus
  owner: string
  branch: Branch
  contacts: IContactPerson[]
  lifetimeValueMinorUnits: number
  currency: CurrencyCode
  tags: string[]
  createdAt: string
  lastActivityAt: string
}

// ---------------------------------------------------------------------------
// CRM: Deals / Transactions
// ---------------------------------------------------------------------------

export const DEAL_STAGES = [
  'prospecting',
  'qualification',
  'proposal',
  'negotiation',
  'closed_won',
  'closed_lost',
] as const
export type DealStage = (typeof DEAL_STAGES)[number]

export const OPEN_DEAL_STAGES: DealStage[] = ['prospecting', 'qualification', 'proposal', 'negotiation']

export interface IDeal {
  id: string
  title: string
  customerId: string
  customerName: string
  stage: DealStage
  amountMinorUnits: number
  currency: CurrencyCode
  probability: number
  owner: string
  branch: Branch
  expectedCloseDate: string
  createdAt: string
  updatedAt: string
}

// ---------------------------------------------------------------------------
// CRM: Leads
// ---------------------------------------------------------------------------

export const LEAD_SOURCES = ['website', 'referral', 'cold_call', 'trade_show', 'social_media', 'partner'] as const
export type LeadSource = (typeof LEAD_SOURCES)[number]

export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'unqualified', 'converted'] as const
export type LeadStatus = (typeof LEAD_STATUSES)[number]

export interface ILead {
  id: string
  name: string
  company: string
  email: string
  phone: string
  source: LeadSource
  status: LeadStatus
  owner: string
  branch: Branch
  estimatedValueMinorUnits: number
  currency: CurrencyCode
  convertedCustomerId: string | null
  createdAt: string
  lastContactedAt: string
}

// ---------------------------------------------------------------------------
// CRM: Contacts (flat, global directory — distinct from the per-customer
// IContactPerson embedded list; this is the searchable/filterable module)
// ---------------------------------------------------------------------------

export interface IContact {
  id: string
  customerId: string
  customerName: string
  name: string
  role: string
  email: string
  phone: string
  isPrimary: boolean
  tags: string[]
  createdAt: string
  lastContactedAt: string
}

// ---------------------------------------------------------------------------
// ERP: Inventory / Products
// ---------------------------------------------------------------------------

export const PRODUCT_CATEGORIES = ['raw_material', 'component', 'finished_good', 'packaging', 'service'] as const
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number]

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock'

export interface IProduct {
  id: string
  sku: string
  name: string
  category: ProductCategory
  unitPriceMinorUnits: number
  currency: CurrencyCode
  stockOnHand: number
  reorderThreshold: number
  reorderQuantity: number
  warehouse: string
  branch: Branch
  updatedAt: string
}

export function deriveStockStatus(product: Pick<IProduct, 'stockOnHand' | 'reorderThreshold'>): StockStatus {
  if (product.stockOnHand <= 0) return 'out_of_stock'
  if (product.stockOnHand <= product.reorderThreshold) return 'low_stock'
  return 'in_stock'
}

// ---------------------------------------------------------------------------
// Analytics: KPIs & Activity Feed
// ---------------------------------------------------------------------------

export type KpiUnit = 'currency' | 'percent' | 'count' | 'ratio'
export type KpiTrendDirection = 'up' | 'down' | 'flat'

export interface IKpiMetric {
  id: string
  label: string
  value: number
  unit: KpiUnit
  currency?: CurrencyCode
  trendPercent: number
  trendDirection: KpiTrendDirection
  comparisonLabel: string
}

export const ACTIVITY_KINDS = ['call', 'email', 'meeting', 'note', 'system'] as const
export type ActivityKind = (typeof ACTIVITY_KINDS)[number]

export type ActivityType =
  | 'deal_created'
  | 'deal_stage_changed'
  | 'customer_created'
  | 'note_added'
  | 'invoice_paid'
  | 'stock_reorder'
  | 'lead_created'
  | 'lead_converted'
  | 'call_logged'
  | 'email_sent'
  | 'meeting_scheduled'

export interface IActivity {
  id: string
  type: ActivityType
  kind: ActivityKind
  message: string
  actor: string
  relatedType: 'customer' | 'deal' | 'product' | 'lead' | 'contact'
  relatedId: string
  relatedLabel: string
  createdAt: string
}

// ---------------------------------------------------------------------------
// Shared filter / query shapes
// ---------------------------------------------------------------------------

export interface DateRange {
  from: string
  to: string
}

/** Global filter bar shown on the Dashboard and inherited by domain list views. */
export interface UniversalFilters {
  dateRange: DateRange | null
  branch: Branch | null
  currency: CurrencyCode
}

/** Deal-list-specific advanced filters, applied on top of UniversalFilters. */
export interface DealFilters {
  search: string
  stages: DealStage[]
  owners: string[]
  amountMin: number | null
  amountMax: number | null
}

export function createEmptyDealFilters(): DealFilters {
  return { search: '', stages: [], owners: [], amountMin: null, amountMax: null }
}

/** Lead-list advanced filters, applied on top of UniversalFilters. */
export interface LeadFilters {
  search: string
  statuses: LeadStatus[]
  sources: LeadSource[]
  owners: string[]
}

export function createEmptyLeadFilters(): LeadFilters {
  return { search: '', statuses: [], sources: [], owners: [] }
}

/** Contact-list advanced filters. */
export interface ContactFilters {
  search: string
  customerIds: string[]
  primaryOnly: boolean
}

export function createEmptyContactFilters(): ContactFilters {
  return { search: '', customerIds: [], primaryOnly: false }
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export type SortOrder = 'asc' | 'desc'

export interface DealSort {
  sortBy: 'expectedCloseDate' | 'amountMinorUnits' | 'title' | 'stage'
  sortOrder: SortOrder
}
