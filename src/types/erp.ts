/**
 * ERP domain models: HR, Finance, Supply Chain, Logistics.
 * Mirrors the industry-agnostic conventions in types/crm.ts — free-form
 * `department`/`category` strings a tenant configures, not hardcoded verticals.
 */
import type { Branch, CurrencyCode } from './crm'

// ---------------------------------------------------------------------------
// HR: Employees
// ---------------------------------------------------------------------------

export const DEPARTMENTS = ['Sotuv', 'Operatsiyalar', 'Moliya', 'Muhandislik', 'Ombor', "Qo'llab-quvvatlash", 'HR'] as const
export type Department = (typeof DEPARTMENTS)[number]

export type EmploymentStatus = 'active' | 'on_leave' | 'terminated'

export interface IEmployee {
  id: string
  name: string
  email: string
  phone: string
  department: Department
  jobTitle: string
  employmentStatus: EmploymentStatus
  managerName: string | null
  branch: Branch
  hireDate: string
  salaryMinorUnits: number
  currency: CurrencyCode
}

// ---------------------------------------------------------------------------
// Finance: Transactions
// ---------------------------------------------------------------------------

export type TransactionType = 'income' | 'expense'

export const TRANSACTION_CATEGORIES = [
  'sales_revenue',
  'service_revenue',
  'payroll',
  'procurement',
  'rent',
  'utilities',
  'marketing',
  'software',
  'logistics',
  'other',
] as const
export type TransactionCategory = (typeof TRANSACTION_CATEGORIES)[number]

export type TransactionStatus = 'completed' | 'pending' | 'failed'

export interface ITransaction {
  id: string
  type: TransactionType
  category: TransactionCategory
  description: string
  amountMinorUnits: number
  currency: CurrencyCode
  status: TransactionStatus
  relatedDealId: string | null
  relatedPurchaseOrderId: string | null
  branch: Branch
  date: string
  createdBy: string
}

// ---------------------------------------------------------------------------
// Supply Chain: Suppliers & Purchase Orders
// ---------------------------------------------------------------------------

export type SupplierStatus = 'active' | 'inactive'

export interface ISupplier {
  id: string
  name: string
  contactName: string
  email: string
  phone: string
  category: string
  rating: number
  status: SupplierStatus
  address: string
  branch: Branch
  createdAt: string
}

export interface IPurchaseOrderLineItem {
  productName: string
  quantity: number
  unitPriceMinorUnits: number
}

export const PURCHASE_ORDER_STATUSES = ['draft', 'submitted', 'approved', 'received', 'cancelled'] as const
export type PurchaseOrderStatus = (typeof PURCHASE_ORDER_STATUSES)[number]

export interface IPurchaseOrder {
  id: string
  poNumber: string
  supplierId: string
  supplierName: string
  status: PurchaseOrderStatus
  lineItems: IPurchaseOrderLineItem[]
  totalMinorUnits: number
  currency: CurrencyCode
  branch: Branch
  orderedAt: string
  expectedDeliveryDate: string
}

// ---------------------------------------------------------------------------
// Logistics: Shipments
// ---------------------------------------------------------------------------

export const SHIPMENT_STATUSES = ['preparing', 'in_transit', 'delivered', 'delayed'] as const
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number]

export interface IShipment {
  id: string
  shipmentNumber: string
  purchaseOrderId: string | null
  carrier: string
  origin: string
  destination: string
  status: ShipmentStatus
  trackingNumber: string
  branch: Branch
  dispatchedAt: string
  estimatedArrival: string
  deliveredAt: string | null
}

// ---------------------------------------------------------------------------
// Shared filter shapes
// ---------------------------------------------------------------------------

export interface EmployeeFilters {
  search: string
  departments: Department[]
  statuses: EmploymentStatus[]
}

export function createEmptyEmployeeFilters(): EmployeeFilters {
  return { search: '', departments: [], statuses: [] }
}

export interface TransactionFilters {
  search: string
  types: TransactionType[]
  categories: TransactionCategory[]
}

export function createEmptyTransactionFilters(): TransactionFilters {
  return { search: '', types: [], categories: [] }
}

export interface SupplierFilters {
  search: string
  statuses: SupplierStatus[]
}

export function createEmptySupplierFilters(): SupplierFilters {
  return { search: '', statuses: [] }
}

export interface PurchaseOrderFilters {
  search: string
  statuses: PurchaseOrderStatus[]
}

export function createEmptyPurchaseOrderFilters(): PurchaseOrderFilters {
  return { search: '', statuses: [] }
}

export interface ShipmentFilters {
  search: string
  statuses: ShipmentStatus[]
}

export function createEmptyShipmentFilters(): ShipmentFilters {
  return { search: '', statuses: [] }
}

export interface ProductFilters {
  search: string
  categories: string[]
  lowStockOnly: boolean
}

export function createEmptyProductFilters(): ProductFilters {
  return { search: '', categories: [], lowStockOnly: false }
}
