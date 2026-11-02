<script setup>
import { computed, ref } from 'vue'
import { formatMetricValue } from '../../data/portfolioAnalytics.js'

const props = defineProps({
  chartId: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  points: {
    type: Array,
    required: true,
  },
  series: {
    type: Array,
    required: true,
  },
  unit: {
    type: String,
    required: true,
  },
})

const plot = { left: 72, right: 704, top: 24, bottom: 214 }
const hoveredIndex = ref(null)

const values = computed(() =>
  props.points.flatMap((point) =>
    props.series
      .map((series) => point[series.key])
      .filter((value) => Number.isFinite(value)),
  ),
)

const maximum = computed(() => {
  const max = Math.max(0, ...values.value)
  if (props.unit === 'percent') {
    return Math.max(0.1, Math.ceil(max * 10) / 10)
  }
  if (max === 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(max))
  return Math.ceil(max / magnitude / 4) * 4 * magnitude
})

const ticks = computed(() =>
  Array.from({ length: 5 }, (_, index) => (maximum.value * index) / 4),
)

const x = (index) =>
  props.points.length <= 1
    ? (plot.left + plot.right) / 2
    : plot.left +
      (index * (plot.right - plot.left)) / (props.points.length - 1)

const y = (value) =>
  plot.bottom - (value / maximum.value) * (plot.bottom - plot.top)

const linePaths = computed(() =>
  props.series.map((series) => ({
    ...series,
    d: props.points
      .map((point, index) => {
        const value = point[series.key]
        if (!Number.isFinite(value)) return null
        return `${index ? 'L' : 'M'} ${x(index).toFixed(2)} ${y(value).toFixed(2)}`
      })
      .filter(Boolean)
      .join(' '),
  })),
)

const dateLabels = computed(() => {
  if (!props.points.length) return []
  const count = Math.min(6, props.points.length)
  const indices = new Set(
    Array.from({ length: count }, (_, index) =>
      count === 1
        ? 0
        : Math.round((index * (props.points.length - 1)) / (count - 1)),
    ),
  )

  return [...indices].map((index) => ({
    index,
    label: props.points[index].label,
  }))
})

const activePoint = computed(() =>
  hoveredIndex.value === null
    ? null
    : props.points[hoveredIndex.value] ?? null,
)

const activePointText = computed(() => {
  if (!activePoint.value) return ''

  const valuesText = props.series
    .map(
      (series) =>
        `${series.name}: ${formatMetricValue(
          activePoint.value[series.key],
          props.unit,
        )}`,
    )
    .join(' · ')

  return `${activePoint.value.label}: ${valuesText}`
})

function pointLabel(point, index) {
  const valuesText = props.series
    .map(
      (series) =>
        `${series.name} ${formatMetricValue(point[series.key], props.unit)}`,
    )
    .join(', ')

  return `${point.label}. ${valuesText}. Data point ${index + 1} of ${props.points.length}.`
}
</script>

