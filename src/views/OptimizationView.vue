<script setup>
import { computed, ref } from 'vue'
import {
  formatScenarioPeriod,
  getOptimizationScenario,
  optimizationAssumptions,
} from '../data/optimizationScenario.js'

const projectionMonths = ref(optimizationAssumptions.projectionMonths)
const rateAdjustment = ref(optimizationAssumptions.assumedRateAdjustment * 100)
const completedActions = ref(new Set())

const scenario = computed(() =>
  getOptimizationScenario({
    projectionMonths: projectionMonths.value,
    rateAdjustment: rateAdjustment.value / 100,
  }),
)

const actionProgress = computed(() => {
  const completed = scenario.value.actions.filter(({ id }) =>
    completedActions.value.has(id),
  ).length

  return `${completed} of ${scenario.value.actions.length} reviewed`
})

const chart = computed(() => {
  const historical = scenario.value.historical
  const projections = scenario.value.projections
  const values = [
    ...historical.flatMap((point) => [
      point.actualLossRatio,
      point.expectedLossRatio,
    ]),
    ...projections.flatMap((point) => [
      point.statusQuoLossRatio,
      point.optimizedLossRatio,
      point.expectedLossRatio,
    ]),
  ].filter(Number.isFinite)
  const maxRatio = Math.max(1, Math.ceil(Math.max(...values) * 4) / 4)
  const chartBounds = { left: 58, right: 760, top: 20, bottom: 220 }
  const timeline = [...historical, ...projections]
  const step = timeline.length > 1
    ? (chartBounds.right - chartBounds.left) / (timeline.length - 1)
    : 0
  const y = (value) =>
    chartBounds.bottom -
    (value / maxRatio) * (chartBounds.bottom - chartBounds.top)
  const x = (index) => chartBounds.left + index * step
  const pointsFor = (series) =>
    series
      .map((value, index) =>
        Number.isFinite(value) ? `${x(index)},${y(value)}` : null,
      )
      .filter(Boolean)
      .join(' ')
  const actual = historical.map(({ actualLossRatio }) => actualLossRatio)
  const expected = [
    ...historical.map(({ expectedLossRatio }) => expectedLossRatio),
    ...projections.map(({ expectedLossRatio }) => expectedLossRatio),
  ]
  const latestActual = actual.at(-1)
  const statusQuo = [
    ...Array(historical.length - 1).fill(null),
    latestActual,
    ...projections.map(({ statusQuoLossRatio }) => statusQuoLossRatio),
  ]
  const optimized = [
    ...Array(historical.length - 1).fill(null),
    latestActual,
    ...projections.map(({ optimizedLossRatio }) => optimizedLossRatio),
  ]
  const ticks = Array.from({ length: 5 }, (_, index) => {
    const value = (maxRatio * index) / 4
    return { value, y: y(value), label: `${Math.round(value * 100)}%` }
  })

  return {
    bounds: chartBounds,
    maxRatio,
    timeline,
    ticks,
    lines: [
      {
        key: 'actual',
        label: 'Observed actual',
        color: '#0b1f4b',
        dash: null,
        points: pointsFor(actual),
      },
      {
        key: 'expected',
        label: 'Expected',
        color: '#64748b',
        dash: '6 5',
        points: pointsFor(expected),
      },
      {
        key: 'status-quo',
        label: 'Status quo',
        color: '#c17725',
        dash: '6 5',
        points: pointsFor(statusQuo),
      },
      {
        key: 'optimized',
        label: 'Optimized scenario',
        color: '#14b8a6',
        dash: null,
        points: pointsFor(optimized),
      },
    ],
    labels: timeline.map((point, index) => ({
      key: point.period,
      label: point.label,
      x: x(index),
      show:
        index === 0 ||
        index === timeline.length - 1 ||
        index % 3 === 0,
    })),
    historicalBoundary:
      chartBounds.left + (historical.length - 0.5) * step,
  }
})

