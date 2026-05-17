/**
 * Shared E2E flag parsing used by both the unified runner (run.ts)
 * and the standalone E2E launcher (e2e.ts).
 */

export type E2EMode = "minimal" | "minimalist" | "services" | "services2x" | "verify" | "all" | "paths"

export interface E2EFlags {
  e2eMode: E2EMode
  inputVariants?: string
  testPrice: boolean
  budgetCenticents?: number
  concurrency?: number
  /** Remaining positional args (paths/globs) after flag extraction */
  positionalArgs: string[]
}

export function parseBudgetCents(rawBudget: string): number {
  const budgetCents = Number(rawBudget)
  if (!Number.isInteger(budgetCents) || budgetCents < 0) {
    throw new Error("--budget-cents requires a non-negative integer number of cents")
  }
  return budgetCents
}

export function parseBudgetCenticents(rawValue: string): number {
  const centicents = Number(rawValue)
  if (!Number.isInteger(centicents) || centicents < 0) {
    throw new Error("--budget-centicent requires a non-negative integer")
  }
  return centicents
}

export function parseConcurrency(rawValue: string): number {
  const concurrency = Number(rawValue)
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error("--concurrency requires an integer >= 1")
  }
  return concurrency
}

export function parseE2EMode(rawValue: string): E2EMode {
  if (
    rawValue !== "minimal"
    && rawValue !== "minimalist"
    && rawValue !== "services"
    && rawValue !== "services2x"
    && rawValue !== "verify"
    && rawValue !== "all"
    && rawValue !== "paths"
  ) {
    throw new Error("--e2e-mode must be one of: minimal, minimalist, services, services2x, verify, all, paths")
  }
  return rawValue
}

/**
 * Parse E2E-specific flags from an argv array, returning structured
 * options and any remaining positional arguments.
 */
export function parseE2EFlags(argv: string[]): E2EFlags {
  let e2eMode: E2EMode = "minimal"
  let inputVariants: string | undefined
  let testPrice = false
  let budgetCenticents: number | undefined
  let concurrency: number | undefined
  const positionalArgs: string[] = []

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]

    if (arg === "--e2e-mode") {
      const value = argv[i + 1]
      if (!value) {
        throw new Error("--e2e-mode requires a value")
      }
      e2eMode = parseE2EMode(value)
      i++
    } else if (arg === "--input") {
      const value = argv[i + 1]
      if (!value) {
        throw new Error("--input requires a value")
      }
      inputVariants = value
      i++
    } else if (arg === "--test-price") {
      testPrice = true
    } else if (arg === "--budget-cents" || arg === "--budget-cent" || arg === "--budget-c") {
      const value = argv[i + 1]
      if (!value) {
        throw new Error("--budget-cents requires a value")
      }
      budgetCenticents = parseBudgetCents(value) * 100
      i++
    } else if (arg === "--budget-centicent" || arg === "--budget-cc") {
      const value = argv[i + 1]
      if (!value) {
        throw new Error("--budget-centicent requires a value")
      }
      budgetCenticents = parseBudgetCenticents(value)
      i++
    } else if (arg === "--concurrency") {
      const value = argv[i + 1]
      if (!value) {
        throw new Error("--concurrency requires a value")
      }
      concurrency = parseConcurrency(value)
      i++
    } else if (arg?.startsWith("--")) {
      throw new Error(`Unknown flag: ${arg}`)
    } else if (arg) {
      positionalArgs.push(arg)
    }
  }

  return {
    e2eMode,
    testPrice,
    ...(inputVariants ? { inputVariants } : {}),
    ...(budgetCenticents !== undefined ? { budgetCenticents } : {}),
    ...(concurrency !== undefined ? { concurrency } : {}),
    positionalArgs,
  }
}
