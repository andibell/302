<script setup>
import { computed, ref } from 'vue'
import BreakdownChart from '../components/charts/BreakdownChart.vue'
import TrendChart from '../components/charts/TrendChart.vue'
import ProductNavigation from '../components/navigation/ProductNavigation.vue'
import {
  breakdownMeasures,
  formatMetricValue,
  getAvailableDimensionValues,
  getIntelligenceAnalysis,
  getMetricPointValue,
  getPortfolioBreakdown,
  getPremiumYearOverYearComparison,
  intelligenceMetrics,
  intelligencePeriods,
  portfolioDimensions,
} from '../data/portfolioAnalytics.js'
import {
  filterPortfolioObservations,
  portfolioObservations,
} from '../data/overview.js'

const props = defineProps({
  activeProductSection: {
    type: String,
    default: 'performance',
  },
})

const emit = defineEmits(['navigate-product-section'])

const selectedPeriod = ref('itd')
const selectedMetricId = ref('lossRatio')
const selectedDimension = ref('lineOfBusiness')
const selectedLineOfBusiness = ref('All lines of business')
const selectedSubproduct = ref('All subproducts')
const selectedRegion = ref('All regions')
const filtersOpen = ref(false)
const copied = ref(false)
const shareError = ref('')
const breakdownMetricIds = ref([
  'incurredLoss',
  'expectedIncurredLoss',
  'lossRatioGap',
])

const selectedMetric = computed(
  () =>
    intelligenceMetrics.find(({ id }) => id === selectedMetricId.value) ??
    intelligenceMetrics[0],
)

const lineOptions = computed(() => [
  'All lines of business',
  ...getAvailableDimensionValues(
    filterPortfolioObservations(portfolioObservations, {
      region: selectedRegion.value,
    }),
    'lineOfBusiness',
  ),
])

const subproductOptionsForFilters = computed(() => [
  'All subproducts',
  ...getAvailableDimensionValues(
    filterPortfolioObservations(portfolioObservations, {
      lineOfBusiness: selectedLineOfBusiness.value,
      region: selectedRegion.value,
    }),
    'subproduct',
  ),
])

const regionOptionsForFilters = computed(() => [
  'All regions',
  ...getAvailableDimensionValues(
    filterPortfolioObservations(portfolioObservations, {
      lineOfBusiness: selectedLineOfBusiness.value,
      subproduct: selectedSubproduct.value,
    }),
    'region',
  ),
])

const analysis = computed(() =>
  getIntelligenceAnalysis({
    periodId: selectedPeriod.value,
    lineOfBusiness: selectedLineOfBusiness.value,
    subproduct: selectedSubproduct.value,
    region: selectedRegion.value,
  }),
)

const latestPeriodAnalysis = computed(() =>
  getIntelligenceAnalysis({
    periodId: 'month',
    lineOfBusiness: selectedLineOfBusiness.value,
    subproduct: selectedSubproduct.value,
    region: selectedRegion.value,
  }),
)

const chartPoints = computed(() =>
  analysis.value.timeline.map((point) => {
    const values = getMetricPointValue(point, selectedMetric.value)
    return {
      period: point.period,
      label: point.label,
      actual: values.actual,
      expected: values.expected,
    }
  }),
)

const lossTrendPoints = computed(() =>
  analysis.value.timeline.map((point) => ({
    period: point.period,
    label: point.label,
    actual: point.incurredLoss,
    expected: point.expectedIncurredLoss,
  })),
)

const chartSeries = computed(() => [
  {
    key: 'actual',
    name: selectedMetric.value.actualLabel,
    className: 'trend-chart__line--actual',
    dash: false,
  },
  ...(selectedMetric.value.expectedField
    ? [
        {
          key: 'expected',
          name: selectedMetric.value.expectedLabel,
          className: 'trend-chart__line--expected',
          dash: true,
        },
      ]
    : []),
])

const currentMetricValue = computed(() => {
  if (!analysis.value.hasData) return null
  if (selectedMetric.value.id === 'lossRatio') {
    return analysis.value.summary.lossRatio
  }
  if (selectedMetric.value.id === 'expectedLossRatio') {
    return analysis.value.summary.expectedLossRatio
  }
  return analysis.value.summary[selectedMetric.value.actualField]
})

