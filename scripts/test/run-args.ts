import {
  parseBudgetCents,
  parseBudgetCenticents,
  parseConcurrency,
  parseE2EMode,
} from "./e2e-flags"
import type { E2EMode } from "./e2e-flags"
import { ALL_SUITES, type CliOptions, type SuiteId } from "./run-types"
import { writeStdout } from "../utils/terminal-output"

export const HELP = `Usage:
  bun as runner                     Show this help
  bun as runner e2e                 Run E2E curated minimal suite
  bun as runner browser             Run Playwright browser suite
  bun as runner e2e browser         Run multiple suites

  bun as runner e2e --e2e-mode services
  bun as runner e2e --e2e-mode services2x
  bun as runner e2e --e2e-mode verify
  bun as runner e2e --e2e-mode minimalist
  bun as runner browser --e2e-mode minimal
  bun as runner browser --e2e-mode minimalist
  bun as runner browser --e2e-mode services
  bun as runner browser --e2e-mode services2x
  bun as runner browser --e2e-mode verify
  bun as runner e2e tests/test-definitions/verify
  bun as runner e2e --concurrency 5 tests/test-definitions/verify
  bun as runner e2e --e2e-mode paths --test-price --budget-cents 1 tests/test-definitions/verify
  bun as runner e2e --budget-centicent 50 tests/test-definitions/verify

Suites: ${ALL_SUITES.join(", ")}

General:
  --grep <pattern>     Filter E2E definition names and browser titles
  --test-price         Print price estimates and exit for e2e definitions or browser service cases

E2E:
  --e2e-mode <mode>    E2E mode: minimal, minimalist, services, services2x, verify, all, paths (default: minimal)
  --input <variant>    Input variant(s) for selected E2E definitions and explicit browser E2E mode
  --concurrency <n>    Run Bun E2E definitions with up to <n> concurrent tests (default: 10)
  --budget-cents <cents>       Skip e2e tests above this per-test budget (in cents)
  --budget-centicent <cc>      Skip e2e tests above this per-test budget (in 1/100th of a cent)

Browser:
  --headed             Run Playwright in headed mode
  --e2e-mode <mode>    With browser, explicitly run the definition-driven Playwright suite for minimal/minimalist/services/services2x/verify/all
  <spec.ts>            One or more .spec.ts paths to run (implies browser suite)
`

const REMOVED_SUITES = new Set(["unit", "api"])

type RunnerArgsState = {
  selectedSuites: Set<SuiteId>
  grep?: string
  headed: boolean
  e2eMode: E2EMode
  e2eModeExplicit: boolean
  inputVariants?: string
  testPrice: boolean
  budgetCenticents?: number
  concurrency?: number
  e2ePaths: string[]
  browserPaths: string[]
}

const createInitialState = (): RunnerArgsState => ({
  selectedSuites: new Set<SuiteId>(),
  headed: false,
  e2eMode: "minimal",
  e2eModeExplicit: false,
  testPrice: false,
  e2ePaths: [],
  browserPaths: [],
})

const isValueFlag = (flag: string): boolean => {
  return [
    "--grep",
    "--e2e-mode",
    "--input",
    "--concurrency",
    "--budget-cents",
    "--budget-cent",
    "--budget-c",
    "--budget-centicent",
    "--budget-cc",
  ].includes(flag)
}

const requireFlagValue = (argv: string[], flag: string, index: number): string => {
  const value = argv[index + 1]
  if (!value) throw new Error(`${flag} requires a value`)
  return value
}

const applyValueFlag = (state: RunnerArgsState, flag: string, value: string): boolean => {
  if (flag === "--grep") {
    state.grep = value
    return true
  }

  if (flag === "--e2e-mode") {
    state.e2eMode = parseE2EMode(value)
    state.e2eModeExplicit = true
    return true
  }

  if (flag === "--input") {
    state.inputVariants = value
    return true
  }

  if (flag === "--concurrency") {
    state.concurrency = parseConcurrency(value)
    return true
  }

  if (flag === "--budget-cents" || flag === "--budget-cent" || flag === "--budget-c") {
    state.budgetCenticents = parseBudgetCents(value) * 100
    return true
  }

  if (flag === "--budget-centicent" || flag === "--budget-cc") {
    state.budgetCenticents = parseBudgetCenticents(value)
    return true
  }

  return false
}