<template>
  <section class="trend-card" :aria-labelledby="`${chartId}-heading`">
    <header class="trend-card__header">
      <div>
        <h3 :id="`${chartId}-heading`">{{ title }}</h3>
        <p>{{ description }}</p>
      </div>
      <span class="trend-card__menu" aria-hidden="true">•••</span>
    </header>

    <p class="trend-card__summary">{{ description }}</p>

    <svg
      class="trend-chart"
      viewBox="0 0 720 286"
      role="group"
      :aria-label="`${title} time-series chart`"
      @pointerleave="hoveredIndex = null"
    >
      <g v-for="tick in ticks" :key="tick">
        <line
          class="trend-chart__grid"
          :x1="plot.left"
          :x2="plot.right"
          :y1="y(tick)"
          :y2="y(tick)"
        />
        <text
          class="trend-chart__axis-label"
          :x="plot.left - 10"
          :y="y(tick) + 4"
          text-anchor="end"
        >
          {{ formatMetricValue(tick, unit, true) }}
        </text>
      </g>

      <path
        v-for="line in linePaths"
        :key="line.key"
        class="trend-chart__line"
        :class="line.className"
        :d="line.d"
        :stroke-dasharray="line.dash ? '6 5' : undefined"
      />

      <g
        v-for="(point, index) in points"
        :key="point.period"
        class="trend-chart__point"
      >
        <circle
          v-if="Number.isFinite(point[series[0]?.key])"
          :cx="x(index)"
          :cy="y(point[series[0].key])"
          r="4.25"
          class="trend-chart__dot trend-chart__dot--actual"
          tabindex="0"
          role="img"
          :aria-label="pointLabel(point, index)"
          @focus="hoveredIndex = index"
          @blur="hoveredIndex = null"
          @pointerenter="hoveredIndex = index"
        >
          <title>{{ pointLabel(point, index) }}</title>
        </circle>
        <circle
          v-if="
            series[1] && Number.isFinite(point[series[1].key])
          "
          :cx="x(index)"
          :cy="y(point[series[1].key])"
          r="3.25"
          class="trend-chart__dot trend-chart__dot--expected"
          aria-hidden="true"
        />
      </g>

      <g v-for="label in dateLabels" :key="label.index">
        <text
          class="trend-chart__axis-label trend-chart__date-label"
          :x="x(label.index)"
          y="236"
          text-anchor="middle"
        >
          {{ label.label }}
        </text>
      </g>

      <g
        v-for="(line, index) in linePaths"
        :key="`legend-${line.key}`"
        class="trend-chart__legend"
        :transform="`translate(${plot.left + index * 205} 270)`"
      >
        <line
          x1="0"
          x2="24"
          y1="0"
          y2="0"
          :class="line.className"
          :stroke-dasharray="line.dash ? '5 4' : undefined"
        />
        <text x="32" y="4">{{ line.name }}</text>
      </g>
    </svg>

    <p class="trend-card__point-detail" aria-live="polite">
      {{ activePointText || 'Focus a data point to hear its values.' }}
    </p>
  </section>
</template>

<style scoped>
.trend-card {
  min-width: 0;
  padding: clamp(1rem, 1.5vw, 1.5rem);
  border: 1px solid #e7edf1;
  border-radius: 0.9rem;
  background: #fff;
  box-shadow: 0 10px 24px rgb(22 43 63 / 7%);
}

.trend-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.trend-card__header h3 {
  color: #355069;
  font-size: 0.92rem;
  font-weight: 650;
}

.trend-card__header p {
  margin-top: 0.25rem;
  color: #7a91a5;
  font-size: 0.72rem;
}

.trend-card__menu {
  color: #9db1c1;
  font-size: 0.8rem;
  letter-spacing: 0.15em;
}

.trend-card__summary {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  clip-path: inset(50%);
}

.trend-chart {
  width: 100%;
  margin-top: 0.8rem;
  overflow: visible;
}

.trend-chart__grid {
  stroke: #edf2f5;
  stroke-width: 1;
}

.trend-chart__axis-label {
  fill: #8196a8;
  font-size: 11px;
}

.trend-chart__date-label {
  font-size: 10px;
}

.trend-chart__line,
.trend-chart__legend line {
  fill: none;
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.trend-chart__line--actual,
.trend-chart__legend line.trend-chart__line--actual {
  stroke: #2563eb;
}

.trend-chart__line--expected,
.trend-chart__legend line.trend-chart__line--expected {
  stroke: #14b8a6;
}

.trend-chart__dot--actual {
  fill: #fff;
  stroke: #2563eb;
  stroke-width: 2.5;
  cursor: crosshair;
}

.trend-chart__dot--actual:focus-visible {
  outline: none;
  stroke: #0b1f4b;
  stroke-width: 4;
}

.trend-chart__dot--expected {
  fill: #14b8a6;
  stroke: white;
  stroke-width: 1.5;
}

.trend-chart__legend line {
  stroke-width: 3;
}

.trend-chart__legend text {
  fill: #526d84;
  font-size: 11px;
}

.trend-card__point-detail {
  min-height: 1.15rem;
  margin-top: 0.05rem;
  color: #607d98;
  font-size: 0.7rem;
}

@media (max-width: 600px) {
  .trend-chart {
    margin-top: 0.45rem;
  }

  .trend-chart__axis-label {
    font-size: 20px;
  }

  .trend-chart__date-label {
    font-size: 18px;
  }

  .trend-chart__legend text {
    font-size: 18px;
  }
}
</style>
