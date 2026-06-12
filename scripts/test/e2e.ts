#!/usr/bin/env bun

import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { resolveTestDefinitionPaths } from "./e2e-paths"
import { parseE2EFlags } from "./e2e-flags"
import { getE2ESuiteName, resolveDefinitionPathsForE2EMode } from "./e2e-mode-selection"
import type { E2EMode } from "./e2e-flags"
import { renderLines, writeStderr, writeStdout } from "../utils/terminal-output"

export {
  CURATED_MINIMAL_E2E_DEFINITION_PATHS,
  CURATED_MINIMALIST_E2E_DEFINITION_PATHS,
} from "./e2e-minimal-suite"

export const DEFAULT_E2E_CONCURRENCY = 10

const HELP = `Usage:
  bun scripts/test/e2e.ts
  bun scripts/test/e2e.ts --e2e-mode minimalist
  bun scripts/test/e2e.ts --e2e-mode services
  bun scripts/test/e2e.ts --e2e-mode services2x
  bun scripts/test/e2e.ts --e2e-mode verify
  bun scripts/test/e2e.ts --e2e-mode all
  bun scripts/test/e2e.ts [--input <variant>] [--concurrency <n>] [--test-price] [--budget-cents <cents>] <path1.json> [path2.json] ...
  bun scripts/test/e2e.ts [--input <variant>] [--concurrency <n>] [--test-price] [--budget-cents <cents>] <directory>
  bun scripts/test/e2e.ts [--input <variant>] [--concurrency <n>] [--test-price] [--budget-cents <cents>] <glob-pattern>

Options:
  --e2e-mode <mode>        E2E mode: minimal, minimalist, services, services2x, verify, all, paths (default: minimal)
  --input <variant>        Input variant(s), comma-separated
                           Audio: 1m-local, 1m-direct, 1m-streaming, 2m-streaming, 5m-direct, 10m-direct, 20m-direct
                           Document: 1p-local, 1p-direct, 3p-local, 10p-direct
  --concurrency <n>        Max concurrent E2E tests (default: 10)
  --test-price             Print estimated cost per test and total, then exit
  --budget-cents <cents>   Skip tests whose estimated price exceeds this per-test budget (in cents)
  --budget-centicent <cc>  Skip tests above this per-test budget (in 1/100th of a cent)

Examples:
  # curated minimal verify subset
  bun scripts/test/e2e.ts
  bun scripts/test/e2e.ts --e2e-mode minimalist
  bun scripts/test/e2e.ts --e2e-mode services
  bun scripts/test/e2e.ts --e2e-mode services2x
  bun scripts/test/e2e.ts --e2e-mode verify
  bun scripts/test/e2e.ts tests/test-definitions/verify/transcription/whisper/verify-transcription-groq-whisperv3turbo.json
  bun scripts/test/e2e.ts --test-price --budget-cents 1 tests/test-definitions/verify
  bun scripts/test/e2e.ts --budget-centicent 50 tests/test-definitions/verify
  bun scripts/test/e2e.ts --input 1m-local tests/test-definitions/verify/transcription/whisper/verify-transcription-groq-whisperv3turbo.json
  bun scripts/test/e2e.ts --input 1m-streaming,2m-streaming tests/test-definitions/verify/transcription
  bun scripts/test/e2e.ts --input 1m-local,10m-direct 'tests/test-definitions/prompts/**/*.json'
  bun scripts/test/e2e.ts --test-price tests/test-definitions/verify/transcription
`

export interface ResolvedStandaloneE2ERun {
  e2eMode: E2EMode
  suiteName: string
  definitionPaths: string[]
  effectiveConcurrency: number
  inputVariants?: string
  testPrice: boolean
  budgetCenticents?: number
}

async function resolveDefinitionPathsForMode(
  e2eMode: E2EMode,
  inputVariants?: string
): Promise<string[]> {
  if (e2eMode !== "paths") {
    return resolveDefinitionPathsForE2EMode(e2eMode, inputVariants)
  }

  return resolveDefinitionPathsForE2EMode("all", inputVariants)
}

function getEffectiveE2EMode(requestedMode: E2EMode, positionalArgs: string[]): E2EMode {
  if (positionalArgs.length > 0) {
    return "paths"
  }
  return requestedMode
}

