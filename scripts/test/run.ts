#!/usr/bin/env bun

import { existsSync } from "node:fs"
import { join } from "node:path"
import { stopServer, waitForServerReady, setupTestServer } from "./harness/server"
import { loadTestDefinitionsFromPaths } from "./harness/definitions"
import { estimateTestSuitePrice, printPricingTable } from "./harness/pricing"
import { getRunnerCliArgs } from "./argv"
import { estimateBrowserSuitePrice, printBrowserPricingTable } from "./browser-pricing"
import {
  resolveDefinitionPathsForE2EMode,
  type ResolvableE2EMode,
} from "./e2e-mode-selection"
import { HELP, parseRunnerArgs } from "./run-args"
import { getTimestampPrefix, runCommand, runCommandPassthrough } from "./run-command"
import { parseJUnitSummary } from "./run-junit"
import { buildSuiteExecution, ensureDir, shouldCreateUnifiedRunArtifacts } from "./run-suites"
import { SERVER_SUITES, type CliOptions, type SuiteResult, type UnifiedRunSummary } from "./run-types"
import { renderLines, writeStderr, writeStdout } from "../utils/terminal-output"
import { UNIFIED_TEST_RUNS_ROOT } from "../../src/utils/artifact-paths"

function filterDefinitionsByGrep(definitions: Awaited<ReturnType<typeof loadTestDefinitionsFromPaths>>, grep?: string) {
  if (!grep) {
    return definitions
  }

  let pattern: RegExp
  try {
    pattern = new RegExp(grep)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Invalid --grep pattern: ${message}`)
  }

  return definitions.filter((definition) => pattern.test(definition.id))
}

export async function runRunnerCommand(argv: string[] = getRunnerCliArgs()) {
  const runStartTime = Date.now()
  if (argv.length === 0) {
    writeStdout(HELP)
    process.exit(0)
  }

  let options: CliOptions
  try {
    options = parseRunnerArgs(argv)
  } catch (error) {
    writeStderr(renderLines([
      error instanceof Error ? error.message : String(error),
      "",
      HELP,
    ]))
    process.exit(1)
  }

  if (!shouldCreateUnifiedRunArtifacts(options)) {
    let failedSuites = 0

    for (const suite of options.suites) {
      if (suite === "browser" && options.testPrice) {
        try {
          if (options.e2eModeExplicit) {
            const browserE2EMode = options.e2eMode as ResolvableE2EMode
            const definitionPaths = await resolveDefinitionPathsForE2EMode(browserE2EMode, options.inputVariants)
            const definitions = filterDefinitionsByGrep(
              await loadTestDefinitionsFromPaths(definitionPaths),
              options.grep
            )
            printPricingTable(estimateTestSuitePrice(definitions))
          } else {
            printBrowserPricingTable(estimateBrowserSuitePrice(options.browserPaths, options.grep))
          }
        } catch (error) {
          writeStderr(error instanceof Error ? error.message : String(error))
          failedSuites++
        }
        continue
      }

      const { command, env } = buildSuiteExecution(suite, options)

      const exitCode = await runCommandPassthrough(command, env, `${suite} suite`)
      if (exitCode !== 0) {
        failedSuites++
      }
    }

    process.exit(failedSuites > 0 ? 1 : 0)
  }

  const runId = getTimestampPrefix()
  const outputDir = join(process.cwd(), UNIFIED_TEST_RUNS_ROOT, runId)
  ensureDir(outputDir)

  const results: SuiteResult[] = []
  const needsServer = !options.testPrice && options.suites.some((suite) => SERVER_SUITES.has(suite))
  let sharedBaseUrl: string | undefined
  let managedServer: Awaited<ReturnType<typeof setupTestServer>> | null = null
  let fatalError: string | undefined

  try {
    if (needsServer) {
      managedServer = await setupTestServer()
      sharedBaseUrl = `http://localhost:${managedServer.port}`
      const ready = await waitForServerReady(sharedBaseUrl, 120)
      if (!ready) {
        throw new Error("Unified test runner failed to start the shared server")
      }
    }

    for (const suite of options.suites) {
      const suiteStart = Date.now()
      const {
        runner,
        command,
        env,
        logPath = join(outputDir, `${suite}.log`),
        junitPath,
      } = buildSuiteExecution(suite, options, sharedBaseUrl, outputDir)

      const exitCode = await runCommand(command, env, logPath, {
        label: `${suite} suite`,
        ...(sharedBaseUrl && SERVER_SUITES.has(suite) ? { baseUrl: sharedBaseUrl } : {}),
        ...(managedServer?.logCollector ? { serverLogCollector: managedServer.logCollector } : {}),
      })
      const durationMs = Date.now() - suiteStart
      const summary = junitPath ? parseJUnitSummary(junitPath) : undefined
      const infrastructureFailure = exitCode !== 0 && (!summary || summary.failed === 0)

      results.push({
        id: suite,
        runner,
        status: exitCode === 0 ? "passed" : "failed",
        exitCode,
        durationMs,
        logPath,
        infrastructureFailure,
        ...(summary ? { summary } : {}),
        ...(junitPath && existsSync(junitPath) ? { junitPath } : {}),
      })
    }
  } catch (error) {
    fatalError = error instanceof Error ? error.message : String(error)
    writeStderr(fatalError)

    for (const suite of options.suites) {
      if (results.some((result) => result.id === suite)) {
        continue
      }

      const runner = suite === "browser" ? "playwright" : "bun"
      const logPath = join(outputDir, `${suite}.log`)
      await Bun.write(logPath, `${fatalError}\n`)

      results.push({
        id: suite,
        runner,
        status: "failed",
        exitCode: 1,
        durationMs: 0,
        logPath,
        infrastructureFailure: true,
      })
    }
  } finally {
    if (managedServer) {
      await stopServer(managedServer)
    }
  }

  const unifiedSummary: UnifiedRunSummary = {
    generatedAt: new Date().toISOString(),
    runId,
    suites: results,
    ...(sharedBaseUrl ? { sharedServer: { baseUrl: sharedBaseUrl } } : {}),
    ...(fatalError ? { fatalError } : {}),
    summary: {
      totalSuites: results.length,
      passedSuites: results.filter((result) => result.status === "passed").length,
      failedSuites: results.filter((result) => result.status === "failed").length,
      infrastructureFailures: results.filter((result) => result.infrastructureFailure).length,
      totalTests: results.reduce((sum, result) => sum + (result.summary?.tests ?? 0), 0),
      passedTests: results.reduce((sum, result) => sum + (result.summary?.passed ?? 0), 0),
      failedTests: results.reduce((sum, result) => sum + (result.summary?.failed ?? 0), 0),
      skippedTests: results.reduce((sum, result) => sum + (result.summary?.skipped ?? 0), 0),
      totalDurationMs: Date.now() - runStartTime,
    },
  }

  const summaryPath = join(outputDir, "summary.json")
  await Bun.write(summaryPath, JSON.stringify(unifiedSummary, null, 2))

  writeStdout(renderLines([
    "",
    "=== Unified Test Summary ===",
    `Run: ${runId}`,
    `Suites: ${unifiedSummary.summary.totalSuites}`,
    `Passed suites: ${unifiedSummary.summary.passedSuites}`,
    `Failed suites: ${unifiedSummary.summary.failedSuites}`,
    `Infrastructure failures: ${unifiedSummary.summary.infrastructureFailures}`,
    `Passed tests: ${unifiedSummary.summary.passedTests}`,
    `Failed tests: ${unifiedSummary.summary.failedTests}`,
    `Skipped tests: ${unifiedSummary.summary.skippedTests}`,
    `Artifacts: ${outputDir}`,
  ]))

  process.exit(unifiedSummary.summary.failedSuites > 0 ? 1 : 0)
}

if (import.meta.main) {
  await runRunnerCommand()
}
