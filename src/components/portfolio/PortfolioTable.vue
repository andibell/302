<script setup>
import { computed, ref } from 'vue'
import {
  formatMetricValue,
  getIntelligenceAnalysis,
  getLossRatioVariance,
  getPortfolioHierarchy,
  intelligencePeriods,
} from '../../data/portfolioAnalytics.js'

const props = defineProps({
  analysis: {
    type: Object,
    required: true,
  },
  latestAnalysis: {
    type: Object,
    required: true,
  },
  portfolioLatestAnalysis: {
    type: Object,
    required: true,
  },
  periodId: {
    type: String,
    required: true,
  },
  lineOfBusiness: {
    type: String,
    required: true,
  },
  subproduct: {
    type: String,
    required: true,
  },
  region: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['update:period'])
const expandedIds = ref(new Set(['portfolio']))
const sortField = ref(null)
const sortDirection = ref('descending')

const filters = computed(() => ({
  lineOfBusiness: props.lineOfBusiness,
  subproduct: props.subproduct,
  region: props.region,
}))

const periodRows = computed(() =>
  ['month', 'quarter', 'ytd', 'itd']
    .map((id) => intelligencePeriods.find((period) => period.id === id))
    .map((period) => ({
      ...period,
      analysis: getIntelligenceAnalysis({
        periodId: period.id,
        ...filters.value,
      }),
    }))
    .map((period) => ({
      ...period,
      range: formatDateRange(period.analysis),
      variance: getLossRatioVariance(period.analysis.summary),
    })),
)

const hierarchy = computed(() => getPortfolioHierarchy(props.analysis.rows))

const sortedHierarchy = computed(() => sortNode(hierarchy.value))

const visibleRows = computed(() => {
  const rows = []

  function visit(node) {
    rows.push(node)
    if (!expandedIds.value.has(node.id)) return
    for (const child of node.children) visit(child)
  }

  visit(sortedHierarchy.value)
  return rows
})

const allExpandableIds = computed(() => {
  const ids = []
  function visit(node) {
    if (node.children.length) {
      ids.push(node.id)
      node.children.forEach(visit)
    }
  }
  visit(hierarchy.value)
  return ids
})

const allExpanded = computed(
  () =>
    allExpandableIds.value.length > 0 &&
    allExpandableIds.value.every((id) => expandedIds.value.has(id)),
)

const activePeriod = computed(
  () =>
    intelligencePeriods.find(({ id }) => id === props.periodId) ??
    intelligencePeriods[0],
)

const filterSummary = computed(() => {
  const activeFilters = [
    props.lineOfBusiness !== 'All lines of business'
      ? props.lineOfBusiness
      : null,
    props.subproduct !== 'All subproducts' ? props.subproduct : null,
    props.region !== 'All regions' ? props.region : null,
  ].filter(Boolean)

  return activeFilters.length ? activeFilters.join(' · ') : 'All portfolio'
})

const portfolioVariance = computed(() =>
  getLossRatioVariance(props.portfolioLatestAnalysis.baselineLatest),
)

const selectedVariance = computed(() =>
  getLossRatioVariance(props.latestAnalysis.latest),
)

const tableSummary = computed(() => {
  const selectedContext =
    filterSummary.value === 'All portfolio'
      ? ''
      : ` Selected segment variance: ${formatVariance(selectedVariance.value)}.`
  const range = props.analysis.timeline.length
    ? `${props.analysis.timeline[0].label} to ${props.analysis.timeline.at(-1).label}`
    : 'no reporting dates'

  return `${activePeriod.value.label}, ${range}. Filters: ${filterSummary.value}. Portfolio latest-month variance: ${formatVariance(portfolioVariance.value)}.${selectedContext}`
})

function formatDateRange(analysis) {
  if (!analysis.timeline.length) return 'No reporting dates'
  const first = analysis.timeline[0].label
  const last = analysis.timeline.at(-1).label
  return first === last ? first : `${first} – ${last}`
}

function formatCurrency(value, compact = true) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—'
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 2 : 0,
  }).format(value)
}

function preciseCurrency(value) {
  return formatCurrency(value, false)
}

function formatRatio(value) {
  return formatMetricValue(value, 'percent')
}

function formatVariance(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—'
  }
  const points = value * 100
  return `${points > 0 ? '+' : ''}${points.toFixed(2)} pp`
}

function ariaVariance(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 'Loss ratio variance unavailable'
  }
  const status =
    value > 0 ? 'above expected' : value < 0 ? 'below expected' : 'on expected'
  return `${formatVariance(value)}, ${status}`
}

function sortValue(node, field) {
  return field === 'variance' ? node.variance : node.summary[field]
}

