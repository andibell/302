import {
  calculateOverallQualityScore,
  getSyntheticQualityDimensions,
} from './qualityMetrics.js'

const segmentDefinitions = [
  {
    lineOfBusiness: 'Commercial Property',
    premiumShare: 0.38,
    expectedLossRatio: 0.49,
    claimFrequency: 3.3,
    retention: 0.79,
    rateChange: 0.043,
    policyCount: 480,
    subproducts: [
      { name: 'Commercial Property Package', weight: 0.5, lossFactor: 0.92 },
      { name: 'Scheduled Property', weight: 0.5, lossFactor: 1.08 },
    ],
  },
  {
    lineOfBusiness: 'Inland Marine',
    premiumShare: 0.24,
    expectedLossRatio: 0.46,
    claimFrequency: 3.5,
    retention: 0.81,
    rateChange: 0.039,
    policyCount: 290,
    subproducts: [
      { name: 'Contractors Equipment', weight: 0.58, lossFactor: 0.9 },
      { name: 'Marine Cargo', weight: 0.42, lossFactor: 1.1 },
    ],
  },
  {
    lineOfBusiness: 'General Liability',
    premiumShare: 0.23,
    expectedLossRatio: 0.55,
    claimFrequency: 3.9,
    retention: 0.76,
    rateChange: 0.041,
    policyCount: 360,
    subproducts: [
      { name: 'Premises Liability', weight: 0.62, lossFactor: 0.9 },
      { name: 'Products Liability', weight: 0.38, lossFactor: 1.1 },
    ],
  },
  {
    lineOfBusiness: 'Small Business Property',
    premiumShare: 0.15,
    expectedLossRatio: 0.51,
    claimFrequency: 3.45,
    retention: 0.77,
    rateChange: 0.036,
    policyCount: 190,
    subproducts: [
      { name: 'Businessowners Policy', weight: 0.68, lossFactor: 0.78 },
      { name: 'Small Commercial Property', weight: 0.32, lossFactor: 1.4675 },
    ],
  },
]

const regions = [
  { name: 'Northeast', premiumWeight: 0.36, lossFactor: 0.88 },
  { name: 'Central', premiumWeight: 0.34, lossFactor: 1 },
  { name: 'West', premiumWeight: 0.3, lossFactor: 1.14 },
]

