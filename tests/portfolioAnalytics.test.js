import assert from 'node:assert/strict'
import test from 'node:test'
import {
  aggregatePortfolioRows,
  getOverviewSummary,
  portfolioObservations,
} from '../src/data/overview.js'
import {
  getAvailableDimensionValues,
  getDatesForReportingPeriod,
  getIntelligenceAnalysis,
  getLossRatioVariance,
  getMetricPointValue,
  getPortfolioBreakdown,
  getPortfolioHierarchy,
  getPremiumYearOverYearComparison,
  intelligenceMetrics,
} from '../src/data/portfolioAnalytics.js'
import {
  aggregateQualityObservations,
  availableQualityPeriods,
  calculateOverallQualityScore,
  dataQualityObservations,
  getLatestQualityPeriod,
  getPreviousQualityPeriod,
  getQualityAnomalies,
  getQualitySummary,
  getQualityTrend,
  qualityDimensions,
  qualityWeights,
} from '../src/data/dataQuality.js'
import { getOptimizationScenario } from '../src/data/optimizationScenario.js'

const latestPeriod = '2026-06'

test('shared observations cover 24 ordered months and portfolio segments', () => {
  const periods = [...new Set(portfolioObservations.map(({ period }) => period))]
  const lines = getAvailableDimensionValues(
    portfolioObservations,
    'lineOfBusiness',
  )

  assert.equal(periods.length, 24)
  assert.deepEqual(periods, [...periods].sort())
  assert.equal(portfolioObservations.length, 24 * 4 * 2 * 3)
  assert.equal(lines.length, 4)
  assert.equal(
    getAvailableDimensionValues(portfolioObservations, 'region').length,
    3,
  )
})

test('overview premium growth remains approximately seven percent year over year', () => {
  const summary = getOverviewSummary('year')
  const growth =
    (summary.current.writtenPremium / summary.previous.writtenPremium - 1) *
    100

  assert.ok(growth > 6.9 && growth < 7.1, `${growth}%`)
})

test('portfolio intelligence shows derived year-over-year premium growth', () => {
  const comparison = getPremiumYearOverYearComparison()
  const growth = comparison.change * 100

  assert.ok(comparison.current > comparison.previous)
  assert.ok(growth > 6.9 && growth < 7.1, `${growth}%`)
})

test('latest portfolio loss ratio gap is approximately 4.2 points', () => {
  const latestRows = portfolioObservations.filter(
    ({ period }) => period === latestPeriod,
  )
  const portfolio = aggregatePortfolioRows(latestRows)
  const gap = (portfolio.lossRatio - portfolio.expectedLossRatio) * 100

  assert.ok(Math.abs(gap - 4.2) < 0.05, `${gap} percentage points`)
})

test('Small Business Property reveals the concentrated 28-point gap', () => {
  const all = getIntelligenceAnalysis()
  const smallBusiness = getIntelligenceAnalysis({
    lineOfBusiness: 'Small Business Property',
  })
  const gap =
    (smallBusiness.latest.lossRatio -
      smallBusiness.latest.expectedLossRatio) *
    100
  const baselineGap =
    (smallBusiness.baselineLatest.lossRatio -
      smallBusiness.baselineLatest.expectedLossRatio) *
    100

  assert.equal(all.timeline.length, 24)
  assert.ok(Math.abs(gap - 28) < 0.1, `${gap} percentage points`)
  assert.ok(Math.abs(baselineGap - 4.2) < 0.05)
  assert.ok(gap > baselineGap * 6)
})

test('reporting period selections return chronological, nonempty windows', () => {
  assert.equal(getDatesForReportingPeriod('itd').length, 24)
  assert.equal(getDatesForReportingPeriod('ytd').length, 6)
  assert.equal(getDatesForReportingPeriod('quarter').length, 3)
  assert.deepEqual(getDatesForReportingPeriod('month'), [latestPeriod])
})

test('line, subproduct, and region filters constrain the shared observations', () => {
  const smallBusiness = getIntelligenceAnalysis({
    lineOfBusiness: 'Small Business Property',
  })
  const subproduct = getAvailableDimensionValues(
    smallBusiness.rows,
    'subproduct',
  )[0]
  const region = getAvailableDimensionValues(smallBusiness.rows, 'region')[0]
  const filtered = getIntelligenceAnalysis({
    lineOfBusiness: 'Small Business Property',
    subproduct,
    region,
  })

  assert.ok(filtered.hasData)
  assert.ok(
    filtered.rows.every(
      (row) =>
        row.lineOfBusiness === 'Small Business Property' &&
        row.subproduct === subproduct &&
        row.region === region,
    ),
  )
  assert.equal(getPortfolioBreakdown(filtered.rows, 'region').length, 1)
  assert.equal(
    getIntelligenceAnalysis({
      lineOfBusiness: 'Small Business Property',
      subproduct: 'Marine Cargo',
    }).hasData,
    false,
  )
})