const latestLossGapPoints = computed(() => {
  const { latest } = latestPeriodAnalysis.value
  if (latest.lossRatio === null || latest.expectedLossRatio === null) {
    return null
  }
  return (latest.lossRatio - latest.expectedLossRatio) * 100
})

const baselineLossGapPoints = computed(() => {
  const { baselineLatest } = analysis.value
  if (
    baselineLatest.lossRatio === null ||
    baselineLatest.expectedLossRatio === null
  ) {
    return null
  }
  return (baselineLatest.lossRatio - baselineLatest.expectedLossRatio) * 100
})

const premiumGrowthComparison = computed(() =>
  getPremiumYearOverYearComparison({
    lineOfBusiness: selectedLineOfBusiness.value,
    subproduct: selectedSubproduct.value,
    region: selectedRegion.value,
  }),
)

const breakdownRows = computed(() =>
  getPortfolioBreakdown(analysis.value.rows, selectedDimension.value),
)

const dimensionLabel = computed(
  () =>
    portfolioDimensions.find(({ id }) => id === selectedDimension.value)
      ?.label ?? 'Line of Business',
)

const metricSummaryLabel = computed(() => {
  if (!analysis.value.hasData) return 'No data for this selection'
  return `${selectedMetric.value.actualLabel} · ${analysis.value.timeline[0].label} to ${analysis.value.timeline.at(-1).label}`
})

const marginImpactSummary = computed(() => {
  if (latestLossGapPoints.value === null) return 'No current observations'
  return `Latest month: ${latestLossGapPoints.value > 0 ? '+' : ''}${latestLossGapPoints.value.toFixed(1)} percentage points`
})

function updateFilter(dimension, value) {
  if (dimension === 'lineOfBusiness') {
    selectedLineOfBusiness.value = value
    if (
      selectedSubproduct.value !== 'All subproducts' &&
      !subproductOptionsForFilters.value.includes(selectedSubproduct.value)
    ) {
      selectedSubproduct.value = 'All subproducts'
    }
  } else if (dimension === 'subproduct') {
    selectedSubproduct.value = value
  } else if (dimension === 'region') {
    selectedRegion.value = value
  }
}

function clearFilters() {
  selectedLineOfBusiness.value = 'All lines of business'
  selectedSubproduct.value = 'All subproducts'
  selectedRegion.value = 'All regions'
}

function selectBreakdownValue(value) {
  if (selectedDimension.value === 'lineOfBusiness') {
    const nextValue =
      selectedLineOfBusiness.value === value
        ? 'All lines of business'
        : value
    selectedLineOfBusiness.value = nextValue
    selectedSubproduct.value = 'All subproducts'
  } else if (selectedDimension.value === 'subproduct') {
    selectedSubproduct.value =
      selectedSubproduct.value === value ? 'All subproducts' : value
  } else {
    selectedRegion.value =
      selectedRegion.value === value ? 'All regions' : value
  }
}

function setBreakdownMeasure(index, measureId) {
  breakdownMetricIds.value[index] = measureId
}

function breakdownRowsForMeasure(measureId) {
  if (measureId === 'incurredLoss') {
    return [...breakdownRows.value].sort(
      (left, right) => right.incurredLoss - left.incurredLoss,
    )
  }
  if (measureId === 'expectedIncurredLoss') {
    return [...breakdownRows.value].sort(
      (left, right) =>
        right.expectedIncurredLoss - left.expectedIncurredLoss,
    )
  }
  return [...breakdownRows.value].sort(
    (left, right) =>
      right.lossRatio - right.expectedLossRatio -
      (left.lossRatio - left.expectedLossRatio),
  )
}

function formatGap(value) {
  if (value === null || value === undefined) return '—'
  return `${value > 0 ? '+' : ''}${value.toFixed(1)} pp`
}

function formatPercent(value) {
  if (value === null || value === undefined) return '—'
  return `${value > 0 ? '+' : ''}${(value * 100).toFixed(1)}%`
}

async function shareView() {
  try {
    await navigator.clipboard.writeText(window.location.href)
    copied.value = true
    shareError.value = ''
    window.setTimeout(() => {
      copied.value = false
    }, 1800)
  } catch (error) {
    console.error('Unable to copy the current view URL.', error)
    copied.value = false
    shareError.value = 'Unable to copy a share link in this browser.'
  }
}
</script>

