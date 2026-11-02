<script setup>
import { computed, ref, watch } from 'vue'
import {
  availableQualityPeriods,
  getLatestQualityPeriod,
  getPreviousQualityPeriod,
  getQualityAnomalies,
  getQualityDimensionStatus,
  getQualityPeriodLabel,
  getQualitySummary,
  getQualityTrend,
  qualityDimensions,
} from '../data/dataQuality.js'
import {
  getAvailableDimensionValues,
  getIntelligenceAnalysis,
} from '../data/portfolioAnalytics.js'
import { filterPortfolioObservations, portfolioObservations } from '../data/overview.js'

const props = defineProps({
  initialLineOfBusiness: {
    type: String,
    default: 'All lines of business',
  },
})

const emit = defineEmits(['back-to-data'])

const selectedPeriod = ref(getLatestQualityPeriod())
const selectedLineOfBusiness = ref(props.initialLineOfBusiness)
const selectedSubproduct = ref('All subproducts')
const selectedRegion = ref('All regions')

const lineOptions = computed(() => [
  'All lines of business',
  ...getAvailableDimensionValues(
    filterPortfolioObservations(portfolioObservations, {
      subproduct: selectedSubproduct.value,
      region: selectedRegion.value,
    }),
    'lineOfBusiness',
  ),
])

const subproductOptions = computed(() => [
  'All subproducts',
  ...getAvailableDimensionValues(
    filterPortfolioObservations(portfolioObservations, {
      lineOfBusiness: selectedLineOfBusiness.value,
      region: selectedRegion.value,
    }),
    'subproduct',
  ),
])

const regionOptions = computed(() => [
  'All regions',
  ...getAvailableDimensionValues(
    filterPortfolioObservations(portfolioObservations, {
      lineOfBusiness: selectedLineOfBusiness.value,
      subproduct: selectedSubproduct.value,
    }),
    'region',
  ),
])

const filters = computed(() => ({
  lineOfBusiness: selectedLineOfBusiness.value,
  subproduct: selectedSubproduct.value,
  region: selectedRegion.value,
}))

const currentSummary = computed(() =>
  getQualitySummary({
    period: selectedPeriod.value,
    ...filters.value,
  }),
)

const previousPeriod = computed(() =>
  getPreviousQualityPeriod(selectedPeriod.value),
)

const previousSummary = computed(() =>
  previousPeriod.value
    ? getQualitySummary({
        period: previousPeriod.value,
        ...filters.value,
      })
    : null,
)

const trend = computed(() =>
  getQualityTrend({
    throughPeriod: selectedPeriod.value,
    ...filters.value,
  }),
)

const anomalies = computed(() =>
  getQualityAnomalies({
    period: selectedPeriod.value,
    ...filters.value,
  }),
)

const dimensions = computed(() =>
  qualityDimensions.map((dimension) => ({
    ...dimension,
    score: currentSummary.value.dimensions[dimension.id],
    priorScore: previousSummary.value?.dimensions[dimension.id] ?? null,
    change:
      previousSummary.value &&
      currentSummary.value.dimensions[dimension.id] !== null &&
      previousSummary.value.dimensions[dimension.id] !== null
        ? currentSummary.value.dimensions[dimension.id] -
          previousSummary.value.dimensions[dimension.id]
        : null,
    status: getQualityDimensionStatus(
      currentSummary.value.dimensions[dimension.id],
    ),
  })),
)

const trendGeometry = computed(() => {
  const width = 900
  const height = 265
  const left = 54
  const right = 876
  const top = 24
  const bottom = 205
  const minimum = 70
  const maximum = 100
  const x = (index) =>
    trend.value.length <= 1
      ? (left + right) / 2
      : left + (index * (right - left)) / (trend.value.length - 1)
  const y = (score) =>
    bottom - ((score - minimum) / (maximum - minimum)) * (bottom - top)
  const path = trend.value
    .map(
      (point, index) =>
        `${index ? 'L' : 'M'} ${x(index).toFixed(2)} ${y(point.overallScore).toFixed(2)}`,
    )
    .join(' ')
  const labelIndexes = new Set([
    0,
    Math.floor((trend.value.length - 1) / 2),
    trend.value.length - 1,
  ])
  return {
    width,
    height,
    left,
    right,
    top,
    bottom,
    x,
    y,
    path,
    ticks: [70, 80, 90, 100],
    labels: trend.value
      .map((point, index) => ({ point, index }))
      .filter(({ index }) => labelIndexes.has(index)),
  }
})

