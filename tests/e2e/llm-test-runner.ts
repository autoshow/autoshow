import { test, expect } from "bun:test"
import {
  uploadTestFile,
  submitProcessingJob,
  pollJobUntilComplete,
  fetchShowNotePage,
  createTestTiming,
  writeTestReport,
} from "./setup"
import type { TestResult, TestReport, TestTiming, StepTimings, ShowNotePageData } from "./setup"
import type { Job } from "../../src/types/job"
import {
  DEFAULT_TRANSCRIPTION,
  DEFAULT_PROMPTS,
  TEST_TIMEOUT,
  POLL_TIMEOUT,
  DELAY_BETWEEN_TESTS_MS,
} from "./test-configs"
import type { LLMConfig, TestSuiteConfig } from "./test-configs"
import type { TestContext } from "./test-runner"

export interface LLMTestConfig {
  llm: LLMConfig
  suite: TestSuiteConfig
}

function buildTestName(config: LLMTestConfig): string {
  const typeLabel = config.suite.type === "local" ? "local file" : "direct URL"
  return `${config.suite.prefix}: processes ${typeLabel} with groq-whisper-large-v3-turbo and ${config.llm.nameSuffix} short summary`
}

function buildReportSuffix(config: LLMTestConfig): string {
  const typeLabel = config.suite.type === "local" ? "local" : "direct"
  return `${config.suite.prefix}-${config.llm.id}-${typeLabel}-groq-whisper-large-v3-turbo-${config.llm.nameSuffix}-short-summary`
}

interface FormDataResult {
  formData: FormData
  uploadTiming: TestTiming | null
  fileName: string
  filePath: string
}

async function buildFormData(config: LLMTestConfig, baseUrl: string): Promise<FormDataResult> {
  const formData = new FormData()
  let uploadTiming: TestTiming | null = null
  let fileName: string
  let filePath: string

  if (config.suite.type === "local") {
    const uploadStart = Date.now()
    const upload = await uploadTestFile(baseUrl, config.suite.source)
    uploadTiming = createTestTiming("fileUpload", uploadStart, Date.now())

    expect(upload.filePath).toBeTruthy()
    expect(upload.fileName).toBe(config.suite.expectedFileName!)

    formData.append("uploadedFilePath", upload.filePath)
    formData.append("uploadedFileName", upload.fileName)
    fileName = upload.fileName
    filePath = upload.filePath
  } else {
    formData.append("url", config.suite.source)
    formData.append("urlType", "direct-file")
    fileName = config.suite.source
    filePath = config.suite.source
  }

  formData.append("transcriptionOption", DEFAULT_TRANSCRIPTION.transcriptionOption)
  formData.append("transcriptionModel", DEFAULT_TRANSCRIPTION.transcriptionModel)
  formData.append("selectedPrompts", DEFAULT_PROMPTS)
  formData.append("llmService", config.llm.service)
  formData.append("llmModel", config.llm.model)
  formData.append("ttsEnabled", "false")
  formData.append("imageGenEnabled", "false")
  formData.append("musicGenSkipped", "true")
  formData.append("videoGenEnabled", "false")

  return { formData, uploadTiming, fileName, filePath }
}

interface TestResultParams {
  testName: string
  testStartTime: number
  testEndTime: number
  containerSetupTiming: TestTiming
  serverReadyTiming: TestTiming
  uploadTiming: TestTiming | null
  submitTiming: TestTiming
  stepTimings: StepTimings
  fetchTiming: TestTiming
  fileName: string
  filePath: string
  config: LLMTestConfig
  job: Job
  showNotePage: ShowNotePageData
}