<template>
  <div class="intelligence-view">
    <div class="view-mode-row">
      <div class="view-mode-toggle" role="group" aria-label="View mode">
        <button class="is-active" type="button" aria-pressed="true">
          Visual
        </button>
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="The Tabular view is planned for a later stage."
        >
          Tabular
        </button>
      </div>
    </div>

    <div class="intelligence-toolbar">
      <ProductNavigation
        :active-section="activeProductSection"
        @navigate="emit('navigate-product-section', $event)"
      />
      <div class="intelligence-toolbar__actions">
        <div class="filter-control">
          <button
            class="intelligence-button intelligence-button--secondary"
            type="button"
            :aria-expanded="filtersOpen"
            aria-controls="intelligence-filter-panel"
            @click="filtersOpen = !filtersOpen"
          >
            Filter
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M3 5h14M5.5 10h9M8 15h4" />
              <circle cx="7" cy="5" r="1.5" />
              <circle cx="12" cy="10" r="1.5" />
            </svg>
          </button>
          <div
            v-if="filtersOpen"
            id="intelligence-filter-panel"
            class="filter-panel"
          >
            <label for="intelligence-line-filter">Line of Business</label>
            <select
              id="intelligence-line-filter"
              :value="selectedLineOfBusiness"
              @change="updateFilter('lineOfBusiness', $event.target.value)"
            >
              <option
                v-for="line in lineOptions"
                :key="line"
                :value="line"
              >
                {{ line }}
              </option>
            </select>

            <label for="intelligence-subproduct-filter">Subproduct</label>
            <select
              id="intelligence-subproduct-filter"
              :value="selectedSubproduct"
              @change="updateFilter('subproduct', $event.target.value)"
            >
              <option value="All subproducts">All subproducts</option>
              <option
                v-for="subproduct in subproductOptionsForFilters.slice(1)"
                :key="subproduct"
                :value="subproduct"
              >
                {{ subproduct }}
              </option>
            </select>

            <label for="intelligence-region-filter">Region</label>
            <select
              id="intelligence-region-filter"
              :value="selectedRegion"
              @change="updateFilter('region', $event.target.value)"
            >
              <option value="All regions">All regions</option>
              <option
                v-for="region in regionOptionsForFilters.slice(1)"
                :key="region"
                :value="region"
              >
                {{ region }}
              </option>
            </select>

            <button
              class="filter-panel__clear"
              type="button"
              @click="clearFilters"
            >
              Clear all filters
            </button>
          </div>
        </div>
        <button
          class="intelligence-button intelligence-button--primary"
          type="button"
          @click="shareView"
        >
          {{ copied ? 'Copied' : 'Share' }}
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M10 13V2M6 6l4-4 4 4M3 11v6h14v-6" />
          </svg>
        </button>
        <span v-if="shareError" class="share-error" role="status">
          {{ shareError }}
        </span>
      </div>
    </div>

    <section class="analysis-section" aria-labelledby="loss-emergence-title">
      <header class="analysis-heading">
        <div class="analysis-heading__metric">
          <h1 id="loss-emergence-title">Loss Emergence</h1>
          <label class="analysis-heading__select-label">
            <span class="visually-hidden">Select analysis metric</span>
            <select v-model="selectedMetricId" aria-label="Select analysis metric">
              <option
                v-for="metric in intelligenceMetrics"
                :key="metric.id"
                :value="metric.id"
              >
                {{ metric.label }}
              </option>
            </select>
          </label>
        </div>

        <label class="reporting-period-select">
          <span class="visually-hidden">Reporting period</span>
          <select v-model="selectedPeriod" aria-label="Reporting period">
            <option
              v-for="period in intelligencePeriods"
              :key="period.id"
              :value="period.id"
            >
              {{ period.label }}
            </option>
          </select>
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="m5 7 5 5 5-5" />
          </svg>
        </label>
      </header>

      <div v-if="analysis.hasData" class="trend-grid">
        <TrendChart
          chart-id="selected-metric"
          :title="selectedMetric.label"
          :description="metricSummaryLabel"
          :points="chartPoints"
          :series="chartSeries"
          :unit="selectedMetric.unit"
        />
        <TrendChart
          chart-id="reported-loss"
          title="Incurred Loss Movements"
          description="Actual incurred loss compared with expected incurred loss."
          :points="lossTrendPoints"
          :series="[
            {
              key: 'actual',
              name: 'Incurred Loss',
              className: 'trend-chart__line--actual',
              dash: false,
            },
            {
              key: 'expected',
              name: 'Expected Incurred Loss',
              className: 'trend-chart__line--expected',
              dash: true,
            },
          ]"
          unit="currency"
        />
      </div>
      <div v-else class="analysis-empty" role="status">
        <h2>No observations match these filters</h2>
        <p>Clear one or more filters to restore the portfolio analysis.</p>
        <button
          class="intelligence-button intelligence-button--secondary"
          type="button"
          @click="clearFilters"
        >
          Clear filters
        </button>
      </div>

      <div class="analysis-context">
        <div class="analysis-context__value">
          <span>{{ selectedMetric.actualLabel }}</span>
          <strong>{{ formatMetricValue(currentMetricValue, selectedMetric.unit) }}</strong>
        </div>
        <div
          v-if="premiumGrowthComparison.change !== null"
          class="analysis-context__value"
        >
          <span>Written premium · 12-mo change</span>
          <strong>{{ formatPercent(premiumGrowthComparison.change) }}</strong>
        </div>
        <div
          v-if="selectedMetric.id === 'lossRatio' || selectedMetric.id === 'expectedLossRatio'"
          class="analysis-context__value"
        >
          <span>Latest actual vs. expected gap</span>
          <strong :class="{ 'is-adverse': latestLossGapPoints > 0 }">
            {{ formatGap(latestLossGapPoints) }}
          </strong>
        </div>
        <div class="analysis-context__comparison">
          <span>Portfolio baseline, latest month</span>
          <strong>{{ formatGap(baselineLossGapPoints) }}</strong>
        </div>
        <p
          v-if="latestLossGapPoints > 10"
          class="analysis-context__note"
          role="note"
        >
          Actual performance is materially above expected for this filtered view.
          Review the segment experience before drawing conclusions about cause.
        </p>
      </div>
    </section>

    <section
      class="breakdown-section"
      aria-labelledby="breakdown-section-title"
    >
      <header class="breakdown-toolbar">
        <h2 id="breakdown-section-title" class="visually-hidden">
          Portfolio breakdown
        </h2>
        <nav class="dimension-tabs" aria-label="Portfolio breakdown dimension">
          <button
            v-for="dimension in portfolioDimensions"
            :key="dimension.id"
            type="button"
            :class="{ 'is-active': selectedDimension === dimension.id }"
            :aria-pressed="selectedDimension === dimension.id"
            @click="selectedDimension = dimension.id"
          >
            {{ dimension.label }}
          </button>
        </nav>
        <label class="reporting-period-select reporting-period-select--compact">
          <span class="visually-hidden">Breakdown reporting period</span>
          <select
            v-model="selectedPeriod"
            aria-label="Breakdown reporting period"
          >
            <option
              v-for="period in intelligencePeriods"
              :key="period.id"
              :value="period.id"
            >
              {{ period.label }}
            </option>
          </select>
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="m5 7 5 5 5-5" />
          </svg>
        </label>
      </header>

      <div class="breakdown-grid">
        <BreakdownChart
          v-for="(measure, index) in breakdownMetricIds"
          :key="`${selectedDimension}-${index}`"
          :title="breakdownMeasures.find((item) => item.id === measure)?.label ?? measure"
          :dimension-label="dimensionLabel"
          :rows="breakdownRowsForMeasure(measure)"
          :measure="measure"
          :selected-value="
            selectedDimension === 'lineOfBusiness'
              ? selectedLineOfBusiness
              : selectedDimension === 'subproduct'
                ? selectedSubproduct
                : selectedRegion
          "
          @update:measure="setBreakdownMeasure(index, $event)"
          @select="selectBreakdownValue"
        />
      </div>

      <p class="breakdown-summary" aria-live="polite">
        {{ marginImpactSummary }}
      </p>
    </section>
  </div>