const trendSummary = computed(() => {
  const prior = previousSummary.value?.overallScore
  const current = currentSummary.value.overallScore
  const change =
    Number.isFinite(prior) && Number.isFinite(current)
      ? current - prior
      : null
  const weakest = [...dimensions.value]
    .filter(({ score }) => Number.isFinite(score))
    .sort((left, right) => left.score - right.score)
    .slice(0, 2)
    .map(({ label }) => label)
    .join(' and ')

  return `${getQualityPeriodLabel(selectedPeriod.value)} · ${segmentLabel.value}. Current score ${formatScore(current)}; prior score ${formatScore(prior)}; change ${formatChange(change)}. Weakest dimensions: ${weakest || 'not available'}.`
})

const segmentLabel = computed(() => {
  const selections = [
    selectedLineOfBusiness.value !== 'All lines of business'
      ? selectedLineOfBusiness.value
      : null,
    selectedSubproduct.value !== 'All subproducts'
      ? selectedSubproduct.value
      : null,
    selectedRegion.value !== 'All regions' ? selectedRegion.value : null,
  ].filter(Boolean)

  return selections.length ? selections.join(' · ') : 'All Portfolio'
})

const selectedPerformanceGap = computed(() => {
  const lineOfBusiness =
    selectedLineOfBusiness.value === 'All lines of business'
      ? 'Small Business Property'
      : selectedLineOfBusiness.value
  const result = getIntelligenceAnalysis({
    periodId: 'month',
    lineOfBusiness,
    subproduct: selectedSubproduct.value,
    region: selectedRegion.value,
  })

  if (!result.hasData) return null
  return (result.latest.lossRatio - result.latest.expectedLossRatio) * 100
})

const smallBusinessQuality = computed(() =>
  getQualitySummary({
    period: getLatestQualityPeriod(),
    lineOfBusiness: 'Small Business Property',
  }),
)

const allPortfolioPerformanceGap = computed(() => {
  const latest = getIntelligenceAnalysis({ periodId: 'month' }).latest
  return (latest.lossRatio - latest.expectedLossRatio) * 100
})

const recentPerformanceGap = computed(() =>
  selectedLineOfBusiness.value === 'All lines of business'
    ? allPortfolioPerformanceGap.value
    : selectedPerformanceGap.value,
)

watch(selectedLineOfBusiness, () => {
  if (!subproductOptions.value.includes(selectedSubproduct.value)) {
    selectedSubproduct.value = 'All subproducts'
  }
})

watch(selectedSubproduct, () => {
  if (!regionOptions.value.includes(selectedRegion.value)) {
    selectedRegion.value = 'All regions'
  }
})

function formatScore(score) {
  return Number.isFinite(score) ? `${score.toFixed(1)}` : '—'
}

function formatChange(change) {
  if (!Number.isFinite(change)) return 'not available'
  return `${change > 0 ? '+' : ''}${change.toFixed(1)} points`
}

function formatVariance(value) {
  return Number.isFinite(value)
    ? `${value > 0 ? '+' : ''}${value.toFixed(1)} pp`
    : 'not available'
}

function periodLabel(period) {
  return getQualityPeriodLabel(period)
}

function formatChartDate(period) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(`${period}-01T00:00:00Z`))
}

function dimensionChangeLabel(change) {
  if (!Number.isFinite(change)) return 'No prior period'
  if (Math.abs(change) < 0.05) return 'No change'
  return `${change > 0 ? '+' : ''}${change.toFixed(1)} points`
}

function statusClass(status) {
  if (status === 'Healthy') return 'quality-status--healthy'
  if (status === 'Monitor') return 'quality-status--monitor'
  return 'quality-status--attention'
}

function clearFilters() {
  selectedLineOfBusiness.value = 'All lines of business'
  selectedSubproduct.value = 'All subproducts'
  selectedRegion.value = 'All regions'
}
</script>

