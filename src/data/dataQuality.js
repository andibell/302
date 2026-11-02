import {
  calculateOverallQualityScore,
  getQualityStatus,
  qualityDimensions,
  qualityWeights,
} from './qualityMetrics.js'
import { getAvailablePortfolioPeriods } from './portfolioAnalytics.js'
import {
  filterPortfolioObservations,
  portfolioObservations,
} from './overview.js'

const periods = getAvailablePortfolioPeriods()
const periodIndexById = new Map(periods.map((period, index) => [period, index]))

export const dataQualityObservations = portfolioObservations.map((row) => {
  const index = periodIndexById.get(row.period) ?? 0
  const scores = Object.fromEntries(
    qualityDimensions.map(({ id }) => [id, row[id]]),
  )
  const recordsExpected = Math.max(1, row.policyCount + row.claimCount)
  const completeness = scores.completenessScore / 100
  const recordsReceived = Math.round(recordsExpected * completeness)
  const missingFields = Math.max(
    0,
    Math.round(((100 - scores.completenessScore) / 100) * recordsExpected),
  )
  const delayedSubmission = 100 - scores.timelinessScore

  return {
    period: row.period,
    lineOfBusiness: row.lineOfBusiness,
    subproduct: row.subproduct,
    region: row.region,
    sourceFile: `${row.lineOfBusiness.replaceAll(' ', '_')}_${row.period}.csv`,
    reportingEntity: `${row.lineOfBusiness} Program Office`,
    recordsExpected,
    recordsReceived,
    missingFields,
    lateRecords: Math.round((delayedSubmission / 100) * recordsExpected),
    duplicateRecords:
      row.lineOfBusiness === 'Small Business Property' && index >= 22
        ? index - 21
        : 0,
    ...scores,
    overallQualityScore: row.dataQualityScore,
    status: getQualityStatus(row.dataQualityScore),
  }
})

const anomalySeeds = [
  {
    id: 'sbp-late-claims-apr',
    period: '2026-04',
    lineOfBusiness: 'Small Business Property',
    subproduct: 'Small Commercial Property',
    region: 'West',
    observation: 'Claims records submitted after the reporting deadline',
    dimension: 'Timeliness',
    affectedRecords: 9,
    severity: 'Moderate',
    followUp: 'Reconcile the delayed submission with the reporting calendar.',
  },
  {
    id: 'sbp-missing-loss-date-may',
    period: '2026-05',
    lineOfBusiness: 'Small Business Property',
    subproduct: 'Businessowners Policy',
    region: 'Central',
    observation: 'Loss date is missing from several claim records',
    dimension: 'Completeness',
    affectedRecords: 12,
    severity: 'Moderate',
    followUp: 'Request corrected loss-date attributes from the source file.',
  },
  {
    id: 'sbp-location-jun',
    period: '2026-06',
    lineOfBusiness: 'Small Business Property',
    subproduct: 'Small Commercial Property',
    region: 'West',
    observation: 'Property-location attributes are incomplete',
    dimension: 'Completeness',
    affectedRecords: 14,
    severity: 'Moderate',
    followUp: 'Validate the location fields before relying on segment-level detail.',
  },
  {
    id: 'sbp-duplicate-claims-jun',
    period: '2026-06',
    lineOfBusiness: 'Small Business Property',
    subproduct: 'Businessowners Policy',
    region: 'Northeast',
    observation: 'Potential duplicate claim identifiers require review',
    dimension: 'Validity',
    affectedRecords: 3,
    severity: 'Low',
    followUp: 'Review the flagged identifiers and confirm whether they are duplicates.',
  },
  {
    id: 'marine-reconciliation-jun',
    period: '2026-06',
    lineOfBusiness: 'Inland Marine',
    subproduct: 'Marine Cargo',
    region: 'Central',
    observation: 'One premium record needs a routine reconciliation check',
    dimension: 'Consistency',
    affectedRecords: 1,
    severity: 'Low',
    followUp: 'Confirm the premium value against the submitted bordereau.',
  },
]

export const qualityAnomalies = anomalySeeds.map((anomaly) => ({
  ...anomaly,
  status: 'Open',
  observationType: 'Data validation',
}))

export const availableQualityPeriods = periods

