<script setup>
import { computed, ref } from 'vue'
import {
  aggregateQualityObservations,
  availableQualityPeriods,
  getLatestQualityPeriod,
  getQualityPeriodLabel,
  getQualityStatus,
  getRecentQualityFiles,
  qualityDimensions,
  dataQualityObservations,
} from '../data/dataQuality.js'

const emit = defineEmits(['open-quality'])

const latestPeriod = getLatestQualityPeriod()
const searchQuery = ref('')
const activeCollection = ref('all')
const activeLayout = ref('list')

const latestSummary = computed(() =>
  aggregateQualityObservations(allLatestQualityRows()),
)

const binderScore = computed(() => {
  if (!latestSummary.value.recordsExpected) return null
  return (
    (latestSummary.value.recordsReceived /
      latestSummary.value.recordsExpected) *
    100
  )
})

const qualityStatus = computed(() => getQualityStatus(latestSummary.value.overallScore))

const files = computed(() => {
  const recent = getRecentQualityFiles({ period: latestPeriod })
  const previousPeriod = availableQualityPeriods.at(-2)
  const prior = previousPeriod
    ? getRecentQualityFiles({ period: previousPeriod })
    : []
  const allFiles = [...recent, ...prior]
  const favorites = allFiles.filter((file) =>
    file.lineOfBusiness === 'Small Business Property' ||
    file.lineOfBusiness === 'Commercial Property',
  )
  const collection =
    activeCollection.value === 'favorites' ? favorites : allFiles
  const query = searchQuery.value.trim().toLowerCase()

  return query
    ? collection.filter(
        (file) =>
          file.name.toLowerCase().includes(query) ||
          file.lineOfBusiness.toLowerCase().includes(query),
      )
    : collection
})

const dimensionSummaries = computed(() => {
  const rows = allLatestQualityRows()
  const summary = aggregateQualityObservations(rows)
  return qualityDimensions.map((dimension) => ({
    ...dimension,
    score: summary.dimensions[dimension.id],
  }))
})

function allLatestQualityRows() {
  return dataQualityObservations.filter((row) => row.period === latestPeriod)
}

function scoreStyle(score) {
  return {
    '--score-angle': `${Math.max(0, Math.min(100, score ?? 0)) * 2.7}deg`,
  }
}

function formatScore(score) {
  return Number.isFinite(score) ? `${score.toFixed(1)}%` : '—'
}

function formatShortPeriod(period) {
  return getQualityPeriodLabel(period)
}

function fileDate(period) {
  return `${formatShortPeriod(period)}`
}

function fileScoreStatus(status) {
  if (status === 'Healthy') return 'status--healthy'
  if (status === 'Monitor') return 'status--monitor'
  return 'status--attention'
}
</script>

