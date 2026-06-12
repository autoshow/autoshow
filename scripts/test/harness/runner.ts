import { expect, describe, test, beforeAll, afterAll } from "bun:test"
import { mkdir, rm } from "node:fs/promises"
import { join } from "node:path"
import type {
  Job,
  TestTiming,
  StepTimings,
  JobPollResult,
  TestReport,
  ShowNotePageData,
  TestDefinition,
  TestResult,
  ServerLogCollector,
  ServerInfo,
  TestExecutionContext,
} from "~/types"
import { setupTestServer, stopServer, waitForServerReady } from "./server"
import {
  buildFormDataFromDefinition,
  TEST_TIMEOUT,
  POLL_TIMEOUT,
  DELAY_BETWEEN_TESTS_MS,
  getTimestampPrefix,
} from "./definitions"
import {
  estimateTestDefinitionPrice,
  estimateTestSuitePrice,
  getBudgetSummary,
  printPricingTable,
} from "./pricing"
import {
  COST_DISPARITY_THRESHOLDS,
  SPEED_DISPARITY_THRESHOLDS,
  summarizeBenchmarkDisparities,
} from "./benchmark-analysis"
import { KNOWN_DURATIONS_SEC, KNOWN_PAGE_COUNTS, findKnownInputSize } from "./input-fixtures"
import { writeMirroredBenchmarkReport } from "./output"
import { renderLines, writeStdout } from "../../utils/terminal-output"
import {
  createTestExecutionContext,
} from "./concurrency"
import {
  buildBenchmarkReportEntry,
  getActualPrimaryStepDurationMs,
} from "./duration-estimation"
import { getDatabase, initializeSchema } from "~/database/db"
import { getJobProgressTimingKey } from "~/utils/job-progress"
import { getShowNoteOutputDir } from "~/utils/artifact-paths"

const SHARED_E2E_UPLOAD_RATE_LIMIT_KEYS = [
  "upload:simple:ip:untrusted",
  "upload:chunk:ip:untrusted",
] as const
type IndexedTestDefinition = {
  def: TestDefinition
  originalDefinitionIndex: number
}

interface CreateTestSuiteOptions {
  concurrency: number
}

interface E2ETestScheduling {
  applySequentialDelay: boolean
  useConcurrentDefinitions: boolean
  isolateSerialDefinitions: boolean
}

function parseTestBudgetCenticents(): number | undefined {
  const rawBudget = process.env.TEST_BUDGET_CENTICENTS
  if (!rawBudget) {
    return undefined
  }

  const budgetCenticents = Number(rawBudget)
  if (!Number.isInteger(budgetCenticents) || budgetCenticents < 0) {
    throw new Error("TEST_BUDGET_CENTICENTS must be a non-negative integer")
  }

  return budgetCenticents
}

function indexDefinitions(definitions: TestDefinition[]): IndexedTestDefinition[] {
  return definitions.map((def, originalDefinitionIndex) => ({ def, originalDefinitionIndex }))
}

async function prepareSharedE2ESuiteState(): Promise<void> {
  const db = getDatabase()
  await initializeSchema(db)

  for (const key of SHARED_E2E_UPLOAD_RATE_LIMIT_KEYS) {
    await db`DELETE FROM rate_limit WHERE key = ${key}`
  }
}

async function cleanupE2ERunState(): Promise<void> {
  const db = getDatabase()
  await initializeSchema(db)

  for (const key of SHARED_E2E_UPLOAD_RATE_LIMIT_KEYS) {
    await db`DELETE FROM rate_limit WHERE key = ${key}`
  }
}

async function cleanupProcessingOutputs(showNoteIds: Iterable<string>): Promise<void> {
  for (const showNoteId of showNoteIds) {
    await rm(getShowNoteOutputDir(showNoteId), { recursive: true, force: true })
  }
}




