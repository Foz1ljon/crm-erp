import type { Deal, DealListQuery, DealStage, Paginated } from '../types/deal.types'
import { DEAL_STAGES } from '../types/deal.types'

// Deterministic PRNG so the mock dataset (and any test/screenshot against it)
// is stable across reloads instead of reshuffling on every fetch.
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(42)
const pick = <T>(items: readonly T[]): T => {
  const item = items[Math.floor(rand() * items.length)]
  if (item === undefined) throw new Error('pick() called on empty array')
  return item
}

const COMPANIES = [
  'Northwind Traders',
  'Globex Industrial',
  'Initech Systems',
  'Umbrella Logistics',
  'Soylent Foods',
  'Stark Manufacturing',
  'Wayne Holdings',
  'Hooli Cloud',
  'Vandelay Imports',
  'Acme Retail',
]

const OWNERS: { id: string; name: string }[] = [
  { id: 'u1', name: 'Amina Karimova' },
  { id: 'u2', name: 'Diego Fuentes' },
  { id: 'u3', name: 'Priya Nair' },
  { id: 'u4', name: 'Tom Becker' },
  { id: 'u5', name: 'Yuki Tanaka' },
]

const CURRENCIES = ['USD', 'EUR', 'GBP']

function generateDeal(index: number): Deal {
  const owner = pick(OWNERS)
  const stage = pick(DEAL_STAGES)
  const company = pick(COMPANIES)
  const createdAt = new Date(2025, 0, 1 + Math.floor(rand() * 400))
  const closeDate = new Date(createdAt.getTime() + Math.floor(rand() * 90) * 86_400_000)

  return {
    id: `deal-${index}`,
    name: `${company} — ${pick(['Renewal', 'Expansion', 'New Business', 'Upsell'])}`,
    company: { id: `co-${company}`, name: company },
    owner: { id: owner.id, name: owner.name },
    stage,
    value: {
      amountMinorUnits: Math.floor(rand() * 500_000 + 5_000) * 100,
      currency: pick(CURRENCIES),
    },
    probability: stage === 'closed_won' ? 100 : stage === 'closed_lost' ? 0 : Math.floor(rand() * 80 + 10),
    closeDate: closeDate.toISOString(),
    createdAt: createdAt.toISOString(),
    updatedAt: createdAt.toISOString(),
  }
}

const DATASET: Deal[] = Array.from({ length: 240 }, (_, i) => generateDeal(i))

function matchesFilters(deal: Deal, query: DealListQuery): boolean {
  if (query.search) {
    const needle = query.search.toLowerCase()
    const haystack = `${deal.name} ${deal.company.name} ${deal.owner.name}`.toLowerCase()
    if (!haystack.includes(needle)) return false
  }
  if (query.stages.length > 0 && !query.stages.includes(deal.stage as DealStage)) return false
  if (query.ownerIds.length > 0 && !query.ownerIds.includes(deal.owner.id)) return false
  if (query.valueMin !== null && deal.value.amountMinorUnits < query.valueMin * 100) return false
  if (query.valueMax !== null && deal.value.amountMinorUnits > query.valueMax * 100) return false
  return true
}

function compareDeals(a: Deal, b: Deal, query: DealListQuery): number {
  const direction = query.sortOrder === 'asc' ? 1 : -1
  switch (query.sortBy) {
    case 'value':
      return (a.value.amountMinorUnits - b.value.amountMinorUnits) * direction
    case 'name':
      return a.name.localeCompare(b.name) * direction
    case 'closeDate':
    default:
      return (new Date(a.closeDate).getTime() - new Date(b.closeDate).getTime()) * direction
  }
}

const SIMULATED_LATENCY_MS = 280

/** Stand-in for a real HTTP client call — same shape a REST/GraphQL layer would return. */
export async function fetchDeals(query: DealListQuery): Promise<Paginated<Deal>> {
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS))

  const filtered = DATASET.filter((deal) => matchesFilters(deal, query)).sort((a, b) => compareDeals(a, b, query))
  const start = (query.page - 1) * query.pageSize
  const items = filtered.slice(start, start + query.pageSize)

  return { items, total: filtered.length, page: query.page, pageSize: query.pageSize }
}

export async function fetchDealOwners(): Promise<{ id: string; name: string }[]> {
  await new Promise((resolve) => setTimeout(resolve, 120))
  return OWNERS
}
