import {
  aggregatePortfolioRows,
  filterPortfolioObservations,
  portfolioObservations,
} from './overview.js'

export const intelligencePeriods = [
  { id: 'itd', label: 'Inception to Date (ITD)', count: Infinity },
  { id: 'ytd', label: 'Year to Date (YTD)', count: 12, currentYear: true },
  { id: 'quarter', label: 'Latest Quarter', count: 3 },
  { id: 'month', label: 'Latest Month', count: 1 },
]

export const intelligenceMetrics = [
  {
    id: 'lossRatio',
    label: 'Actual Loss Ratio',
    unit: 'percent',
    actualField: 'incurredLoss',
    expectedField: 'expectedIncurredLoss',
    actualLabel: 'Actual Loss Ratio',
    expectedLabel: 'Expected Loss Ratio',
    derived: true,
  },
  {
    id: 'expectedLossRatio',
    label: 'Expected Loss Ratio',
    unit: 'percent',
    actualField: 'expectedIncurredLoss',
    expectedField: 'incurredLoss',
    actualLabel: 'Expected Loss Ratio',
    expectedLabel: 'Actual Loss Ratio',
    derived: true,
  },
  {
    id: 'earnedPremium',
    label: 'Earned Premium',
    unit: 'currency',
    actualField: 'earnedPremium',
    expectedField: null,
    actualLabel: 'Earned Premium',
    expectedLabel: null,
    derived: false,
  },
  {
    id: 'incurredLoss',
    label: 'Incurred Loss',
    unit: 'currency',
    actualField: 'incurredLoss',
    expectedField: 'expectedIncurredLoss',
    actualLabel: 'Incurred Loss',
    expectedLabel: 'Expected Incurred Loss',
    derived: false,
  },
  {
    id: 'expectedIncurredLoss',
    label: 'Expected Incurred Loss',
    unit: 'currency',
    actualField: 'expectedIncurredLoss',
    expectedField: 'incurredLoss',
    actualLabel: 'Expected Incurred Loss',
    expectedLabel: 'Incurred Loss',
    derived: false,
  },
]

export const breakdownMeasures = [
  { id: 'incurredLoss', label: 'Actual Incurred Loss' },
  { id: 'expectedIncurredLoss', label: 'Expected Incurred Loss' },
  { id: 'lossRatioGap', label: 'Marginal AvE Impact' },
]

export const portfolioDimensions = [
  { id: 'lineOfBusiness', label: 'Line of Business' },
  { id: 'subproduct', label: 'Subproduct' },
  { id: 'region', label: 'Region' },
]

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  month: 'short',
  year: '2-digit',
  timeZone: 'UTC',
})

export function getAvailablePortfolioPeriods(rows = portfolioObservations) {
  return [...new Set(rows.map(({ period }) => period))].sort()
}

export function getPremiumYearOverYearComparison({
  lineOfBusiness = 'All lines of business',
  subproduct = 'All subproducts',
  region = 'All regions',
  rows = portfolioObservations,
} = {}) {
  const periods = getAvailablePortfolioPeriods(rows)
  const currentPeriods = new Set(periods.slice(-12))
  const previousPeriods = new Set(periods.slice(-24, -12))
  const filteredRows = filterPortfolioObservations(rows, {
    lineOfBusiness,
    subproduct,
    region,
  })
  const current = filteredRows
    .filter(({ period }) => currentPeriods.has(period))
    .reduce((total, row) => total + row.writtenPremium, 0)
  const previous = filteredRows
    .filter(({ period }) => previousPeriods.has(period))
    .reduce((total, row) => total + row.writtenPremium, 0)

  return {
    current,
    previous,
    change: previous ? current / previous - 1 : null,
  }
}

export function getDatesForReportingPeriod(
  periodId,
  availablePeriods = getAvailablePortfolioPeriods(),
) {
  if (!availablePeriods.length) return []

  const definition =
    intelligencePeriods.find(({ id }) => id === periodId) ??
    intelligencePeriods[0]
  const latest = availablePeriods.at(-1)
  let selectedPeriods = availablePeriods

  if (definition.currentYear) {
    const year = latest.slice(0, 4)
    selectedPeriods = availablePeriods.filter((period) =>
      period.startsWith(year),
    )
  }

  if (Number.isFinite(definition.count)) {
    selectedPeriods = selectedPeriods.slice(-definition.count)
  }

  return selectedPeriods
}