const periods = Array.from({ length: 24 }, (_, index) => {
  const date = new Date(Date.UTC(2024, 6 + index, 1))

  return {
    date: date.toISOString().slice(0, 7),
    label: new Intl.DateTimeFormat('en', {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(date),
    index,
  }
})

function lossRatioEmergence(index, lineOfBusiness) {
  if (lineOfBusiness !== 'Small Business Property' || index < 17) {
    return 0
  }

  const emergenceByMonth = [0.04, 0.08, 0.14, 0.19, 0.24, 0.28, 0.28]
  return emergenceByMonth[index - 17] ?? 0
}

export const portfolioObservations = periods.flatMap(({ date, index }) => {
  const portfolioWrittenPremium = 585_000 * (1 + index * 0.006)

  return segmentDefinitions.flatMap((segment) => {
    const segmentWrittenPremium =
      portfolioWrittenPremium * segment.premiumShare
    const emergence = lossRatioEmergence(index, segment.lineOfBusiness)
    const segmentPolicyCount = Math.round(
      segment.policyCount * (1 + index * 0.004),
    )
    const expectedClaimFrequency = segment.claimFrequency
    const claimFrequency =
      segment.claimFrequency +
      (segment.lineOfBusiness === 'Small Business Property' && index >= 20
        ? (index - 19) * 0.12
        : 0)

    return segment.subproducts.flatMap((subproduct) =>
      regions.map((region) => {
        const weight = subproduct.weight * region.premiumWeight
        const writtenPremium = segmentWrittenPremium * weight
        const earnedPremium =
          writtenPremium * (0.96 + (index % 4) * 0.002)
        const expectedLossRatio = segment.expectedLossRatio
        const incurredLoss =
          earnedPremium *
          (expectedLossRatio +
            emergence * subproduct.lossFactor * region.lossFactor)
        const policyCount = Math.round(segmentPolicyCount * weight)
        const qualityScores = getSyntheticQualityDimensions(
          segment.lineOfBusiness,
          index,
        )

        return {
          period: date,
          lineOfBusiness: segment.lineOfBusiness,
          subproduct: subproduct.name,
          region: region.name,
          writtenPremium,
          earnedPremium,
          incurredLoss,
          expectedIncurredLoss: earnedPremium * expectedLossRatio,
          rateChange: segment.rateChange,
          retention: segment.retention,
          policyCount,
          claimCount: Math.round((policyCount * claimFrequency) / 100),
          claimFrequency,
          expectedClaimFrequency,
          ...qualityScores,
          dataQualityScore: calculateOverallQualityScore(qualityScores),
        }
      }),
    )
  })
})

export const lineOfBusinessOptions = [
  'All lines of business',
  ...segmentDefinitions.map(({ lineOfBusiness }) => lineOfBusiness),
]

export const subproductOptions = [
  ...new Set(
    segmentDefinitions.flatMap(({ subproducts }) =>
      subproducts.map(({ name }) => name),
    ),
  ),
]

export const regionOptions = ['Northeast', 'Central', 'West']

export const portfolioAlerts = [
  {
    id: 'loss-emergence',
    category: 'LOSS EMERGENCE',
    title:
      'Small Business Property is 28 points above expected loss ratio in the latest month.',
    date: '30 Jun 2026',
    status: 'new',
  },
  {
    id: 'claims-frequency',
    category: 'CLAIMS FREQUENCY',
    title:
      'Small Business Property claim frequency has risen over the latest three reporting periods.',
    date: '30 Jun 2026',
    status: 'new',
  },
  {
    id: 'premium-growth',
    category: 'PORTFOLIO GROWTH',
    title:
      'Written premium continues to grow across the portfolio year over year.',
    date: '30 Jun 2026',
    status: 'flagged',
  },
  {
    id: 'retention-review',
    category: 'RETENTION',
    title:
      'Commercial Property retention is holding near plan for the current period.',
    date: '30 Jun 2026',
    status: 'flagged',
  },
  {
    id: 'data-review',
    category: 'PORTFOLIO REVIEW',
    title:
      'Review recent segment experience before making broad portfolio changes.',
    date: '30 Jun 2026',
    status: 'new',
  },
]

export const optimizationOpportunities = [
  {
    id: 'new-opportunity',
    title: 'New Opportunity',
    eyebrow: 'PORTFOLIO REVIEW',
    name: 'Emerging Risk Review',
    description: 'Investigate the concentrated loss signal',
    progress: 0,
    status: 'new',
    featured: true,
  },
  {
    id: 'underwriting-review',
    eyebrow: 'UNDERWRITING',
    name: 'Segment Performance',
    description: 'Compare experience with expected performance',
    progress: 50,
    completed: '2 of 4 checks complete',
    status: 'In progress',
  },
  {
    id: 'portfolio-growth',
    eyebrow: 'PORTFOLIO',
    name: 'Sustainable Growth',
    description: 'Monitor growth alongside loss performance',
    progress: 25,
    completed: '1 of 4 checks complete',
    status: 'Monitoring',
  },
]

export const portfolioResources = [
  'Portfolio Analytics',
  'Risk Engineering',
  'Program Benchmarking',
  'Claims Advisory',
  'Underwriting Services',
  'Market Insights',
]

export const nimvaNews = [
  {
    type: 'PORTFOLIO NOTE',
    title: 'A practical guide to reviewing emerging segment experience',
    date: '30 JUN 2026',
    readTime: '4 MIN READ',
  },
  {
    type: 'INSURANCE BRIEF',
    title: 'Why aggregate results can conceal local changes in risk',
    date: '24 JUN 2026',
    readTime: '3 MIN READ',
  },
  {
    type: 'PORTFOLIO NOTE',
    title: 'Questions to ask before changing a growing portfolio',
    date: '18 JUN 2026',
    readTime: '5 MIN READ',
  },
]

function sum(rows, field) {
  return rows.reduce((total, row) => total + row[field], 0)
}

export function calculateLossRatio(rows, lossField) {
  const earnedPremium = sum(rows, 'earnedPremium')
  return earnedPremium
    ? sum(rows, lossField) / earnedPremium
    : null
}

export function aggregatePortfolioRows(rows) {
  const earnedPremium = sum(rows, 'earnedPremium')
  const incurredLoss = sum(rows, 'incurredLoss')
  const expectedIncurredLoss = sum(rows, 'expectedIncurredLoss')

  return {
    writtenPremium: sum(rows, 'writtenPremium'),
    earnedPremium,
    incurredLoss,
    expectedIncurredLoss,
    lossRatio: earnedPremium ? incurredLoss / earnedPremium : null,
    expectedLossRatio: earnedPremium
      ? expectedIncurredLoss / earnedPremium
      : null,
    retention: weightedAverage(rows, 'retention', 'writtenPremium'),
    rateChange: weightedAverage(rows, 'rateChange', 'writtenPremium'),
    claimFrequency: weightedAverage(rows, 'claimFrequency', 'policyCount'),
    expectedClaimFrequency: weightedAverage(
      rows,
      'expectedClaimFrequency',
      'policyCount',
    ),
    dataQualityScore: weightedQualityScore(rows),
    policyCount: sum(rows, 'policyCount'),
    claimCount: sum(rows, 'claimCount'),
  }
}

export function filterPortfolioObservations(
  rows,
  { lineOfBusiness, subproduct, region } = {},
) {
  return rows.filter(
    (row) =>
      (!lineOfBusiness ||
        lineOfBusiness === 'All lines of business' ||
        row.lineOfBusiness === lineOfBusiness) &&
      (!subproduct ||
        subproduct === 'All subproducts' ||
        row.subproduct === subproduct) &&
      (!region || region === 'All regions' || row.region === region),
  )
}

function weightedAverage(rows, valueField, weightField) {
  const totalWeight = sum(rows, weightField)
  return totalWeight
    ? rows.reduce(
        (total, row) => total + row[valueField] * row[weightField],
        0,
      ) / totalWeight
    : 0
}

function weightedQualityScore(rows) {
  const totalRecords = rows.reduce(
    (total, row) => total + row.policyCount + row.claimCount,
    0,
  )
  return totalRecords
    ? rows.reduce(
        (total, row) =>
          total +
          row.dataQualityScore * (row.policyCount + row.claimCount),
        0,
      ) / totalRecords
    : null
}

function summarize(rows) {
  return aggregatePortfolioRows(rows)
}

export function getOverviewSummary(
  period = 'year',
  lineOfBusiness = lineOfBusinessOptions[0],
) {
  const windowSize = period === 'month' ? 1 : 12
  const selectedRows =
    filterPortfolioObservations(portfolioObservations, { lineOfBusiness })
  const latestPeriod = portfolioObservations.at(-1).period
  const visibleDates = [
    ...new Set(selectedRows.map((row) => row.period)),
  ]
  const currentDates = visibleDates.slice(-windowSize)
  const previousDates = visibleDates.slice(-windowSize * 2, -windowSize)

  const currentRows = selectedRows.filter((row) =>
    currentDates.includes(row.period),
  )
  const previousRows = selectedRows.filter((row) =>
    previousDates.includes(row.period),
  )
  const latestRows = selectedRows.filter(
    (row) => row.period === latestPeriod,
  )

  return {
    current: summarize(currentRows),
    previous: summarize(previousRows),
    latest: summarize(latestRows),
    windowSize,
    observationCount: selectedRows.length,
    periodCount: visibleDates.length,
  }
}