<template>
  <div class="quality-detail">
    <nav class="quality-breadcrumb" aria-label="Breadcrumb">
      <button type="button" @click="emit('back-to-data')">Data</button>
      <span aria-hidden="true">›</span>
      <span aria-current="page">Data Quality</span>
    </nav>

    <header class="quality-header">
      <div>
        <h1>Data Quality</h1>
        <p>Confidence in portfolio data supporting performance analysis</p>
      </div>
      <div class="quality-period-control">
        <label for="quality-period">Viewing scores</label>
        <select id="quality-period" v-model="selectedPeriod">
          <option v-for="period in availableQualityPeriods" :key="period" :value="period">
            {{ periodLabel(period) }}
          </option>
        </select>
      </div>
    </header>

    <section class="quality-summary" aria-label="Current quality score">
      <div class="quality-summary__score">
        <span>Your Score</span>
        <div class="quality-score-line">
          <strong>{{ formatScore(currentSummary.overallScore) }}</strong>
          <span>%</span>
          <span class="quality-status" :class="statusClass(currentSummary.status)">
            {{ currentSummary.status }}
          </span>
        </div>
      </div>
      <div class="quality-summary__comparison">
        <span>Prior Period</span>
        <div class="quality-score-line">
          <strong>{{ formatScore(previousSummary?.overallScore) }}</strong>
          <span>%</span>
          <span
            v-if="previousSummary"
            class="change-pill"
            :class="{ 'change-pill--down': currentSummary.overallScore < previousSummary.overallScore }"
          >
            {{ formatChange(currentSummary.overallScore - previousSummary.overallScore) }}
          </span>
        </div>
        <small v-if="previousPeriod">{{ periodLabel(previousPeriod) }}</small>
        <small v-else>No earlier reporting period</small>
      </div>
      <div class="quality-summary__filters">
        <label for="quality-line-filter">Line of Business</label>
        <select id="quality-line-filter" v-model="selectedLineOfBusiness">
          <option v-for="option in lineOptions" :key="option" :value="option">
            {{ option }}
          </option>
        </select>
        <label for="quality-subproduct-filter">Subproduct</label>
        <select id="quality-subproduct-filter" v-model="selectedSubproduct">
          <option v-for="option in subproductOptions" :key="option" :value="option">
            {{ option }}
          </option>
        </select>
        <label for="quality-region-filter">Region</label>
        <select id="quality-region-filter" v-model="selectedRegion">
          <option v-for="option in regionOptions" :key="option" :value="option">
            {{ option }}
          </option>
        </select>
        <button type="button" @click="clearFilters">Clear filters</button>
      </div>
    </section>

    <section class="quality-trend-card" aria-labelledby="quality-trend-heading">
      <header class="quality-section-heading">
        <div>
          <h2 id="quality-trend-heading">Quality Trend</h2>
          <p>{{ segmentLabel }} · score history through {{ periodLabel(selectedPeriod) }}</p>
        </div>
        <div class="quality-trend-legend" aria-label="Chart legend">
          <span><i class="legend-score"></i>Overall Score</span>
          <span><i class="legend-reference"></i>90-point reference</span>
        </div>
      </header>
      <p class="quality-chart-summary" role="status">{{ trendSummary }}</p>
      <div class="quality-chart-scroll">
        <svg
          class="quality-chart"
          :viewBox="`0 0 ${trendGeometry.width} ${trendGeometry.height}`"
          role="img"
          :aria-label="`Data Quality score trend. ${trendSummary}`"
          preserveAspectRatio="none"
        >
          <g v-for="tick in trendGeometry.ticks" :key="tick">
            <line
              class="quality-chart__grid"
              :x1="trendGeometry.left"
              :x2="trendGeometry.right"
              :y1="trendGeometry.y(tick)"
              :y2="trendGeometry.y(tick)"
            />
            <text
              class="quality-chart__axis"
              :x="trendGeometry.left - 10"
              :y="trendGeometry.y(tick) + 4"
              text-anchor="end"
            >{{ tick }}</text>
          </g>
          <line
            class="quality-chart__reference"
            :x1="trendGeometry.left"
            :x2="trendGeometry.right"
            :y1="trendGeometry.y(90)"
            :y2="trendGeometry.y(90)"
          />
          <path class="quality-chart__line" :d="trendGeometry.path" />
          <circle
            v-for="(point, index) in trend"
            :key="point.period"
            class="quality-chart__point"
            :class="{ 'quality-chart__point--current': point.period === selectedPeriod }"
            :cx="trendGeometry.x(index)"
            :cy="trendGeometry.y(point.overallScore)"
            r="4"
          >
            <title>{{ periodLabel(point.period) }}: {{ formatScore(point.overallScore) }}%</title>
          </circle>
          <g v-for="entry in trendGeometry.labels" :key="entry.point.period">
            <text
              class="quality-chart__date"
              :x="trendGeometry.x(entry.index)"
              y="238"
              text-anchor="middle"
            >{{ formatChartDate(entry.point.period) }}</text>
          </g>
        </svg>
      </div>
    </section>

    <div class="quality-breakdown-label" aria-hidden="true">
      <span></span><strong>Breakdown</strong><span></span>
    </div>

    <section class="dimension-section" aria-labelledby="dimension-heading">
      <header class="quality-section-heading">
        <div>
          <h2 id="dimension-heading">Quality Dimensions</h2>
          <p>Weighted using expected record volumes · current reporting period</p>
        </div>
      </header>
      <div class="dimension-grid">
        <article v-for="dimension in dimensions" :key="dimension.id" class="dimension-card">
          <div class="dimension-card__top">
            <h3>{{ dimension.label }}</h3>
            <span class="quality-status" :class="statusClass(dimension.status)">
              {{ dimension.status }}
            </span>
          </div>
          <div class="dimension-card__score">
            <strong>{{ formatScore(dimension.score) }}</strong><span>%</span>
          </div>
          <div
            class="dimension-meter"
            role="meter"
            :aria-label="`${dimension.label} score`"
            :aria-valuenow="dimension.score ?? 0"
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <span :style="{ width: `${dimension.score ?? 0}%` }"></span>
          </div>
          <p>{{ dimension.description }}</p>
          <footer>
            <span>Prior {{ formatScore(dimension.priorScore) }}%</span>
            <strong :class="{ 'dimension-change--down': dimension.change < 0 }">
              {{ dimensionChangeLabel(dimension.change) }}
            </strong>
          </footer>
        </article>
      </div>
    </section>

    <section class="quality-observations" aria-labelledby="observations-heading">
      <header class="quality-section-heading">
        <div>
          <h2 id="observations-heading">Detected Observations</h2>
          <p>{{ periodLabel(selectedPeriod) }} · {{ segmentLabel }}</p>
        </div>
        <span class="observation-count">{{ anomalies.length }} observations</span>
      </header>
      <div v-if="anomalies.length" class="quality-table-scroll" tabindex="0" aria-label="Data quality observations; scroll horizontally to view all details">
        <table class="quality-observation-table">
          <caption class="visually-hidden">
            Data quality observations for {{ segmentLabel }} in {{ periodLabel(selectedPeriod) }}.
          </caption>
          <thead>
            <tr>
              <th scope="col">Observation</th>
              <th scope="col">Quality Dimension</th>
              <th scope="col">Affected Segment</th>
              <th scope="col">Records</th>
              <th scope="col">Severity</th>
              <th scope="col">Status</th>
              <th scope="col">Recommended Follow-up</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="anomaly in anomalies" :key="anomaly.id">
              <th scope="row">
                <strong>{{ anomaly.observation }}</strong>
                <small>{{ anomaly.id }}</small>
              </th>
              <td>{{ anomaly.dimension }}</td>
              <td>
                {{ anomaly.lineOfBusiness }}<small>{{ anomaly.subproduct }} · {{ anomaly.region }}</small>
              </td>
              <td>{{ anomaly.affectedRecords }}</td>
              <td>
                <span class="quality-status" :class="anomaly.severity === 'Moderate' ? 'quality-status--monitor' : 'quality-status--healthy'">
                  {{ anomaly.severity }}
                </span>
              </td>
              <td>{{ anomaly.status }}</td>
              <td>{{ anomaly.followUp }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="quality-empty-state" role="status">
        <h3>No observations for this selection</h3>
        <p>No data-quality exceptions were recorded for {{ segmentLabel }} in {{ periodLabel(selectedPeriod) }}.</p>
      </div>
    </section>

    <aside class="quality-story-note" aria-label="Portfolio interpretation">
      <strong>Interpretation context</strong>
      <p>
        <template v-if="selectedLineOfBusiness === 'Small Business Property'">
          Small Business Property has a {{ formatVariance(selectedPerformanceGap) }} latest-month loss-ratio gap and a
          Data Quality score of {{ formatScore(currentSummary.overallScore) }}%.
        </template>
        <template v-else>
          Small Business Property has a {{ formatVariance(selectedPerformanceGap) }} latest-month loss-ratio gap and a
          Data Quality score of {{ formatScore(smallBusinessQuality.overallScore) }}%; the portfolio-wide performance gap is
          {{ formatVariance(recentPerformanceGap) }}.
        </template>
        Validate supporting records before diagnosing the performance signal. These parallel observations do not establish causation.
      </p>
    </aside>
  </div>
</template>

<style scoped>
.quality-detail {
  display: grid;
  min-width: 0;
  gap: 1.2rem;
  color: #263745;
}

.quality-breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  color: #607d98;
  font-size: 0.72rem;
}

