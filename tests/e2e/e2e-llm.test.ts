import { describe, beforeAll, afterAll } from "bun:test"
import {
  setupTestContainer,
  stopAndRemoveContainer,
  waitForServerReady,
  createTestTiming,
  writeTestReport,
} from "./setup"
import type { ContainerInfo, TestResult, TestReport, TestTiming } from "./setup"
import type { TestContext } from "./test-runner"

import { createTests as createTests1mLocalLLM } from "./1m-local-llm.test"
import { createTests as createTests5mLocalLLM } from "./5m-local-llm.test"
import { createTests as createTests10minDirectLLM } from "./10min-direct-llm.test"
import { createTests as createTests20minDirectLLM } from "./20min-direct-llm.test"

const allTests = [
  ...createTests1mLocalLLM,
  ...createTests5mLocalLLM,
  ...createTests10minDirectLLM,
  ...createTests20minDirectLLM,
]

describe("E2E: Process API - LLM Models", () => {
  let container: ContainerInfo
  let baseUrl: string
  let containerSetupTiming: TestTiming
  let serverReadyTiming: TestTiming
  const allTestResults: TestResult[] = []
  const suiteStartTime = Date.now()
  let testIndex = 0

  beforeAll(async () => {
    const setupStart = Date.now()
    container = await setupTestContainer()
    baseUrl = `http://localhost:${container.port}`
    const setupEnd = Date.now()
    containerSetupTiming = createTestTiming("containerSetup", setupStart, setupEnd)

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

    await writeTestReport(report, "tests/e2e/e2e-llm-report.json")

    if (container) {
      await stopAndRemoveContainer(container)
    }
  })

  const ctx: TestContext = {
    baseUrl: () => baseUrl,
    containerSetupTiming: () => containerSetupTiming,
    serverReadyTiming: () => serverReadyTiming,
    addTestResult: (result: TestResult) => {
      allTestResults.push(result)
    },
    getTestIndex: () => testIndex,
    incrementTestIndex: () => {
      testIndex++
    },
  }

  for (const createTest of allTests) {
    createTest(ctx)
  }
})