async function fetchRuntimeEstimatedCostUsd(showNoteId: string): Promise<number | null> {
  const db = getDatabase()
  await initializeSchema(db)

  const rows = await db`
    SELECT total_cost_usd
    FROM show_notes
    WHERE id = ${showNoteId}
    LIMIT 1
  `

  const row = rows[0] as { total_cost_usd: number | null } | undefined
  if (row?.total_cost_usd == null) {
    return null
  }

  return row.total_cost_usd
}

function formatTimestamp(): string {
  const now = new Date()
  const hours = now.getHours().toString().padStart(2, "0")
  const minutes = now.getMinutes().toString().padStart(2, "0")
  const seconds = now.getSeconds().toString().padStart(2, "0")
  const millis = now.getMilliseconds().toString().padStart(3, "0")
  return `${hours}:${minutes}:${seconds}.${millis}`
}

function createTestTiming(step: string, startedAt: number, completedAt: number): TestTiming {
  return {
    step,
    startedAt,
    completedAt,
    durationMs: completedAt - startedAt,
  }
}

function getRuntimeStepTimingKey(stepName: string | null | undefined): keyof StepTimings | null {
  const stepKey = getJobProgressTimingKey(stepName)

  switch (stepKey) {
    case "download":
      return "download"
    case "transcription":
      return "transcription"
    case "writeAndTts":
    case "contentSelection":
    case "llm":
    case "tts":
      return "writeAndTts"
    case "media":
    case "image":
    case "music":
    case "video":
      return "media"
    default:
      return null
  }
}

async function writeTestReport(report: TestReport, outputPath: string): Promise<void> {
  const { reportPath, mirroredReportPath } = await writeMirroredBenchmarkReport(outputPath, report)
  writeStdout(renderLines([
    `Test report written to: ${reportPath}`,
    ...(mirroredReportPath !== reportPath
      ? [`Mirrored test report written to: ${mirroredReportPath}`]
      : []),
  ]))
}

async function uploadTestFile(
  baseUrl: string,
  filePath: string,
  requestHeaders: HeadersInit
): Promise<{ uploadId: string; fileName: string }> {
  const file = Bun.file(filePath)
  const fileName = filePath.split("/").pop() || "test.mp3"

  const formData = new FormData()
  formData.append("file", file, fileName)

  const response = await fetch(`${baseUrl}/api/download/upload`, {
    method: "POST",
    headers: requestHeaders,
    body: formData,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Upload failed: ${error}`)
  }

  const result = await response.json()
  return {
    uploadId: result.uploadId,
    fileName: result.fileName,
  }
}

async function submitProcessingJob(
  baseUrl: string,
  formData: FormData,
  requestHeaders: HeadersInit
): Promise<string> {
  const response = await fetch(`${baseUrl}/api/process`, {
    method: "POST",
    headers: requestHeaders,
    body: formData,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Job submission failed: ${error}`)
  }

  const result = await response.json()
  return result.jobId
}