</template>

<style scoped>
.intelligence-view {
  --intelligence-ink: #132d48;
  --intelligence-muted: #607d98;
  --intelligence-border: #d7e1e9;
  --intelligence-blue: #2563eb;
  --intelligence-indigo: #211064;

  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1.65rem;
  color: var(--intelligence-ink);
}

.view-mode-row {
  display: flex;
  justify-content: center;
  margin-top: -0.25rem;
}

.view-mode-toggle {
  display: inline-flex;
  padding: 0.25rem;
  border-radius: 0.55rem;
  background: #dfe7ec;
}

.view-mode-toggle button {
  min-width: 6rem;
  min-height: 2rem;
  padding: 0.4rem 1rem;
  border: 0;
  border-radius: 0.4rem;
  background: transparent;
  color: #607d98;
  font-size: 0.8rem;
}

.view-mode-toggle button.is-active {
  background: white;
  color: var(--intelligence-indigo);
  box-shadow: 0 1px 3px rgb(22 43 63 / 12%);
}

.view-mode-toggle button:disabled {
  cursor: not-allowed;
  opacity: 0.76;
}

.intelligence-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.intelligence-toolbar :deep(.product-navigation) {
  flex: 1;
  min-width: 0;
  width: 100%;
  border: 0;
  background: transparent;
}

