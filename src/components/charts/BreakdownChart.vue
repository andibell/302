<script setup>
import { computed } from 'vue'
import {
  breakdownMeasures,
  formatMetricValue,
} from '../../data/portfolioAnalytics.js'

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  dimensionLabel: {
    type: String,
    required: true,
  },
  rows: {
    type: Array,
    required: true,
  },
  measure: {
    type: String,
    required: true,
  },
  selectedValue: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:measure', 'select'])

const maxMagnitude = computed(() =>
  Math.max(
    0.0001,
    ...props.rows.map((row) => Math.abs(getValue(row))),
  ),
)

function getValue(row) {
  return props.measure === 'lossRatioGap'
    ? row.lossRatio !== null && row.expectedLossRatio !== null
      ? row.lossRatio - row.expectedLossRatio
      : 0
    : row[props.measure] ?? 0
}

function getUnit() {
  return props.measure === 'lossRatioGap' ? 'percent' : 'currency'
}

function displayValue(value) {
  if (props.measure === 'lossRatioGap') {
    const points = value * 100
    return `${points > 0 ? '+' : ''}${points.toFixed(1)} pp`
  }

  return formatMetricValue(value, getUnit(), true)
}
</script>

<template>
  <section class="breakdown-card">
    <header class="breakdown-card__header">
      <label>
        <span class="visually-hidden">{{ dimensionLabel }} breakdown metric</span>
        <select
          :value="measure"
          :aria-label="`${dimensionLabel} breakdown metric`"
          @change="emit('update:measure', $event.target.value)"
        >
          <option
            v-for="item in breakdownMeasures"
            :key="item.id"
            :value="item.id"
          >
            {{ item.label }}
          </option>
        </select>
      </label>
      <span class="breakdown-card__menu" aria-hidden="true">•••</span>
    </header>
    <p class="breakdown-card__caption">By {{ dimensionLabel }}</p>

    <ul v-if="rows.length" class="breakdown-list">
      <li v-for="row in rows" :key="row.label">
        <button
          class="breakdown-row"
          :class="{
            'is-selected': selectedValue === row.label,
            'is-adverse':
              measure === 'lossRatioGap' &&
              row.lossRatio > row.expectedLossRatio,
          }"
          type="button"
          :aria-pressed="selectedValue === row.label"
          :aria-label="`${row.label}: ${displayValue(getValue(row))}. Filter by ${dimensionLabel}.`"
          @click="emit('select', row.label)"
        >
          <span class="breakdown-row__label">{{ row.label }}</span>
          <span
            class="breakdown-row__track"
            aria-hidden="true"
          >
            <span
              class="breakdown-row__bar"
              :style="{ width: `${(Math.abs(getValue(row)) / maxMagnitude) * 100}%` }"
            ></span>
          </span>
          <span class="breakdown-row__value">
            {{ displayValue(getValue(row)) }}
          </span>
        </button>
      </li>
    </ul>
    <p v-else class="breakdown-empty">
      No {{ dimensionLabel.toLowerCase() }} observations for these filters.
    </p>
    <p class="breakdown-card__footnote">
      Values use the selected reporting period.
    </p>
  </section>
</template>

<style scoped>
.breakdown-card {
  min-width: 0;
  padding: 1.1rem;
  border: 1px solid #d9e3eb;
  border-radius: 0.8rem;
  background: white;
}

.breakdown-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.breakdown-card__header select {
  width: min(100%, 14.5rem);
  min-height: 2.4rem;
  padding: 0.45rem 0.6rem;
  border: 1px solid #d8e1e9;
  border-radius: 0.35rem;
  background: #fff;
  color: #607d98;
  font-size: 0.78rem;
}

.breakdown-card__header label {
  display: block;
  min-width: 0;
}

.breakdown-card__menu {
  color: #9db1c1;
  letter-spacing: 0.12em;
}

.breakdown-card h3 {
  margin-top: 1rem;
  color: #3e5a72;
  font-size: 0.9rem;
}

.breakdown-card__caption {
  margin-top: 0.15rem;
  color: #8aa0b2;
  font-size: 0.7rem;
}

.breakdown-list {
  display: grid;
  gap: 0.55rem;
  margin: 1.15rem 0 0;
  padding: 0;
  list-style: none;
}

.breakdown-row {
  display: grid;
  grid-template-columns: minmax(5rem, 1fr) minmax(3rem, 1.5fr) auto;
  align-items: center;
  width: 100%;
  gap: 0.55rem;
  padding: 0.12rem 0;
  border: 0;
  background: transparent;
  color: #607d98;
  text-align: left;
  cursor: pointer;
}

.breakdown-row__label {
  overflow: hidden;
  font-size: 0.72rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.breakdown-row__track {
  display: block;
  height: 1rem;
  overflow: hidden;
  background: #f0f4f7;
}

.breakdown-row__bar {
  display: block;
  height: 100%;
  min-width: 2px;
  background: #2563eb;
}

.breakdown-row.is-adverse .breakdown-row__bar {
  background: #14b8a6;
}

.breakdown-row.is-selected .breakdown-row__label {
  color: #0b1f4b;
  font-weight: 700;
}

.breakdown-row.is-selected .breakdown-row__track {
  outline: 2px solid #0b1f4b;
  outline-offset: 1px;
}

.breakdown-row__value {
  min-width: 3.1rem;
  color: #435b70;
  font-size: 0.66rem;
  font-weight: 600;
  text-align: right;
  white-space: nowrap;
}

.breakdown-empty {
  margin-top: 1.25rem;
  color: #607d98;
  font-size: 0.75rem;
}

.breakdown-card__footnote {
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid #dce5eb;
  color: #8196a8;
  font-size: 0.65rem;
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
</style>
