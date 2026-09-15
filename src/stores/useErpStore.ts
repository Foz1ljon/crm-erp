import { defineStore } from 'pinia'
import { computed, ref, type Ref } from 'vue'
import { convertMinorUnits } from '@/core/utils/currency'
import type { CurrencyCode } from '@/types/crm'
import {
  createEmptyEmployeeFilters,
  createEmptyPurchaseOrderFilters,
  createEmptyShipmentFilters,
  createEmptySupplierFilters,
  createEmptyTransactionFilters,
  type EmployeeFilters,
  type IEmployee,
  type IPurchaseOrder,
  type IShipment,
  type ISupplier,
  type ITransaction,
  type PurchaseOrderFilters,
  type PurchaseOrderStatus,
  type ShipmentFilters,
  type ShipmentStatus,
  type SupplierFilters,
  type TransactionFilters,
} from '@/types/erp'
import { generateErpDemoDataset } from './erp.mock'
import { useCrmStore } from './useCrmStore'

export type ErpDataMode = 'demo' | 'live'

function makePaginated<T>(source: () => T[], page: Ref<number>, pageSize: Ref<number>) {
  const pageCount = computed(() => Math.max(1, Math.ceil(source().length / pageSize.value)))
  const items = computed(() => {
    const start = (page.value - 1) * pageSize.value
    return source().slice(start, start + pageSize.value)
  })
  return { pageCount, items }
}

