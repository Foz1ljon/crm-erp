import { useCrmStore } from '@/stores/useCrmStore'
import { useErpStore } from '@/stores/useErpStore'
import { useNotificationsStore } from '@/stores/useNotificationsStore'

/**
 * Builds a compact, plain-text snapshot of the live CRM/ERP demo data so
 * the AI helper answers grounded in what's actually on screen, not
 * generic knowledge. Kept short (bullet summaries + a handful of sample
 * rows) — the full dataset is not needed for the model to answer
 * "how many open deals", "which products are low on stock", etc.
 */
export function buildAiContext(): string {
  const crm = useCrmStore()
  const erp = useErpStore()
  const notifications = useNotificationsStore()

  const topDeals = crm.deals
    .filter((d) => d.stage !== 'closed_lost')
    .slice(0, 8)
    .map((d) => `- ${d.title} | stage: ${d.stage} | amount: ${(d.amountMinorUnits / 100).toFixed(0)} ${d.currency} | owner: ${d.owner}`)
    .join('\n')

  const lowStock = crm.lowStockProducts
    .slice(0, 8)
    .map((p) => `- ${p.name} (${p.sku}): ${p.stockOnHand} on hand, reorder at ${p.reorderThreshold}`)
    .join('\n')

  const leadFunnel = crm.leadFunnel.map((f) => `${f.status}: ${f.count}`).join(', ')

  const openPOs = erp.purchaseOrders
    .filter((po) => po.status !== 'received' && po.status !== 'cancelled')
    .slice(0, 8)
    .map((po) => `- ${po.poNumber} | supplier: ${po.supplierName} | status: ${po.status} | total: ${(po.totalMinorUnits / 100).toFixed(0)} ${po.currency}`)
    .join('\n')

  const shipmentsInTransit = erp.shipments.filter((s) => s.status === 'in_transit').length
  const shipmentsDelayed = erp.shipments.filter((s) => s.status === 'delayed').length

  return `You are the in-app AI helper for "${crm.mode === 'demo' ? 'a demo' : 'a live'}" CRM + ERP workspace. Answer questions using ONLY the data below. If the data doesn't contain the answer, say so plainly instead of guessing. Keep answers concise.

## CRM summary
- Customers: ${crm.customers.length}, Leads: ${crm.leads.length} (funnel: ${leadFunnel}), Contacts: ${crm.contacts.length}
- Deals: ${crm.deals.length} total. KPIs: ${crm.kpis.map((k) => `${k.label}=${k.value}${k.unit === 'percent' ? '%' : ''}`).join(', ')}
- Sample active deals:
${topDeals || '(none)'}

## Inventory
- Products: ${crm.products.length}, low-stock items: ${crm.lowStockProducts.length}
${lowStock || '(none low on stock)'}

## ERP summary
- Employees: ${erp.employees.length} (${erp.activeEmployeesCount} active), Suppliers: ${erp.suppliers.length} (${erp.activeSuppliersCount} active)
- Finance: income ${(erp.totalIncomeMinorUnits / 100).toFixed(0)}, expense ${(erp.totalExpenseMinorUnits / 100).toFixed(0)}, net profit ${(erp.netProfitMinorUnits / 100).toFixed(0)} (display currency: ${crm.universalFilters.currency})
- Open purchase orders:
${openPOs || '(none)'}
- Shipments: ${erp.shipments.length} total, ${shipmentsInTransit} in transit, ${shipmentsDelayed} delayed

## Notifications
- Unread: ${notifications.unreadCount} of ${notifications.notifications.length}
`
}