function sortNode(node) {
  const children = [...node.children]
  if (sortField.value) {
    children.sort((left, right) => {
      const leftValue = sortValue(left, sortField.value)
      const rightValue = sortValue(right, sortField.value)
      const difference = (leftValue ?? -Infinity) - (rightValue ?? -Infinity)
      return sortDirection.value === 'ascending'
        ? difference || left.label.localeCompare(right.label)
        : -difference || left.label.localeCompare(right.label)
    })
  }
  return { ...node, children: children.map(sortNode) }
}

function toggleExpanded(id) {
  const next = new Set(expandedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedIds.value = next
}

function toggleAll() {
  expandedIds.value = allExpanded.value
    ? new Set()
    : new Set(allExpandableIds.value)
}

function changeSort(field) {
  if (sortField.value === field) {
    sortDirection.value =
      sortDirection.value === 'ascending' ? 'descending' : 'ascending'
  } else {
    sortField.value = field
    sortDirection.value = 'descending'
  }
}

function sortAria(field) {
  return sortField.value === field ? sortDirection.value : 'none'
}

function fullValue(field, value) {
  if (field === 'earnedPremium' || field === 'incurredLoss' || field === 'expectedIncurredLoss') {
    return preciseCurrency(value)
  }
  if (field === 'lossRatio' || field === 'expectedLossRatio') {
    return value === null || value === undefined ? 'Unavailable' : formatRatio(value)
  }
  return ariaVariance(value)
}

function cellValue(field, summary, variance) {
  if (field === 'variance') return formatVariance(variance)
  if (field === 'lossRatio' || field === 'expectedLossRatio') {
    return formatRatio(summary[field])
  }
  return formatCurrency(summary[field])
}

const columns = [
  { field: 'earnedPremium', label: 'Earned Premium', sortable: true },
  { field: 'incurredLoss', label: 'Incurred Loss', sortable: true },
  {
    field: 'expectedIncurredLoss',
    label: 'Expected Incurred Loss',
    sortable: true,
  },
  { field: 'lossRatio', label: 'Actual Loss Ratio', sortable: true },
  { field: 'expectedLossRatio', label: 'Expected Loss Ratio', sortable: true },
  { field: 'variance', label: 'Variance', sortable: true },
]
</script>

<template>
  <div class="portfolio-table-view">
    <section class="portfolio-table-card" aria-labelledby="period-summary-title">
      <header class="portfolio-table-card__heading">
        <div>
          <h1 id="period-summary-title">Loss Emergence</h1>
          <p>Portfolio performance across reporting periods</p>
        </div>
        <span class="portfolio-table-card__menu" aria-hidden="true">•••</span>
      </header>

      <div class="table-scroll" tabindex="0" aria-label="Reporting period summary; scroll horizontally to view all measures">
        <table class="portfolio-data-table period-table">
          <caption class="visually-hidden">
            Earned premium, incurred losses, loss ratios, and variance across reporting periods.
          </caption>
          <thead>
            <tr>
              <th scope="col">Reporting Period</th>
              <th v-for="column in columns" :key="column.field" scope="col">
                {{ column.label }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="period in periodRows"
              :key="period.id"
              :class="{ 'is-selected': periodId === period.id }"
            >
              <th scope="row">
                <button
                  class="period-select"
                  type="button"
                  :aria-pressed="periodId === period.id"
                  :aria-label="`Use ${period.label}: ${period.range}`"
                  @click="emit('update:period', period.id)"
                >
                  <span>{{ period.label }}</span>
                  <small>{{ period.range }}</small>
                </button>
              </th>
              <td
                v-for="column in columns"
                :key="column.field"
                :class="{ 'is-adverse': column.field === 'variance' && period.variance > 0 }"
                :aria-label="`${column.label}: ${fullValue(column.field, column.field === 'variance' ? period.variance : period.analysis.summary[column.field])}`"
                :title="fullValue(column.field, column.field === 'variance' ? period.variance : period.analysis.summary[column.field])"
              >
                <span v-if="column.field !== 'variance'">
                  {{ cellValue(column.field, period.analysis.summary, period.variance) }}
                </span>
                <span v-else class="variance-value">
                  {{ cellValue(column.field, period.analysis.summary, period.variance) }}
                  <span v-if="period.variance > 0" class="variance-label">Above expected</span>
                  <span v-else-if="period.variance < 0" class="variance-label">Below expected</span>
                  <span v-else-if="period.variance === 0" class="variance-label">On expected</span>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="portfolio-table-card hierarchy-card" aria-labelledby="hierarchy-title">
      <div class="hierarchy-toolbar">
        <div>
          <p class="hierarchy-toolbar__eyebrow">Portfolio Detail</p>
          <h2 id="hierarchy-title">By Portfolio Hierarchy</h2>
        </div>
        <button
          class="hierarchy-toggle"
          type="button"
          :disabled="!allExpandableIds.length"
          @click="toggleAll"
        >
          {{ allExpanded ? 'Collapse All' : 'Expand All' }}
        </button>
      </div>
      <p class="hierarchy-context">
        {{ activePeriod.label }} · {{ filterSummary }} · Select a row to inspect its components.
      </p>

      <p class="portfolio-table-summary" role="status" aria-live="polite">
        {{ tableSummary }}
      </p>

      <div
        v-if="analysis.hasData"
        class="table-scroll hierarchy-scroll"
        tabindex="0"
        aria-label="Portfolio hierarchy table; scroll horizontally to view all measures"
      >
        <table class="portfolio-data-table hierarchy-table">
          <caption class="visually-hidden">
            {{ tableSummary }} Expand portfolio rows to explore line of business, subproduct, and region values.
          </caption>
          <thead>
            <tr>
              <th scope="col" class="hierarchy-label-heading">Portfolio Group</th>
              <th
                v-for="column in columns"
                :key="column.field"
                scope="col"
                :aria-sort="sortAria(column.field)"
              >
                <button
                  class="sort-button"
                  type="button"
                  :aria-label="`Sort by ${column.label}${sortField === column.field ? `, currently ${sortDirection}` : ''}`"
                  @click="changeSort(column.field)"
                >
                  {{ column.label }}
                  <span aria-hidden="true">
                    {{ sortField === column.field ? (sortDirection === 'ascending' ? '↑' : '↓') : '↕' }}
                  </span>
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in visibleRows"
              :key="row.id"
              :class="[
                `hierarchy-row--depth-${row.depth}`,
                { 'hierarchy-row--portfolio': row.depth === 0, 'hierarchy-row--line': row.depth === 1 },
              ]"
            >
              <th scope="row">
                <div class="hierarchy-row-label" :style="{ '--row-depth': row.depth }">
                  <button
                    v-if="row.children.length"
                    class="expand-button"
                    type="button"
                    :aria-expanded="expandedIds.has(row.id)"
                    :aria-label="`${expandedIds.has(row.id) ? 'Collapse' : 'Expand'} ${row.label}, ${row.depth === 0 ? 'portfolio total' : `level ${row.depth}`}`"
                    @click="toggleExpanded(row.id)"
                  >
                    <svg viewBox="0 0 16 16" aria-hidden="true">
                      <path d="m5 6 3 3 3-3" />
                    </svg>
                  </button>
                  <span v-else class="expand-spacer" aria-hidden="true"></span>
                  <span>{{ row.label }}</span>
                </div>
              </th>
              <td
                v-for="column in columns"
                :key="column.field"
                :class="{ 'is-adverse': column.field === 'variance' && row.variance > 0 }"
                :aria-label="`${column.label}: ${fullValue(column.field, column.field === 'variance' ? row.variance : row.summary[column.field])}`"
                :title="fullValue(column.field, column.field === 'variance' ? row.variance : row.summary[column.field])"
              >
                <span v-if="column.field !== 'variance'">
                  {{ cellValue(column.field, row.summary, row.variance) }}
                </span>
                <span v-else class="variance-value">
                  {{ cellValue(column.field, row.summary, row.variance) }}
                  <span v-if="row.variance > 0" class="variance-label">Above expected</span>
                  <span v-else-if="row.variance < 0" class="variance-label">Below expected</span>
                  <span v-else-if="row.variance === 0" class="variance-label">On expected</span>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="table-empty-state" role="status">
        <h3>No observations match these filters</h3>
        <p>Clear or adjust the portfolio filters to restore the table.</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.portfolio-table-view {
  display: grid;
  min-width: 0;
  gap: 2rem;
  color: #263745;
}

.portfolio-table-card {
  min-width: 0;
  padding: clamp(1.1rem, 2vw, 1.5rem);
  border-radius: 0.9rem;
  background: #fff;
}

.portfolio-table-card__heading,
.hierarchy-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.portfolio-table-card__heading {
  margin-bottom: 1.4rem;
}

.portfolio-table-card__heading h1,
.hierarchy-toolbar h2 {
  color: #263745;
  font-size: 1.1rem;
}

.portfolio-table-card__heading p {
  margin-top: 0.3rem;
  color: #607d98;
  font-size: 0.78rem;
}

.portfolio-table-card__menu {
  color: #9db1c1;
  letter-spacing: 0.15em;
}

.table-scroll {
  max-width: 100%;
  overflow: auto;
  border-radius: 0.45rem;
  overscroll-behavior-inline: contain;
}

.table-scroll:focus-visible {
  outline-offset: 2px;
}

.portfolio-data-table {
  width: 100%;
  min-width: 1040px;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
  font-size: 0.78rem;
}

.portfolio-data-table th,
.portfolio-data-table td {
  padding: 0.78rem 0.85rem;
  text-align: right;
  vertical-align: middle;
}

.portfolio-data-table thead th {
  background: #eff4f8;
  color: #607d98;
  font-weight: 550;
  white-space: nowrap;
}

.portfolio-data-table thead th:first-child {
  width: 24%;
  border-radius: 0.4rem 0 0 0.4rem;
  text-align: left;
}

.portfolio-data-table thead th:last-child {
  border-radius: 0 0.4rem 0.4rem 0;
}

.portfolio-data-table tbody tr:nth-child(even) {
  background: #fbfcfd;
}

.portfolio-data-table tbody tr.is-selected {
  background: #f3f6fa;
}

.portfolio-data-table tbody th {
  color: #354b5e;
  font-weight: 550;
  text-align: left;
}

.portfolio-data-table tbody td {
  color: #263745;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.period-select {
  display: grid;
  justify-items: start;
  gap: 0.1rem;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.period-select[aria-pressed='true'] span {
  color: #211064;
  font-weight: 700;
}

.period-select small {
  color: #607d98;
  font-size: 0.69rem;
  font-weight: 400;
}

.variance-value {
  display: inline-flex;
  align-items: baseline;
  gap: 0.35rem;
}

.is-adverse {
  color: #9a4c18 !important;
  font-weight: 700;
}

.variance-label {
  color: #526d84;
  font-size: 0.65rem;
  font-weight: 500;
}

.hierarchy-card {
  padding-top: 1.45rem;
}

.hierarchy-toolbar {
  margin-bottom: 0.5rem;
}

.hierarchy-toolbar__eyebrow {
  margin-bottom: 0.35rem;
  color: #8aa0b2;
  font-size: 0.7rem;
  font-weight: 650;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.hierarchy-toggle {
  min-height: 2rem;
  padding: 0.35rem 0.7rem;
  border: 1px solid #dfe7ec;
  border-radius: 0.35rem;
  background: white;
  color: #2563eb;
  font-size: 0.72rem;
  cursor: pointer;
}

.hierarchy-toggle:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.hierarchy-context {
  margin-bottom: 0.7rem;
  color: #607d98;
  font-size: 0.75rem;
}

.portfolio-table-summary {
  margin-bottom: 1rem;
  padding: 0.65rem 0.75rem;
  border-left: 3px solid #14b8a6;
  background: #f5f8fa;
  color: #526d84;
  font-size: 0.75rem;
}

.hierarchy-table {
  min-width: 1120px;
}

.hierarchy-table .hierarchy-label-heading {
  width: 25%;
}

.sort-button {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.35rem;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  white-space: nowrap;
  cursor: pointer;
}

.sort-button span {
  color: #8aa0b2;
  font-size: 0.85rem;
}

.hierarchy-row--portfolio {
  background: #f0f3f6 !important;
}

.hierarchy-row--line {
  background: #f7f8fa !important;
}

.hierarchy-row--portfolio th,
.hierarchy-row--portfolio td,
.hierarchy-row--line th,
.hierarchy-row--line td {
  font-weight: 700;
}

.hierarchy-row-label {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.45rem;
  padding-left: calc(var(--row-depth) * 1.3rem);
}

.expand-button,
.expand-spacer {
  display: inline-flex;
  width: 1rem;
  height: 1rem;
  flex: 0 0 1rem;
  align-items: center;
  justify-content: center;
}

.expand-button {
  padding: 0;
  border: 0;
  border-radius: 0.2rem;
  background: transparent;
  color: #8196a8;
  cursor: pointer;
}

.expand-button[aria-expanded='true'] svg {
  transform: rotate(0deg);
}

.expand-button[aria-expanded='false'] svg {
  transform: rotate(-90deg);
}

.expand-button svg {
  width: 0.85rem;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
  transition: transform 120ms ease;
}

.hierarchy-row--depth-2 th,
.hierarchy-row--depth-3 th {
  color: #526d84;
  font-weight: 450;
}

.table-empty-state {
  padding: 2rem 1rem;
  border: 1px solid #d7e1e9;
  border-radius: 0.6rem;
  color: #526d84;
}

.table-empty-state h3 {
  margin-bottom: 0.4rem;
  font-size: 0.95rem;
}

.table-empty-state p {
  font-size: 0.8rem;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  clip-path: inset(50%);
}

@media (max-width: 620px) {
  .portfolio-table-view {
    gap: 1.2rem;
  }

  .portfolio-table-card {
    padding: 1rem;
  }

  .portfolio-data-table {
    min-width: 1040px;
  }

  .hierarchy-toolbar {
    align-items: flex-start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .expand-button svg {
    transition: none;
  }
}
</style>