<template>
  <div class="data-view">
    <aside class="data-score-rail" aria-label="Portfolio data quality summaries">
      <section class="data-score-card">
        <header class="score-card-heading">
          <span>Data Quality</span>
          <span class="status-pill" :class="qualityStatus === 'Healthy' ? 'status--healthy' : 'status--monitor'">
            {{ qualityStatus }}
          </span>
        </header>
        <div
          class="score-gauge"
          :style="scoreStyle(latestSummary.overallScore)"
          role="img"
          :aria-label="`Overall data quality ${formatScore(latestSummary.overallScore)}, ${qualityStatus}`"
        >
          <div class="score-gauge__center">
            <strong>{{ formatScore(latestSummary.overallScore) }}</strong>
          </div>
        </div>
        <p class="score-card-period">LATEST REPORTING PERIOD</p>
        <p class="score-card-period__date">{{ formatShortPeriod(latestPeriod) }}</p>
        <dl class="score-dimensions">
          <div v-for="dimension in dimensionSummaries" :key="dimension.id">
            <dt>{{ dimension.label }}</dt>
            <dd>{{ formatScore(dimension.score) }}</dd>
          </div>
        </dl>
        <button class="data-outline-button" type="button" @click="emit('open-quality')">
          Explore <span aria-hidden="true">›</span>
        </button>
      </section>

      <section class="data-score-card binder-card">
        <header class="score-card-heading">
          <span>Binder Controls</span>
          <span class="status-pill status--healthy">On track</span>
        </header>
        <div
          class="score-gauge score-gauge--binder"
          :style="scoreStyle(binderScore)"
          role="img"
          :aria-label="`Records received ${formatScore(binderScore)} of expected records`"
        >
          <div class="score-gauge__center">
            <strong>{{ formatScore(binderScore) }}</strong>
          </div>
        </div>
        <p class="binder-card__caption">
          {{ latestSummary.recordsReceived.toLocaleString() }} of
          {{ latestSummary.recordsExpected.toLocaleString() }} expected records received
        </p>
        <div class="binder-card__detail">
          <span>Records requiring follow-up</span>
          <strong>{{ latestSummary.missingFields.toLocaleString() }}</strong>
        </div>
        <button class="data-outline-button" type="button" @click="emit('open-quality')">
          Explore <span aria-hidden="true">›</span>
        </button>
      </section>
    </aside>

    <section class="data-library" aria-label="Portfolio data files">
      <div class="data-library__toolbar">
        <div class="collection-tabs" role="tablist" aria-label="File collection">
          <button
            type="button"
            role="tab"
            :aria-selected="activeCollection === 'all'"
            :class="{ 'is-active': activeCollection === 'all' }"
            @click="activeCollection = 'all'"
          >
            All Data
          </button>
          <button
            type="button"
            role="tab"
            :aria-selected="activeCollection === 'favorites'"
            :class="{ 'is-active': activeCollection === 'favorites' }"
            @click="activeCollection = 'favorites'"
          >
            Favorites
          </button>
        </div>
        <div class="data-library__actions">
          <label class="data-search">
            <span class="visually-hidden">Search data files</span>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <circle cx="8.5" cy="8.5" r="5.5" />
              <path d="m13 13 4 4" />
            </svg>
            <input v-model="searchQuery" type="search" placeholder="Search docs" />
          </label>
          <div class="layout-toggle" role="group" aria-label="File layout">
            <button
              type="button"
              :aria-pressed="activeLayout === 'list'"
              aria-label="List view"
              @click="activeLayout = 'list'"
            >☷</button>
            <button
              type="button"
              :aria-pressed="activeLayout === 'grid'"
              aria-label="Grid view"
              @click="activeLayout = 'grid'"
            >▦</button>
          </div>
          <button
            class="data-new-button"
            type="button"
            disabled
            title="File upload is outside the scope of this prototype"
          >
            <span aria-hidden="true">＋</span> New
          </button>
        </div>
      </div>

      <div class="data-library__content">
        <header class="recent-heading">
          <h1>Recent</h1>
          <span>{{ getQualityPeriodLabel(latestPeriod) }}</span>
        </header>
        <div class="recent-files">
          <button
            v-for="file in getRecentQualityFiles({ period: latestPeriod })"
            :key="file.id"
            class="recent-file"
            type="button"
            @click="emit('open-quality', file.lineOfBusiness)"
          >
            <span class="recent-file__name">{{ file.name }}</span>
            <span class="recent-file__meta">
              {{ file.lineOfBusiness }} · Quality {{ formatScore(file.score) }}
            </span>
          </button>
        </div>

        <div class="file-list-heading">
          <h2>{{ activeCollection === 'all' ? 'All' : 'Favorites' }}</h2>
          <span>{{ files.length }} files</span>
        </div>
        <div v-if="files.length" class="file-table-scroll" tabindex="0" aria-label="Portfolio file list; scroll horizontally to view all details">
          <table class="file-table" :class="{ 'file-table--grid': activeLayout === 'grid' }">
            <caption class="visually-hidden">
              Synthetic portfolio data files, reporting period, record counts, quality scores, and validation status.
            </caption>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Portfolio Segment</th>
                <th scope="col">Reporting Period</th>
                <th scope="col">Records</th>
                <th scope="col">Quality</th>
                <th scope="col">Status</th>
                <th scope="col">Details</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="file in files" :key="file.id">
                <th scope="row">
                  <span class="file-icon" aria-hidden="true">▧</span>
                  {{ file.name }}
                </th>
                <td>{{ file.lineOfBusiness }}</td>
                <td>{{ fileDate(file.period) }}</td>
                <td>
                  {{ file.recordsReceived.toLocaleString() }} /
                  {{ file.recordsExpected.toLocaleString() }}
                </td>
                <td>{{ formatScore(file.score) }}</td>
                <td>
                  <span class="status-pill" :class="fileScoreStatus(file.status)">
                    {{ file.status }}
                  </span>
                  <span v-if="file.exceptionCount" class="exception-count">
                    {{ file.exceptionCount }} review items
                  </span>
                </td>
                <td>
                  <button
                    class="file-detail-link"
                    type="button"
                    :aria-label="`View data quality for ${file.lineOfBusiness}`"
                    @click="emit('open-quality', file.lineOfBusiness)"
                  >
                    Explore
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="file-empty" role="status">
          No files match “{{ searchQuery }}”. Try another search.
        </p>
      </div>

      <p class="data-story-note">
        The Small Business Property quality signal is a reason to validate supporting records;
        it does not establish a cause for the segment’s performance result.
      </p>
    </section>
  </div>
</template>

