import type {
  Job,
  TestTiming,
  StepTimings,
  JobPollResult,
  TestReport,
  ShowNotePageData,
} from "~/types"

export function createTestTiming(step: string, startedAt: number, completedAt: number): TestTiming {
  return {
    step,
    startedAt,
    completedAt,
    durationMs: completedAt - startedAt,
  }
}

export async function writeTestReport(report: TestReport, outputPath: string): Promise<void> {
  await Bun.write(outputPath, JSON.stringify(report, null, 2))
  console.log(`Test report written to: ${outputPath}`)
}

export async function uploadTestFile(
  baseUrl: string,
  filePath: string
): Promise<{ filePath: string; fileName: string }> {
  const file = Bun.file(filePath)
  const fileName = filePath.split("/").pop() || "test.mp3"

  const formData = new FormData()
  formData.append("file", file, fileName)

  const response = await fetch(`${baseUrl}/api/download/upload`, {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Upload failed: ${error}`)
  }

  const result = await response.json()
  return {
    filePath: result.filePath,
    fileName: result.fileName,
  }
}

export async function submitProcessingJob(
  baseUrl: string,
  formData: FormData
): Promise<string> {
  const response = await fetch(`${baseUrl}/api/process`, {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Job submission failed: ${error}`)
  }

  const result = await response.json()
  return result.jobId
}

const STEP_NAME_TO_KEY: Record<string, keyof StepTimings> = {
  "Download Audio": "download",
  "Transcription": "transcription",
  "Content Selection": "contentSelection",
  "LLM Generation": "llm",
  "Text-to-Speech": "tts",
  "Image Generation": "image",
  "Music Generation": "music",
  "Video Generation": "video",
}

function formatTimestamp(): string {
  const now = new Date()
  const hours = now.getHours().toString().padStart(2, "0")
  const minutes = now.getMinutes().toString().padStart(2, "0")
  const seconds = now.getSeconds().toString().padStart(2, "0")
  const millis = now.getMilliseconds().toString().padStart(3, "0")
  return `${hours}:${minutes}:${seconds}.${millis}`
}

export async function pollJobUntilComplete(
  baseUrl: string,
  jobId: string,
  timeoutMs: number = 300_000
): Promise<JobPollResult> {
  const startTime = Date.now()
  const pollInterval = 100
  const pollLogs: string[] = []

  const stepTimings: StepTimings = {
    download: null,
    transcription: null,
    contentSelection: null,
    llm: null,
    tts: null,
    image: null,
    music: null,
    video: null,
  }

  let currentStepKey: keyof StepTimings | null = null
  let currentStepStartTime: number | null = null

  let lastLogKey = ""

  while (Date.now() - startTime < timeoutMs) {
    const response = await fetch(`${baseUrl}/api/jobs/${jobId}`)

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

    const stepKey = job.stepName ? STEP_NAME_TO_KEY[job.stepName] : null

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
      console.log("--- Poll Logs (Error) ---")
      pollLogs.forEach((log) => console.log(log))
      throw new Error(`Job failed: ${job.error || "Unknown error"}`)
    }

    await Bun.sleep(pollInterval)
  }

  console.log("--- Poll Logs (Timeout) ---")
  pollLogs.forEach((log) => console.log(log))
  throw new Error(`Job ${jobId} timed out after ${timeoutMs}ms`)
}

export async function fetchShowNotePage(
  baseUrl: string,
  showNoteId: string
): Promise<ShowNotePageData> {
  const response = await fetch(`${baseUrl}/show-notes/${showNoteId}`)

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