test('loss ratios are derived from loss and earned premium, not duplicated fields', () => {
  const analysis = getIntelligenceAnalysis({ periodId: 'month' })
  const latest = analysis.timeline.at(-1)
  const expectedValue = getMetricPointValue(
    latest,
    intelligenceMetrics.find(({ id }) => id === 'expectedLossRatio'),
  )

  assert.equal(latest.lossRatio, latest.incurredLoss / latest.earnedPremium)
  assert.equal(
    latest.expectedLossRatio,
    latest.expectedIncurredLoss / latest.earnedPremium,
  )
  assert.equal(expectedValue.actual, latest.expectedLossRatio)
  assert.equal(expectedValue.expected, latest.lossRatio)
  assert.ok(
    portfolioObservations.every(
      (row) => !('lossRatio' in row) && !('expectedLossRatio' in row),
    ),
  )
})

test('optimization scenario starts from observed Small Business Property results', () => {
  const observed = getIntelligenceAnalysis({
    periodId: 'month',
    lineOfBusiness: 'Small Business Property',
  }).latest
  const scenario = getOptimizationScenario()

  assert.equal(scenario.latestPeriod, latestPeriod)
  assert.equal(scenario.targetSegment, 'Small Business Property')
  assert.equal(scenario.actualLossRatio, observed.lossRatio)
  assert.equal(scenario.expectedLossRatio, observed.expectedLossRatio)
  assert.equal(scenario.historical.length, 12)
  assert.equal(scenario.projections.length, 6)
})

test('optimization scenario separates historical and projected periods', () => {
  const scenario = getOptimizationScenario()
  const lastHistorical = scenario.historical.at(-1)
  const firstProjection = scenario.projections[0]

  assert.equal(lastHistorical.period, scenario.latestPeriod)
  assert.equal(firstProjection.period, '2026-07')
  assert.ok(
    Math.abs(
      firstProjection.statusQuoIncurredLoss -
        observedPremium(scenario) *
          (1 + scenario.retentionImpact) *
          scenario.actualLossRatio,
    ) < 1e-8,
  )
  assert.equal(
    firstProjection.optimizedLossRatio,
    (scenario.actualLossRatio -
      (scenario.actualLossRatio - scenario.expectedLossRatio) * 0.1) *
      (scenario.exposureMultiplier / scenario.premiumMultiplier),
  )
  assert.ok(
    scenario.projections.every(
      ({ optimizedLossRatio }) =>
        optimizedLossRatio > scenario.expectedLossRatio &&
        optimizedLossRatio < scenario.actualLossRatio,
    ),
  )
  assert.ok(
    scenario.projections.every(
      ({ optimizedLossRatio }, index, projections) =>
        index === 0 ||
        optimizedLossRatio < projections[index - 1].optimizedLossRatio,
    ),
  )
})

test('optimization scenario calculates modeled loss difference from premium and ratios', () => {
  const scenario = getOptimizationScenario()
  const expectedDifference = scenario.projections.reduce(
    (total, point) =>
      total +
      point.earnedPremium *
        (point.statusQuoLossRatio - point.optimizedLossRatio),
    0,
  )
  const noRateChange = getOptimizationScenario({ rateAdjustment: 0 })

  assert.ok(Math.abs(scenario.modeledLossDifference - expectedDifference) < 1e-8)
  assert.ok(scenario.modeledLossDifference > 0)
  assert.ok(
    scenario.projectedEarnedPremium >
      noRateChange.projectedEarnedPremium,
  )
  assert.equal(
    scenario.modeledLossDifference,
    noRateChange.modeledLossDifference,
  )
  assert.ok(
    scenario.projectedStatusQuoLossRatio <
      noRateChange.projectedStatusQuoLossRatio,
  )
  assert.equal(
    getOptimizationScenario({ projectionMonths: 3 }).projections.length,
    3,
  )
})

function observedPremium(scenario) {
  return getIntelligenceAnalysis({
    periodId: 'month',
    lineOfBusiness: scenario.targetSegment,
  }).latest.earnedPremium
}

test('optimization scenario carries the segment-specific data quality context', () => {
  const scenario = getOptimizationScenario()
  const quality = getQualitySummary({
    period: getLatestQualityPeriod(),
    lineOfBusiness: 'Small Business Property',
  })

  assert.equal(scenario.dataQualityScore, quality.overallScore)
  assert.equal(scenario.dataQualityStatus, quality.status)
  assert.equal(scenario.actions.length, 4)
})

