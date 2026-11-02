<script setup>
import { computed, useId } from 'vue'

const props = defineProps({
  score: {
    type: Number,
    default: null,
  },
  status: {
    type: String,
    required: true,
  },
  variant: {
    type: String,
    default: 'standard',
    validator: (value) => ['quality', 'standard'].includes(value),
  },
  accessibleLabel: {
    type: String,
    required: true,
  },
})

const radius = 53
const circumference = 2 * Math.PI * radius
const gradientId = `circular-score-gradient-${useId()}`
const normalizedScore = computed(() =>
  Number.isFinite(props.score)
    ? Math.max(0, Math.min(100, props.score))
    : 0,
)
const progressOffset = computed(
  () => circumference * (1 - normalizedScore.value / 100),
)
const displayScore = computed(() =>
  Number.isFinite(props.score) ? `${props.score.toFixed(1)}%` : '—',
)
const semanticColor = computed(() => {
  const statusColors = {
    Healthy: 'var(--color-success)',
    'On track': 'var(--color-success)',
    Monitor: 'var(--color-warning)',
    'Needs attention': 'var(--color-critical)',
    Unavailable: 'var(--color-neutral-300)',
  }

  return statusColors[props.status] ?? 'var(--color-neutral-300)'
})
</script>

<template>
  <svg
    class="circular-score"
    viewBox="0 0 120 120"
    role="img"
    :aria-label="accessibleLabel"
  >
    <defs v-if="variant === 'quality'">
      <linearGradient
        :id="gradientId"
        x1="0%"
        y1="0%"
        x2="0%"
        y2="100%"
        gradientTransform="rotate(90 0.5 0.5)"
      >
        <stop offset="0%" stop-color="#dc294a" />
        <stop offset="50%" stop-color="#ef8d45" />
        <stop offset="100%" stop-color="#52bd85" />
      </linearGradient>
    </defs>
    <circle
      class="circular-score__track"
      cx="60"
      cy="60"
      :r="radius"
    />
    <circle
      class="circular-score__progress"
      cx="60"
      cy="60"
      :r="radius"
      :stroke="variant === 'quality' ? `url(#${gradientId})` : semanticColor"
      :stroke-dasharray="`${circumference} ${circumference}`"
      :stroke-dashoffset="progressOffset"
      transform="rotate(-90 60 60)"
    />
    <text
      class="circular-score__value"
      x="60"
      y="60"
      text-anchor="middle"
      dominant-baseline="middle"
    >
      {{ displayScore }}
    </text>
  </svg>
</template>

<style scoped>
.circular-score {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 1;
}

.circular-score__track,
.circular-score__progress {
  fill: none;
  stroke-width: 14;
  stroke-linecap: round;
}

.circular-score__track {
  stroke: #e8eef2;
}

.circular-score__value {
  fill: #263745;
  font-size: 18px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
</style>
