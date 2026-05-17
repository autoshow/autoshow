import { existsSync, mkdirSync } from "node:fs"
import { join } from "node:path"
import type { CliOptions, SuiteId } from "./run-types"
import { SERVER_SUITES } from "./run-types"
import { BROWSER_E2E_DEFINITIONS_SPEC_PATH } from "../../tests/playwright/browser-e2e-cases"

function ensureDir(path: string): void {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true })
  }
}

function createSuiteEnv(baseEnv: NodeJS.ProcessEnv, outputDir?: string): NodeJS.ProcessEnv {
  const {
    AUTOSHOW_E2E_CONCURRENCY: _ignoredConcurrency,
    AUTOSHOW_PLAYWRIGHT_E2E_MODE: _ignoredBrowserE2EMode,
    INPUT_VARIANTS: _ignoredInputVariants,
    ...env
  } = baseEnv
  if (!outputDir) {
    return { ...env }
  }

  return {
    ...env,
    TEST_RUN_OUTPUT_DIR: outputDir,
  }
}

export function buildE2ECommand(
  options: CliOptions,
  junitPath?: string
): { command: string[]; env: NodeJS.ProcessEnv } {
  const { AUTOSHOW_E2E_CONCURRENCY: _ignoredConcurrency, ...env } = process.env
  const command = ["bun", "scripts/test/e2e.ts"]
  if (options.e2eMode !== "minimal" && options.e2eMode !== "paths") {
    command.push("--e2e-mode", options.e2eMode)
  }
  if (options.inputVariants) {
    command.push("--input", options.inputVariants)
  }
  if (options.concurrency !== undefined) {
    command.push("--concurrency", String(options.concurrency))
  }
  if (options.testPrice) {
    command.push("--test-price")
  }
  if (options.budgetCenticents !== undefined) {
    command.push("--budget-cc", String(options.budgetCenticents))
  }
  command.push(...options.e2ePaths)

  return {
    command,
    env: {
      ...env,
      ...(junitPath
        ? {
            BUN_TEST_REPORTER: "junit",
            BUN_TEST_REPORTER_OUTFILE: junitPath,
          }
        : {}),
      ...(options.grep ? { BUN_TEST_NAME_PATTERN: options.grep } : {}),
    },
  }
}

function buildBrowserCommand(options: CliOptions): string[] {
  const command = ["bun", "x", "playwright", "test"]
  if (options.grep) {
    command.push("--grep", options.grep)
  }
  if (options.headed) {
    command.push("--headed")
  }
  if (options.e2eModeExplicit) {
    command.push(BROWSER_E2E_DEFINITIONS_SPEC_PATH)
  } else if (options.browserPaths.length > 0) {
    command.push(...options.browserPaths)
  }
  return command
}

export function shouldCreateUnifiedRunArtifacts(options: CliOptions): boolean {
  return !options.testPrice
}

type SuiteExecution = {
  runner: "bun" | "playwright"
  command: string[]
  env: NodeJS.ProcessEnv
  logPath?: string
  junitPath?: string
}

const buildSharedServerEnv = (
  suite: SuiteId,
  sharedBaseUrl: string | undefined,
  outputDir: string | undefined,
  junitPath: string | undefined
): NodeJS.ProcessEnv => {
  if (!sharedBaseUrl || !SERVER_SUITES.has(suite)) {
    return {}
  }

  return {
    TEST_SERVER_MODE: "external",
    BASE_URL: sharedBaseUrl,
    PLAYWRIGHT_BASE_URL: sharedBaseUrl,
    PLAYWRIGHT_DISABLE_WEBSERVER: "1",
    ...(outputDir ? { PLAYWRIGHT_OUTPUT_DIR: join(outputDir, "playwright-artifacts") } : {}),
    ...(junitPath ? { PLAYWRIGHT_JUNIT_REPORT: junitPath } : {}),
  }
}

const buildExecutionResult = (
  suite: SuiteId,
  runner: "bun" | "playwright",
  command: string[],
  env: NodeJS.ProcessEnv,
  outputDir?: string,
  junitPath?: string
): SuiteExecution => {
  return {
    runner,
    command,
    env,
    ...(outputDir ? { logPath: join(outputDir, `${suite}.log`) } : {}),
    ...(junitPath ? { junitPath } : {}),
  }
}

const buildE2EExecution = (
  options: CliOptions,
  env: NodeJS.ProcessEnv,
  outputDir?: string,
  junitPath?: string
): SuiteExecution => {
  const e2eRun = buildE2ECommand(options, junitPath)
  return buildExecutionResult(
    "e2e",
    "bun",
    e2eRun.command,
    {
      ...env,
      ...e2eRun.env,
    },
    outputDir,
    junitPath
  )
}

const buildBrowserExecution = (
  options: CliOptions,
  env: NodeJS.ProcessEnv,
  outputDir?: string,
  junitPath?: string
): SuiteExecution => {
  const browserEnv: NodeJS.ProcessEnv = {
    ...env,
    ...(options.e2eModeExplicit ? { AUTOSHOW_PLAYWRIGHT_E2E_MODE: options.e2eMode } : {}),
    ...(options.e2eModeExplicit && options.inputVariants ? { INPUT_VARIANTS: options.inputVariants } : {}),
  }

  return buildExecutionResult(
    "browser",
    "playwright",
    buildBrowserCommand(options),
    browserEnv,
    outputDir,
    junitPath
  )
}

const SUITE_BUILDERS: Record<
  SuiteId,
  (options: CliOptions, env: NodeJS.ProcessEnv, outputDir?: string, junitPath?: string) => SuiteExecution
> = {
  e2e: buildE2EExecution,
  browser: buildBrowserExecution,
}

export function buildSuiteExecution(
  suite: SuiteId,
  options: CliOptions,
  sharedBaseUrl?: string,
  outputDir?: string
): SuiteExecution {
  const junitPath = outputDir ? join(outputDir, `${suite}.junit.xml`) : undefined
  const baseEnv = createSuiteEnv(process.env, outputDir)
  const env: NodeJS.ProcessEnv = {
    ...baseEnv,
    ...buildSharedServerEnv(suite, sharedBaseUrl, outputDir, junitPath),
  }

  return SUITE_BUILDERS[suite](options, env, outputDir, junitPath)
}

export { ensureDir }