const applyBooleanFlag = (state: RunnerArgsState, flag: string): boolean => {
  if (flag === "--headed") {
    state.headed = true
    return true
  }

  if (flag === "--test-price") {
    state.testPrice = true
    return true
  }

  return false
}

const applyPositionalArg = (state: RunnerArgsState, arg: string): void => {
  if (REMOVED_SUITES.has(arg)) {
    throw new Error(`Unsupported suite "${arg}". Available suites: ${ALL_SUITES.join(", ")}`)
  }

  if (ALL_SUITES.includes(arg as SuiteId)) {
    state.selectedSuites.add(arg as SuiteId)
    return
  }

  if (arg.endsWith(".spec.ts") || arg.endsWith(".spec.js")) {
    state.browserPaths.push(arg)
    state.selectedSuites.add("browser")
    return
  }

  state.e2ePaths.push(arg)
}

const handleFlagArg = (state: RunnerArgsState, argv: string[], arg: string, index: number): number => {
  if (applyBooleanFlag(state, arg)) {
    return 0
  }

  if (isValueFlag(arg)) {
    applyValueFlag(state, arg, requireFlagValue(argv, arg, index))
    return 1
  }

  if (arg === "--help" || arg === "-h") {
    writeStdout(HELP)
    process.exit(0)
  }

  if (arg.startsWith("--")) {
    throw new Error(`Unknown flag: ${arg}`)
  }

  return -1
}

const finalizeSuites = (state: RunnerArgsState): SuiteId[] => {
  if (state.e2ePaths.length > 0) {
    state.selectedSuites.add("e2e")
    state.e2eMode = "paths"
  }

  return state.selectedSuites.size > 0
    ? ALL_SUITES.filter((suite) => state.selectedSuites.has(suite))
    : []
}

const validateParsedArgs = (state: RunnerArgsState, suites: SuiteId[]): void => {
  if (suites.length === 0) {
    throw new Error(`Select a suite: ${ALL_SUITES.join(", ")}`)
  }
  if (state.testPrice && !suites.includes("e2e") && !suites.includes("browser")) {
    throw new Error("--test-price only applies when the e2e or browser suite is selected")
  }
  if (state.inputVariants !== undefined && !suites.includes("e2e") && !(suites.includes("browser") && state.e2eModeExplicit)) {
    throw new Error("--input only applies to e2e or browser with explicit --e2e-mode")
  }
  if (state.budgetCenticents !== undefined && !suites.includes("e2e")) {
    throw new Error("--budget-cents only applies when the e2e suite is selected")
  }
  if (state.concurrency !== undefined && !suites.includes("e2e")) {
    throw new Error("--concurrency only applies when the e2e suite is selected")
  }
  if (state.e2eMode === "paths" && suites.includes("e2e") && state.e2ePaths.length === 0) {
    throw new Error("e2e paths mode requires at least one JSON path, directory, or glob")
  }
  if (suites.includes("browser") && state.e2eModeExplicit && state.e2eMode === "paths") {
    throw new Error("browser does not support --e2e-mode paths")
  }
  if (suites.includes("browser") && state.e2eModeExplicit && state.browserPaths.length > 0) {
    throw new Error("browser does not support combining explicit --e2e-mode with .spec.ts paths")
  }
}

export function parseRunnerArgs(argv: string[]): CliOptions {
  const state = createInitialState()

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index]
    if (!arg) {
      continue
    }

    const consumedArgs = handleFlagArg(state, argv, arg, index)
    if (consumedArgs >= 0) {
      index += consumedArgs
      continue
    }

    applyPositionalArg(state, arg)
  }

  const suites = finalizeSuites(state)
  validateParsedArgs(state, suites)

  return {
    suites,
    headed: state.headed,
    e2eMode: state.e2eMode,
    e2eModeExplicit: state.e2eModeExplicit,
    e2ePaths: state.e2ePaths,
    browserPaths: state.browserPaths,
    testPrice: state.testPrice,
    ...(state.concurrency !== undefined ? { concurrency: state.concurrency } : {}),
    ...(state.budgetCenticents !== undefined ? { budgetCenticents: state.budgetCenticents } : {}),
    ...(state.grep ? { grep: state.grep } : {}),
    ...(state.inputVariants ? { inputVariants: state.inputVariants } : {}),
  }
}
