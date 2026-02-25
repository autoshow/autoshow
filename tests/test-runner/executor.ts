import { expect } from "bun:test"
import type {
  TestDefinition,
  TestTiming,
  TestResult,
  TestReport,
  ServerLogCollector,
} from "~/types"
import {
  createTestTiming,
  uploadTestFile,
  submitProcessingJob,
  pollJobUntilComplete,
  fetchShowNotePage,
} from "./api"
import { buildFormDataFromDefinition } from "./form-builder"
import { getTimestampPrefix, POLL_TIMEOUT } from "./constants"

export async function writeIndividualTestReport(
  result: TestResult,
  testId: string,
  logCollector: ServerLogCollector,
  testStartTime: number
): Promise<void> {
  const timestamp = getTimestampPrefix()
  const sanitizedId = testId.toLowerCase().replace(/[^a-z0-9]+/g, "-")
  const reportPath = `logs/${timestamp}-${sanitizedId}-report.json`
  const logsPath = `logs/${timestamp}-${sanitizedId}-server.log`
  
  const report: TestReport = {
    reportGeneratedAt: new Date().toISOString(),
    environment: {
      platform: process.platform,
      nodeVersion: process.version,
      bunVersion: Bun.version,
    },
    summary: {
      totalTests: 1,
      passed: result.status === "passed" ? 1 : 0,
      failed: result.status === "failed" ? 1 : 0,
      totalDurationMs: result.timestamps.totalDurationMs,
    },
    tests: [result],
  }
  
  const serverLogs = logCollector.getLogsAsText(testStartTime)
  
  await Promise.all([
    Bun.write(reportPath, JSON.stringify(report, null, 2)),
    Bun.write(logsPath, serverLogs || "(no server logs captured for this test)"),
  ])
  
  console.log(`Test report written to: ${reportPath}`)
  console.log(`Server logs written to: ${logsPath}`)
}

export async function runSingleTest(
  def: TestDefinition,
  baseUrl: string,
  serverSetupTiming: TestTiming,
  serverReadyTiming: TestTiming
): Promise<TestResult> {
  const testStartTime = Date.now()
  
  try {
    const formData = buildFormDataFromDefinition(def)
    let uploadTiming: TestTiming | null = null
    let fileName: string
    let filePath: string

    if (def.input.type === "local" && def.input.path) {
      const uploadStart = Date.now()
      const upload = await uploadTestFile(baseUrl, def.input.path)
      uploadTiming = createTestTiming("fileUpload", uploadStart, Date.now())

      expect(upload.filePath).toBeTruthy()

      formData.append("uploadedFilePath", upload.filePath)
      formData.append("uploadedFileName", upload.fileName)
      fileName = upload.fileName
      filePath = upload.filePath
    } else if (def.input.type === "url" && def.input.url) {
      formData.append("url", def.input.url)
      formData.append("urlType", def.input.urlType || "direct-file")
      fileName = def.input.url
      filePath = def.input.url
    } else {
      throw new Error(`Invalid input configuration for test ${def.id}`)
    }

    const submitStart = Date.now()
    const jobId = await submitProcessingJob(baseUrl, formData)
    const submitTiming = createTestTiming("jobSubmission", submitStart, Date.now())

    expect(jobId).toMatch(/^job_\d+_[a-z0-9]+$/)

    const { job, stepTimings } = await pollJobUntilComplete(baseUrl, jobId, POLL_TIMEOUT)

    expect(job.status).toBe("completed")
    expect(job.showNoteId).toBeTruthy()
    expect(job.error).toBeNull()

    const fetchStart = Date.now()
    const showNotePage = await fetchShowNotePage(baseUrl, job.showNoteId!)
    const fetchTiming = createTestTiming("showNoteFetch", fetchStart, Date.now())

    expect(showNotePage.id).toBe(job.showNoteId!)
    expect(showNotePage.rawHtml).toContain(job.showNoteId!)
    expect(showNotePage.rawHtml.length).toBeGreaterThan(1000)

    const testEndTime = Date.now()

    return {
      testName: def.name,
      status: "passed",
      timestamps: {
        testStartedAt: new Date(testStartTime).toISOString(),
        testCompletedAt: new Date(testEndTime).toISOString(),
        totalDurationMs: testEndTime - testStartTime,
      },
      timings: {
        containerSetup: serverSetupTiming,
        serverReady: serverReadyTiming,
        fileUpload: uploadTiming ?? createTestTiming("fileUpload", 0, 0),
        jobSubmission: submitTiming,
        download: stepTimings.download,
        transcription: stepTimings.transcription,
        contentSelection: stepTimings.contentSelection,
        llm: stepTimings.llm,
        tts: stepTimings.tts,
        image: stepTimings.image,
        music: stepTimings.music,
        video: stepTimings.video,
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
    }
  } catch (error) {
    const testEndTime = Date.now()
    const emptyTiming = createTestTiming("", 0, 0)
    
    return {
      testName: def.name,
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
      timestamps: {
        testStartedAt: new Date(testStartTime).toISOString(),
        testCompletedAt: new Date(testEndTime).toISOString(),
        totalDurationMs: testEndTime - testStartTime,
      },
      timings: {
        containerSetup: serverSetupTiming,
        serverReady: serverReadyTiming,
        fileUpload: emptyTiming,
        jobSubmission: emptyTiming,
        download: null,
        transcription: null,
        contentSelection: null,
        llm: null,
        tts: null,
        image: null,
        music: null,
        video: null,
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
}