export function aggregateQualityObservations(rows) {
  if (!rows.length) {
    return {
      dimensions: Object.fromEntries(
        qualityDimensions.map(({ id }) => [id, null]),
      ),
      overallScore: null,
      recordsExpected: 0,
      recordsReceived: 0,
      missingFields: 0,
      lateRecords: 0,
      status: 'Unavailable',
    }
  }

  const expectedTotal = rows.reduce(
    (total, row) => total + row.recordsExpected,
    0,
  )
  const receivedTotal = rows.reduce(
    (total, row) => total + row.recordsReceived,
    0,
  )
  const dimensions = Object.fromEntries(
    qualityDimensions.map(({ id }) => [
      id,
      expectedTotal
        ? rows.reduce(
            (total, row) => total + row[id] * row.recordsExpected,
            0,
          ) / expectedTotal
        : null,
    ]),
  )
  const overallScore = calculateOverallQualityScore(dimensions)

  return {
    dimensions,
    overallScore,
    recordsExpected: expectedTotal,
    recordsReceived: receivedTotal,
    missingFields: rows.reduce((total, row) => total + row.missingFields, 0),
    lateRecords: rows.reduce((total, row) => total + row.lateRecords, 0),
    status: getQualityStatus(overallScore),
  }
}

function filterQualityObservations(
  rows,
  { lineOfBusiness, subproduct, region } = {},
) {
  return filterPortfolioObservations(rows, {
    lineOfBusiness,
    subproduct,
    region,
  })
}

export function getQualitySummary({
  period,
  lineOfBusiness = 'All lines of business',
  subproduct = 'All subproducts',
  region = 'All regions',
  rows = dataQualityObservations,
} = {}) {
  const selectedRows = filterQualityObservations(rows, {
    lineOfBusiness,
    subproduct,
    region,
  }).filter((row) => row.period === period)

  return {
    ...aggregateQualityObservations(selectedRows),
    period,
    rowCount: selectedRows.length,
    rows: selectedRows,
  }
}

export function getQualityTrend({
  throughPeriod,
  lineOfBusiness = 'All lines of business',
  subproduct = 'All subproducts',
  region = 'All regions',
  rows = dataQualityObservations,
} = {}) {
  const available = getAvailablePortfolioPeriods(rows)
  const endIndex = available.indexOf(throughPeriod)
  if (endIndex < 0) return []

  return available
    .slice(Math.max(0, endIndex - 11), endIndex + 1)
    .map((period) => ({
      period,
      ...getQualitySummary({
        period,
        lineOfBusiness,
        subproduct,
        region,
        rows,
      }),
    }))
}

export function getQualityAnomalies({
  period,
  lineOfBusiness = 'All lines of business',
  subproduct = 'All subproducts',
  region = 'All regions',
  anomalies = qualityAnomalies,
} = {}) {
  return anomalies.filter(
    (anomaly) =>
      anomaly.period === period &&
      filterPortfolioObservations([anomaly], {
        lineOfBusiness,
        subproduct,
        region,
      }).length > 0,
  )
}

export function getRecentQualityFiles({
  period = availableQualityPeriods.at(-1),
  rows = dataQualityObservations,
} = {}) {
  const selectedRows = rows.filter((row) => row.period === period)
  const lines = [...new Set(selectedRows.map((row) => row.lineOfBusiness))]

  return lines.map((lineOfBusiness) => {
    const lineRows = selectedRows.filter(
      (row) => row.lineOfBusiness === lineOfBusiness,
    )
    const summary = aggregateQualityObservations(lineRows)
    const filePrefix = {
      'Small Business Property': 'SBP_Claims',
      'Commercial Property': 'Commercial_Property_Binder',
      'General Liability': 'General_Liability_Claims',
      'Inland Marine': 'Inland_Marine_Premium',
    }[lineOfBusiness]

    return {
      id: `${lineOfBusiness}:${period}`,
      name: `${filePrefix}_${period}.csv`,
      period,
      lineOfBusiness,
      recordsExpected: summary.recordsExpected,
      recordsReceived: summary.recordsReceived,
      score: summary.overallScore,
      status: summary.status,
      receivedDate: `${period}-30`,
      exceptionCount: qualityAnomalies.filter(
        (anomaly) =>
          anomaly.period === period &&
          anomaly.lineOfBusiness === lineOfBusiness,
      ).length,
    }
  })
}

export function getLatestQualityPeriod() {
  return availableQualityPeriods.at(-1)
}

export function getPreviousQualityPeriod(period) {
  const index = availableQualityPeriods.indexOf(period)
  return index > 0 ? availableQualityPeriods[index - 1] : null
}

export function getQualityPeriodLabel(period) {
  if (!period) return 'No reporting period'
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${period}-01T00:00:00Z`))
}

export function getQualityDimensionStatus(score) {
  return getQualityStatus(score)
}

export function getQualityOverallScoreFromDimensions(dimensions) {
  return calculateOverallQualityScore(
    Object.fromEntries(
      qualityDimensions.map(({ id }) => [id, dimensions[id] ?? null]),
    ),
  )
}

export {
  calculateOverallQualityScore,
  getQualityStatus,
  qualityDimensions,
  qualityWeights,
}