.quality-breadcrumb button {
  padding: 0;
  border: 0;
  background: transparent;
  color: #263745;
  cursor: pointer;
}

.quality-breadcrumb span[aria-hidden='true'] {
  color: #2563eb;
  font-size: 1.1rem;
}

.quality-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  padding-bottom: 0.85rem;
  border-bottom: 1px solid #d7e1e9;
}

.quality-header h1 {
  color: #263745;
  font-size: 1.25rem;
}

.quality-header p,
.quality-period-control label {
  margin-top: 0.25rem;
  color: #607d98;
  font-size: 0.72rem;
}

.quality-period-control {
  display: grid;
  justify-items: end;
}

.quality-period-control label {
  margin: 0;
  font-size: 0.63rem;
  text-transform: uppercase;
}

.quality-period-control select,
.quality-summary__filters select {
  min-height: 2rem;
  padding: 0.25rem 1.8rem 0.25rem 0.4rem;
  border: 0;
  background: white;
  color: #263745;
  font-size: 0.83rem;
}

.quality-summary {
  display: grid;
  grid-template-columns: minmax(12rem, 0.8fr) minmax(12rem, 0.8fr) minmax(20rem, 1.6fr);
  gap: 1.25rem;
  padding: 0.75rem 0.4rem;
}

.quality-summary__score,
.quality-summary__comparison {
  display: grid;
  align-content: start;
  gap: 0.35rem;
  color: #607d98;
  font-size: 0.76rem;
}