<style scoped>
.data-view {
  display: grid;
  grid-template-columns: minmax(17rem, 0.29fr) minmax(0, 1fr);
  align-items: start;
  gap: 2rem;
  min-width: 0;
  color: #263745;
}

.data-score-rail {
  display: grid;
  gap: 2rem;
}

.data-score-card,
.data-library {
  min-width: 0;
  border-radius: 0.9rem;
  background: white;
  box-shadow: 0 12px 26px rgb(22 43 63 / 7%);
}

.data-score-card {
  display: grid;
  justify-items: center;
  padding: 1.4rem 1.5rem 1.5rem;
}

.score-card-heading {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  color: #607d98;
  font-size: 0.7rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.status-pill {
  display: inline-flex;
  min-height: 1.55rem;
  align-items: center;
  justify-content: center;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 650;
  letter-spacing: 0;
  text-transform: none;
  white-space: nowrap;
}

.status--healthy {
  background: #e6f4eb;
  color: #18764a;
}

.status--monitor {
  background: #fff0e7;
  color: #a64b18;
}

.status--attention {
  background: #fde9ec;
  color: #ae2340;
}

.score-gauge {
  display: grid;
  width: 10.5rem;
  aspect-ratio: 1;
  place-items: center;
  margin-top: 1.1rem;
  border-radius: 50%;
  background: conic-gradient(
    from 225deg,
    #dc294a 0deg,
    #ef8d45 80deg,
    #52bd85 var(--score-angle),
    #e8eef2 var(--score-angle),
    #e8eef2 270deg,
    transparent 270deg
  );
  clip-path: polygon(0 0, 100% 0, 100% 75%, 50% 100%, 0 75%);
}

.score-gauge__center {
  display: grid;
  width: 76%;
  aspect-ratio: 1;
  place-items: center;
  margin-top: 18%;
  border-radius: 50%;
  background: white;
}

.score-gauge__center strong {
  margin-top: -10%;
  color: #263745;
  font-size: 1.65rem;
  font-variant-numeric: tabular-nums;
}

.score-gauge--binder {
  background: conic-gradient(
    from 225deg,
    #52bd85 0deg,
    #52bd85 var(--score-angle),
    #e8eef2 var(--score-angle),
    #e8eef2 225deg,
    #e8eef2 270deg,
    transparent 270deg
  );
}

.score-card-period {
  margin-top: 0.8rem;
  color: #607d98;
  font-size: 0.7rem;
}

.score-card-period__date {
  margin-top: 0.2rem;
  color: #263745;
  font-size: 0.78rem;
  font-weight: 600;
}

.score-dimensions {
  display: grid;
  width: 100%;
  gap: 0.55rem;
  margin: 1.1rem 0;
}

.score-dimensions div,
.binder-card__detail {
  display: flex;
  justify-content: space-between;
  gap: 0.7rem;
  color: #607d98;
  font-size: 0.72rem;
}

.score-dimensions dd {
  color: #263745;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}

.data-outline-button {
  display: inline-flex;
  min-height: 2rem;
  align-items: center;
  gap: 0.35rem;
  justify-self: center;
  padding: 0.35rem 0.7rem;
  border: 1px solid #d7e1e9;
  border-radius: 0.4rem;
  background: white;
  color: #2563eb;
  font-size: 0.73rem;
  cursor: pointer;
}

.data-outline-button span {
  font-size: 1.15rem;
  line-height: 0.8;
}

.binder-card__caption {
  max-width: 14rem;
  margin: 0.9rem 0;
  color: #607d98;
  font-size: 0.72rem;
  text-align: center;
}

.binder-card__detail {
  width: 100%;
  margin: 0.45rem 0 1rem;
}

.binder-card__detail strong {
  color: #a64b18;
}

.data-library {
  padding: 1.1rem 1.25rem 1.35rem;
  box-shadow: none;
}

.data-library__toolbar,
.data-library__actions,
.collection-tabs,
.layout-toggle {
  display: flex;
  align-items: center;
}

.data-library__toolbar {
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 2rem;
}

.collection-tabs {
  flex: 0 0 auto;
  gap: 0.35rem;
}

.collection-tabs button {
  min-height: 2rem;
  padding: 0.35rem 0.9rem;
  border: 0;
  border-radius: 0.45rem;
  background: transparent;
  color: #607d98;
  font-size: 0.75rem;
  cursor: pointer;
}

.collection-tabs button.is-active {
  background: #211064;
  color: white;
}

.data-library__actions {
  min-width: 0;
  gap: 0.55rem;
}

.data-search {
  display: flex;
  width: min(18rem, 28vw);
  min-height: 2.4rem;
  align-items: center;
  gap: 0.45rem;
  padding-inline: 0.6rem;
  border-radius: 0.4rem;
  background: #e8eef2;
  color: #607d98;
}

.data-search svg {
  width: 0.95rem;
  flex: 0 0 auto;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-width: 1.7;
}

.data-search input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #263745;
  font-size: 0.75rem;
}

.layout-toggle {
  gap: 0.15rem;
}

.layout-toggle button {
  width: 2rem;
  height: 2rem;
  border: 0;
  background: transparent;
  color: #2563eb;
  font-size: 1.2rem;
  cursor: pointer;
}

.layout-toggle button[aria-pressed='true'] {
  color: #211064;
}

.data-new-button {
  min-height: 2.2rem;
  padding: 0.35rem 0.7rem;
  border: 0;
  border-radius: 0.4rem;
  background: #1200ef;
  color: white;
  font-size: 0.75rem;
}

.data-new-button:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.data-library__content {
  padding: 0.2rem 0.15rem;
}

.recent-heading,
.file-list-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.7rem;
  margin-bottom: 0.9rem;
}