export async function resolveStandaloneE2ERun(argv: string[]): Promise<ResolvedStandaloneE2ERun> {
  const flags = parseE2EFlags(argv)
  const e2eMode = getEffectiveE2EMode(flags.e2eMode, flags.positionalArgs)

  if (flags.e2eMode === "paths" && flags.positionalArgs.length === 0) {
    throw new Error("e2e paths mode requires at least one JSON path, directory, or glob")
  }

  const definitionPaths = e2eMode === "paths"
    ? await resolveTestDefinitionPaths(flags.positionalArgs)
    : await resolveDefinitionPathsForMode(e2eMode, flags.inputVariants)

  if (definitionPaths.length === 0) {
    throw new Error("No test definition files found matching the selected E2E mode or paths")
  }

  return {
    e2eMode,
    suiteName: getE2ESuiteName(e2eMode, definitionPaths.length),
    definitionPaths,
    effectiveConcurrency: flags.concurrency ?? DEFAULT_E2E_CONCURRENCY,
    testPrice: flags.testPrice,
    ...(flags.inputVariants ? { inputVariants: flags.inputVariants } : {}),
    ...(flags.budgetCenticents !== undefined ? { budgetCenticents: flags.budgetCenticents } : {}),
  }
}

export function buildE2ETestWrapperSource(
  suiteName: string,
  definitionPaths: string[],
  concurrency: number
): string {
  const runnerModuleUrl = pathToFileURL(join(process.cwd(), "scripts/test/harness/runner.ts")).href
  const serializedPaths = JSON.stringify(definitionPaths, null, 2)

  return `import { createTestSuite, loadTestDefinitionsFromPaths } from ${JSON.stringify(runnerModuleUrl)}

const definitionPaths = ${serializedPaths}
const definitions = await loadTestDefinitionsFromPaths(definitionPaths)

createTestSuite(${JSON.stringify(suiteName)}, definitions, { concurrency: ${concurrency} })
`
}

export function buildStandaloneE2ETestCommand(
  wrapperPath: string,
  concurrency: number,
  env: NodeJS.ProcessEnv = process.env
): string[] {
  const command = ["bun", "test", wrapperPath, "--max-concurrency", String(concurrency)]
  if (env.BUN_TEST_NAME_PATTERN) {
    command.push("--test-name-pattern", env.BUN_TEST_NAME_PATTERN)
  }
  if (env.BUN_TEST_REPORTER === "junit" && env.BUN_TEST_REPORTER_OUTFILE) {
    command.push("--reporter=junit", "--reporter-outfile", env.BUN_TEST_REPORTER_OUTFILE)
  }
  return command
}

export function buildStandaloneE2EEnv(
  options: Pick<ResolvedStandaloneE2ERun, "inputVariants" | "testPrice" | "budgetCenticents">,
  baseEnv: NodeJS.ProcessEnv = process.env
): NodeJS.ProcessEnv {
  const { AUTOSHOW_E2E_CONCURRENCY: _ignoredConcurrency, ...env } = baseEnv
  return {
    ...env,
    ...(options.inputVariants ? { INPUT_VARIANTS: options.inputVariants } : {}),
    ...(options.testPrice ? { TEST_PRICE: "true" } : {}),
    ...(options.budgetCenticents !== undefined ? { TEST_BUDGET_CENTICENTS: String(options.budgetCenticents) } : {}),
  }
}

async function writeTemporaryWrapper(source: string): Promise<{ directory: string; filePath: string }> {
  const directory = await mkdtemp(join(tmpdir(), "autoshow-e2e-"))
  const filePath = join(directory, "generated-e2e.test.ts")
  await writeFile(filePath, source, "utf8")
  return { directory, filePath }
}

function printHelp(): void {
  writeStdout(HELP)
}

export async function runStandaloneE2ECommand(argv: string[] = Bun.argv.slice(2)): Promise<number> {
  if (argv.includes("--help") || argv.includes("-h")) {
    printHelp()
    return 0
  }

  let run: ResolvedStandaloneE2ERun
  try {
    run = await resolveStandaloneE2ERun(argv)
  } catch (error) {
    writeStderr(renderLines([
      error instanceof Error ? error.message : String(error),
      "",
      HELP,
    ]))
    return 1
  }

  const wrapperSource = buildE2ETestWrapperSource(
    run.suiteName,
    run.definitionPaths,
    run.effectiveConcurrency,
  )
  const { directory, filePath } = await writeTemporaryWrapper(wrapperSource)

  try {
    const proc = Bun.spawn(
      buildStandaloneE2ETestCommand(filePath, run.effectiveConcurrency),
      {
        stdio: ["inherit", "inherit", "inherit"],
        env: buildStandaloneE2EEnv(run),
      },
    )

    return await proc.exited
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

if (import.meta.main) {
  process.exit(await runStandaloneE2ECommand())
}
