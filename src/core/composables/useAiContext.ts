import { i18n } from '@/config/i18n'
import { useCrmStore } from '@/stores/useCrmStore'
import { useErpStore } from '@/stores/useErpStore'
import { useNotificationsStore } from '@/stores/useNotificationsStore'
import { deriveStockStatus } from '@/types/crm'

/** Locale code -> the language name the model should answer in. */
const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  uz: 'Uzbek (Latin script)',
  'uz-Cyrl': 'Uzbek (Cyrillic script)',
  ru: 'Russian',
}

/**
 * Character ceiling for the whole prompt. The demo dataset lands around 25k,
 * so every row normally ships in full; the budget only matters if a tenant
 * loads a bigger one, in which case rows are trimmed per section instead of
 * the request failing on a context-length error.
 */
const MAX_CONTEXT_CHARS = 60_000

interface Section {
  heading: string
  /** Column legend, so the model can read the pipe-delimited rows reliably. */
  columns: string
  rows: string[]
}

/** `12345600` -> `123456 UZS` — minor units are noise in a chat answer. */
function money(amountMinorUnits: number, currency: string): string {
  return `${Math.round(amountMinorUnits / 100)} ${currency}`
}

/** ISO timestamp -> `2026-09-15`; the time-of-day is never asked about. */
function day(iso: string | null): string {
  return iso ? iso.slice(0, 10) : '-'
}

function renderSection(section: Section, rowLimit: number): string {
  const head = `## ${section.heading} (${section.rows.length})`
  if (section.rows.length === 0) return `${head}\n(none)`
  const shown = section.rows.slice(0, rowLimit)
  const omitted = section.rows.length - shown.length
  const tail = omitted > 0 ? `\n(+${omitted} more rows omitted — ask for a narrower slice to see them)` : ''
  return `${head}\ncolumns: ${section.columns}\n${shown.join('\n')}${tail}`
}

/**
 * Builds a plain-text dump of the live CRM/ERP data so the AI helper answers
 * grounded in what's actually in the workspace rather than generic knowledge.
 *
 * Every record ships as one pipe-delimited row: the helper is asked things
 * like "list 10 employees" or "what do we know about Dilnoza?", which summary
 * counts and a handful of sample rows simply cannot answer. Rows are trimmed
 * only when the dataset would blow the context budget.
 */
