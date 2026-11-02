import { getIntelligenceAnalysis } from './portfolioAnalytics.js'
import {
  getLatestQualityPeriod,
  getQualitySummary,
} from './dataQuality.js'

export const optimizationAssumptions = {
  targetSegment: 'Small Business Property',
  projectionMonths: 6,
  assumedRateAdjustment: 0.04,
  assumedRetentionImpact: -0.015,
  modeledVarianceConvergence: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6],
  confidence: 'Moderate',
}

const latestPeriodAnalysis = getIntelligenceAnalysis({
  periodId: 'month',
  lineOfBusiness: optimizationAssumptions.targetSegment,
})
const historyAnalysis = getIntelligenceAnalysis({
  periodId: 'itd',
  lineOfBusiness: optimizationAssumptions.targetSegment,
})

const latestPeriod = latestPeriodAnalysis.latestPeriod
const qualitySummary = getQualitySummary({
  period: getLatestQualityPeriod(),
  lineOfBusiness: optimizationAssumptions.targetSegment,
})

function nextMonth(period, offset) {
  const [year, month] = period.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1 + offset, 1))
  return date.toISOString().slice(0, 7)
}

function periodLabel(period, options = { month: 'short', year: '2-digit' }) {
  return new Intl.DateTimeFormat('en-US', {
    ...options,
    timeZone: 'UTC',
  }).format(new Date(`${period}-01T00:00:00Z`))
}

function clampRate(value) {
  return Number.isFinite(value) ? Math.max(0, Math.min(0.1, value)) : 0
}