test('tabular hierarchy agrees with shared analysis for required scenarios', () => {
  const scenarios = [
    { periodId: 'month' },
    { periodId: 'month', lineOfBusiness: 'Small Business Property' },
    { periodId: 'month', lineOfBusiness: 'Commercial Property' },
    { periodId: 'month', region: 'Central' },
    { periodId: 'ytd' },
  ]

  for (const scenario of scenarios) {
    const analysis = getIntelligenceAnalysis(scenario)
    const hierarchy = getPortfolioHierarchy(analysis.rows)
    const expected = analysis.summary

    assert.equal(hierarchy.summary.earnedPremium, expected.earnedPremium)
    assert.equal(hierarchy.summary.incurredLoss, expected.incurredLoss)
    assert.equal(
      hierarchy.summary.expectedIncurredLoss,
      expected.expectedIncurredLoss,
    )
    assert.equal(hierarchy.summary.lossRatio, expected.lossRatio)
    assert.equal(
      hierarchy.summary.expectedLossRatio,
      expected.expectedLossRatio,
    )
    assert.equal(
      hierarchy.variance,
      getLossRatioVariance(expected),
    )
  }
})

test('tabular parent loss ratios use aggregated losses and premium', () => {
  const analysis = getIntelligenceAnalysis({
    periodId: 'month',
    lineOfBusiness: 'Small Business Property',
  })
  const hierarchy = getPortfolioHierarchy(analysis.rows)
  const smallBusiness = hierarchy.children[0]
  const childRatioAverage =
    smallBusiness.children.reduce(
      (total, child) => total + child.summary.lossRatio,
      0,
    ) / smallBusiness.children.length

  assert.equal(
    smallBusiness.summary.lossRatio,
    smallBusiness.summary.incurredLoss /
      smallBusiness.summary.earnedPremium,
  )
  assert.notEqual(smallBusiness.summary.lossRatio, childRatioAverage)
  assert.ok(Math.abs(smallBusiness.variance * 100 - 28) < 0.1)
  assert.equal(new Set(collectIds(hierarchy)).size, collectIds(hierarchy).length)
  assert.equal(getPortfolioHierarchy([]).variance, null)
})

function collectIds(node) {
  return [node.id, ...node.children.flatMap(collectIds)]
}

test('data quality scoring is weighted and internally consistent', () => {
  const latestPeriod = getLatestQualityPeriod()
  const portfolio = getQualitySummary({ period: latestPeriod })
  const smallBusiness = getQualitySummary({
    period: latestPeriod,
    lineOfBusiness: 'Small Business Property',
  })

  assert.equal(
    Object.values(qualityWeights).reduce((total, weight) => total + weight, 0),
    1,
  )
  assert.equal(
    portfolio.overallScore,
    calculateOverallQualityScore(portfolio.dimensions),
  )
  assert.ok(
    Math.abs(
      aggregatePortfolioRows(
        portfolioObservations.filter(({ period }) => period === latestPeriod),
      ).dataQualityScore - portfolio.overallScore,
    ) < 1e-10,
  )
  assert.ok(portfolio.overallScore >= 90 && portfolio.overallScore <= 94)
  assert.ok(Math.abs(smallBusiness.overallScore - 82.9) < 0.01)
  assert.equal(
    smallBusiness.dimensions.completenessScore,
    76,
  )
  assert.equal(smallBusiness.dimensions.timelinessScore, 78)
  assert.ok(smallBusiness.dimensions.validityScore >= 90)
  assert.ok(smallBusiness.dimensions.consistencyScore >= 90)
  assert.equal(
    dataQualityObservations.at(-1).overallQualityScore,
    calculateOverallQualityScore(
      Object.fromEntries(
        qualityDimensions.map(({ id }) => [
          id,
          dataQualityObservations.at(-1)[id],
        ]),
      ),
    ),
  )
})

test('data quality trends, previous periods, and observations follow active filters', () => {
  const latestPeriod = getLatestQualityPeriod()
  const previousPeriod = getPreviousQualityPeriod(latestPeriod)
  const allPortfolio = getQualitySummary({ period: latestPeriod })
  const allPrior = getQualitySummary({ period: previousPeriod })
  const smallBusiness = getQualitySummary({
    period: latestPeriod,
    lineOfBusiness: 'Small Business Property',
  })
  const smallBusinessPrior = getQualitySummary({
    period: previousPeriod,
    lineOfBusiness: 'Small Business Property',
  })
  const trend = getQualityTrend({
    throughPeriod: latestPeriod,
    lineOfBusiness: 'Small Business Property',
  })

  assert.equal(availableQualityPeriods.length, 24)
  assert.ok(allPortfolio.overallScore >= 90)
  assert.ok(allPortfolio.overallScore < allPrior.overallScore)
  assert.ok(smallBusiness.overallScore < smallBusinessPrior.overallScore)
  assert.equal(trend.at(-1).period, latestPeriod)
  assert.ok(trend.length <= 12)
  assert.ok(
    getQualityAnomalies({
      period: latestPeriod,
      lineOfBusiness: 'Small Business Property',
    }).length >= 2,
  )
  assert.equal(
    getQualityAnomalies({
      period: latestPeriod,
      lineOfBusiness: 'Commercial Property',
    }).length,
    0,
  )
  assert.ok(aggregateQualityObservations([]).overallScore === null)
})
