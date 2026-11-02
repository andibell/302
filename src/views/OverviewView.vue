<script setup>
import { computed, ref } from 'vue'
import OverviewGauge from '../components/portfolio/OverviewGauge.vue'
import {
  getOverviewSummary,
  lineOfBusinessOptions,
  nimvaNews,
  optimizationOpportunities,
  portfolioAlerts,
  portfolioResources,
} from '../data/overview.js'

const selectedPeriod = ref('year')
const selectedLineOfBusiness = ref(lineOfBusinessOptions[0])
const selectedAlertTab = ref('new')
const filtersOpen = ref(false)
const showAllAlerts = ref(false)

const summary = computed(() =>
  getOverviewSummary(selectedPeriod.value, selectedLineOfBusiness.value),
)

const filteredAlerts = computed(() => {
  const alerts = portfolioAlerts.filter(
    (alert) => alert.status === selectedAlertTab.value,
  )
  return showAllAlerts.value ? alerts : alerts.slice(0, 4)
})

const premiumPlan = computed(() => summary.value.current.writtenPremium * 0.98)
const retentionPlan = 0.78
const ratePlan = 0.044

const performanceMetrics = computed(() => [
  {
    id: 'premium',
    title: 'Gross Written Premium',
    value: formatCurrency(summary.value.current.writtenPremium),
    plan: formatCurrency(premiumPlan.value),
    previous: formatCurrency(summary.value.previous.writtenPremium),
    comparison: percentChange(
      summary.value.current.writtenPremium,
      summary.value.previous.writtenPremium,
    ),
    planComparison: percentChange(
      summary.value.current.writtenPremium,
      premiumPlan.value,
    ),
    gaugeValue: 72,
    status: 'On Target',
    tone: 'positive',
  },
  {
    id: 'retention',
    title: 'Retention Rate',
    value: formatPercent(summary.value.current.retention),
    plan: formatPercent(retentionPlan),
    previous: formatPercent(summary.value.previous.retention),
    comparison: percentChange(
      summary.value.current.retention,
      summary.value.previous.retention,
    ),
    planComparison: percentChange(
      summary.value.current.retention,
      retentionPlan,
    ),
    gaugeValue: 64,
    status: 'On Target',
    tone: 'positive',
  },
  {
    id: 'rate',
    title: 'Rate Change',
    value: formatPercent(summary.value.current.rateChange),
    plan: formatPercent(ratePlan),
    previous: formatPercent(summary.value.previous.rateChange),
    comparison: percentChange(
      summary.value.current.rateChange,
      summary.value.previous.rateChange,
    ),
    planComparison: percentChange(
      summary.value.current.rateChange,
      ratePlan,
    ),
    gaugeValue: 36,
    status: 'Slightly Under',
    tone: 'warning',
  },
])