async function pollJobUntilComplete(
  baseUrl: string,
  jobId: string,
  requestHeaders: HeadersInit,
  timeoutMs: number = 300_000
): Promise<JobPollResult> {
  const startTime = Date.now()
  const pollInterval = 100
  const pollLogs: string[] = []

  const stepTimings: StepTimings = {
    download: null,
    transcription: null,
    writeAndTts: null,
    media: null,
  }

  let currentStepKey: keyof StepTimings | null = null
  let currentStepStartTime: number | null = null
  let lastLogKey = ""

  while (Date.now() - startTime < timeoutMs) {
    const response = await fetch(`${baseUrl}/api/jobs/${jobId}`, {
      headers: requestHeaders,
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch job status: ${response.status}`)
    }

    const job = (await response.json()) as Job
    const now = Date.now()
    const logKey = `${job.status}-${job.stepName || "waiting"}-${job.overallProgress}`

    if (logKey !== lastLogKey) {
      const logLine = `[${formatTimestamp()}] Job ${jobId}: ${job.status} - ${job.stepName || "waiting"} (${job.overallProgress}%)`
      pollLogs.push(logLine)
      lastLogKey = logKey
    }

    const stepKey = getRuntimeStepTimingKey(job.stepName)

    if (stepKey && stepKey !== currentStepKey) {
      if (currentStepKey && currentStepStartTime) {
        stepTimings[currentStepKey] = createTestTiming(currentStepKey, currentStepStartTime, now)
      }
      currentStepKey = stepKey
      currentStepStartTime = now
    }

    if (job.status === "completed") {
      if (currentStepKey && currentStepStartTime) {
        stepTimings[currentStepKey] = createTestTiming(currentStepKey, currentStepStartTime, now)
      }
      return { job, stepTimings, pollLogs }
    }

    if (job.status === "error") {
      throw new Error(`Job failed: ${job.error || "Unknown error"}`)
    }

    await Bun.sleep(pollInterval)
  }

  throw new Error(`Job ${jobId} timed out after ${timeoutMs}ms`)
}

async function fetchShowNotePage(
  baseUrl: string,
  showNoteId: string,
  requestHeaders: HeadersInit
): Promise<ShowNotePageData> {
  const response = await fetch(`${baseUrl}/show-notes/${showNoteId}`, {
    headers: requestHeaders,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to fetch show note page: ${response.status} - ${error}`)
  }

  const html = await response.text()

  const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/)
  const title = titleMatch?.[1]?.trim() ?? ""

  const hasTranscription = html.includes("Transcription") || html.includes("transcription")
  const hasSummary = html.includes("Summary") || html.includes("summary")

  const transcriptionServiceMatch = html.match(/Transcription Service[^>]*>([^<]+)</)
  const transcriptionService = transcriptionServiceMatch?.[1]?.trim() ?? null

  const transcriptionModelMatch = html.match(/Transcription Model[^>]*>([^<]+)</)
  const transcriptionModel = transcriptionModelMatch?.[1]?.trim() ?? null

  const llmModelMatch = html.match(/LLM Model[^>]*>([^<]+)</)
  const llmModel = llmModelMatch?.[1]?.trim() ?? null

  return {
    id: showNoteId,
    title,
    hasTranscription,
    hasSummary,
    transcriptionService,
    transcriptionModel,
    llmModel,
    rawHtml: html,
  }
}

async function writeIndividualTestReport(
  result: TestResult,
  context: TestExecutionContext,
  logCollector: ServerLogCollector,
  testStartTime: number
): Promise<void> {
  await mkdir(context.artifactDir, { recursive: true })

  const reportPath = join(context.artifactDir, `${context.artifactPrefix}-report.json`)
  const logsPath = join(context.artifactDir, `${context.artifactPrefix}-server.log`)

  const report: TestReport = {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    tests: [result.reportEntry],
  }

  const serverLogs = result.job.jobId
    ? logCollector.getLogsAsTextContaining(`job=${result.job.jobId}`)
    : logCollector.getLogsAsText(testStartTime)

  await Promise.all([
    Bun.write(reportPath, JSON.stringify(report, null, 2)),
    Bun.write(logsPath, serverLogs || "(no server logs captured for this test)"),
  ])

  writeStdout(renderLines([
    `Test report written to: ${reportPath}`,
    `Server logs written to: ${logsPath}`,
  ]))
}