.recent-heading h1,
.file-list-heading h2 {
  color: #607d98;
  font-size: 0.9rem;
  font-weight: 500;
}

.recent-heading span,
.file-list-heading span {
  color: #8196a8;
  font-size: 0.7rem;
}

.recent-files {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.8rem;
  margin-bottom: 2rem;
}

.recent-file {
  display: grid;
  min-width: 0;
  gap: 0.25rem;
  padding: 0.8rem;
  border: 1px solid #cbd9e3;
  border-radius: 0.45rem;
  background: #fff;
  text-align: left;
  cursor: pointer;
}

.recent-file__name {
  overflow: hidden;
  color: #263745;
  font-size: 0.75rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-file__meta {
  overflow: hidden;
  color: #607d98;
  font-size: 0.66rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-table-scroll {
  max-width: 100%;
  overflow: auto;
  overscroll-behavior-inline: contain;
}

.file-table {
  width: 100%;
  min-width: 790px;
  border-collapse: collapse;
  font-size: 0.69rem;
}

.file-table th,
.file-table td {
  padding: 0.72rem 0.55rem;
  border-bottom: 1px solid #dce5eb;
  color: #435b70;
  text-align: left;
  white-space: nowrap;
}

.file-table thead th {
  color: #607d98;
  font-size: 0.65rem;
  font-weight: 500;
}

.file-table tbody th {
  color: #354b5e;
  font-weight: 500;
}

.file-icon {
  margin-right: 0.5rem;
  color: #94aebe;
}

.file-table .status-pill {
  min-height: 1.3rem;
  font-size: 0.62rem;
}

.exception-count {
  display: block;
  margin-top: 0.2rem;
  color: #a64b18;
  font-size: 0.61rem;
}

.file-detail-link {
  padding: 0.25rem 0.4rem;
  border: 1px solid #d7e1e9;
  border-radius: 0.3rem;
  background: white;
  color: #2563eb;
  font-size: 0.65rem;
  cursor: pointer;
}

.file-table--grid tbody {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.6rem;
  padding-top: 0.6rem;
}

.file-table--grid tbody tr {
  display: grid;
  gap: 0.2rem;
  padding: 0.7rem;
  border: 1px solid #dce5eb;
  border-radius: 0.45rem;
  background: white;
}

.file-table--grid tbody th,
.file-table--grid tbody td {
  padding: 0.15rem 0;
  border: 0;
  white-space: normal;
}

.file-empty {
  padding: 1.5rem;
  color: #607d98;
  font-size: 0.8rem;
  text-align: center;
}

.data-story-note {
  margin-top: 1.2rem;
  padding: 0.75rem;
  border-left: 3px solid #14b8a6;
  background: #f5f8fa;
  color: #526d84;
  font-size: 0.7rem;
  line-height: 1.5;
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
  .data-view {
    grid-template-columns: minmax(14rem, 0.4fr) minmax(0, 1fr);
    gap: 1rem;
  }

  .data-library__toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .data-library__actions {
    width: 100%;
  }

  .data-search {
    width: auto;
    flex: 1;
  }
}

@media (max-width: 650px) {
  .data-view {
    grid-template-columns: minmax(0, 1fr);
  }

  .data-score-rail {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
  }

  .data-score-card {
    padding: 1rem;
  }

  .score-card-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .score-gauge {
    width: min(9rem, 100%);
  }

  .data-library {
    padding: 1rem;
  }

  .data-library__actions {
    flex-wrap: wrap;
  }
}

@media (max-width: 420px) {
  .data-score-rail {
    grid-template-columns: minmax(0, 1fr);
  }

  .data-score-card {
    justify-items: stretch;
  }

  .score-card-heading {
    align-items: center;
    flex-direction: row;
  }

  .score-gauge {
    justify-self: center;
  }

  .recent-files,
  .file-table--grid tbody {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
