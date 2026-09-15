import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { convertMinorUnits } from '@/core/utils/currency'
import {
  LEAD_STATUSES,
  OPEN_DEAL_STAGES,
  createEmptyContactFilters,
  createEmptyDealFilters,
  createEmptyLeadFilters,
  type Branch,
  type ContactFilters,
  type CurrencyCode,
  type DealFilters,
  type DealSort,
  type DealStage,
  type IActivity,
  type IContact,
  type ICustomer,
  type IDeal,
  type ILead,
  type IKpiMetric,
  type IProduct,
  type LeadFilters,
  type LeadStatus,
  type UniversalFilters,
} from '@/types/crm'
import { createEmptyProductFilters, type ProductFilters } from '@/types/erp'
import { PREVIOUS_PERIOD_BASELINE, generateDemoDataset } from './crm.mock'

export type DataMode = 'demo' | 'live'

export const useCrmStore = defineStore(
  'crm',
  () => {
    // -------------------------------------------------------------------
    // Core dataset + mode
    // -------------------------------------------------------------------
    const mode = ref<DataMode>('demo')
    const customers = ref<ICustomer[]>([])
    const leads = ref<ILead[]>([])
    const contacts = ref<IContact[]>([])
    const deals = ref<IDeal[]>([])
    const products = ref<IProduct[]>([])
    const activities = ref<IActivity[]>([])

    function loadDemoData() {
      const dataset = generateDemoDataset()
      customers.value = dataset.customers
      leads.value = dataset.leads
      contacts.value = dataset.contacts
      deals.value = dataset.deals
      products.value = dataset.products
      activities.value = dataset.activities
      mode.value = 'demo'
    }

    /**
     * There is no real backend behind this reference build. Switching to
     * "live" mode empties the dataset and flags the connection as
     * unconfigured — views render their real empty/error state rather than
     * silently keeping demo rows around under a "live" label.
     */
    const liveConnectionStatus = ref<'not_configured' | 'connected'>('not_configured')

    function setMode(next: DataMode) {
      mode.value = next
      if (next === 'live') {
        customers.value = []
        leads.value = []
        contacts.value = []
        deals.value = []
        products.value = []
        activities.value = []
        liveConnectionStatus.value = 'not_configured'
      } else {
        loadDemoData()
      }
    }

    // First-ever load (nothing in storage yet) needs a populated dataset.
    // On later reloads this runs too, but pinia-plugin-persistedstate
    // hydrates over it synchronously right after setup() returns, so a
    // returning user's persisted edits still win — this call just avoids
    // a blank dataset for the very first session.
    if (customers.value.length === 0 && mode.value === 'demo') {
      loadDemoData()
    }

    // -------------------------------------------------------------------
    // Universal filter bar (Dashboard + inherited by domain views)
    // -------------------------------------------------------------------
    const universalFilters = ref<UniversalFilters>({ dateRange: null, branch: null, currency: 'UZS' })

    function setUniversalFilters(next: Partial<UniversalFilters>) {
      universalFilters.value = { ...universalFilters.value, ...next }
    }

    function inDateRange(isoDate: string): boolean {
      const range = universalFilters.value.dateRange
      if (!range) return true
      const time = new Date(isoDate).getTime()
      return time >= new Date(range.from).getTime() && time <= new Date(range.to).getTime()
    }

    function inBranch(branch: Branch): boolean {
      return universalFilters.value.branch === null || universalFilters.value.branch === branch
    }

    /** Deals within the universal (branch/date-range) scope — the shared base every dashboard widget and KPI reads from. */
    const universallyFilteredDeals = computed(() => deals.value.filter((deal) => inBranch(deal.branch) && inDateRange(deal.createdAt)))
    const universallyFilteredCustomers = computed(() => customers.value.filter((c) => inBranch(c.branch)))
    const universallyFilteredProducts = computed(() => products.value.filter((p) => inBranch(p.branch)))

    function toDisplayCurrency(amountMinorUnits: number, from: CurrencyCode): number {
      return convertMinorUnits(amountMinorUnits, from, universalFilters.value.currency)
    }

    // -------------------------------------------------------------------
    // Deal-list advanced filters, sort, pagination (DealsView)
    // -------------------------------------------------------------------
    const dealFilters = ref<DealFilters>(createEmptyDealFilters())
    const dealSort = ref<DealSort>({ sortBy: 'expectedCloseDate', sortOrder: 'asc' })
    const dealPage = ref(1)
    const dealPageSize = ref(10)

    const dealOwners = computed(() => Array.from(new Set(deals.value.map((deal) => deal.owner))).sort())

    const activeDealFilterCount = computed(() => {
      const f = dealFilters.value
      return (
        (f.search ? 1 : 0) +
        f.stages.length +
        f.owners.length +
        (f.amountMin !== null ? 1 : 0) +
        (f.amountMax !== null ? 1 : 0)
      )
    })

    function setDealFilters(next: Partial<DealFilters>) {
      dealFilters.value = { ...dealFilters.value, ...next }
      dealPage.value = 1
    }

    function resetDealFilters() {
      dealFilters.value = createEmptyDealFilters()
      dealPage.value = 1
    }

    function setDealSort(sortBy: DealSort['sortBy'], sortOrder: DealSort['sortOrder']) {
      dealSort.value = { sortBy, sortOrder }
    }

    function setDealPage(page: number) {
      dealPage.value = page
    }

    function setDealPageSize(pageSize: number) {
      dealPageSize.value = pageSize
      dealPage.value = 1
    }

    const dealsMatchingFilters = computed(() => {
      const f = dealFilters.value
      const needle = f.search.trim().toLowerCase()
      return universallyFilteredDeals.value.filter((deal) => {
        if (needle && !`${deal.title} ${deal.customerName} ${deal.owner}`.toLowerCase().includes(needle)) return false
        if (f.stages.length > 0 && !f.stages.includes(deal.stage)) return false
        if (f.owners.length > 0 && !f.owners.includes(deal.owner)) return false
        const amountInBase = toDisplayCurrency(deal.amountMinorUnits, deal.currency) / 100
        if (f.amountMin !== null && amountInBase < f.amountMin) return false
        if (f.amountMax !== null && amountInBase > f.amountMax) return false
        return true
      })
    })

    const sortedFilteredDeals = computed(() => {
      const { sortBy, sortOrder } = dealSort.value
      const direction = sortOrder === 'asc' ? 1 : -1
      return [...dealsMatchingFilters.value].sort((a, b) => {
        switch (sortBy) {
          case 'amountMinorUnits':
            return (toDisplayCurrency(a.amountMinorUnits, a.currency) - toDisplayCurrency(b.amountMinorUnits, b.currency)) * direction
          case 'title':
            return a.title.localeCompare(b.title) * direction
          case 'stage':
            return a.stage.localeCompare(b.stage) * direction
          case 'expectedCloseDate':
          default:
            return (new Date(a.expectedCloseDate).getTime() - new Date(b.expectedCloseDate).getTime()) * direction
        }
      })
    })

    const dealsPageCount = computed(() => Math.max(1, Math.ceil(sortedFilteredDeals.value.length / dealPageSize.value)))

    const paginatedDeals = computed(() => {
      const start = (dealPage.value - 1) * dealPageSize.value
      return sortedFilteredDeals.value.slice(start, start + dealPageSize.value)
    })

    // -------------------------------------------------------------------
    // CRUD — Deals
    // -------------------------------------------------------------------
    function addDeal(deal: IDeal) {
      deals.value = [deal, ...deals.value]
    }

    function updateDeal(id: string, patch: Partial<Omit<IDeal, 'id'>>) {
      const index = deals.value.findIndex((d) => d.id === id)
      if (index === -1) return
      const existing = deals.value[index]
      if (!existing) return
      deals.value.splice(index, 1, { ...existing, ...patch, updatedAt: new Date().toISOString() })
    }

    function changeDealStage(id: string, stage: DealStage) {
      if (stage === 'closed_won') updateDeal(id, { stage, probability: 100 })
      else if (stage === 'closed_lost') updateDeal(id, { stage, probability: 0 })
      else updateDeal(id, { stage })
    }

    function removeDeal(id: string) {
      deals.value = deals.value.filter((d) => d.id !== id)
    }

    // -------------------------------------------------------------------
    // CRUD — Customers
    // -------------------------------------------------------------------
    function addCustomer(customer: ICustomer) {
      customers.value = [customer, ...customers.value]
    }

    function updateCustomer(id: string, patch: Partial<Omit<ICustomer, 'id'>>) {
      const index = customers.value.findIndex((c) => c.id === id)
      if (index === -1) return
      const existing = customers.value[index]
      if (!existing) return
      customers.value.splice(index, 1, { ...existing, ...patch })
    }

    function removeCustomer(id: string) {
      customers.value = customers.value.filter((c) => c.id !== id)
    }

    // -------------------------------------------------------------------
    // CRUD — Products
    // -------------------------------------------------------------------
    function addProduct(product: IProduct) {
      products.value = [product, ...products.value]
    }

    function updateProduct(id: string, patch: Partial<Omit<IProduct, 'id'>>) {
      const index = products.value.findIndex((p) => p.id === id)
      if (index === -1) return
      const existing = products.value[index]
      if (!existing) return
      products.value.splice(index, 1, { ...existing, ...patch, updatedAt: new Date().toISOString() })
    }

    function adjustStock(id: string, delta: number) {
      const product = products.value.find((p) => p.id === id)
      if (!product) return
      updateProduct(id, { stockOnHand: Math.max(0, product.stockOnHand + delta) })
    }

    function removeProduct(id: string) {
      products.value = products.value.filter((p) => p.id !== id)
    }

    // -------------------------------------------------------------------
    // Product/Inventory filters & pagination (InventoryView)
    // -------------------------------------------------------------------
    const productFilters = ref<ProductFilters>(createEmptyProductFilters())
    const productPage = ref(1)
    const productPageSize = ref(10)

    const productCategoryOptions = computed(() => Array.from(new Set(products.value.map((p) => p.category))).sort())

    const activeProductFilterCount = computed(() => {
      const f = productFilters.value
      return (f.search ? 1 : 0) + f.categories.length + (f.lowStockOnly ? 1 : 0)
    })

    function setProductFilters(next: Partial<ProductFilters>) {
      productFilters.value = { ...productFilters.value, ...next }
      productPage.value = 1
    }

    function resetProductFilters() {
      productFilters.value = createEmptyProductFilters()
      productPage.value = 1
    }

    function setProductPage(page: number) {
      productPage.value = page
    }

    function setProductPageSize(pageSize: number) {
      productPageSize.value = pageSize
      productPage.value = 1
    }

    const productsMatchingFilters = computed(() => {
      const f = productFilters.value
      const needle = f.search.trim().toLowerCase()
      return universallyFilteredProducts.value.filter((product) => {
        if (needle && !`${product.name} ${product.sku} ${product.warehouse}`.toLowerCase().includes(needle)) return false
        if (f.categories.length > 0 && !f.categories.includes(product.category)) return false
        if (f.lowStockOnly && product.stockOnHand > product.reorderThreshold) return false
        return true
      })
    })

    const productsPageCount = computed(() => Math.max(1, Math.ceil(productsMatchingFilters.value.length / productPageSize.value)))

    const paginatedProducts = computed(() => {
      const start = (productPage.value - 1) * productPageSize.value
      return productsMatchingFilters.value.slice(start, start + productPageSize.value)
    })

    // -------------------------------------------------------------------
    // Leads (list, filters, pagination, CRUD, conversion)
    // -------------------------------------------------------------------
    const leadFilters = ref<LeadFilters>(createEmptyLeadFilters())
    const leadPage = ref(1)
    const leadPageSize = ref(10)

    const leadOwners = computed(() => Array.from(new Set(leads.value.map((lead) => lead.owner))).sort())

    const activeLeadFilterCount = computed(() => {
      const f = leadFilters.value
      return (f.search ? 1 : 0) + f.statuses.length + f.sources.length + f.owners.length
    })

    function setLeadFilters(next: Partial<LeadFilters>) {
      leadFilters.value = { ...leadFilters.value, ...next }
      leadPage.value = 1
    }

    function resetLeadFilters() {
      leadFilters.value = createEmptyLeadFilters()
      leadPage.value = 1
    }

    function setLeadPage(page: number) {
      leadPage.value = page
    }

    function setLeadPageSize(pageSize: number) {
      leadPageSize.value = pageSize
      leadPage.value = 1
    }

    const leadsMatchingFilters = computed(() => {
      const f = leadFilters.value
      const needle = f.search.trim().toLowerCase()
      return leads.value
        .filter((lead) => {
          if (needle && !`${lead.name} ${lead.company} ${lead.email}`.toLowerCase().includes(needle)) return false
          if (f.statuses.length > 0 && !f.statuses.includes(lead.status)) return false
          if (f.sources.length > 0 && !f.sources.includes(lead.source)) return false
          if (f.owners.length > 0 && !f.owners.includes(lead.owner)) return false
          return true
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    })

    const leadsPageCount = computed(() => Math.max(1, Math.ceil(leadsMatchingFilters.value.length / leadPageSize.value)))

    const paginatedLeads = computed(() => {
      const start = (leadPage.value - 1) * leadPageSize.value
      return leadsMatchingFilters.value.slice(start, start + leadPageSize.value)
    })

    /** Lead count per status, in funnel order — drives the LeadsView conversion funnel widget. */
    const leadFunnel = computed(() => {
      return LEAD_STATUSES.map((status) => ({
        status,
        count: leads.value.filter((lead) => lead.status === status).length,
      }))
    })

    function addLead(lead: ILead) {
      leads.value = [lead, ...leads.value]
    }

    function updateLead(id: string, patch: Partial<Omit<ILead, 'id'>>) {
      const index = leads.value.findIndex((l) => l.id === id)
      if (index === -1) return
      const existing = leads.value[index]
      if (!existing) return
      leads.value.splice(index, 1, { ...existing, ...patch })
    }

    function setLeadStatus(id: string, status: LeadStatus) {
      updateLead(id, { status, lastContactedAt: new Date().toISOString() })
    }

    function removeLead(id: string) {
      leads.value = leads.value.filter((l) => l.id !== id)
    }

    /** Converts a lead into a full customer record and marks the lead as converted. */
    function convertLead(id: string): ICustomer | null {
      const lead = leads.value.find((l) => l.id === id)
      if (!lead || lead.status === 'converted') return null
      const customer: ICustomer = {
        id: `cust-${Date.now()}`,
        name: lead.company,
        industry: 'Unclassified',
        lifecycleStage: 'customer',
        status: 'active',
        owner: lead.owner,
        branch: lead.branch,
        contacts: [{ id: `contact-${Date.now()}`, name: lead.name, email: lead.email, phone: lead.phone, role: 'Primary Contact' }],
        lifetimeValueMinorUnits: lead.estimatedValueMinorUnits,
        currency: lead.currency,
        tags: ['converted-lead'],
        createdAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
      }
      customers.value = [customer, ...customers.value]
      updateLead(id, { status: 'converted', convertedCustomerId: customer.id })
      return customer
    }

    // -------------------------------------------------------------------
    // Contacts (global directory, filters, pagination, CRUD)
    // -------------------------------------------------------------------
    const contactFilters = ref<ContactFilters>(createEmptyContactFilters())
    const contactPage = ref(1)
    const contactPageSize = ref(10)

    const activeContactFilterCount = computed(() => {
      const f = contactFilters.value
      return (f.search ? 1 : 0) + f.customerIds.length + (f.primaryOnly ? 1 : 0)
    })

    function setContactFilters(next: Partial<ContactFilters>) {
      contactFilters.value = { ...contactFilters.value, ...next }
      contactPage.value = 1
    }

    function resetContactFilters() {
      contactFilters.value = createEmptyContactFilters()
      contactPage.value = 1
    }

    function setContactPage(page: number) {
      contactPage.value = page
    }

    function setContactPageSize(pageSize: number) {
      contactPageSize.value = pageSize
      contactPage.value = 1
    }

    const contactsMatchingFilters = computed(() => {
      const f = contactFilters.value
      const needle = f.search.trim().toLowerCase()
      return contacts.value
        .filter((contact) => {
          if (needle && !`${contact.name} ${contact.customerName} ${contact.role} ${contact.email}`.toLowerCase().includes(needle)) return false
          if (f.customerIds.length > 0 && !f.customerIds.includes(contact.customerId)) return false
          if (f.primaryOnly && !contact.isPrimary) return false
          return true
        })
        .sort((a, b) => new Date(b.lastContactedAt).getTime() - new Date(a.lastContactedAt).getTime())
    })

    const contactsPageCount = computed(() => Math.max(1, Math.ceil(contactsMatchingFilters.value.length / contactPageSize.value)))

    const paginatedContacts = computed(() => {
      const start = (contactPage.value - 1) * contactPageSize.value
      return contactsMatchingFilters.value.slice(start, start + contactPageSize.value)
    })

    function addContact(contact: IContact) {
      contacts.value = [contact, ...contacts.value]
    }

    function updateContact(id: string, patch: Partial<Omit<IContact, 'id'>>) {
      const index = contacts.value.findIndex((c) => c.id === id)
      if (index === -1) return
      const existing = contacts.value[index]
      if (!existing) return
      contacts.value.splice(index, 1, { ...existing, ...patch })
    }

    function removeContact(id: string) {
      contacts.value = contacts.value.filter((c) => c.id !== id)
    }

    // -------------------------------------------------------------------
    // CRUD — Activities
    // -------------------------------------------------------------------
    function addActivity(activity: IActivity) {
      activities.value = [activity, ...activities.value]
    }

    function removeActivity(id: string) {
      activities.value = activities.value.filter((a) => a.id !== id)
    }

    // -------------------------------------------------------------------
    // Analytics: KPIs, pipeline, revenue breakdown, alerts
    // -------------------------------------------------------------------
    function trend(current: number, previous: number): Pick<IKpiMetric, 'trendPercent' | 'trendDirection'> {
      if (previous === 0) return { trendPercent: 0, trendDirection: 'flat' }
      const percent = ((current - previous) / previous) * 100
      const direction = percent > 0.5 ? 'up' : percent < -0.5 ? 'down' : 'flat'
      return { trendPercent: Math.round(percent * 10) / 10, trendDirection: direction }
    }

    const totalInventoryValueMinorUnits = computed(() =>
      universallyFilteredProducts.value.reduce(
        (sum, p) => sum + toDisplayCurrency(p.unitPriceMinorUnits * p.stockOnHand, p.currency),
        0,
      ),
    )

    const kpis = computed<IKpiMetric[]>(() => {
      const won = universallyFilteredDeals.value.filter((d) => d.stage === 'closed_won')
      const lost = universallyFilteredDeals.value.filter((d) => d.stage === 'closed_lost')
      const revenue = won.reduce((sum, d) => sum + toDisplayCurrency(d.amountMinorUnits, d.currency), 0)
      const activeDeals = universallyFilteredDeals.value.filter((d) => OPEN_DEAL_STAGES.includes(d.stage)).length
      const decided = won.length + lost.length
      const conversionRate = decided === 0 ? 0 : (won.length / decided) * 100
      const inventoryValue = totalInventoryValueMinorUnits.value
      const inventoryTurnover = inventoryValue === 0 ? 0 : Math.round((revenue / inventoryValue) * 10) / 10
      const churned = universallyFilteredCustomers.value.filter((c) => c.lifecycleStage === 'churned').length
      const churnRate = universallyFilteredCustomers.value.length === 0 ? 0 : (churned / universallyFilteredCustomers.value.length) * 100

      const baseline = PREVIOUS_PERIOD_BASELINE
      const revenueBaseline = convertMinorUnits(baseline.revenueMinorUnitsUsd, 'USD', universalFilters.value.currency)

      return [
        {
          id: 'revenue',
          label: 'Revenue (won deals)',
          value: revenue / 100,
          unit: 'currency',
          currency: universalFilters.value.currency,
          comparisonLabel: 'vs last month',
          ...trend(revenue, revenueBaseline),
        },
        {
          id: 'conversion-rate',
          label: 'Conversion Rate',
          value: Math.round(conversionRate * 10) / 10,
          unit: 'percent',
          comparisonLabel: 'vs last month',
          ...trend(conversionRate, baseline.conversionRatePercent),
        },
        {
          id: 'active-deals',
          label: 'Active Deals',
          value: activeDeals,
          unit: 'count',
          comparisonLabel: 'vs last month',
          ...trend(activeDeals, baseline.activeDeals),
        },
        {
          id: 'inventory-turnover',
          label: 'Inventory Turnover',
          value: inventoryTurnover,
          unit: 'ratio',
          comparisonLabel: 'vs last month',
          ...trend(inventoryTurnover, baseline.inventoryTurnoverRatio),
        },
        {
          id: 'churn-rate',
          label: 'Churn Rate',
          value: Math.round(churnRate * 10) / 10,
          unit: 'percent',
          comparisonLabel: 'vs last month',
          ...trend(churnRate, baseline.churnRatePercent),
        },
      ]
    })

    const pipelineByStage = computed(() => {
      const totals = new Map<DealStage, { count: number; amountMinorUnits: number }>()
      for (const deal of universallyFilteredDeals.value) {
        const entry = totals.get(deal.stage) ?? { count: 0, amountMinorUnits: 0 }
        entry.count += 1
        entry.amountMinorUnits += toDisplayCurrency(deal.amountMinorUnits, deal.currency)
        totals.set(deal.stage, entry)
      }
      return totals
    })

    const revenueByBranch = computed(() => {
      const totals = new Map<Branch, number>()
      for (const deal of universallyFilteredDeals.value) {
        if (deal.stage !== 'closed_won') continue
        totals.set(deal.branch, (totals.get(deal.branch) ?? 0) + toDisplayCurrency(deal.amountMinorUnits, deal.currency))
      }
      return totals
    })

    const recentActivities = computed(() => activities.value.slice(0, 12))

    const lowStockProducts = computed(() =>
      universallyFilteredProducts.value.filter((p) => p.stockOnHand <= p.reorderThreshold).sort((a, b) => a.stockOnHand - b.stockOnHand),
    )

    return {
      mode,
      customers,
      leads,
      contacts,
      deals,
      products,
      activities,
      liveConnectionStatus,
      setMode,
      loadDemoData,

      universalFilters,
      setUniversalFilters,
      universallyFilteredCustomers,
      universallyFilteredProducts,

      productFilters,
      productPage,
      productPageSize,
      productCategoryOptions,
      activeProductFilterCount,
      setProductFilters,
      resetProductFilters,
      setProductPage,
      setProductPageSize,
      paginatedProducts,
      productsPageCount,
      productsTotalCount: computed(() => productsMatchingFilters.value.length),

      leadFilters,
      leadPage,
      leadPageSize,
      leadOwners,
      activeLeadFilterCount,
      setLeadFilters,
      resetLeadFilters,
      setLeadPage,
      setLeadPageSize,
      paginatedLeads,
      leadsPageCount,
      leadsTotalCount: computed(() => leadsMatchingFilters.value.length),
      leadFunnel,
      addLead,
      updateLead,
      setLeadStatus,
      removeLead,
      convertLead,

      contactFilters,
      contactPage,
      contactPageSize,
      activeContactFilterCount,
      setContactFilters,
      resetContactFilters,
      setContactPage,
      setContactPageSize,
      paginatedContacts,
      contactsPageCount,
      contactsTotalCount: computed(() => contactsMatchingFilters.value.length),
      addContact,
      updateContact,
      removeContact,

      dealFilters,
      dealSort,
      dealPage,
      dealPageSize,
      dealOwners,
      activeDealFilterCount,
      setDealFilters,
      resetDealFilters,
      setDealSort,
      setDealPage,
      setDealPageSize,
      paginatedDeals,
      dealsPageCount,
      dealsTotalCount: computed(() => sortedFilteredDeals.value.length),

      addDeal,
      updateDeal,
      changeDealStage,
      removeDeal,
      addCustomer,
      updateCustomer,
      removeCustomer,
      addActivity,
      removeActivity,
      addProduct,
      updateProduct,
      adjustStock,
      removeProduct,

      kpis,
      pipelineByStage,
      revenueByBranch,
      recentActivities,
      lowStockProducts,
      toDisplayCurrency,
    }
  },
  {
    persist: {
      // Persist the working dataset + view prefs so CRUD edits and filter
      // choices survive a refresh — this *is* the "persistent demo state"
      // the store is meant to provide, not just cosmetic prefs.
      pick: [
        'mode',
        'customers',
        'leads',
        'contacts',
        'deals',
        'products',
        'activities',
        'universalFilters',
        'dealFilters',
        'dealSort',
        'dealPageSize',
        'leadFilters',
        'leadPageSize',
        'contactFilters',
        'contactPageSize',
        'productFilters',
        'productPageSize',
      ],
    },
  },
)
