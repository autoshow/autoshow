import type { Job } from "../../src/types/job"

export interface TestTiming {
  step: string
  startedAt: number
  completedAt: number
  durationMs: number
}

export interface StepTimings {
  download: TestTiming | null
  transcription: TestTiming | null
  contentSelection: TestTiming | null
  llm: TestTiming | null
  tts: TestTiming | null
  image: TestTiming | null
  music: TestTiming | null
  video: TestTiming | null
}

export interface JobPollResult {
  job: Job
  stepTimings: StepTimings
  pollLogs: string[]
}

export interface TestResult {
  testName: string
  status: "passed" | "failed"
  error?: string
  timestamps: {
    testStartedAt: string
    testCompletedAt: string
    totalDurationMs: number
  }
  timings: {
    containerSetup: TestTiming
    serverReady: TestTiming
    fileUpload: TestTiming
    jobSubmission: TestTiming
    download: TestTiming | null
    transcription: TestTiming | null
    contentSelection: TestTiming | null
    llm: TestTiming | null
    tts: TestTiming | null
    image: TestTiming | null
    music: TestTiming | null
    video: TestTiming | null
    showNoteFetch: TestTiming
  }
  input: {
    fileName: string
    filePath: string
    transcriptionOption: string
    transcriptionModel: string
    llmModel: string
    selectedPrompts: string[]
    ttsEnabled: boolean
    imageGenEnabled: boolean
    musicGenEnabled: boolean
    videoGenEnabled: boolean
  }
  job: {
    jobId: string
    status: string
    showNoteId: string | null
    createdAt: number
    startedAt: number | null
    completedAt: number | null
    totalJobDurationMs: number
  }
  showNotePage: {
    id: string
    title: string
    hasTranscription: boolean
    hasSummary: boolean
    pageSize: number
  }
}

export interface TestReport {
  reportGeneratedAt: string
  environment: {
    platform: string
    nodeVersion: string
    bunVersion: string
  }
  summary: {
    totalTests: number
    passed: number
    failed: number
    totalDurationMs: number
  }
  tests: TestResult[]
}

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

export interface ContainerInfo {
  containerId: string
  port: number
  volumePrefix: string
  imageName: string
}

export async function isPortInUse(port: number): Promise<boolean> {
  try {
    const server = Bun.serve({ port, fetch: () => new Response() })
    server.stop(true)
    return false
  } catch {
    return true
  }
}

export async function findAvailablePort(startPort: number): Promise<number> {
  let port = startPort
  while (await isPortInUse(port)) {
    port++
  }
  return port
}

export async function loadEnvFile(path: string): Promise<Record<string, string>> {
  const envVars: Record<string, string> = {}
  try {
    const content = await Bun.file(path).text()
    for (const line of content.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const eqIndex = trimmed.indexOf("=")
      if (eqIndex === -1) continue
      const key = trimmed.slice(0, eqIndex)
      const value = trimmed.slice(eqIndex + 1)
      if (value) {
        envVars[key] = value
      }
    }
  } catch {
    console.warn(`Could not load env file: ${path}`)
  }
  return envVars
}

export async function buildDockerImage(imageName: string): Promise<boolean> {
  console.log(`Building Docker image: ${imageName}`)
  const proc = Bun.spawn(
    ["docker", "build", "-f", ".github/Dockerfile", "-t", imageName, "."],
    {
      stdout: "inherit",
      stderr: "inherit",
      cwd: process.cwd(),
    }
  )
  const exitCode = await proc.exited
  return exitCode === 0
}

export async function startContainer(
  imageName: string,
  port: number,
  envVars: Record<string, string>,
  volumePrefix: string
): Promise<string | null> {
  const containerName = `autoshow-test-${volumePrefix}`
  const dataVolume = `autoshow-test-data-${volumePrefix}`
  const outputVolume = `autoshow-test-output-${volumePrefix}`

  const args = [
    "docker",
    "run",
    "-d",
    "--name",
    containerName,
    "-p",
    `${port}:4321`,
    "-v",
    `${dataVolume}:/data`,
    "-v",
    `${outputVolume}:/app/output`,
  ]

  for (const [key, value] of Object.entries(envVars)) {
    args.push("-e", `${key}=${value}`)
  }

  args.push(imageName)

  const proc = Bun.spawn(args, {
    stdout: "pipe",
    stderr: "pipe",
  })

  const exitCode = await proc.exited
  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text()
    console.error(`Failed to start container: ${stderr}`)
    return null
  }

  const containerId = (await new Response(proc.stdout).text()).trim()
  return containerId
}