async function runSingleTest(
  def: TestDefinition,
  context: TestExecutionContext,
  baseUrl: string,
  serverSetupTiming: TestTiming,
  serverReadyTiming: TestTiming
): Promise<TestResult> {
  const testStartTime = Date.now()
  const testStartedAt = new Date(testStartTime).toISOString()
  let jobId = ""

  try {
    estimateTestDefinitionPrice(def)

    const formData = buildFormDataFromDefinition(def)

    const { value: knownDurationSec } = findKnownInputSize(def, KNOWN_DURATIONS_SEC)
    if (knownDurationSec != null) {
      formData.append("urlDuration", String(knownDurationSec))
    }

    const { value: knownPageCount } = findKnownInputSize(def, KNOWN_PAGE_COUNTS)
    if (knownPageCount != null) {
      formData.append("documentPageCount", String(knownPageCount))
    }

    let uploadTiming: TestTiming | null = null
    let fileName: string
    let filePath: string

    if (def.input.type === "local" && def.input.path) {
      const uploadStart = Date.now()
      const upload = await uploadTestFile(baseUrl, def.input.path, context.requestHeaders)
      uploadTiming = createTestTiming("fileUpload", uploadStart, Date.now())

      expect(upload.uploadId).toBeTruthy()

      formData.append("uploadId", upload.uploadId)
      fileName = upload.fileName
      filePath = def.input.path
    } else if (def.input.type === "url" && def.input.url) {
      formData.append("url", def.input.url)
      formData.append("urlType", def.input.urlType || "direct-file")
      fileName = def.input.url
      filePath = def.input.url
    } else {
      throw new Error(`Invalid input configuration for test ${def.id}`)
    }

    const submitStart = Date.now()
    jobId = await submitProcessingJob(baseUrl, formData, context.requestHeaders)
    const submitTiming = createTestTiming("jobSubmission", submitStart, Date.now())

    expect(jobId).toMatch(/^job_\d+_[a-z0-9]+$/)

    const { job, stepTimings } = await pollJobUntilComplete(baseUrl, jobId, context.requestHeaders, POLL_TIMEOUT)

    expect(job.status).toBe("completed")
    expect(job.showNoteId).toBeTruthy()
    expect(job.error).toBeNull()

    const fetchStart = Date.now()
    const showNotePage = await fetchShowNotePage(baseUrl, job.showNoteId!, context.requestHeaders)
    const fetchTiming = createTestTiming("showNoteFetch", fetchStart, Date.now())

    expect(showNotePage.id).toBe(job.showNoteId!)
    expect(showNotePage.rawHtml).toContain(job.showNoteId!)
    expect(showNotePage.rawHtml.length).toBeGreaterThan(1000)

    const runtimeEstimatedCostUsd = await fetchRuntimeEstimatedCostUsd(job.showNoteId!)
    const testEndTime = Date.now()
    const actualDurationMs = testEndTime - testStartTime
    const actualPrimaryStepDurationMs = getActualPrimaryStepDurationMs(def, stepTimings)

    return {
      testName: def.name,
      status: "passed",
      timestamps: {
        testStartedAt,
        testCompletedAt: new Date(testEndTime).toISOString(),
        totalDurationMs: actualDurationMs,
      },
      timings: {
        containerSetup: serverSetupTiming,
        serverReady: serverReadyTiming,
        fileUpload: uploadTiming ?? createTestTiming("fileUpload", 0, 0),
        jobSubmission: submitTiming,
        download: stepTimings.download,
        transcription: stepTimings.transcription,
        writeAndTts: stepTimings.writeAndTts,
        media: stepTimings.media,
        showNoteFetch: fetchTiming,
      },
      input: {
        fileName,
        filePath,
        transcriptionOption: def.transcription.service,
        transcriptionModel: def.transcription.model,
        llmModel: def.llm.model,
        selectedPrompts: def.llm.prompts,
        ttsEnabled: def.tts.enabled,
        imageGenEnabled: def.image.enabled,
        musicGenEnabled: def.music.enabled,
        videoGenEnabled: def.video.enabled,
      },
      job: {
        jobId: job.id,
        status: job.status,
        showNoteId: job.showNoteId,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        totalJobDurationMs: job.completedAt && job.startedAt ? job.completedAt - job.startedAt : 0,
      },
      showNotePage: {
        id: showNotePage.id,
        title: showNotePage.title,
        hasTranscription: showNotePage.hasTranscription,
        hasSummary: showNotePage.hasSummary,
        pageSize: showNotePage.rawHtml.length,
      },
      reportEntry: buildBenchmarkReportEntry(
        def,
        testStartedAt,
        actualDurationMs,
        actualPrimaryStepDurationMs,
        runtimeEstimatedCostUsd
      ),
    }
  } catch (error) {
    const testEndTime = Date.now()
    const emptyTiming = createTestTiming("", 0, 0)
    const actualDurationMs = testEndTime - testStartTime

    return {
      testName: def.name,
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
      timestamps: {
        testStartedAt,
        testCompletedAt: new Date(testEndTime).toISOString(),
        totalDurationMs: actualDurationMs,
      },
      timings: {
        containerSetup: serverSetupTiming,
        serverReady: serverReadyTiming,
        fileUpload: emptyTiming,
        jobSubmission: emptyTiming,
        download: null,
        transcription: null,
        writeAndTts: null,
        media: null,
        showNoteFetch: emptyTiming,
      },
      input: {
        fileName: def.input.path || def.input.url || "",
        filePath: "",
        transcriptionOption: def.transcription.service,
        transcriptionModel: def.transcription.model,
        llmModel: def.llm.model,
        selectedPrompts: def.llm.prompts,
        ttsEnabled: def.tts.enabled,
        imageGenEnabled: def.image.enabled,
        musicGenEnabled: def.music.enabled,
        videoGenEnabled: def.video.enabled,
      },
      job: {
        jobId,
        status: "failed",
        showNoteId: null,
        createdAt: 0,
        startedAt: null,
        completedAt: null,
        totalJobDurationMs: 0,
      },
      showNotePage: {
        id: "",
        title: "",
        hasTranscription: false,
        hasSummary: false,
        pageSize: 0,
      },
      reportEntry: buildBenchmarkReportEntry(def, testStartedAt, actualDurationMs, null, null),
    }
  }
}