export const useErpStore = defineStore(
  'erp',
  () => {
    const mode = ref<ErpDataMode>('demo')
    const employees = ref<IEmployee[]>([])
    const suppliers = ref<ISupplier[]>([])
    const purchaseOrders = ref<IPurchaseOrder[]>([])
    const shipments = ref<IShipment[]>([])
    const transactions = ref<ITransaction[]>([])

    function loadDemoData() {
      const crm = useCrmStore()
      const dealIds = crm.deals.length > 0 ? crm.deals.map((d) => d.id) : ['deal-1']
      const dataset = generateErpDemoDataset(dealIds)
      employees.value = dataset.employees
      suppliers.value = dataset.suppliers
      purchaseOrders.value = dataset.purchaseOrders
      shipments.value = dataset.shipments
      transactions.value = dataset.transactions
      mode.value = 'demo'
    }

    const liveConnectionStatus = ref<'not_configured' | 'connected'>('not_configured')

    function setMode(next: ErpDataMode) {
      mode.value = next
      if (next === 'live') {
        employees.value = []
        suppliers.value = []
        purchaseOrders.value = []
        shipments.value = []
        transactions.value = []
        liveConnectionStatus.value = 'not_configured'
      } else {
        loadDemoData()
      }
    }

    if (employees.value.length === 0 && mode.value === 'demo') {
      loadDemoData()
    }

    function toDisplayCurrency(amountMinorUnits: number, from: CurrencyCode): number {
      const crm = useCrmStore()
      return convertMinorUnits(amountMinorUnits, from, crm.universalFilters.currency)
    }

    // -------------------------------------------------------------------
    // Employees (HR)
    // -------------------------------------------------------------------
    const employeeFilters = ref<EmployeeFilters>(createEmptyEmployeeFilters())
    const employeePage = ref(1)
    const employeePageSize = ref(10)

    function setEmployeeFilters(next: Partial<EmployeeFilters>) {
      employeeFilters.value = { ...employeeFilters.value, ...next }
      employeePage.value = 1
    }
    function resetEmployeeFilters() {
      employeeFilters.value = createEmptyEmployeeFilters()
      employeePage.value = 1
    }

    const employeesMatchingFilters = computed(() => {
      const f = employeeFilters.value
      const needle = f.search.trim().toLowerCase()
      return employees.value.filter((e) => {
        if (needle && !`${e.name} ${e.jobTitle} ${e.email}`.toLowerCase().includes(needle)) return false
        if (f.departments.length > 0 && !f.departments.includes(e.department)) return false
        if (f.statuses.length > 0 && !f.statuses.includes(e.employmentStatus)) return false
        return true
      })
    })
    const activeEmployeeFilterCount = computed(
      () => (employeeFilters.value.search ? 1 : 0) + employeeFilters.value.departments.length + employeeFilters.value.statuses.length,
    )
    const { pageCount: employeesPageCount, items: paginatedEmployees } = makePaginated(
      () => employeesMatchingFilters.value,
      employeePage,
      employeePageSize,
    )

    function addEmployee(employee: IEmployee) {
      employees.value = [employee, ...employees.value]
    }
    function updateEmployee(id: string, patch: Partial<Omit<IEmployee, 'id'>>) {
      const index = employees.value.findIndex((e) => e.id === id)
      if (index === -1) return
      const existing = employees.value[index]
      if (!existing) return
      employees.value.splice(index, 1, { ...existing, ...patch })
    }
    function removeEmployee(id: string) {
      employees.value = employees.value.filter((e) => e.id !== id)
    }

    // -------------------------------------------------------------------
    // Suppliers
    // -------------------------------------------------------------------
    const supplierFilters = ref<SupplierFilters>(createEmptySupplierFilters())
    const supplierPage = ref(1)
    const supplierPageSize = ref(10)

    function setSupplierFilters(next: Partial<SupplierFilters>) {
      supplierFilters.value = { ...supplierFilters.value, ...next }
      supplierPage.value = 1
    }
    function resetSupplierFilters() {
      supplierFilters.value = createEmptySupplierFilters()
      supplierPage.value = 1
    }

    const suppliersMatchingFilters = computed(() => {
      const f = supplierFilters.value
      const needle = f.search.trim().toLowerCase()
      return suppliers.value.filter((s) => {
        if (needle && !`${s.name} ${s.contactName} ${s.category}`.toLowerCase().includes(needle)) return false
        if (f.statuses.length > 0 && !f.statuses.includes(s.status)) return false
        return true
      })
    })
    const activeSupplierFilterCount = computed(() => (supplierFilters.value.search ? 1 : 0) + supplierFilters.value.statuses.length)
    const { pageCount: suppliersPageCount, items: paginatedSuppliers } = makePaginated(
      () => suppliersMatchingFilters.value,
      supplierPage,
      supplierPageSize,
    )

    function addSupplier(supplier: ISupplier) {
      suppliers.value = [supplier, ...suppliers.value]
    }
    function updateSupplier(id: string, patch: Partial<Omit<ISupplier, 'id'>>) {
      const index = suppliers.value.findIndex((s) => s.id === id)
      if (index === -1) return
      const existing = suppliers.value[index]
      if (!existing) return
      suppliers.value.splice(index, 1, { ...existing, ...patch })
    }
    function removeSupplier(id: string) {
      suppliers.value = suppliers.value.filter((s) => s.id !== id)
    }

    // -------------------------------------------------------------------
    // Purchase Orders
    // -------------------------------------------------------------------
    const purchaseOrderFilters = ref<PurchaseOrderFilters>(createEmptyPurchaseOrderFilters())
    const purchaseOrderPage = ref(1)
    const purchaseOrderPageSize = ref(10)

    function setPurchaseOrderFilters(next: Partial<PurchaseOrderFilters>) {
      purchaseOrderFilters.value = { ...purchaseOrderFilters.value, ...next }
      purchaseOrderPage.value = 1
    }
    function resetPurchaseOrderFilters() {
      purchaseOrderFilters.value = createEmptyPurchaseOrderFilters()
      purchaseOrderPage.value = 1
    }

    const purchaseOrdersMatchingFilters = computed(() => {
      const f = purchaseOrderFilters.value
      const needle = f.search.trim().toLowerCase()
      return purchaseOrders.value.filter((po) => {
        if (needle && !`${po.poNumber} ${po.supplierName}`.toLowerCase().includes(needle)) return false
        if (f.statuses.length > 0 && !f.statuses.includes(po.status)) return false
        return true
      })
    })
    const activePurchaseOrderFilterCount = computed(
      () => (purchaseOrderFilters.value.search ? 1 : 0) + purchaseOrderFilters.value.statuses.length,
    )
    const { pageCount: purchaseOrdersPageCount, items: paginatedPurchaseOrders } = makePaginated(
      () => purchaseOrdersMatchingFilters.value,
      purchaseOrderPage,
      purchaseOrderPageSize,
    )

    function addPurchaseOrder(po: IPurchaseOrder) {
      purchaseOrders.value = [po, ...purchaseOrders.value]
    }
    function setPurchaseOrderStatus(id: string, status: PurchaseOrderStatus) {
      const index = purchaseOrders.value.findIndex((po) => po.id === id)
      if (index === -1) return
      const existing = purchaseOrders.value[index]
      if (!existing) return
      purchaseOrders.value.splice(index, 1, { ...existing, status })
    }
    function removePurchaseOrder(id: string) {
      purchaseOrders.value = purchaseOrders.value.filter((po) => po.id !== id)
    }

    // -------------------------------------------------------------------
    // Shipments (Logistics)
    // -------------------------------------------------------------------
    const shipmentFilters = ref<ShipmentFilters>(createEmptyShipmentFilters())
    const shipmentPage = ref(1)
    const shipmentPageSize = ref(10)

    function setShipmentFilters(next: Partial<ShipmentFilters>) {
      shipmentFilters.value = { ...shipmentFilters.value, ...next }
      shipmentPage.value = 1
    }
    function resetShipmentFilters() {
      shipmentFilters.value = createEmptyShipmentFilters()
      shipmentPage.value = 1
    }

    const shipmentsMatchingFilters = computed(() => {
      const f = shipmentFilters.value
      const needle = f.search.trim().toLowerCase()
      return shipments.value.filter((s) => {
        if (needle && !`${s.shipmentNumber} ${s.carrier} ${s.origin} ${s.destination} ${s.trackingNumber}`.toLowerCase().includes(needle))
          return false
        if (f.statuses.length > 0 && !f.statuses.includes(s.status)) return false
        return true
      })
    })
    const activeShipmentFilterCount = computed(() => (shipmentFilters.value.search ? 1 : 0) + shipmentFilters.value.statuses.length)
    const { pageCount: shipmentsPageCount, items: paginatedShipments } = makePaginated(
      () => shipmentsMatchingFilters.value,
      shipmentPage,
      shipmentPageSize,
    )

    function addShipment(shipment: IShipment) {
      shipments.value = [shipment, ...shipments.value]
    }
    function setShipmentStatus(id: string, status: ShipmentStatus) {
      const index = shipments.value.findIndex((s) => s.id === id)
      if (index === -1) return
      const existing = shipments.value[index]
      if (!existing) return
      shipments.value.splice(index, 1, {
        ...existing,
        status,
        deliveredAt: status === 'delivered' ? new Date().toISOString() : existing.deliveredAt,
      })
    }
    function removeShipment(id: string) {
      shipments.value = shipments.value.filter((s) => s.id !== id)
    }

    // -------------------------------------------------------------------
    // Transactions (Finance)
    // -------------------------------------------------------------------
    const transactionFilters = ref<TransactionFilters>(createEmptyTransactionFilters())
    const transactionPage = ref(1)
    const transactionPageSize = ref(10)

    function setTransactionFilters(next: Partial<TransactionFilters>) {
      transactionFilters.value = { ...transactionFilters.value, ...next }
      transactionPage.value = 1
    }
    function resetTransactionFilters() {
      transactionFilters.value = createEmptyTransactionFilters()
      transactionPage.value = 1
    }

    const transactionsMatchingFilters = computed(() => {
      const f = transactionFilters.value
      const needle = f.search.trim().toLowerCase()
      return transactions.value.filter((t) => {
        if (needle && !`${t.description} ${t.createdBy}`.toLowerCase().includes(needle)) return false
        if (f.types.length > 0 && !f.types.includes(t.type)) return false
        if (f.categories.length > 0 && !f.categories.includes(t.category)) return false
        return true
      })
    })
    const activeTransactionFilterCount = computed(
      () => (transactionFilters.value.search ? 1 : 0) + transactionFilters.value.types.length + transactionFilters.value.categories.length,
    )
    const { pageCount: transactionsPageCount, items: paginatedTransactions } = makePaginated(
      () => transactionsMatchingFilters.value,
      transactionPage,
      transactionPageSize,
    )

    function addTransaction(transaction: ITransaction) {
      transactions.value = [transaction, ...transactions.value]
    }
    function removeTransaction(id: string) {
      transactions.value = transactions.value.filter((t) => t.id !== id)
    }

    // -------------------------------------------------------------------
    // Finance summary (drives FinanceView cards + Dashboard widget)
    // -------------------------------------------------------------------
    const totalIncomeMinorUnits = computed(() =>
      transactions.value
        .filter((t) => t.type === 'income' && t.status === 'completed')
        .reduce((sum, t) => sum + toDisplayCurrency(t.amountMinorUnits, t.currency), 0),
    )
    const totalExpenseMinorUnits = computed(() =>
      transactions.value
        .filter((t) => t.type === 'expense' && t.status === 'completed')
        .reduce((sum, t) => sum + toDisplayCurrency(t.amountMinorUnits, t.currency), 0),
    )
    const netProfitMinorUnits = computed(() => totalIncomeMinorUnits.value - totalExpenseMinorUnits.value)

    const purchaseOrderStatusCounts = computed(() => {
      const counts = new Map<PurchaseOrderStatus, number>()
      for (const po of purchaseOrders.value) counts.set(po.status, (counts.get(po.status) ?? 0) + 1)
      return counts
    })

    const shipmentStatusCounts = computed(() => {
      const counts = new Map<ShipmentStatus, number>()
      for (const s of shipments.value) counts.set(s.status, (counts.get(s.status) ?? 0) + 1)
      return counts
    })

    const activeSuppliersCount = computed(() => suppliers.value.filter((s) => s.status === 'active').length)
    const activeEmployeesCount = computed(() => employees.value.filter((e) => e.employmentStatus === 'active').length)

    return {
      mode,
      employees,
      suppliers,
      purchaseOrders,
      shipments,
      transactions,
      liveConnectionStatus,
      setMode,
      loadDemoData,
      toDisplayCurrency,

      employeeFilters,
      employeePage,
      employeePageSize,
      activeEmployeeFilterCount,
      setEmployeeFilters,
      resetEmployeeFilters,
      paginatedEmployees,
      employeesPageCount,
      employeesTotalCount: computed(() => employeesMatchingFilters.value.length),
      addEmployee,
      updateEmployee,
      removeEmployee,

      supplierFilters,
      supplierPage,
      supplierPageSize,
      activeSupplierFilterCount,
      setSupplierFilters,
      resetSupplierFilters,
      paginatedSuppliers,
      suppliersPageCount,
      suppliersTotalCount: computed(() => suppliersMatchingFilters.value.length),
      addSupplier,
      updateSupplier,
      removeSupplier,

      purchaseOrderFilters,
      purchaseOrderPage,
      purchaseOrderPageSize,
      activePurchaseOrderFilterCount,
      setPurchaseOrderFilters,
      resetPurchaseOrderFilters,
      paginatedPurchaseOrders,
      purchaseOrdersPageCount,
      purchaseOrdersTotalCount: computed(() => purchaseOrdersMatchingFilters.value.length),
      addPurchaseOrder,
      setPurchaseOrderStatus,
      removePurchaseOrder,

      shipmentFilters,
      shipmentPage,
      shipmentPageSize,
      activeShipmentFilterCount,
      setShipmentFilters,
      resetShipmentFilters,
      paginatedShipments,
      shipmentsPageCount,
      shipmentsTotalCount: computed(() => shipmentsMatchingFilters.value.length),
      addShipment,
      setShipmentStatus,
      removeShipment,

      transactionFilters,
      transactionPage,
      transactionPageSize,
      activeTransactionFilterCount,
      setTransactionFilters,
      resetTransactionFilters,
      paginatedTransactions,
      transactionsPageCount,
      transactionsTotalCount: computed(() => transactionsMatchingFilters.value.length),
      addTransaction,
      removeTransaction,

      totalIncomeMinorUnits,
      totalExpenseMinorUnits,
      netProfitMinorUnits,
      purchaseOrderStatusCounts,
      shipmentStatusCounts,
      activeSuppliersCount,
      activeEmployeesCount,
    }
  },
  {
    persist: {
      pick: [
        'mode',
        'employees',
        'suppliers',
        'purchaseOrders',
        'shipments',
        'transactions',
        'employeeFilters',
        'employeePageSize',
        'supplierFilters',
        'supplierPageSize',
        'purchaseOrderFilters',
        'purchaseOrderPageSize',
        'shipmentFilters',
        'shipmentPageSize',
        'transactionFilters',
        'transactionPageSize',
      ],
    },
  },
)