const formattedMeasures = computed(() => [
  {
    label: 'Current loss ratio',
    value: formatPercent(scenario.value.actualLossRatio),
    detail: `Latest observed · ${formatScenarioPeriod(scenario.value.latestPeriod)}`,
  },
  {
    label: 'Expected loss ratio',
    value: formatPercent(scenario.value.expectedLossRatio),
    detail: 'Current segment benchmark',
  },
  {
    label: 'Status quo · end of projection',
    value: formatPercent(scenario.value.projectedStatusQuoLossRatio),
    detail: 'Holds loss-cost ratio before rate change',
  },
  {
    label: 'Optimized scenario · end',
    value: formatPercent(scenario.value.projections.at(-1)?.optimizedLossRatio),
    detail: 'Gradual, assumption-based convergence',
  },
])

function formatPercent(value, digits = 1) {
  return Number.isFinite(value) ? `${(value * 100).toFixed(digits)}%` : '—'
}

function formatCurrency(value) {
  if (!Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatSignedPercent(value) {
  if (!Number.isFinite(value)) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${(value * 100).toFixed(1)}%`
}

function toggleAction(id, checked) {
  const updated = new Set(completedActions.value)
  if (checked) updated.add(id)
  else updated.delete(id)
  completedActions.value = updated
}
</script>

<template>
  <div class="optimization-view">
    <header class="optimization-heading">
      <div>
        <p class="optimization-eyebrow">PORTFOLIO INTELLIGENCE / SCENARIO PLANNING</p>
        <h1>Optimization</h1>
        <p class="optimization-heading__description">
          Explore a measured response to the loss emergence in Small Business
          Property. This is a hypothetical scenario for review, not a forecast
          or approved recommendation.
        </p>
      </div>
      <span class="optimization-scenario-badge">Illustrative scenario</span>
    </header>

    <nav class="optimization-section-nav" aria-label="Optimization page sections">
      <a href="#scenario-overview">Overview</a>
      <a href="#actions-needed">Actions Needed</a>
      <a href="#optimization-targets">Optimization Targets</a>
      <a href="#supporting-data">Supporting Data &amp; Models</a>
    </nav>

    <div class="optimization-layout">
      <div class="optimization-sidebar">
        <section
          id="scenario-overview"
          class="optimization-card opportunity-card"
          aria-labelledby="opportunity-heading"
        >
          <div class="optimization-card__heading">
            <div>
              <p class="optimization-kicker">OPPORTUNITY SUMMARY</p>
              <h2 id="opportunity-heading">Small Business Property</h2>
            </div>
            <span class="optimization-status">For review</span>
          </div>
          <p class="opportunity-card__summary">
            Recent experience is materially above the expected loss ratio.
            Review data completeness and pricing adequacy before deciding on
            targeted renewal actions.
          </p>
          <dl class="opportunity-metrics">
            <div>
              <dt>Latest observed gap</dt>
              <dd>
                {{
                  Number.isFinite(scenario.currentVariance)
                    ? `+${(scenario.currentVariance * 100).toFixed(1)} pp`
                    : '—'
                }}
              </dd>
            </div>
            <div>
              <dt>Scenario confidence</dt>
              <dd>{{ scenario.confidence }}</dd>
            </div>
          </dl>
          <p class="opportunity-card__caveat">
            Data-quality signals are a reason to validate the evidence, not
            proof of what caused the loss emergence.
          </p>
        </section>

        <section
          id="actions-needed"
          class="optimization-card actions-card"
          aria-labelledby="actions-heading"
        >
          <div class="optimization-card__heading">
            <div>
              <p class="optimization-kicker">REVIEW BEFORE DECIDING</p>
              <h2 id="actions-heading">Actions Needed</h2>
            </div>
            <span class="action-progress">{{ actionProgress }}</span>
          </div>
          <p class="actions-card__intro">
            Mark items as reviewed to track this working session. Progress
            does not change scenario results.
          </p>
          <ul class="action-list">
            <li v-for="action in scenario.actions" :key="action.id">
              <label class="action-item">
                <input
                  type="checkbox"
                  :checked="completedActions.has(action.id)"
                  @change="toggleAction(action.id, $event.target.checked)"
                />
                <span class="action-item__content">
                  <strong>{{ action.title }}</strong>
                  <span>{{ action.rationale }}</span>
                  <small>{{ action.owner }} · {{ action.timing }}</small>
                </span>
              </label>
            </li>
          </ul>
        </section>
      </div>

      <div class="optimization-main-column">
        <section
          id="optimization-targets"
          class="optimization-card targets-card"
          aria-labelledby="targets-heading"
        >
          <div class="optimization-card__heading targets-heading">
            <div>
              <p class="optimization-kicker">SCENARIO COMPARISON</p>
              <h2 id="targets-heading">Optimization Targets</h2>
            </div>
            <div class="projection-control" aria-label="Projection duration">
              <span>Projection</span>
              <div role="group" aria-label="Projection length">
                <button
                  v-for="months in [3, 6]"
                  :key="months"
                  type="button"
                  :aria-pressed="projectionMonths === months"
                  :class="{ 'is-selected': projectionMonths === months }"
                  @click="projectionMonths = months"
                >
                  {{ months }} months
                </button>
              </div>
            </div>
          </div>

          <div class="target-measures">
            <article
              v-for="measure in formattedMeasures"
              :key="measure.label"
              class="target-measure"
            >
              <span>{{ measure.label }}</span>
              <strong>{{ measure.value }}</strong>
              <small>{{ measure.detail }}</small>
            </article>
          </div>

          <div class="scenario-impact">
            <div>
              <span>Modeled loss difference over {{ scenario.projectionMonths }} months</span>
              <strong>{{ formatCurrency(scenario.modeledLossDifference) }}</strong>
              <small>
                Directional comparison with status quo; not guaranteed savings.
              </small>
            </div>
            <div class="rate-assumption">
              <label for="rate-adjustment">
                Assumed targeted rate adjustment
                <strong>{{ formatSignedPercent(scenario.rateAdjustment) }}</strong>
              </label>
              <input
                id="rate-adjustment"
                v-model.number="rateAdjustment"
                type="range"
                min="0"
                max="10"
                step="1"
                aria-describedby="rate-assumption-note"
              />
              <small id="rate-assumption-note">
                Applied to premium only; it does not increase modeled claim
                costs. Also assumes a
                {{ formatSignedPercent(scenario.retentionImpact) }} retention impact.
              </small>
            </div>
          </div>

          <div class="trend-heading">
            <div>
              <h3>Status Quo vs. Optimized</h3>
              <p>
                Observed history through {{ formatScenarioPeriod(scenario.latestPeriod) }};
                {{ scenario.projectionMonths }}-month illustrative projection thereafter.
              </p>
            </div>
            <span class="trend-period">
              {{ formatScenarioPeriod(scenario.projectionStart) }} –
              {{ formatScenarioPeriod(scenario.projectionEnd) }}
            </span>
          </div>

          <div class="trend-legend" aria-label="Chart legend">
            <span v-for="line in chart.lines" :key="line.key">
              <i :style="{ '--series-color': line.color }" aria-hidden="true"></i>
              {{ line.label }}
            </span>
          </div>
          <div class="scenario-chart-scroll">
            <svg
              class="scenario-chart"
              viewBox="0 0 790 270"
              role="img"
              :aria-label="`Observed and projected loss ratios for ${scenario.targetSegment}. Current actual ${formatPercent(scenario.actualLossRatio)}, expected ${formatPercent(scenario.expectedLossRatio)}, optimized scenario at the end of the projection ${formatPercent(scenario.projections.at(-1)?.optimizedLossRatio)}.`"
            >
              <g class="scenario-chart__grid">
                <line
                  v-for="tick in chart.ticks"
                  :key="tick.label"
                  :x1="chart.bounds.left"
                  :x2="chart.bounds.right"
                  :y1="tick.y"
                  :y2="tick.y"
                />
                <text
                  v-for="tick in chart.ticks"
                  :key="`label-${tick.label}`"
                  :x="chart.bounds.left - 10"
                  :y="tick.y + 4"
                  text-anchor="end"
                >
                  {{ tick.label }}
                </text>
              </g>
              <line
                class="scenario-chart__boundary"
                :x1="chart.historicalBoundary"
                :x2="chart.historicalBoundary"
                :y1="chart.bounds.top"
                :y2="chart.bounds.bottom"
              />
              <text
                class="scenario-chart__boundary-label"
                :x="chart.historicalBoundary + 7"
                :y="chart.bounds.top + 10"
              >
                PROJECTED
              </text>
              <polyline
                v-for="line in chart.lines"
                :key="line.key"
                :points="line.points"
                fill="none"
                :stroke="line.color"
                :stroke-dasharray="line.dash"
                stroke-linecap="round"
                stroke-linejoin="round"
                :stroke-width="line.key === 'optimized' ? 3 : 2"
              />
              <g class="scenario-chart__labels">
                <text
                  v-for="point in chart.labels.filter(({ show }) => show)"
                  :key="point.key"
                  :x="point.x"
                  :y="chart.bounds.bottom + 22"
                  text-anchor="middle"
                >
                  {{ point.label }}
                </text>
              </g>
            </svg>
          </div>
          <p class="chart-note">
            Scenario assumes gradual improvement from targeted review and
            disciplined follow-up. It is not a validated predictive model.
          </p>
        </section>

        <section
          id="supporting-data"
          class="optimization-card supporting-card"
          aria-labelledby="supporting-heading"
        >
          <div class="optimization-card__heading">
            <div>
              <p class="optimization-kicker">MODEL INPUTS &amp; LIMITATIONS</p>
              <h2 id="supporting-heading">Supporting Data &amp; Models</h2>
            </div>
            <span class="confidence-label">{{ scenario.confidence }} confidence</span>
          </div>

          <div class="supporting-grid">
            <div>
              <h3>Portfolio experience</h3>
              <p>
                {{ formatScenarioPeriod(scenario.historicalPeriod.start) }} –
                {{ formatScenarioPeriod(scenario.historicalPeriod.end) }} observed
                premium, incurred loss, and expected loss for
                {{ scenario.targetSegment }}.
              </p>
              <a href="#portfolio-intelligence">Review Portfolio Intelligence</a>
            </div>
            <div>
              <h3>Data quality context</h3>
              <p>
                Latest segment score:
                <strong>{{ scenario.dataQualityScore?.toFixed(1) ?? '—' }}%</strong>
                ({{ scenario.dataQualityStatus }}). Check completeness and
                timeliness before acting on the apparent trend.
              </p>
              <a href="#data-quality">Review Data Quality detail</a>
            </div>
            <div>
              <h3>Transparent assumptions</h3>
              <ul>
                <li>                Status quo holds the latest observed loss-cost ratio constant
                before the rate adjustment.</li>
                <li>
                  Optimized case closes a portion of the current variance over
                  time; no causal impact is inferred.
                </li>
                <li>
                  Rate adjustment changes premium only; the separate retention
                  assumption scales both premium and claim costs.
                </li>
              </ul>
            </div>
          </div>
          <p class="supporting-disclaimer">
            Synthetic data and illustrative calculations only. Validate source
            records and obtain underwriting and actuarial review before using
            any scenario for a portfolio decision. This experience does not
            represent a production optimization algorithm.
          </p>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.optimization-view {
  --optimization-border: #e2e8f0;
  --optimization-muted: #64748b;
  --optimization-ink: #0b1f4b;
  --optimization-blue: #2563eb;
  --optimization-surface: #fff;
  --optimization-radius: 0.75rem;
  width: 100%;
}

.optimization-heading,
.optimization-card__heading,
.targets-heading,
.trend-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.optimization-heading {
  margin-bottom: 1.25rem;
}

.optimization-eyebrow,
.optimization-kicker {
  color: var(--optimization-muted);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.optimization-heading h1 {
  margin-top: 0.3rem;
  font-size: clamp(1.7rem, 3vw, 2.15rem);
}

.optimization-heading__description {
  max-width: 52rem;
  margin-top: 0.55rem;
  color: var(--optimization-muted);
}

.optimization-scenario-badge,
.optimization-status,
.confidence-label {
  flex: 0 0 auto;
  padding: 0.38rem 0.65rem;
  border: 1px solid #bdd8f7;
  border-radius: 999px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 0.75rem;
  font-weight: 650;
}

.optimization-section-nav {
  display: flex;
  gap: 1.5rem;
  overflow-x: auto;
  margin-bottom: 1.25rem;
  border-bottom: 1px solid var(--optimization-border);
}

.optimization-section-nav a {
  flex: 0 0 auto;
  padding: 0.65rem 0;
  color: #475569;
  font-size: 0.875rem;
  font-weight: 550;
  text-decoration: none;
}

.optimization-section-nav a:hover,
.supporting-grid a {
  color: var(--optimization-blue);
}

.optimization-layout {
  display: grid;
  grid-template-columns: minmax(17rem, 0.82fr) minmax(0, 1.8fr);
  align-items: start;
  gap: 1.25rem;
}

.optimization-sidebar,
.optimization-main-column {
  display: grid;
  min-width: 0;
  gap: 1.25rem;
}

.optimization-card {
  min-width: 0;
  padding: clamp(1rem, 2vw, 1.4rem);
  border: 1px solid var(--optimization-border);
  border-radius: var(--optimization-radius);
  background: var(--optimization-surface);
  box-shadow: 0 1px 3px rgb(15 23 42 / 5%);
}

.optimization-card h2 {
  margin-top: 0.28rem;
  font-size: 1.12rem;
}

.opportunity-card__summary {
  margin-top: 1.1rem;
  color: #475569;
  font-size: 0.9rem;
}

.opportunity-metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin: 1rem 0;
  padding: 0;
}

.opportunity-metrics div {
  padding: 0.8rem;
  border-radius: 0.5rem;
  background: #f8fafc;
}

.opportunity-metrics dt {
  color: var(--optimization-muted);
  font-size: 0.75rem;
}

.opportunity-metrics dd {
  margin: 0.25rem 0 0;
  color: var(--optimization-ink);
  font-size: 1.25rem;
  font-weight: 700;
}

.opportunity-card__caveat,
.chart-note,
.supporting-disclaimer {
  color: var(--optimization-muted);
  font-size: 0.78rem;
}

.opportunity-card__caveat {
  padding-left: 0.75rem;
  border-left: 3px solid #f4bc68;
}

.action-progress {
  color: var(--optimization-muted);
  font-size: 0.75rem;
  white-space: nowrap;
}

.actions-card__intro {
  margin-top: 0.55rem;
  color: var(--optimization-muted);
  font-size: 0.82rem;
}

.action-list {
  display: grid;
  gap: 0.15rem;
  margin: 0.8rem 0 0;
  padding: 0;
  list-style: none;
}

.action-list li + li {
  border-top: 1px solid #eef2f6;
}

.action-item {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  padding: 0.8rem 0;
  cursor: pointer;
}

.action-item input {
  width: 1rem;
  height: 1rem;
  flex: 0 0 auto;
  margin: 0.2rem 0 0;
  accent-color: var(--optimization-blue);
}

.action-item__content {
  display: grid;
  gap: 0.22rem;
  min-width: 0;
}

.action-item__content strong {
  color: var(--optimization-ink);
  font-size: 0.85rem;
  font-weight: 650;
}

.action-item__content span,
.action-item__content small {
  color: var(--optimization-muted);
  font-size: 0.75rem;
  line-height: 1.4;
}

.action-item__content small {
  color: #475569;
  font-weight: 600;
}

.projection-control {
  display: grid;
  justify-items: end;
  gap: 0.35rem;
  color: var(--optimization-muted);
  font-size: 0.76rem;
}

.projection-control [role="group"] {
  display: flex;
  padding: 0.18rem;
  border: 1px solid var(--optimization-border);
  border-radius: 0.5rem;
  background: #f8fafc;
}

.projection-control button {
  padding: 0.35rem 0.55rem;
  border: 0;
  border-radius: 0.35rem;
  background: transparent;
  color: #475569;
  font-size: 0.75rem;
  cursor: pointer;
}

.projection-control button.is-selected {
  background: white;
  color: var(--optimization-blue);
  box-shadow: 0 1px 3px rgb(15 23 42 / 15%);
  font-weight: 650;
}

.target-measures {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.65rem;
  margin-top: 1.15rem;
}

.target-measure {
  display: grid;
  align-content: start;
  gap: 0.35rem;
  min-width: 0;
  padding: 0.75rem;
  border: 1px solid #e8edf3;
  border-radius: 0.55rem;
  background: #fbfdff;
}

.target-measure span,
.target-measure small {
  color: var(--optimization-muted);
  font-size: 0.7rem;
  line-height: 1.35;
}

.target-measure strong {
  color: var(--optimization-ink);
  font-size: 1.2rem;
  font-variant-numeric: tabular-nums;
}

.scenario-impact {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(14rem, 0.8fr);
  gap: 1rem;
  margin-top: 0.8rem;
  padding: 0.85rem 1rem;
  border: 1px solid #cfe7e5;
  border-radius: 0.6rem;
  background: #f2fbf9;
}

.scenario-impact > div:first-child {
  display: grid;
  align-content: center;
  gap: 0.2rem;
}

.scenario-impact span,
.scenario-impact small,
.rate-assumption label {
  color: #475569;
  font-size: 0.75rem;
}

.scenario-impact > div:first-child strong {
  color: #0f766e;
  font-size: 1.35rem;
  font-variant-numeric: tabular-nums;
}

.scenario-impact small {
  line-height: 1.4;
}

.rate-assumption {
  display: grid;
  gap: 0.35rem;
  padding-left: 1rem;
  border-left: 1px solid #cfe7e5;
}

.rate-assumption label {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
}

.rate-assumption label strong {
  color: var(--optimization-ink);
  font-variant-numeric: tabular-nums;
}

.rate-assumption input {
  width: 100%;
  accent-color: #0f766e;
}

.trend-heading {
  align-items: flex-end;
  margin-top: 1.4rem;
}

.trend-heading h3,
.supporting-grid h3 {
  color: var(--optimization-ink);
  font-size: 0.95rem;
}

.trend-heading p {
  margin-top: 0.25rem;
  color: var(--optimization-muted);
  font-size: 0.76rem;
}

.trend-period {
  color: var(--optimization-muted);
  font-size: 0.72rem;
  white-space: nowrap;
}

.trend-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem 1rem;
  margin-top: 1rem;
  color: #475569;
  font-size: 0.72rem;
}

.trend-legend span {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.trend-legend i {
  width: 1rem;
  height: 0.16rem;
  border-radius: 1rem;
  background: var(--series-color);
}

.scenario-chart-scroll {
  width: 100%;
  overflow-x: auto;
  margin-top: 0.45rem;
}

.scenario-chart {
  width: 100%;
  min-width: 38rem;
  overflow: visible;
}

.scenario-chart__grid line {
  stroke: #e8edf3;
  stroke-width: 1;
}

.scenario-chart__grid text,
.scenario-chart__labels text {
  fill: #64748b;
  font-family: inherit;
  font-size: 10px;
}

.scenario-chart__boundary {
  stroke: #94a3b8;
  stroke-dasharray: 3 4;
  stroke-width: 1;
}

.scenario-chart__boundary-label {
  fill: #64748b;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.chart-note {
  margin-top: 0.45rem;
}

.confidence-label {
  border-color: #cbd5e1;
  background: #f8fafc;
  color: #475569;
}

.supporting-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.supporting-grid > div {
  min-width: 0;
}

.supporting-grid p,
.supporting-grid li {
  margin-top: 0.4rem;
  color: #475569;
  font-size: 0.78rem;
  line-height: 1.5;
}

.supporting-grid a {
  display: inline-block;
  margin-top: 0.55rem;
  font-size: 0.78rem;
  font-weight: 600;
  text-decoration: none;
}

.supporting-grid a:hover {
  text-decoration: underline;
}

.supporting-grid ul {
  margin: 0;
  padding-left: 1rem;
}

.supporting-disclaimer {
  margin-top: 1rem;
  padding-top: 0.8rem;
  border-top: 1px solid #eef2f6;
  line-height: 1.5;
}

@media (max-width: 62rem) {
  .optimization-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .optimization-sidebar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }

  .target-measures {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 42rem) {
  .optimization-heading,
  .targets-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .optimization-scenario-badge {
    align-self: flex-start;
  }

  .optimization-sidebar,
  .supporting-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .scenario-impact {
    grid-template-columns: minmax(0, 1fr);
  }

  .rate-assumption {
    padding: 0.8rem 0 0;
    border-top: 1px solid #cfe7e5;
    border-left: 0;
  }

  .trend-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.35rem;
  }

  .opportunity-metrics {
    grid-template-columns: minmax(0, 1fr);
  }

  .optimization-card__heading:not(.targets-heading) {
    flex-wrap: wrap;
  }
}
</style>