function selectIndexedDefinitions(
  definitions: TestDefinition[],
  pricingResult?: ReturnType<typeof estimateTestSuitePrice>
): IndexedTestDefinition[] {
  const indexedDefinitions = indexDefinitions(definitions)
  if (!pricingResult) {
    return indexedDefinitions
  }

  const selectedDefinitions = new Set(pricingResult.perTest.map(entry => entry.def))
  return indexedDefinitions.filter(({ def }) => selectedDefinitions.has(def))
}

function isSerialDefinition(def: TestDefinition): boolean {
  return def.tags.includes("serial")
    || (def.video.enabled === true && def.video.service === "gemini")
}

function getE2ETestScheduling(concurrency: number): E2ETestScheduling {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error("E2E test suite concurrency must be an integer >= 1")
  }

  return {
    applySequentialDelay: concurrency === 1,
    useConcurrentDefinitions: concurrency > 1,
    isolateSerialDefinitions: concurrency > 1,
  }
}

export function createTestSuite(
  suiteName: string,
  definitions: TestDefinition[],
  options: CreateTestSuiteOptions
) {
  const { concurrency: effectiveConcurrency } = options
  const scheduling = getE2ETestScheduling(effectiveConcurrency)

  const budgetCenticents = parseTestBudgetCenticents()
  const pricingResult = budgetCenticents !== undefined || process.env.TEST_PRICE === "true"
    ? estimateTestSuitePrice(
      definitions,
      budgetCenticents !== undefined ? { budgetCenticents } : {}
    )
    : undefined

  const selectedDefinitions = selectIndexedDefinitions(definitions, pricingResult)

  const budgetSummary = pricingResult ? getBudgetSummary(pricingResult) : null
  void budgetSummary

  if (process.env.TEST_PRICE === "true") {
    printPricingTable(pricingResult ?? estimateTestSuitePrice(definitions))
    process.exit(0)
  }

  if (definitions.length === 0) {
    describe(suiteName, () => {
      test("no tests found", () => {
        throw new Error("No test definitions matched the given patterns")
      })
    })
    return
  }

  if (budgetCenticents !== undefined && selectedDefinitions.length === 0) {
    describe(suiteName, () => {
      test.skip("no tests selected under budget", () => {})
    })
    return
  }

  const suiteTimestamp = getTimestampPrefix()

  describe(suiteName, () => {
    let server: ServerInfo
    let baseUrl: string
    let serverSetupTiming: TestTiming
    let serverReadyTiming: TestTiming
    const allTestResults: Array<TestResult | undefined> = new Array(definitions.length)
    const completedShowNoteIds = new Set<string>()
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

      await prepareSharedE2ESuiteState()
    }, 600_000)

    afterAll(async () => {
      try {
        const reportEntries = allTestResults
          .filter((result): result is TestResult => result !== undefined)
          .map((result) => result.reportEntry)
        const report: TestReport = {
          schemaVersion: 2,
          generatedAt: new Date().toISOString(),
          tests: reportEntries,
        }

        const reportName = suiteName.toLowerCase().replace(/[^a-z0-9]+/g, "-")
        await writeTestReport(report, `${suiteTimestamp}-${reportName}-report.json`)

        const durationSummary = summarizeBenchmarkDisparities(reportEntries, {
          estimate: (entry) => entry.durations.endToEnd.estimatedMs,
          actual: (entry) => entry.durations.endToEnd.actualMs,
          thresholds: SPEED_DISPARITY_THRESHOLDS,
        })
        const primaryStepSummary = summarizeBenchmarkDisparities(reportEntries, {
          estimate: (entry) => entry.durations.primaryStep.estimatedMs,
          actual: (entry) => entry.durations.primaryStep.actualMs,
          thresholds: SPEED_DISPARITY_THRESHOLDS,
        })
        const costSummary = summarizeBenchmarkDisparities(reportEntries, {
          estimate: (entry) => entry.cost.estimatedUsd,
          actual: (entry) => entry.cost.runtimeEstimatedUsd,
          thresholds: COST_DISPARITY_THRESHOLDS,
        })

        void durationSummary
        void primaryStepSummary
        void costSummary
      } finally {
        try {
          await cleanupE2ERunState()
          await cleanupProcessingOutputs(completedShowNoteIds)
        } finally {
          if (server) {
            await stopServer(server)
          }
        }
      }
    })

    const runDefinitionTest = async ({ def, originalDefinitionIndex }: IndexedTestDefinition) => {
      if (scheduling.applySequentialDelay && lastTestEndTime > 0) {
        const timeSinceLastTest = Date.now() - lastTestEndTime
        if (timeSinceLastTest < DELAY_BETWEEN_TESTS_MS) {
          await Bun.sleep(DELAY_BETWEEN_TESTS_MS - timeSinceLastTest)
        }
      }

      const context = createTestExecutionContext(def.id, originalDefinitionIndex)

      const testStartTime = Date.now()
      const result = await runSingleTest(def, context, baseUrl, serverSetupTiming, serverReadyTiming)
      allTestResults[originalDefinitionIndex] = result

      if (result.job.showNoteId) {
        completedShowNoteIds.add(result.job.showNoteId)
      }

      if (scheduling.applySequentialDelay) {
        lastTestEndTime = Date.now()
      }

      await writeIndividualTestReport(result, context, server.logCollector, testStartTime)

      if (result.status === "failed") {
        throw new Error(result.error || "Test failed")
      }
    }

    const concurrentDefinitions = selectedDefinitions.filter(({ def }) => !isSerialDefinition(def))
    const serialDefinitions = selectedDefinitions.filter(({ def }) => isSerialDefinition(def))
    const concurrentTest = scheduling.useConcurrentDefinitions ? test.concurrent : test
    const serialTest = scheduling.isolateSerialDefinitions ? test.serial : test

    for (const indexedDef of concurrentDefinitions) {
      concurrentTest(indexedDef.def.name, async () => {
        await runDefinitionTest(indexedDef)
      }, TEST_TIMEOUT)
    }

    for (const indexedDef of serialDefinitions) {
      serialTest(indexedDef.def.name, async () => {
        await runDefinitionTest(indexedDef)
      }, TEST_TIMEOUT)
    }
  })
}

export { loadTestDefinitionsFromPaths } from "./definitions"