export function getIntelligenceAnalysis({
  periodId = 'itd',
  lineOfBusiness = 'All lines of business',
  subproduct = 'All subproducts',
  region = 'All regions',
  rows = portfolioObservations,
} = {}) {
  const availablePeriods = getAvailablePortfolioPeriods(rows)
  const selectedPeriods = getDatesForReportingPeriod(
    periodId,
    availablePeriods,
  )
  const selectedPeriodSet = new Set(selectedPeriods)
  const filteredRows = filterPortfolioObservations(rows, {
    lineOfBusiness,
    subproduct,
    region,
  })
  const periodRows = filteredRows.filter(({ period }) =>
    selectedPeriodSet.has(period),
  )
  const timeline = selectedPeriods
    .map((period) => {
      const periodObservations = periodRows.filter(
        (row) => row.period === period,
      )

      return {
        period,
        label: dateFormatter.format(new Date(`${period}-01T00:00:00Z`)),
        ...aggregatePortfolioRows(periodObservations),
      }
    })
    .filter(({ earnedPremium }) => earnedPremium > 0)
  const latestPeriod = availablePeriods.at(-1)
  const latestRows = filteredRows.filter(
    ({ period }) => period === latestPeriod,
  )
  const baselineLatestRows = rows.filter(
    ({ period }) => period === latestPeriod,
  )

  return {
    rows: periodRows,
    timeline,
    selectedPeriods: timeline.map(({ period }) => period),
    summary: aggregatePortfolioRows(periodRows),
    latest: aggregatePortfolioRows(latestRows),
    baselineLatest: aggregatePortfolioRows(baselineLatestRows),
    hasData: periodRows.length > 0,
    latestPeriod,
  }
}

export function getPortfolioBreakdown(rows, dimension) {
  const groups = new Map()

  for (const row of rows) {
    const key = row[dimension]
    if (!key) continue
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(row)
  }

  return [...groups.entries()]
    .map(([label, observations]) => ({
      label,
      ...aggregatePortfolioRows(observations),
    }))
    .sort((left, right) => right.incurredLoss - left.incurredLoss)
}

export function getLossRatioVariance(summary) {
  if (summary.lossRatio === null || summary.expectedLossRatio === null) {
    return null
  }
  return summary.lossRatio - summary.expectedLossRatio
}

export function getPortfolioHierarchy(rows) {
  const dimensions = ['lineOfBusiness', 'subproduct', 'region']

  function groupRows(observations, depth, parentId) {
    const dimension = dimensions[depth]
    if (!dimension) return []

    const groups = new Map()
    for (const row of observations) {
      const label = row[dimension]
      if (!groups.has(label)) groups.set(label, [])
      groups.get(label).push(row)
    }

    return [...groups.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([label, group]) => {
        const id = `${parentId}/${dimension}:${encodeURIComponent(label)}`
        const summary = aggregatePortfolioRows(group)
        return {
          id,
          label,
          depth: depth + 1,
          summary,
          variance: getLossRatioVariance(summary),
          children: groupRows(group, depth + 1, id),
        }
      })
  }

  const summary = aggregatePortfolioRows(rows)
  return {
    id: 'portfolio',
    label: 'Portfolio',
    depth: 0,
    summary,
    variance: getLossRatioVariance(summary),
    children: groupRows(rows, 0, 'portfolio'),
  }
}

export function getAvailableDimensionValues(rows, dimension) {
  return [...new Set(rows.map((row) => row[dimension]).filter(Boolean))].sort()
}

export function getMetricPointValue(point, metric) {
  if (metric.derived) {
    const actual =
      point.earnedPremium > 0
        ? point.incurredLoss / point.earnedPremium
        : null
    const expected =
      point.earnedPremium > 0
        ? point.expectedIncurredLoss / point.earnedPremium
        : null

    return metric.id === 'expectedLossRatio'
      ? { actual: expected, expected: actual }
      : { actual, expected }
  }

  return {
    actual: point[metric.actualField],
    expected: metric.expectedField
      ? point[metric.expectedField]
      : null,
  }
}

export function formatMetricValue(value, unit, compact = false) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—'
  }

  if (unit === 'percent') {
    return `${(value * 100).toFixed(1)}%`
  }

  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 1 : 0,
  }).format(value)
}