export function getOptimizationScenario({
  projectionMonths = optimizationAssumptions.projectionMonths,
  rateAdjustment = optimizationAssumptions.assumedRateAdjustment,
} = {}) {
  const actual = latestPeriodAnalysis.latest
  const actualLossRatio =
    actual.earnedPremium > 0 ? actual.incurredLoss / actual.earnedPremium : null
  const expectedLossRatio =
    actual.earnedPremium > 0
      ? actual.expectedIncurredLoss / actual.earnedPremium
      : null
  const months = Math.max(
    1,
    Math.min(projectionMonths, optimizationAssumptions.projectionMonths),
  )
  const adjustment = clampRate(rateAdjustment)
  const exposureMultiplier = Math.max(
    0,
    1 + optimizationAssumptions.assumedRetentionImpact,
  )
  const premiumMultiplier = exposureMultiplier * (1 + adjustment)
  const historical = historyAnalysis.timeline.slice(-12).map((point) => ({
    period: point.period,
    label: periodLabel(point.period),
    actualLossRatio: point.lossRatio,
    expectedLossRatio: point.expectedLossRatio,
    earnedPremium: point.earnedPremium,
    phase: 'Historical',
  }))
  const projections = Array.from({ length: months }, (_, index) => {
    const convergence =
      optimizationAssumptions.modeledVarianceConvergence[index]
    const projectedOptimizedLossRatio =
      actualLossRatio !== null && expectedLossRatio !== null
        ? actualLossRatio -
          (actualLossRatio - expectedLossRatio) * convergence
        : null
    const projectedBaseEarnedPremium =
      actual.earnedPremium * exposureMultiplier
    const projectedEarnedPremium =
      actual.earnedPremium * premiumMultiplier
    const projectedStatusQuoLoss =
      actualLossRatio === null
        ? null
        : projectedBaseEarnedPremium * actualLossRatio
    const projectedOptimizedLoss =
      projectedOptimizedLossRatio === null
        ? null
        : projectedBaseEarnedPremium * projectedOptimizedLossRatio

    return {
      period: nextMonth(latestPeriod, index + 1),
      label: periodLabel(nextMonth(latestPeriod, index + 1)),
      statusQuoLossRatio:
        projectedStatusQuoLoss === null || projectedEarnedPremium <= 0
          ? null
          : projectedStatusQuoLoss / projectedEarnedPremium,
      optimizedLossRatio:
        projectedOptimizedLoss === null || projectedEarnedPremium <= 0
          ? null
          : projectedOptimizedLoss / projectedEarnedPremium,
      expectedLossRatio:
        expectedLossRatio === null || premiumMultiplier <= 0
          ? null
          : (expectedLossRatio * exposureMultiplier) / premiumMultiplier,
      earnedPremium: projectedEarnedPremium,
      statusQuoIncurredLoss: projectedStatusQuoLoss,
      optimizedIncurredLoss: projectedOptimizedLoss,
      modeledLossDifference:
        projectedStatusQuoLoss === null || projectedOptimizedLoss === null
          ? null
          : projectedStatusQuoLoss - projectedOptimizedLoss,
      phase: 'Projected',
    }
  })

  const projectedStatusQuoLoss = projections.reduce(
    (total, point) => total + (point.statusQuoIncurredLoss ?? 0),
    0,
  )
  const projectedOptimizedLoss = projections.reduce(
    (total, point) => total + (point.optimizedIncurredLoss ?? 0),
    0,
  )
  const projectedEarnedPremium = projections.reduce(
    (total, point) => total + point.earnedPremium,
    0,
  )
  const statusQuoLossRatio =
    projectedEarnedPremium > 0
      ? projectedStatusQuoLoss / projectedEarnedPremium
      : null
  const optimizedLossRatio =
    projectedEarnedPremium > 0
      ? projectedOptimizedLoss / projectedEarnedPremium
      : null
  const modeledLossDifference =
    projectedStatusQuoLoss - projectedOptimizedLoss

  return {
    id: 'targeted-small-business-property-review',
    name: 'Small Business Property targeted review',
    status: 'Scenario for review',
    confidence: optimizationAssumptions.confidence,
    targetSegment: optimizationAssumptions.targetSegment,
    historicalPeriod: {
      start: historical[0]?.period ?? latestPeriod,
      end: latestPeriod,
      startLabel: historical[0]?.label ?? periodLabel(latestPeriod),
      endLabel: periodLabel(latestPeriod),
    },
    projectionMonths: months,
    projectionStart: projections[0]?.period ?? null,
    projectionEnd: projections.at(-1)?.period ?? null,
    latestPeriod,
    actualLossRatio,
    expectedLossRatio,
    currentVariance:
      actualLossRatio === null || expectedLossRatio === null
        ? null
        : actualLossRatio - expectedLossRatio,
    rateAdjustment: adjustment,
    retentionImpact: optimizationAssumptions.assumedRetentionImpact,
    premiumMultiplier,
    exposureMultiplier,
    historical,
    projections,
    projectedStatusQuoLossRatio: statusQuoLossRatio,
    projectedOptimizedLossRatio: optimizedLossRatio,
    projectedVarianceReduction:
      statusQuoLossRatio === null || optimizedLossRatio === null
        ? null
        : statusQuoLossRatio - optimizedLossRatio,
    projectedEarnedPremium,
    projectedStatusQuoLoss,
    projectedOptimizedLoss,
    modeledLossDifference:
      Number.isFinite(modeledLossDifference) && modeledLossDifference >= 0
        ? modeledLossDifference
        : null,
    dataQualityScore: qualitySummary.overallScore,
    dataQualityStatus: qualitySummary.status,
    dataQualityPeriod: qualitySummary.period,
    dataQualityDimensions: qualitySummary.dimensions,
    actions: [
      {
        id: 'validate-claims-completeness',
        title: 'Validate recent claims-data completeness',
        rationale:
          'Review missing loss-date and property-location attributes before interpreting segment movement.',
        owner: 'Claims Data',
        timing: 'Before next review',
        status: 'To review',
      },
      {
        id: 'reconcile-late-submissions',
        title: 'Reconcile late or incomplete submissions',
        rationale:
          'Confirm the latest Small Business Property records are complete and aligned to the reporting period.',
        owner: 'Program Operations',
        timing: 'Before next renewal cycle',
        status: 'To review',
      },
      {
        id: 'review-pricing-adequacy',
        title: 'Review pricing adequacy for the affected segment',
        rationale:
          'Assess the assumed targeted adjustment against validated experience and renewal context.',
        owner: 'Portfolio Underwriting',
        timing: 'Renewal planning',
        status: 'Scenario assumption',
      },
      {
        id: 'monitor-experience',
        title: 'Monitor actual versus expected experience',
        rationale:
          'Compare future reported results with the directional scenario rather than treating it as a commitment.',
        owner: 'Portfolio Analytics',
        timing: `${months}-month projection`,
        status: 'Ongoing',
      },
    ],
  }
}

export function formatScenarioPeriod(period, options) {
  return period ? periodLabel(period, options) : 'Not available'
}
