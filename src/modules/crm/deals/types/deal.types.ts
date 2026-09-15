export const DEAL_STAGES = [
  'prospecting',
  'qualification',
  'proposal',
  'negotiation',
  'closed_won',
  'closed_lost',
] as const

export type DealStage = (typeof DEAL_STAGES)[number]

/** Amounts are always stored in minor units (cents) to avoid float drift in sums. */
export interface Money {
  amountMinorUnits: number
  currency: string
}

export interface DealOwner {
  id: string
  name: string
  avatarUrl?: string
}

export interface DealCompany {
  id: string
  name: string
  logoUrl?: string
}

export interface Deal {
  id: string
  name: string
  company: DealCompany
  owner: DealOwner
  stage: DealStage
  value: Money
  probability: number
  closeDate: string
  createdAt: string
  updatedAt: string
}

export interface DealFilters {
  search: string
  stages: DealStage[]
  ownerIds: string[]
  valueMin: number | null
  valueMax: number | null
}

export function createEmptyDealFilters(): DealFilters {
  return {
    search: '',
    stages: [],
    ownerIds: [],
    valueMin: null,
    valueMax: null,
  }
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface DealListQuery extends DealFilters {
  page: number
  pageSize: number
  sortBy: 'closeDate' | 'value' | 'name'
  sortOrder: 'asc' | 'desc'
}
