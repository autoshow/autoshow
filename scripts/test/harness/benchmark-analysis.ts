import type { TestReportEntry } from "~/types"

interface BenchmarkDisparityThresholds {
  absoluteDelta: number
  ratioUpper: number
  ratioLower: number
}

interface BenchmarkDisparitySample {
  label: string
  estimate: number
  actual: number
  delta: number
  ratio: number
}

interface BenchmarkDisparitySummary {
  totalCompared: number
  significantCount: number
  underestimates: BenchmarkDisparitySample[]
  overestimates: BenchmarkDisparitySample[]
}

export const SPEED_DISPARITY_THRESHOLDS: BenchmarkDisparityThresholds = {
  absoluteDelta: 5_000,
  ratioUpper: 2,
  ratioLower: 0.5,
}

export const COST_DISPARITY_THRESHOLDS: BenchmarkDisparityThresholds = {
  absoluteDelta: 0.02,
  ratioUpper: 2,
  ratioLower: 0.5,
}

function createReportEntryLabel(entry: TestReportEntry): string {
  return `${entry.serviceName}/${entry.modelName}`
}

function byLargestAbsoluteDelta(a: BenchmarkDisparitySample, b: BenchmarkDisparitySample): number {
  return Math.abs(b.delta) - Math.abs(a.delta)
}

export function summarizeBenchmarkDisparities(
  entries: TestReportEntry[],
  {
    estimate,
    actual,
    thresholds,
  }: {
    estimate: (entry: TestReportEntry) => number | null | undefined
    actual: (entry: TestReportEntry) => number | null | undefined
    thresholds: BenchmarkDisparityThresholds
  }
): BenchmarkDisparitySummary {
  const underestimates: BenchmarkDisparitySample[] = []
  const overestimates: BenchmarkDisparitySample[] = []
  let totalCompared = 0

  for (const entry of entries) {
    const estimatedValue = estimate(entry)
    const actualValue = actual(entry)

    if (
      estimatedValue == null
      || actualValue == null
      || !Number.isFinite(estimatedValue)
      || !Number.isFinite(actualValue)
      || estimatedValue <= 0
      || actualValue < 0
    ) {
      continue
    }

    totalCompared += 1

    const delta = actualValue - estimatedValue
    const ratio = actualValue / estimatedValue
    const isSignificant =
      Math.abs(delta) >= thresholds.absoluteDelta
      || ratio >= thresholds.ratioUpper
      || ratio <= thresholds.ratioLower

    if (!isSignificant) {
      continue
    }

    const sample: BenchmarkDisparitySample = {
      label: createReportEntryLabel(entry),
      estimate: estimatedValue,
      actual: actualValue,
      delta,
      ratio,
    }

    if (delta >= 0) {
      underestimates.push(sample)
    } else {
      overestimates.push(sample)
    }
  }

  underestimates.sort(byLargestAbsoluteDelta)
  overestimates.sort(byLargestAbsoluteDelta)

  return {
    totalCompared,
    significantCount: underestimates.length + overestimates.length,
    underestimates,
    overestimates,
  }
}
