export const qualityDimensions = [
  {
    id: 'completenessScore',
    label: 'Completeness',
    weight: 0.35,
    description: 'Required fields and records are present.',
  },
  {
    id: 'timelinessScore',
    label: 'Timeliness',
    weight: 0.25,
    description: 'Submissions arrive within the reporting window.',
  },
  {
    id: 'validityScore',
    label: 'Validity',
    weight: 0.25,
    description: 'Values follow expected formats and ranges.',
  },
  {
    id: 'consistencyScore',
    label: 'Consistency',
    weight: 0.15,
    description: 'Related records reconcile across submissions.',
  },
]

export const qualityWeights = Object.freeze(
  Object.fromEntries(
    qualityDimensions.map(({ id, weight }) => [id, weight]),
  ),
)

const recentSmallBusinessScores = [
  [92, 92, 95, 94],
  [89, 90, 95, 94],
  [86, 88, 94, 94],
  [83, 85, 94, 93],
  [79, 82, 93, 93],
  [76, 78, 92, 92],
]

export function getSyntheticQualityDimensions(lineOfBusiness, periodIndex) {
  if (lineOfBusiness === 'Small Business Property' && periodIndex >= 18) {
    const scores =
      recentSmallBusinessScores[
        Math.min(periodIndex - 18, recentSmallBusinessScores.length - 1)
      ]
    const [
      completenessScore,
      timelinessScore,
      validityScore,
      consistencyScore,
    ] = scores

    return {
      completenessScore,
      timelinessScore,
      validityScore,
      consistencyScore,
    }
  }

  return {
    completenessScore: 94,
    timelinessScore: 93,
    validityScore: lineOfBusiness === 'Small Business Property' ? 95 : 96,
    consistencyScore: 94,
  }
}

export function calculateOverallQualityScore(scores) {
  const available = qualityDimensions.filter(({ id }) =>
    Number.isFinite(scores[id]),
  )
  const totalWeight = available.reduce(
    (total, { weight }) => total + weight,
    0,
  )
  if (!totalWeight) return null

  return available.reduce(
    (total, { id, weight }) => total + scores[id] * weight,
    0,
  ) / totalWeight
}

export function getQualityStatus(score) {
  if (!Number.isFinite(score)) return 'Unavailable'
  if (score >= 90) return 'Healthy'
  if (score >= 80) return 'Monitor'
  return 'Needs attention'
}

export function getQualityDimensionStatus(score) {
  return getQualityStatus(score)
}