.quality-score-line {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
  color: #263745;
}

.quality-score-line strong {
  font-size: 1.6rem;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.quality-score-line > span:nth-child(2) {
  font-size: 0.9rem;
}

.quality-summary__comparison small {
  color: #8196a8;
  font-size: 0.68rem;
}

.quality-status {
  display: inline-flex;
  min-height: 1.35rem;
  align-items: center;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  font-size: 0.66rem;
  font-weight: 650;
  white-space: nowrap;
}

.quality-status--healthy {
  background: #e6f4eb;
  color: #18764a;
}

.quality-status--monitor {
  background: #fff0e7;
  color: #a64b18;
}

.quality-status--attention {
  background: #fde9ec;
  color: #ae2340;
}

.change-pill {
  display: inline-flex;
  margin-left: 0.45rem;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  background: #e6f4eb;
  color: #18764a;
  font-size: 0.67rem;
  font-weight: 650;
}

.change-pill--down {
  background: #fff0e7;
  color: #a64b18;
}

.quality-summary__filters {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-content: start;
  gap: 0.35rem;
}

.quality-summary__filters label {
  color: #607d98;
  font-size: 0.65rem;
}

.quality-summary__filters select {
  min-width: 0;
  border: 1px solid #d7e1e9;
  border-radius: 0.35rem;
  font-size: 0.68rem;
}

.quality-summary__filters button {
  justify-self: start;
  padding: 0.2rem 0;
  border: 0;
  background: transparent;
  color: #2563eb;
  font-size: 0.67rem;
  cursor: pointer;
}

.quality-trend-card,
.dimension-section,
.quality-observations {
  min-width: 0;
  padding: 1.1rem 1.2rem;
  border-radius: 0.8rem;
  background: white;
}

.quality-section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.8rem;
}

.quality-section-heading h2 {
  color: #263745;
  font-size: 0.95rem;
}

.quality-section-heading p {
  margin-top: 0.2rem;
  color: #8196a8;
  font-size: 0.68rem;
}

.quality-trend-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
  color: #607d98;
  font-size: 0.65rem;
}