function buildTestResult(params: TestResultParams): TestResult {
  return {
    testName: params.testName,
    status: "passed",
    timestamps: {
      testStartedAt: new Date(params.testStartTime).toISOString(),
      testCompletedAt: new Date(params.testEndTime).toISOString(),
      totalDurationMs: params.testEndTime - params.testStartTime,
    },
    timings: {
      containerSetup: params.containerSetupTiming,
      serverReady: params.serverReadyTiming,
      fileUpload: params.uploadTiming ?? createTestTiming("fileUpload", 0, 0),
      jobSubmission: params.submitTiming,
      download: params.stepTimings.download,
      transcription: params.stepTimings.transcription,
      contentSelection: params.stepTimings.contentSelection,
      llm: params.stepTimings.llm,
      tts: params.stepTimings.tts,
      image: params.stepTimings.image,
      music: params.stepTimings.music,
      video: params.stepTimings.video,
      showNoteFetch: params.fetchTiming,
    },
    input: {
      fileName: params.fileName,
      filePath: params.filePath,
      transcriptionOption: DEFAULT_TRANSCRIPTION.transcriptionOption,
      transcriptionModel: DEFAULT_TRANSCRIPTION.transcriptionModel,
      llmModel: params.config.llm.model,
      selectedPrompts: [DEFAULT_PROMPTS],
      ttsEnabled: false,
      imageGenEnabled: false,
      musicGenEnabled: false,
      videoGenEnabled: false,
    },
    job: {
      jobId: params.job.id,
      status: params.job.status,
      showNoteId: params.job.showNoteId,
      createdAt: params.job.createdAt,
      startedAt: params.job.startedAt,
      completedAt: params.job.completedAt,
      totalJobDurationMs: params.job.completedAt && params.job.startedAt ? params.job.completedAt - params.job.startedAt : 0,
    },
    showNotePage: {
      id: params.showNotePage.id,
      title: params.showNotePage.title,
      hasTranscription: params.showNotePage.hasTranscription,
      hasSummary: params.showNotePage.hasSummary,
      pageSize: params.showNotePage.rawHtml.length,
    },
  }
}

interface FailedTestResultParams {
  testName: string
  testStartTime: number
  testEndTime: number
  error: unknown
  containerSetupTiming: TestTiming
  serverReadyTiming: TestTiming
  fileName: string
  config: LLMTestConfig
}