.intelligence-toolbar :deep(.product-navigation__inner) {
  width: 100%;
  min-height: 2.5rem;
  gap: 0.7rem;
  padding: 0;
}

.intelligence-toolbar :deep(.product-navigation__link) {
  min-height: 2rem;
  padding: 0.4rem 1rem;
  border-radius: 0.45rem;
}

.intelligence-toolbar :deep(.product-navigation__link.is-active) {
  background: var(--intelligence-indigo);
  color: white;
  box-shadow: 0 2px 4px rgb(16 34 71 / 12%);
}

.intelligence-toolbar :deep(.product-navigation__link.is-active::after) {
  display: none;
}

.intelligence-toolbar :deep(.product-navigation__link:disabled) {
  color: #71889c;
  cursor: not-allowed;
  opacity: 0.78;
}

.intelligence-toolbar__actions {
  position: relative;
  display: flex;
  flex: 0 0 auto;
  gap: 0.7rem;
}

.share-error {
  position: absolute;
  top: calc(100% + 0.3rem);
  right: 0;
  z-index: 2;
  width: max-content;
  max-width: min(20rem, calc(100vw - 2rem));
  padding: 0.4rem 0.55rem;
  border: 1px solid #edc2c8;
  border-radius: 0.35rem;
  background: #fff;
  color: #a5203b;
  font-size: 0.7rem;
  box-shadow: var(--shadow-sm);
}

.intelligence-button {
  display: inline-flex;
  min-height: 2.55rem;
  align-items: center;
  justify-content: center;
  gap: 0.7rem;
  padding: 0.5rem 1rem;
  border: 1px solid var(--intelligence-border);
  border-radius: 0.5rem;
  font-size: 0.8rem;
  font-weight: 550;
  cursor: pointer;
}

.intelligence-button svg {
  width: 1rem;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.6;
}

.intelligence-button--secondary {
  background: white;
  color: var(--intelligence-indigo);
}

.intelligence-button--primary {
  border-color: #1200ef;
  background: #1200ef;
  color: white;
}

.filter-control {
  position: relative;
}

.filter-panel {
  position: absolute;
  z-index: 4;
  top: calc(100% + 0.5rem);
  right: 0;
  display: grid;
  width: min(22rem, calc(100vw - 2rem));
  gap: 0.5rem;
  padding: 1rem;
  border: 1px solid var(--intelligence-border);
  border-radius: 0.65rem;
  background: white;
  box-shadow: 0 12px 30px rgb(21 45 72 / 14%);
}

.filter-panel label {
  margin-top: 0.25rem;
  color: var(--intelligence-muted);
  font-size: 0.72rem;
  font-weight: 650;
}

.filter-panel select {
  min-height: 2.4rem;
  padding: 0.4rem 0.6rem;
  border: 1px solid var(--intelligence-border);
  border-radius: 0.4rem;
  background: white;
  color: var(--intelligence-ink);
  font-size: 0.8rem;
}

.filter-panel__clear {
  justify-self: start;
  margin-top: 0.3rem;
  padding: 0.25rem 0;
  border: 0;
  background: transparent;
  color: var(--intelligence-blue);
  font-size: 0.78rem;
  cursor: pointer;
}

.analysis-section {
  display: grid;
  gap: 1.05rem;
}

.analysis-heading,
.breakdown-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.analysis-heading {
  min-height: 3rem;
}

