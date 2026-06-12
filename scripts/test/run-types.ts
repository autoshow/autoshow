import type { E2EMode } from "./e2e-flags"

export type SuiteId = "e2e" | "browser"

export interface CliOptions {
  suites: SuiteId[]
  grep?: string
  headed: boolean
  e2eMode: E2EMode
  e2eModeExplicit: boolean
  e2ePaths: string[]
  browserPaths: string[]
  inputVariants?: string
  testPrice: boolean
  budgetCenticents?: number
  concurrency?: number
}

export interface JUnitSummary {
  tests: number
  passed: number
  failed: number
  skipped: number
}

export interface SuiteResult {
  id: SuiteId
  runner: "bun" | "playwright"
  status: "passed" | "failed"
  exitCode: number
  durationMs: number
  logPath: string
  junitPath?: string
  summary?: JUnitSummary
  infrastructureFailure?: boolean
}

export interface UnifiedRunSummary {
  generatedAt: string
  runId: string
  suites: SuiteResult[]
  sharedServer?: {
    baseUrl: string
  }
  fatalError?: string
  summary: {
    totalSuites: number
    passedSuites: number
    failedSuites: number
    infrastructureFailures: number
    totalTests: number
    passedTests: number
    failedTests: number
    skippedTests: number
    totalDurationMs: number
  }
}

export const ALL_SUITES: SuiteId[] = ["e2e", "browser"]
export const SERVER_SUITES = new Set<SuiteId>(["e2e", "browser"])
