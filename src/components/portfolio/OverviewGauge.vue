<script setup>
import { computed } from 'vue'

const props = defineProps({
  value: {
    type: Number,
    required: true,
  },
  tone: {
    type: String,
    default: 'positive',
  },
})

const progress = computed(() => Math.min(1, Math.max(0, props.value / 100)))
const dashOffset = computed(() => 157 * (1 - progress.value))
const needleRotation = computed(() => -90 + progress.value * 180)
</script>

<template>
  <svg
    class="overview-gauge"
    :class="`overview-gauge--${tone}`"
    viewBox="0 0 120 70"
    aria-hidden="true"
  >
    <path
      class="overview-gauge__track"
      d="M 10 60 A 50 50 0 0 1 110 60"
      pathLength="157"
    />
    <path
      class="overview-gauge__progress"
      d="M 10 60 A 50 50 0 0 1 110 60"
      pathLength="157"
      stroke-dasharray="157"
      :stroke-dashoffset="dashOffset"
    />
    <g :transform="`rotate(${needleRotation} 60 60)`">
      <line class="overview-gauge__needle" x1="60" y1="60" x2="60" y2="23" />
      <circle class="overview-gauge__pivot" cx="60" cy="60" r="4" />
    </g>
    <circle
      class="overview-gauge__marker"
      :cx="10 + progress * 100"
      cy="60"
      r="5"
    />
  </svg>
</template>

<style scoped>
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
  stroke: #15803d;
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
  stroke: #15803d;
  stroke-width: 4;
}

.overview-gauge--warning .overview-gauge__marker {
  stroke: #f47839;
}
</style>