function buildFailedTestResult(params: FailedTestResultParams): TestResult {
  return {
    testName: params.testName,
    status: "failed",
    error: params.error instanceof Error ? params.error.message : String(params.error),
    timestamps: {
      testStartedAt: new Date(params.testStartTime).toISOString(),
      testCompletedAt: new Date(params.testEndTime).toISOString(),
      totalDurationMs: params.testEndTime - params.testStartTime,
    },
    timings: {
      containerSetup: params.containerSetupTiming,
      serverReady: params.serverReadyTiming,
      fileUpload: createTestTiming("fileUpload", 0, 0),
      jobSubmission: createTestTiming("jobSubmission", 0, 0),
      download: null,
      transcription: null,
      contentSelection: null,
      llm: null,
      tts: null,
      image: null,
      music: null,
      video: null,
      showNoteFetch: createTestTiming("showNoteFetch", 0, 0),
    },
    input: {
      fileName: params.fileName,
      filePath: "",
      transcriptionOption: DEFAULT_TRANSCRIPTION.transcriptionOption,
      transcriptionModel: DEFAULT_TRANSCRIPTION.transcriptionModel,
      llmModel: params.config.llm.model,
      selectedPrompts: [DEFAULT_PROMPTS],
      ttsEnabled: false,
      imageGenEnabled: false,
      musicGenEnabled: false,
      videoGenEnabled: false,
    },
    job: {
      jobId: "",
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
  }
}

function buildIndividualReport(testResult: TestResult, testStartTime: number, testEndTime: number): TestReport {
  return {
    reportGeneratedAt: new Date().toISOString(),
    environment: {
      platform: process.platform,
      nodeVersion: process.version,
      bunVersion: Bun.version,
    },
    summary: {
      totalTests: 1,
      passed: 1,
      failed: 0,
      totalDurationMs: testEndTime - testStartTime,
    },
    tests: [testResult],
  }
}

interface LogParams {
  showNotePage: ShowNotePageData
  containerSetupTiming: TestTiming
  serverReadyTiming: TestTiming
  uploadTiming: TestTiming | null
  submitTiming: TestTiming
  stepTimings: StepTimings
  fetchTiming: TestTiming
}

function logTestResults(params: LogParams): void {
  console.log(`\n--- Test Results ---`)
  console.log(`Show note ID: ${params.showNotePage.id}`)
  console.log(`Page title: ${params.showNotePage.title}`)
  console.log(`Page size: ${params.showNotePage.rawHtml.length} bytes`)
  console.log(`Has transcription content: ${params.showNotePage.hasTranscription}`)
  console.log(`Has summary content: ${params.showNotePage.hasSummary}`)
  console.log(`\n--- Performance ---`)
  console.log(`Container setup: ${params.containerSetupTiming.durationMs}ms`)
  console.log(`Server ready: ${params.serverReadyTiming.durationMs}ms`)
  if (params.uploadTiming) {
    console.log(`File upload: ${params.uploadTiming.durationMs}ms`)
  }
  console.log(`Job submission: ${params.submitTiming.durationMs}ms`)
  console.log(`Download: ${params.stepTimings.download?.durationMs ?? "skipped"}ms`)
  console.log(`Transcription: ${params.stepTimings.transcription?.durationMs ?? "skipped"}ms`)
  console.log(`Content Selection: ${params.stepTimings.contentSelection?.durationMs ?? "skipped"}ms`)
  console.log(`LLM: ${params.stepTimings.llm?.durationMs ?? "skipped"}ms`)
  console.log(`TTS: ${params.stepTimings.tts?.durationMs ?? "skipped"}ms`)
  console.log(`Image: ${params.stepTimings.image?.durationMs ?? "skipped"}ms`)
  console.log(`Music: ${params.stepTimings.music?.durationMs ?? "skipped"}ms`)
  console.log(`Video: ${params.stepTimings.video?.durationMs ?? "skipped"}ms`)
  console.log(`Show note page fetch: ${params.fetchTiming.durationMs}ms`)
}

export function createLLMTest(config: LLMTestConfig) {
  const testName = buildTestName(config)
  const reportSuffix = buildReportSuffix(config)

  return (ctx: TestContext) => {
    test(testName, async () => {
      if (ctx.getTestIndex() > 0) {
        console.log(`\nWaiting ${DELAY_BETWEEN_TESTS_MS}ms before next test (API rate limit avoidance)...`)
        await Bun.sleep(DELAY_BETWEEN_TESTS_MS)
      }
      ctx.incrementTestIndex()

      const testStartTime = Date.now()

      try {
        const { formData, uploadTiming, fileName, filePath } = await buildFormData(config, ctx.baseUrl())

        const submitStart = Date.now()
        const jobId = await submitProcessingJob(ctx.baseUrl(), formData)
        const submitTiming = createTestTiming("jobSubmission", submitStart, Date.now())

        expect(jobId).toMatch(/^job_\d+_[a-z0-9]+$/)

        const { job, stepTimings } = await pollJobUntilComplete(ctx.baseUrl(), jobId, POLL_TIMEOUT)

        expect(job.status).toBe("completed")
        expect(job.showNoteId).toBeTruthy()
        expect(job.error).toBeNull()

        const fetchStart = Date.now()
        const showNotePage = await fetchShowNotePage(ctx.baseUrl(), job.showNoteId!)
        const fetchTiming = createTestTiming("showNoteFetch", fetchStart, Date.now())

        expect(showNotePage.id).toBe(job.showNoteId!)
        expect(showNotePage.rawHtml).toContain(job.showNoteId!)
        expect(showNotePage.rawHtml.length).toBeGreaterThan(1000)

        const testEndTime = Date.now()

        const testResult = buildTestResult({
          testName,
          testStartTime,
          testEndTime,
          containerSetupTiming: ctx.containerSetupTiming(),
          serverReadyTiming: ctx.serverReadyTiming(),
          uploadTiming,
          submitTiming,
          stepTimings,
          fetchTiming,
          fileName,
          filePath,
          config,
          job,
          showNotePage,
        })

        ctx.addTestResult(testResult)

        const report = buildIndividualReport(testResult, testStartTime, testEndTime)
        await writeTestReport(report, `tests/e2e/${job.showNoteId}-${reportSuffix}.json`)

        logTestResults({
          showNotePage,
          containerSetupTiming: ctx.containerSetupTiming(),
          serverReadyTiming: ctx.serverReadyTiming(),
          uploadTiming,
          submitTiming,
          stepTimings,
          fetchTiming,
        })
      } catch (error) {
        const testEndTime = Date.now()
        const expectedFileName = config.suite.type === "local" ? config.suite.expectedFileName! : config.suite.source

        const testResult = buildFailedTestResult({
          testName,
          testStartTime,
          testEndTime,
          error,
          containerSetupTiming: ctx.containerSetupTiming(),
          serverReadyTiming: ctx.serverReadyTiming(),
          fileName: expectedFileName,
          config,
        })

        ctx.addTestResult(testResult)
        throw error
      }
    }, TEST_TIMEOUT)
  }
}