.quality-trend-legend span {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.quality-trend-legend i {
  display: inline-block;
  width: 1rem;
  border-top: 2px solid #2563eb;
}

.quality-trend-legend .legend-reference {
  border-color: #14b8a6;
  border-top-style: dashed;
}

.quality-chart-summary {
  margin-bottom: 0.4rem;
  color: #526d84;
  font-size: 0.7rem;
}

.quality-chart-scroll {
  width: 100%;
  overflow: hidden;
}

.quality-chart {
  width: 100%;
  height: clamp(11rem, 21vw, 15rem);
}

.quality-chart__grid {
  stroke: #edf2f5;
  stroke-width: 1;
}

.quality-chart__axis,
.quality-chart__date {
  fill: #8196a8;
  font-size: 11px;
}

.quality-chart__date {
  font-size: 10px;
}

.quality-chart__reference {
  stroke: #14b8a6;
  stroke-dasharray: 6 5;
  stroke-width: 1.5;
}

.quality-chart__line {
  fill: none;
  stroke: #2563eb;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 3;
}

.quality-chart__point {
  fill: white;
  stroke: #2563eb;
  stroke-width: 2;
}

.quality-chart__point--current {
  fill: #14b8a6;
  stroke: white;
  stroke-width: 3;
}

.quality-breakdown-label {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  color: #263745;
  font-size: 0.84rem;
}

.quality-breakdown-label span {
  height: 1px;
  flex: 1;
  background: #cbd9e3;
}

.dimension-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.8rem;
}

.dimension-card {
  min-width: 0;
  padding: 0.9rem;
  border: 1px solid #e0e7ec;
  border-radius: 0.55rem;
}

.dimension-card__top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
}

.dimension-card h3 {
  color: #211064;
  font-size: 0.78rem;
}

.dimension-card__score {
  display: flex;
  align-items: baseline;
  gap: 0.15rem;
  margin: 0.8rem 0 0.55rem;
  color: #263745;
}

.dimension-card__score strong {
  font-size: 1.5rem;
  font-variant-numeric: tabular-nums;
}

.dimension-card__score span {
  font-size: 0.75rem;
}

.dimension-meter {
  height: 0.42rem;
  overflow: hidden;
  border-radius: 999px;
  background: #edf2f5;
}

.dimension-meter span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #14b8a6;
}

.dimension-card p {
  min-height: 2rem;
  margin-top: 0.6rem;
  color: #607d98;
  font-size: 0.66rem;
}

.dimension-card footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.3rem;
  margin-top: 0.7rem;
  padding-top: 0.6rem;
  border-top: 1px solid #e7edf1;
  color: #8196a8;
  font-size: 0.62rem;
}

.dimension-card footer strong {
  color: #18764a;
  font-weight: 600;
}

.dimension-card footer strong.dimension-change--down {
  color: #a64b18;
}

.observation-count {
  color: #8196a8;
  font-size: 0.68rem;
}

.quality-table-scroll {
  max-width: 100%;
  overflow: auto;
  overscroll-behavior-inline: contain;
}

.quality-observation-table {
  width: 100%;
  min-width: 920px;
  border-collapse: collapse;
  font-size: 0.68rem;
}

.quality-observation-table th,
.quality-observation-table td {
  padding: 0.7rem 0.55rem;
  border-bottom: 1px solid #e0e7ec;
  color: #435b70;
  text-align: left;
  vertical-align: middle;
}

.quality-observation-table thead th {
  background: #eff4f8;
  color: #607d98;
  font-weight: 550;
  white-space: nowrap;
}

.quality-observation-table tbody th {
  min-width: 13rem;
  color: #263745;
  font-weight: 550;
}

.quality-observation-table small {
  display: block;
  margin-top: 0.18rem;
  color: #8196a8;
  font-size: 0.62rem;
  font-weight: 400;
}

.quality-empty-state {
  padding: 1.5rem;
  border: 1px solid #e0e7ec;
  border-radius: 0.55rem;
  color: #607d98;
}

.quality-empty-state h3 {
  margin-bottom: 0.35rem;
  font-size: 0.85rem;
}

.quality-empty-state p {
  font-size: 0.7rem;
}

.quality-story-note {
  padding: 0.8rem 1rem;
  border-left: 3px solid #d48741;
  background: #fffaf5;
  color: #526d84;
  font-size: 0.72rem;
  line-height: 1.55;
}

.quality-story-note strong {
  display: block;
  margin-bottom: 0.2rem;
  color: #263745;
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
  .quality-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .quality-summary__filters {
    grid-column: 1 / -1;
  }

  .dimension-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 620px) {
  .quality-header,
  .quality-section-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .quality-period-control {
    justify-items: start;
  }

  .quality-summary {
    grid-template-columns: minmax(0, 1fr);
    gap: 0.8rem;
  }

  .quality-summary__filters {
    grid-template-columns: minmax(0, 1fr);
  }

  .quality-summary__filters label:not(:first-child) {
    margin-top: 0.25rem;
  }

  .dimension-grid {
    grid-template-columns: minmax(0, 1fr);
  }

}
</style>