const signalMetrics = computed(() => [
  {
    id: 'loss',
    title: 'Loss Emergence',
    value: `${signedNumber(
      (summary.value.current.lossRatio -
        summary.value.current.expectedLossRatio) *
        100,
      1,
    )} pts`,
    description: 'Actual loss ratio above expected',
    actual: formatPercent(summary.value.current.lossRatio),
    expected: formatPercent(summary.value.current.expectedLossRatio),
    previous: formatPercent(summary.value.previous.lossRatio),
    tone: 'critical',
    status: 'Investigate',
  },
  {
    id: 'frequency',
    title: 'Claims Frequency',
    value: summary.value.current.claimFrequency.toFixed(2),
    description: 'Claims per 100 policies',
    actual: summary.value.current.claimFrequency.toFixed(2),
    expected: summary.value.current.expectedClaimFrequency.toFixed(2),
    previous: summary.value.previous.claimFrequency.toFixed(2),
    tone: 'warning',
    status: 'Slightly Over',
  },
])

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`
}

function percentChange(current, previous) {
  if (!previous) return '—'
  const change = ((current - previous) / Math.abs(previous)) * 100
  return `${change > 0 ? '+' : ''}${change.toFixed(1)}%`
}

function signedNumber(value, decimals = 0) {
  return `${value > 0 ? '+' : ''}${value.toFixed(decimals)}`
}

function selectPeriod(period) {
  selectedPeriod.value = period
  showAllAlerts.value = false
}
</script>

<template>
  <div class="overview-page">
    <header class="overview-heading">
      <div>
        <p class="overview-eyebrow">Portfolio overview</p>
        <h1>Good morning</h1>
        <p class="overview-heading__subhead">
          Here’s how your portfolio is performing.
        </p>
      </div>

      <div class="overview-toolbar">
        <button
          class="overview-button overview-button--secondary"
          type="button"
          :aria-expanded="filtersOpen"
          aria-controls="overview-filters"
          @click="filtersOpen = !filtersOpen"
        >
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M3 5h14M5.5 10h9M8 15h4" />
            <circle cx="7" cy="5" r="1.5" />
            <circle cx="12" cy="10" r="1.5" />
          </svg>
          Filters
        </button>
        <button
          class="overview-button overview-button--secondary"
          type="button"
          disabled
          title="File upload is outside the scope of this prototype"
        >
          Import
          <span aria-hidden="true">+</span>
        </button>

        <div
          v-if="filtersOpen"
          id="overview-filters"
          class="overview-filter-panel"
        >
          <label for="line-of-business">Line of Business</label>
          <select
            id="line-of-business"
            v-model="selectedLineOfBusiness"
            @change="filtersOpen = false; showAllAlerts = false"
          >
            <option
              v-for="line in lineOfBusinessOptions"
              :key="line"
              :value="line"
            >
              {{ line }}
            </option>
          </select>
          <button
            class="overview-filter-panel__clear"
            type="button"
            @click="selectedLineOfBusiness = lineOfBusinessOptions[0]"
          >
            Clear filters
          </button>
        </div>
      </div>
    </header>

    <div class="overview-top-grid">
      <section class="performance-section" aria-labelledby="performance-title">
        <div class="overview-section-heading">
          <h2 id="performance-title">Performance to Plan</h2>
          <div class="period-toggle" aria-label="Reporting period">
            <button
              type="button"
              :class="{ 'is-active': selectedPeriod === 'year' }"
              :aria-pressed="selectedPeriod === 'year'"
              @click="selectPeriod('year')"
            >
              Year
            </button>
            <button
              type="button"
              :class="{ 'is-active': selectedPeriod === 'month' }"
              :aria-pressed="selectedPeriod === 'month'"
              @click="selectPeriod('month')"
            >
              Month
            </button>
          </div>
        </div>

        <div class="performance-card-grid">
          <div class="performance-metric-list">
            <article
              v-for="metric in performanceMetrics"
              :key="metric.id"
              class="performance-card"
              :aria-labelledby="`${metric.id}-title`"
            >
              <div class="performance-card__gauge">
                <span
                  class="status-badge"
                  :class="`status-badge--${metric.tone}`"
                >
                  {{ metric.status }}
                </span>
                <OverviewGauge
                  :value="metric.gaugeValue"
                  :tone="metric.tone"
                />
              </div>

              <div class="performance-card__details">
                <h3 :id="`${metric.id}-title`">{{ metric.title }}</h3>
                <p class="performance-card__value">{{ metric.value }}</p>
                <dl class="comparison-list">
                  <div>
                    <dt>Plan</dt>
                    <dd>{{ metric.plan }}</dd>
                    <span
                      class="change-pill"
                      :class="
                        metric.planComparison.startsWith('-')
                          ? 'change-pill--down'
                          : 'change-pill--up'
                      "
                    >
                      {{ metric.planComparison }}
                    </span>
                  </div>
                  <div>
                    <dt>Prior period</dt>
                    <dd>{{ metric.previous }}</dd>
                    <span
                      class="change-pill"
                      :class="
                        metric.comparison.startsWith('-')
                          ? 'change-pill--down'
                          : 'change-pill--up'
                      "
                    >
                      {{ metric.comparison }}
                    </span>
                  </div>
                </dl>
              </div>
              <span class="performance-card__chevron" aria-hidden="true">›</span>
            </article>
          </div>

          <div class="signal-card-list" aria-label="Emerging portfolio signals">
            <article
              v-for="signal in signalMetrics"
              :key="signal.id"
              class="signal-card"
              :aria-labelledby="`${signal.id}-signal-title`"
            >
              <span
                class="status-badge"
                :class="`status-badge--${signal.tone}`"
              >
                {{ signal.status }}
              </span>
              <h3 :id="`${signal.id}-signal-title`">
                {{ signal.title }}
                <span class="info-mark" :aria-label="signal.description">i</span>
              </h3>
              <p class="signal-card__value">{{ signal.value }}</p>
              <p class="signal-card__description">{{ signal.description }}</p>
              <div
                class="signal-scale"
                :class="`signal-scale--${signal.tone}`"
                aria-hidden="true"
              >
                <span></span>
              </div>
              <dl class="signal-comparisons">
                <div>
                  <dt>{{ signal.id === 'loss' ? 'Expected LR' : 'Expected' }}</dt>
                  <dd>{{ signal.expected }}</dd>
                </div>
                <div>
                  <dt>Prior period</dt>
                  <dd>{{ signal.previous }}</dd>
                </div>
              </dl>
            </article>
          </div>
        </div>
      </section>

      <aside class="alerts-section" aria-labelledby="alerts-title">
        <div class="alerts-heading">
          <h2 id="alerts-title">Portfolio Alerts</h2>
          <button
            class="text-link"
            type="button"
            :aria-expanded="showAllAlerts"
            @click="showAllAlerts = !showAllAlerts"
          >
            {{ showAllAlerts ? 'Show Less' : 'View All' }}
            <span aria-hidden="true">{{ showAllAlerts ? '‹' : '›' }}</span>
          </button>
        </div>

        <div class="alert-tabs" role="group" aria-label="Filter portfolio alerts">
          <button
            type="button"
            :class="{ 'is-active': selectedAlertTab === 'new' }"
            :aria-pressed="selectedAlertTab === 'new'"
            @click="selectedAlertTab = 'new'; showAllAlerts = false"
          >
            New
          </button>
          <button
            type="button"
            :class="{ 'is-active': selectedAlertTab === 'flagged' }"
            :aria-pressed="selectedAlertTab === 'flagged'"
            @click="selectedAlertTab = 'flagged'; showAllAlerts = false"
          >
            Flagged
          </button>
        </div>

        <ul class="alert-list" aria-live="polite">
          <li v-for="alert in filteredAlerts" :key="alert.id">
            <article class="alert-item">
              <span class="alert-item__category">{{ alert.category }}</span>
              <span class="alert-item__title">{{ alert.title }}</span>
              <span class="alert-item__date">{{ alert.date }}</span>
              <span class="alert-item__chevron" aria-hidden="true">›</span>
            </article>
          </li>
          <li v-if="filteredAlerts.length === 0" class="alert-empty">
            No alerts in this view.
          </li>
        </ul>
      </aside>
    </div>

    <section class="opportunities-section" aria-labelledby="opportunities-title">
      <h2 id="opportunities-title">Optimization</h2>
      <div class="opportunity-list">
        <article
          v-for="opportunity in optimizationOpportunities"
          :key="opportunity.id"
          class="opportunity-card"
          :class="{ 'opportunity-card--featured': opportunity.featured }"
        >
          <div v-if="opportunity.featured" class="opportunity-card__banner">
            {{ opportunity.title }}
          </div>
          <div class="opportunity-card__body">
            <p class="opportunity-card__eyebrow">{{ opportunity.eyebrow }}</p>
            <span
              v-if="!opportunity.featured"
              class="status-badge status-badge--neutral"
            >
              {{ opportunity.status }}
            </span>
            <h3>{{ opportunity.name }}</h3>
            <p class="opportunity-card__description">
              {{ opportunity.description }}
            </p>
            <div class="opportunity-progress">
              <div
                class="opportunity-progress__track"
                role="progressbar"
                :aria-valuenow="opportunity.progress"
                aria-valuemin="0"
                aria-valuemax="100"
                :aria-label="`${opportunity.name} progress`"
              >
                <span :style="{ width: `${opportunity.progress}%` }"></span>
              </div>
              <span>{{ opportunity.completed || 'Ready to review' }}</span>
            </div>
          </div>
          <span class="opportunity-card__chevron" aria-hidden="true">›</span>
        </article>
      </div>
    </section>

    <section class="resources-section" aria-labelledby="resources-title">
      <h2 id="resources-title">Services and Resources</h2>
      <div class="resources-layout">
        <div class="resource-grid">
          <div
            v-for="(resource, index) in portfolioResources"
            :key="resource"
            class="resource-tile"
            :class="`resource-tile--${index + 1}`"
          >
            {{ resource }}
            <span aria-hidden="true">›</span>
          </div>
        </div>

        <aside class="news-column" aria-labelledby="nimva-news-title">
          <h3 id="nimva-news-title">Nimva Insights</h3>
          <article v-for="story in nimvaNews" :key="story.title" class="news-item">
            <p class="news-item__type">{{ story.type }}</p>
            <h4>{{ story.title }}</h4>
            <p class="news-item__meta">
              {{ story.date }} <span aria-hidden="true">•</span>
              {{ story.readTime }}
            </p>
          </article>
          <h3 class="news-column__secondary-title">Industry Notes</h3>
          <article class="news-item">
            <p class="news-item__type">MARKET BRIEF</p>
            <h4>Monitoring specialty portfolio conditions through the cycle</h4>
            <p class="news-item__meta">12 JUN 2026 <span aria-hidden="true">•</span> 3 MIN READ</p>
          </article>
        </aside>
      </div>
    </section>
  </div>
</template>

<style scoped>
.overview-page {
  --overview-ink: #132d48;
  --overview-muted: #607d98;
  --overview-border: #d6e0e8;
  --overview-canvas: #f3f7fa;
  --overview-blue: #2874e8;
  --overview-indigo: #211064;

  display: grid;
  gap: 2rem;
  color: var(--overview-ink);
}

.overview-heading,
.overview-section-heading,
.alerts-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.25rem;
}

.overview-heading {
  position: relative;
  min-height: 4.25rem;
}

.overview-eyebrow {
  margin-bottom: 0.25rem;
  color: var(--overview-muted);
  font-size: 0.7rem;
  font-weight: 650;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.overview-heading h1 {
  font-size: clamp(1.35rem, 2vw, 1.65rem);
}

.overview-heading__subhead {
  margin-top: 0.35rem;
  color: var(--overview-muted);
  font-size: 0.9rem;
}

.overview-toolbar {
  position: relative;
  display: flex;
  gap: 0.75rem;
}

.overview-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  min-height: 2.65rem;
  padding: 0.55rem 1rem;
  border: 1px solid var(--overview-border);
  border-radius: 0.55rem;
  background: #fff;
  color: var(--overview-indigo);
  font-size: 0.82rem;
  font-weight: 550;
  cursor: pointer;
}

.overview-button svg {
  width: 1rem;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-width: 1.5;
}

.overview-button:disabled {
  color: #78899a;
  cursor: not-allowed;
  opacity: 0.72;
}

.overview-filter-panel {
  position: absolute;
  z-index: 3;
  top: calc(100% + 0.5rem);
  right: 0;
  display: grid;
  width: min(20rem, calc(100vw - 2rem));
  gap: 0.6rem;
  padding: 1rem;
  border: 1px solid var(--overview-border);
  border-radius: 0.65rem;
  background: white;
  box-shadow: 0 12px 30px rgb(21 45 72 / 14%);
}

.overview-filter-panel label {
  font-size: 0.78rem;
  font-weight: 650;
}

.overview-filter-panel select {
  min-height: 2.5rem;
  padding-inline: 0.65rem;
  border: 1px solid var(--overview-border);
  border-radius: 0.4rem;
  background: white;
  color: var(--overview-ink);
}

.overview-filter-panel__clear {
  justify-self: start;
  padding: 0.2rem 0;
  border: 0;
  background: none;
  color: var(--overview-blue);
  font-size: 0.78rem;
  cursor: pointer;
}

.overview-top-grid {
  display: grid;
  grid-template-columns: minmax(0, 2.55fr) minmax(18rem, 0.95fr);
  gap: clamp(1.5rem, 2.5vw, 2.75rem);
  align-items: start;
}

.performance-section,
.alerts-section {
  min-width: 0;
}

.overview-section-heading {
  min-height: 3.25rem;
  margin-bottom: 0.65rem;
}

.overview-section-heading h2,
.alerts-heading h2,
.opportunities-section > h2,
.resources-section > h2 {
  font-size: 1.12rem;
}

.period-toggle,
.alert-tabs {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.period-toggle button,
.alert-tabs button {
  min-height: 2rem;
  padding: 0.35rem 0.75rem;
  border: 0;
  border-radius: 0.45rem;
  background: transparent;
  color: var(--overview-muted);
  font-size: 0.78rem;
  cursor: pointer;
}

.period-toggle button.is-active,
.alert-tabs button.is-active {
  background: var(--overview-indigo);
  color: white;
  box-shadow: 0 2px 4px rgb(16 34 71 / 12%);
}

.performance-card-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(14rem, 0.9fr);
  gap: 1.25rem;
}

.performance-metric-list,
.signal-card-list {
  display: grid;
  align-content: start;
  gap: 1rem;
}

.performance-card,
.signal-card {
  position: relative;
  min-width: 0;
  border-radius: 0.9rem;
  background: white;
  box-shadow: var(--shadow-md);
}

.performance-card {
  display: grid;
  grid-template-columns: minmax(7rem, 0.85fr) minmax(0, 1.15fr);
  align-items: center;
  min-height: 10rem;
  padding: 1.05rem 1.2rem;
  gap: 1rem;
}

.performance-card__gauge {
  display: grid;
  justify-items: center;
  gap: 0.15rem;
}

.overview-gauge {
  width: min(100%, 9.3rem);
  overflow: visible;
}

.overview-gauge__track,
.overview-gauge__progress {
  fill: none;
  stroke-width: 8;
  stroke-linecap: round;
}

.overview-gauge__track {
  stroke: #dfe7ed;
}

.overview-gauge__progress {
  stroke: var(--color-success);
}

.overview-gauge--warning .overview-gauge__progress {
  stroke: #ff9a61;
}

.overview-gauge__needle {
  stroke: #344756;
  stroke-width: 7;
  stroke-linecap: round;
}

.overview-gauge__pivot {
  fill: #344756;
}

.overview-gauge__marker {
  fill: white;
  stroke: var(--color-success);
  stroke-width: 4;
}

.overview-gauge--warning .overview-gauge__marker {
  stroke: #f47839;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 0.2rem 0.62rem;
  border-radius: var(--radius-pill);
  background: #e6f4eb;
  color: #178a4b;
  font-size: 0.68rem;
  font-weight: 650;
  line-height: 1.25;
  white-space: nowrap;
}

.status-badge--warning {
  background: #fff0e7;
  color: #db5b21;
}

.status-badge--critical {
  background: #fde8ec;
  color: #c52344;
}

.status-badge--neutral {
  background: #eaf0f5;
  color: #536d83;
}

.performance-card__details {
  min-width: 0;
}

.performance-card__details h3,
.signal-card h3 {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--overview-ink);
  font-size: 0.82rem;
  font-weight: 650;
  line-height: 1.35;
}

.performance-card__value,
.signal-card__value {
  margin-top: 0.35rem;
  color: #202a32;
  font-size: clamp(1.2rem, 1.8vw, 1.55rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.2;
  white-space: nowrap;
}

.comparison-list,
.signal-comparisons {
  display: grid;
  gap: 0.3rem;
  margin-top: 0.75rem;
  color: var(--overview-muted);
  font-size: 0.7rem;
}

.comparison-list > div {
  display: grid;
  grid-template-columns: minmax(4rem, 1fr) auto auto;
  align-items: center;
  gap: 0.35rem;
}

.comparison-list dt,
.signal-comparisons dt {
  text-transform: uppercase;
}

.comparison-list dd,
.signal-comparisons dd {
  margin: 0;
  white-space: nowrap;
}

.change-pill {
  min-width: 3rem;
  padding: 0.15rem 0.4rem;
  border-radius: var(--radius-pill);
  background: #e6f4eb;
  color: #178a4b;
  font-size: 0.65rem;
  font-weight: 650;
  text-align: center;
}

.change-pill--down {
  background: #fff0e7;
  color: #db5b21;
}

.performance-card__chevron,
.opportunity-card__chevron {
  position: absolute;
  top: 50%;
  right: 0.8rem;
  transform: translateY(-50%);
  color: var(--overview-blue);
  font-size: 1.8rem;
  line-height: 1;
}

.signal-card {
  min-height: 14.15rem;
  padding: 1.25rem 1.35rem;
}

.signal-card h3 {
  margin-top: 0.75rem;
}

.info-mark {
  display: inline-grid;
  width: 1rem;
  height: 1rem;
  place-items: center;
  border: 1.5px solid var(--overview-blue);
  border-radius: 50%;
  color: var(--overview-blue);
  font-size: 0.68rem;
  font-style: normal;
  font-weight: 700;
}

.signal-card__value {
  margin-top: 0.5rem;
}

.signal-card__description {
  margin-top: 0.25rem;
  color: var(--overview-muted);
  font-size: 0.68rem;
}

.signal-scale {
  position: relative;
  height: 0.65rem;
  margin-top: 1rem;
  border-radius: var(--radius-pill);
  background: #e1e8ed;
}

.signal-scale::before {
  position: absolute;
  top: 0;
  left: 60%;
  width: 20%;
  height: 100%;
  border-radius: inherit;
  background: #f5a1b2;
  content: "";
}

.signal-scale--warning::before {
  left: 45%;
  background: #ffc499;
}

.signal-scale span {
  position: absolute;
  top: 50%;
  left: 72%;
  width: 1.1rem;
  height: 1.1rem;
  transform: translate(-50%, -50%);
  border: 4px solid #d82c52;
  border-radius: 50%;
  background: white;
}

.signal-scale--warning span {
  left: 57%;
  border-color: #f47839;
}

.signal-comparisons {
  gap: 0.35rem;
  margin-top: 0.8rem;
}

.signal-comparisons > div {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.alerts-heading {
  min-height: 3.25rem;
  margin-bottom: 0.65rem;
}

.text-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 0;
  background: transparent;
  color: var(--overview-blue);
  font-size: 0.75rem;
  white-space: nowrap;
  cursor: pointer;
}

.alert-tabs {
  margin-bottom: 0.75rem;
}

.alert-list {
  max-height: 32rem;
  margin: 0;
  padding: 0 0.25rem 0 0;
  overflow: auto;
  list-style: none;
  scrollbar-color: #9db1c1 transparent;
  scrollbar-width: thin;
}

.alert-list li {
  border-bottom: 1px solid #cfdae3;
}

.alert-item {
  position: relative;
  display: grid;
  width: 100%;
  min-height: 5.35rem;
  align-content: center;
  gap: 0.2rem;
  padding: 0.75rem 1.5rem 0.75rem 0.7rem;
  border: 0;
  background: transparent;
  color: var(--overview-ink);
  text-align: left;
}

.alert-item__category,
.news-item__type {
  color: var(--overview-muted);
  font-size: 0.62rem;
  letter-spacing: 0.035em;
}

.alert-item__title {
  font-size: 0.75rem;
  line-height: 1.35;
}

.alert-item__date {
  color: var(--overview-muted);
  font-size: 0.62rem;
}

.alert-item__chevron {
  position: absolute;
  top: 50%;
  right: 0.3rem;
  transform: translateY(-50%);
  color: #9bb0c0;
  font-size: 1.35rem;
}

.alert-empty {
  padding: 1.25rem 0.7rem;
  color: var(--overview-muted);
  font-size: 0.8rem;
}

.opportunities-section {
  display: grid;
  gap: 1.15rem;
}

.opportunity-list {
  display: grid;
  grid-auto-columns: minmax(17rem, 1fr);
  grid-auto-flow: column;
  gap: 1.35rem;
  padding: 0.15rem 0.15rem 0.75rem;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
}

.opportunity-card {
  position: relative;
  min-height: 13.75rem;
  overflow: hidden;
  border: 1px solid #cbd9e4;
  border-radius: 0.9rem;
  background: white;
  scroll-snap-align: start;
}

.opportunity-card__body {
  position: relative;
  display: grid;
  min-height: inherit;
  align-content: start;
  gap: 0.7rem;
  padding: 1.4rem 1.35rem;
}

.opportunity-card__banner {
  padding: 0.8rem 1rem;
  background: linear-gradient(110deg, #2874e8, #263fca);
  color: white;
  font-size: 0.9rem;
  font-weight: 650;
}

.opportunity-card--featured .opportunity-card__body {
  min-height: 10rem;
}

.opportunity-card__eyebrow {
  color: var(--overview-muted);
  font-size: 0.65rem;
  letter-spacing: 0.04em;
}

.opportunity-card__body h3 {
  padding-right: 1.35rem;
  font-size: 1rem;
}

.opportunity-card__description {
  max-width: 90%;
  color: var(--overview-muted);
  font-size: 0.78rem;
}

.opportunity-progress {
  display: grid;
  gap: 0.4rem;
  margin-top: auto;
  color: var(--overview-muted);
  font-size: 0.65rem;
}

.opportunity-progress__track {
  height: 0.6rem;
  overflow: hidden;
  border-radius: var(--radius-pill);
  background: #e0e7ed;
}

.opportunity-progress__track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--overview-blue);
}

.opportunity-card__chevron {
  top: 55%;
  right: 1rem;
}

.resources-section {
  margin-inline: calc(clamp(var(--space-4), 3vw, var(--space-8)) * -1);
  padding: clamp(2rem, 4vw, 3.5rem) clamp(var(--space-4), 3vw, var(--space-8));
  background: #eff4f8;
}

.resources-section > h2 {
  margin-bottom: 1.75rem;
  color: #7589a0;
  font-size: 1.35rem;
  font-weight: 500;
}

.resources-layout {
  display: grid;
  grid-template-columns: minmax(0, 2.35fr) minmax(16rem, 0.85fr);
  gap: clamp(2rem, 5vw, 5rem);
  align-items: start;
}

.resource-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.25rem;
}

.resource-tile {
  position: relative;
  display: flex;
  min-height: clamp(8rem, 14vw, 12rem);
  align-items: end;
  justify-content: space-between;
  overflow: hidden;
  padding: 1.1rem;
  border-radius: 0.85rem;
  background: #2867bd;
  box-shadow: var(--shadow-md);
  color: white;
  font-size: 0.9rem;
  font-weight: 650;
  cursor: default;
}

.resource-tile::before {
  position: absolute;
  top: 0;
  right: -15%;
  left: -15%;
  height: 65%;
  border-radius: 0 0 50% 50%;
  background: rgb(255 255 255 / 11%);
  content: "";
  transform: translateY(-28%) rotate(-7deg);
}

.resource-tile > * {
  position: relative;
}

.resource-tile span {
  opacity: 0;
  transition: opacity 120ms ease;
}

.resource-tile:hover span,
.resource-tile:focus-visible span {
  opacity: 1;
}

.resource-tile--2 {
  background: #0c9d91;
}

.resource-tile--3 {
  background: #7053ba;
}

.resource-tile--4 {
  background: #37a6bd;
}

.resource-tile--5 {
  background: #d69a24;
}

.resource-tile--6 {
  background: #c72c67;
}

.news-column h3 {
  margin-bottom: 0.8rem;
  color: #7589a0;
  font-size: 1rem;
  font-weight: 550;
}

.news-item {
  position: relative;
  padding: 0.7rem 1rem 0.8rem 0;
  border-bottom: 1px solid #d5dfe6;
}

.news-item h4 {
  margin-top: 0.25rem;
  color: #344a5f;
  font-size: 0.75rem;
  font-weight: 550;
  line-height: 1.35;
}

.news-item__meta {
  margin-top: 0.3rem;
  color: var(--overview-muted);
  font-size: 0.6rem;
}

.news-column__secondary-title {
  margin-top: 1.5rem;
}

@media (max-width: 1100px) {
  .overview-top-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .alerts-section {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    column-gap: 1rem;
  }

  .alerts-heading {
    grid-column: 1 / -1;
  }

  .alert-tabs {
    align-self: start;
    margin: 0;
  }

  .alert-list {
    grid-column: 1 / -1;
    display: grid;
    grid-auto-columns: minmax(15rem, 1fr);
    grid-auto-flow: column;
    gap: 0.8rem;
    max-height: none;
    padding-bottom: 0.5rem;
    overflow-x: auto;
  }

  .alert-list li {
    border: 1px solid var(--overview-border);
    border-radius: 0.6rem;
    background: white;
  }

  .alert-item {
    min-height: 6rem;
  }

  .resources-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .news-column {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 1.25rem;
  }

  .news-column > h3 {
    grid-column: 1 / -1;
  }

  .news-column__secondary-title {
    margin-top: 1rem;
  }
}

@media (max-width: 700px) {
  .overview-page {
    gap: 1.5rem;
  }

  .overview-heading {
    align-items: flex-start;
  }

  .overview-toolbar {
    gap: 0.4rem;
  }

  .overview-button {
    min-height: 2.4rem;
    padding-inline: 0.65rem;
    font-size: 0.72rem;
  }

  .overview-section-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.5rem;
    padding-block: 0.4rem;
  }

  .performance-card-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .signal-card-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .signal-card {
    min-height: 13.5rem;
    padding: 1rem;
  }

  .opportunity-list {
    grid-auto-columns: minmax(16rem, 78vw);
  }

  .resource-grid {
    gap: 0.75rem;
  }

  .resource-tile {
    min-height: 7.5rem;
    padding: 0.8rem;
    font-size: 0.78rem;
  }
}

@media (max-width: 480px) {
  .overview-heading {
    flex-direction: column;
    gap: 1rem;
  }

  .overview-toolbar {
    width: 100%;
  }

  .overview-toolbar > button {
    flex: 1;
  }

  .overview-filter-panel {
    right: auto;
    left: 0;
  }

  .performance-card {
    grid-template-columns: 7rem minmax(0, 1fr);
    gap: 0.65rem;
    min-height: 9rem;
    padding: 0.85rem;
  }

  .overview-gauge {
    width: 7rem;
  }

  .performance-card__details h3 {
    font-size: 0.74rem;
  }

  .performance-card__value {
    font-size: 1.12rem;
  }

  .comparison-list {
    font-size: 0.62rem;
  }

  .comparison-list > div {
    grid-template-columns: minmax(3.6rem, 1fr) auto;
  }

  .comparison-list .change-pill {
    grid-column: 2;
    justify-self: end;
  }

  .signal-card-list {
    grid-template-columns: minmax(0, 1fr);
  }

  .signal-card {
    min-height: 12.5rem;
  }

  .news-column {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (prefers-reduced-motion: reduce) {
  .resource-tile span {
    transition: none;
  }
}
</style>
