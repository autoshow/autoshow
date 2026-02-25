import { describe, test, beforeAll, afterAll } from "bun:test"
import type {
  TestDefinition,
  TestTiming,
  TestResult,
  TestReport,
  ServerInfo,
} from "~/types"
import {
  setupTestServer,
  stopServer,
  waitForServerReady,
} from "./container"
import { createTestTiming, writeTestReport } from "./api"
import { loadTestDefinitions, loadTestDefinitionsFromPaths } from "./loader"
import { buildFormDataFromDefinition } from "./form-builder"
import { runSingleTest, writeIndividualTestReport } from "./executor"
import {
  TEST_TIMEOUT,
  DELAY_BETWEEN_TESTS_MS,
  getTimestampPrefix,
} from "./constants"

export function createTestSuite(suiteName: string, definitions: TestDefinition[]) {
  console.log(`Loaded ${definitions.length} test definitions for suite: ${suiteName}`)

  if (definitions.length === 0) {
    describe(suiteName, () => {
      test("no tests found", () => {
        throw new Error("No test definitions matched the given patterns")
      })
    })
    return
  }

  const suiteTimestamp = getTimestampPrefix()

  describe(suiteName, () => {
    let server: ServerInfo
    let baseUrl: string
    let serverSetupTiming: TestTiming
    let serverReadyTiming: TestTiming
    const allTestResults: TestResult[] = []
    const suiteStartTime = Date.now()
    let lastTestEndTime = 0

    beforeAll(async () => {
      const setupStart = Date.now()
      server = await setupTestServer()
      baseUrl = `http://localhost:${server.port}`
      const setupEnd = Date.now()
      serverSetupTiming = createTestTiming("serverSetup", setupStart, setupEnd)

      const serverStart = Date.now()
      const ready = await waitForServerReady(baseUrl, 120)
      const serverEnd = Date.now()
      serverReadyTiming = createTestTiming("serverReady", serverStart, serverEnd)

      if (!ready) {
        throw new Error("Server failed to become ready")
      }
    }, 600_000)

    afterAll(async () => {
      const report: TestReport = {
        reportGeneratedAt: new Date().toISOString(),
        environment: {
          platform: process.platform,
          nodeVersion: process.version,
          bunVersion: Bun.version,
        },
        summary: {
          totalTests: allTestResults.length,
          passed: allTestResults.filter((t) => t.status === "passed").length,
          failed: allTestResults.filter((t) => t.status === "failed").length,
          totalDurationMs: Date.now() - suiteStartTime,
        },
        tests: allTestResults,
      }

      const reportName = suiteName.toLowerCase().replace(/[^a-z0-9]+/g, "-")
      await writeTestReport(report, `logs/${suiteTimestamp}-${reportName}-report.json`)

      if (server) {
        await stopServer(server)
      }
    })

    for (const def of definitions) {
      test(def.name, async () => {
        if (lastTestEndTime > 0) {
          const timeSinceLastTest = Date.now() - lastTestEndTime
          if (timeSinceLastTest < DELAY_BETWEEN_TESTS_MS) {
            await Bun.sleep(DELAY_BETWEEN_TESTS_MS - timeSinceLastTest)
          }
        }

        const testStartTime = Date.now()
        const result = await runSingleTest(def, baseUrl, serverSetupTiming, serverReadyTiming)
        allTestResults.push(result)
        lastTestEndTime = Date.now()

        await writeIndividualTestReport(result, def.id, server.logCollector, testStartTime)

        if (result.status === "failed") {
          throw new Error(result.error || "Test failed")
        }
      }, TEST_TIMEOUT)
    }
  })
}

export { loadTestDefinitions, loadTestDefinitionsFromPaths, runSingleTest, buildFormDataFromDefinition }