export function buildAiContext(): string {
  const crm = useCrmStore()
  const erp = useErpStore()
  const notifications = useNotificationsStore()

  const sections: Section[] = [
    {
      heading: 'Customers',
      columns: 'name | industry | lifecycle | status | owner | branch | lifetime value | tags | last activity',
      rows: crm.customers.map((c) =>
        [
          c.name,
          c.industry,
          c.lifecycleStage,
          c.status,
          c.owner,
          c.branch,
          money(c.lifetimeValueMinorUnits, c.currency),
          c.tags.join('/') || '-',
          day(c.lastActivityAt),
        ].join(' | '),
      ),
    },
    {
      heading: 'Contacts',
      columns: 'name | role | customer | email | phone | primary | last contacted',
      rows: crm.contacts.map((c) =>
        [c.name, c.role, c.customerName, c.email, c.phone, c.isPrimary ? 'primary' : '-', day(c.lastContactedAt)].join(' | '),
      ),
    },
    {
      heading: 'Leads',
      columns: 'name | company | email | phone | source | status | owner | branch | estimated value | last contacted',
      rows: crm.leads.map((l) =>
        [
          l.name,
          l.company,
          l.email,
          l.phone,
          l.source,
          l.status,
          l.owner,
          l.branch,
          money(l.estimatedValueMinorUnits, l.currency),
          day(l.lastContactedAt),
        ].join(' | '),
      ),
    },
    {
      heading: 'Deals',
      columns: 'title | customer | stage | amount | probability | owner | branch | expected close',
      rows: crm.deals.map((d) =>
        [
          d.title,
          d.customerName,
          d.stage,
          money(d.amountMinorUnits, d.currency),
          `${d.probability}%`,
          d.owner,
          d.branch,
          day(d.expectedCloseDate),
        ].join(' | '),
      ),
    },
    {
      heading: 'Products / inventory',
      columns: 'sku | name | category | unit price | on hand | reorder threshold | stock status | warehouse | branch',
      rows: crm.products.map((p) =>
        [
          p.sku,
          p.name,
          p.category,
          money(p.unitPriceMinorUnits, p.currency),
          String(p.stockOnHand),
          String(p.reorderThreshold),
          deriveStockStatus(p),
          p.warehouse,
          p.branch,
        ].join(' | '),
      ),
    },
    {
      heading: 'Employees',
      columns: 'name | job title | department | status | manager | branch | email | phone | hire date | salary',
      rows: erp.employees.map((e) =>
        [
          e.name,
          e.jobTitle,
          e.department,
          e.employmentStatus,
          e.managerName ?? '-',
          e.branch,
          e.email,
          e.phone,
          day(e.hireDate),
          money(e.salaryMinorUnits, e.currency),
        ].join(' | '),
      ),
    },
    {
      heading: 'Suppliers',
      columns: 'name | contact | email | phone | category | rating | status | branch | address',
      rows: erp.suppliers.map((s) =>
        [s.name, s.contactName, s.email, s.phone, s.category, `${s.rating}/5`, s.status, s.branch, s.address].join(' | '),
      ),
    },
    {
      heading: 'Purchase orders',
      columns: 'po number | supplier | status | total | branch | ordered | expected delivery | line items',
      rows: erp.purchaseOrders.map((po) =>
        [
          po.poNumber,
          po.supplierName,
          po.status,
          money(po.totalMinorUnits, po.currency),
          po.branch,
          day(po.orderedAt),
          day(po.expectedDeliveryDate),
          po.lineItems.map((li) => `${li.productName} x${li.quantity}`).join(', '),
        ].join(' | '),
      ),
    },
    {
      heading: 'Shipments',
      columns: 'number | carrier | origin | destination | status | tracking | dispatched | eta | delivered',
      rows: erp.shipments.map((s) =>
        [
          s.shipmentNumber,
          s.carrier,
          s.origin,
          s.destination,
          s.status,
          s.trackingNumber,
          day(s.dispatchedAt),
          day(s.estimatedArrival),
          day(s.deliveredAt),
        ].join(' | '),
      ),
    },
    {
      heading: 'Finance transactions',
      columns: 'date | type | category | description | amount | status | branch | created by',
      rows: erp.transactions.map((tx) =>
        [
          day(tx.date),
          tx.type,
          tx.category,
          tx.description,
          money(tx.amountMinorUnits, tx.currency),
          tx.status,
          tx.branch,
          tx.createdBy,
        ].join(' | '),
      ),
    },
    {
      heading: 'Recent activity',
      columns: 'date | type | message | actor',
      rows: crm.activities.map((a) => [day(a.createdAt), a.type, a.message, a.actor].join(' | ')),
    },
    {
      heading: 'Notifications',
      columns: 'date | severity | category | read | title | message',
      rows: notifications.notifications.map((n) =>
        [day(n.createdAt), n.severity, n.category, n.isRead ? 'read' : 'unread', n.title, n.message].join(' | '),
      ),
    },
  ]

  const replyLanguage = LANGUAGE_NAMES[i18n.global.locale.value] ?? 'the language of the question'

  // The chat bubble renders the reply as plain text, so markdown syntax would
  // reach the user as literal asterisks and hashes. And the interface speaks
  // the user's language — an English-only answer reads as a broken reply.
  const preamble = `You are the in-app AI helper for ${crm.mode === 'demo' ? 'a demo' : 'a live'} CRM + ERP workspace.

Answer using ONLY the workspace data below. It is the complete dataset, one record per line, unless a section says rows were omitted. You can list, count, filter, sort and compare rows freely — when asked for a number of items ("10 employees"), return exactly that many. When asked about one person or record by name, find their row and report the fields it holds. If the data genuinely doesn't contain the answer, say so plainly instead of guessing.

Reply in ${replyLanguage}, unless the user writes in a different language — then match theirs.
Write plain text only: no markdown, no **bold**, no headings, no tables. For lists use short lines starting with "- ".

# Workspace summary
- Display currency: ${crm.universalFilters.currency}
- KPIs: ${crm.kpis.map((k) => `${k.label}=${k.value}${k.unit === 'percent' ? '%' : ''}`).join(', ')}
- Finance: income ${money(erp.totalIncomeMinorUnits, crm.universalFilters.currency)}, expense ${money(erp.totalExpenseMinorUnits, crm.universalFilters.currency)}, net profit ${money(erp.netProfitMinorUnits, crm.universalFilters.currency)}
- Employees: ${erp.employees.length} (${erp.activeEmployeesCount} active) · Suppliers: ${erp.suppliers.length} (${erp.activeSuppliersCount} active)
- Low-stock products: ${crm.lowStockProducts.length} · Unread notifications: ${notifications.unreadCount}

# Workspace data`

  // Shrink the per-section row cap until the whole prompt fits the budget.
  // Sections are capped uniformly so no single large table starves the rest.
  let rowLimit = Number.POSITIVE_INFINITY
  let context = ''
  for (;;) {
    context = [preamble, ...sections.map((s) => renderSection(s, rowLimit))].join('\n\n')
    if (context.length <= MAX_CONTEXT_CHARS || rowLimit <= 10) break
    const largest = Math.max(...sections.map((s) => Math.min(s.rows.length, rowLimit)))
    rowLimit = Math.max(10, Math.floor(largest / 2))
  }
  return context
}