export async function stopAndRemoveContainer(info: ContainerInfo): Promise<void> {
  console.log(`Stopping container: ${info.containerId}`)

  const stopProc = Bun.spawn(["docker", "stop", info.containerId], {
    stdout: "pipe",
    stderr: "pipe",
  })
  await stopProc.exited

  const rmProc = Bun.spawn(["docker", "rm", info.containerId], {
    stdout: "pipe",
    stderr: "pipe",
  })
  await rmProc.exited

  const dataVolume = `autoshow-test-data-${info.volumePrefix}`
  const outputVolume = `autoshow-test-output-${info.volumePrefix}`

  const rmDataVol = Bun.spawn(["docker", "volume", "rm", dataVolume], {
    stdout: "pipe",
    stderr: "pipe",
  })
  await rmDataVol.exited

  const rmOutputVol = Bun.spawn(["docker", "volume", "rm", outputVolume], {
    stdout: "pipe",
    stderr: "pipe",
  })
  await rmOutputVol.exited

  const rmiProc = Bun.spawn(["docker", "rmi", info.imageName], {
    stdout: "pipe",
    stderr: "pipe",
  })
  await rmiProc.exited

  console.log("Container and volumes cleaned up")
}

export async function waitForServerReady(
  baseUrl: string,
  maxAttempts: number = 60
): Promise<boolean> {
  console.log(`Waiting for server at ${baseUrl}`)

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`${baseUrl}/api/health`, {
        signal: AbortSignal.timeout(2000),
      })
      if (response.ok) {
        const data = await response.json()
        if (data.status === "healthy") {
          console.log("Server is ready")
          return true
        }
      }
    } catch {
      if (i < maxAttempts - 1) {
        await Bun.sleep(1000)
      }
    }
  }

  console.error(`Server failed to start after ${maxAttempts} attempts`)
  return false
}

export async function uploadTestFile(
  baseUrl: string,
  filePath: string
): Promise<{ filePath: string; fileName: string }> {
  const file = Bun.file(filePath)
  const fileName = filePath.split("/").pop() || "test.mp3"

  const formData = new FormData()
  formData.append("file", file, fileName)

  const response = await fetch(`${baseUrl}/api/upload`, {
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

  while (Date.now() - startTime < timeoutMs) {
    const response = await fetch(`${baseUrl}/api/jobs/${jobId}`)

    if (!response.ok) {
      throw new Error(`Failed to fetch job status: ${response.status}`)
    }

    const job = (await response.json()) as Job
    const now = Date.now()
    const logLine = `[${formatTimestamp()}] Job ${jobId}: ${job.status} - ${job.stepName || "waiting"} (${job.overallProgress}%)`
    pollLogs.push(logLine)

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

export interface ShowNotePageData {
  id: string
  title: string
  hasTranscription: boolean
  hasSummary: boolean
  transcriptionService: string | null
  transcriptionModel: string | null
  llmModel: string | null
  rawHtml: string
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

export async function setupTestContainer(): Promise<ContainerInfo> {
  const timestamp = Date.now()
  const volumePrefix = `${timestamp}`
  const imageName = `autoshow-test-${timestamp}`

  const port = await findAvailablePort(4321)
  console.log(`Using port: ${port}`)

  const buildSuccess = await buildDockerImage(imageName)
  if (!buildSuccess) {
    throw new Error("Failed to build Docker image")
  }

  const envVars = await loadEnvFile(".env")

  const containerId = await startContainer(imageName, port, envVars, volumePrefix)
  if (!containerId) {
    throw new Error("Failed to start container")
  }

  console.log(`Container started: ${containerId}`)

  return {
    containerId,
    port,
    volumePrefix,
    imageName,
  }
}