.analysis-heading__metric {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.analysis-heading h1 {
  color: #263745;
  font-size: 1.15rem;
}

.analysis-heading__select-label {
  display: inline-flex;
  align-items: center;
}

.analysis-heading__select-label select {
  max-width: 12.5rem;
  padding: 0.3rem 1.2rem 0.3rem 0.3rem;
  border: 0;
  appearance: none;
  background: transparent;
  color: var(--intelligence-blue);
  font-size: 0.76rem;
  cursor: pointer;
}

.reporting-period-select {
  position: relative;
  display: inline-flex;
  width: min(18rem, 42vw);
  min-height: 2.55rem;
  align-items: center;
  padding-inline: 0.8rem 2rem;
  border: 1px solid var(--intelligence-border);
  border-radius: 0.4rem;
  background: #fff;
  color: var(--intelligence-muted);
}

.reporting-period-select select {
  width: 100%;
  border: 0;
  appearance: none;
  background: transparent;
  color: inherit;
  font-size: 0.8rem;
  cursor: pointer;
}

.reporting-period-select svg {
  position: absolute;
  right: 0.65rem;
  width: 0.9rem;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.5;
  pointer-events: none;
}

.trend-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(1rem, 2.5vw, 2rem);
}

.analysis-context {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1.25rem;
  padding: 0.2rem 0.25rem;
  color: var(--intelligence-muted);
  font-size: 0.72rem;
}

.analysis-context__value,
.analysis-context__comparison {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.analysis-context strong {
  color: #263d52;
  font-size: 0.82rem;
}

.analysis-context strong.is-adverse {
  color: #bd334d;
}

.analysis-context__comparison {
  padding-left: 1.1rem;
  border-left: 1px solid var(--intelligence-border);
}

.analysis-context__note {
  flex-basis: 100%;
  width: 100%;
  min-width: 0;
  max-width: 54rem;
  padding-left: 0.65rem;
  border-left: 3px solid #d48741;
  color: #586e80;
  font-size: 0.75rem;
}

.analysis-empty {
  display: grid;
  justify-items: start;
  gap: 0.7rem;
  padding: 2rem;
  border: 1px solid var(--intelligence-border);
  border-radius: 0.75rem;
  background: white;
}

.analysis-empty h2 {
  font-size: 1rem;
}

.analysis-empty p {
  color: var(--intelligence-muted);
  font-size: 0.85rem;
}

.breakdown-section {
  display: grid;
  gap: 1rem;
}

.dimension-tabs {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  overflow-x: auto;
}

.dimension-tabs button {
  min-height: 2rem;
  flex: 0 0 auto;
  padding: 0.4rem 1rem;
  border: 0;
  border-radius: 0.45rem;
  background: transparent;
  color: var(--intelligence-muted);
  font-size: 0.8rem;
  cursor: pointer;
}

.dimension-tabs button.is-active {
  background: var(--intelligence-indigo);
  color: white;
  box-shadow: 0 2px 4px rgb(16 34 71 / 12%);
}

.reporting-period-select--compact {
  width: min(18rem, 40vw);
}

.breakdown-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(1rem, 3vw, 3rem);
}

.breakdown-summary {
  justify-self: end;
  color: var(--intelligence-muted);
  font-size: 0.75rem;
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

@media (max-width: 900px) {
  .trend-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .breakdown-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .breakdown-grid :deep(.breakdown-card:last-child) {
    grid-column: 1 / -1;
  }
}

@media (max-width: 620px) {
  .intelligence-view {
    gap: 1.1rem;
  }

  .intelligence-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .intelligence-toolbar :deep(.product-navigation__inner) {
    gap: 0.25rem;
  }

  .intelligence-toolbar :deep(.product-navigation__link) {
    padding-inline: 0.7rem;
  }

  .intelligence-toolbar__actions {
    width: 100%;
    justify-content: flex-end;
  }

  .analysis-heading,
  .breakdown-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .reporting-period-select,
  .reporting-period-select--compact {
    width: 100%;
  }

  .analysis-heading__metric {
    flex-wrap: wrap;
  }

  .analysis-context {
    align-items: flex-start;
    flex-direction: column;
    flex-wrap: nowrap;
    gap: 0.6rem;
  }

  .analysis-context__note {
    align-self: stretch;
    flex-basis: auto;
  }

  .analysis-context__comparison {
    padding-left: 0;
    border-left: 0;
  }

  .breakdown-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .breakdown-grid :deep(.breakdown-card:last-child) {
    grid-column: auto;
  }
}
</style>
