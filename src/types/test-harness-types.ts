import type { Job } from './shared/shared-types'

export interface TestTiming {
  step: string
  startedAt: number
  completedAt: number
  durationMs: number
}

export interface StepTimings {
  download: TestTiming | null
  transcription: TestTiming | null
  writeAndTts: TestTiming | null
  media: TestTiming | null
}

export type TestPrimaryStepKey =
  | "transcription"
  | "llm"
  | "tts"
  | "image"
  | "music"
  | "video"

export type TestBenchmarkCategory =
  | "transcription"
  | "llm"
  | "document"
  | "tts"
  | "image"
  | "music"
  | "video"

export interface ServerLogEntry {
  timestamp: number
  stream: "stdout" | "stderr"
  text: string
}

export interface ServerLogCollector {
  logs: ServerLogEntry[]
  getLogsSince: (since: number) => ServerLogEntry[]
  getLogsContaining: (substring: string) => ServerLogEntry[]
  getLogsAsText: (since?: number) => string
  getLogsAsTextContaining: (substring: string) => string
}

export interface ServerInfo {
  pid: number
  port: number
  logCollector: ServerLogCollector
  ownership?: "managed" | "external"
}

export interface JobPollResult {
  job: Job
  stepTimings: StepTimings
  pollLogs: string[]
}

export interface TestExecutionContext {
  testRunId: string
  requestHeaders: Record<string, string>
  artifactDir: string
  artifactPrefix: string
  originalDefinitionIndex: number
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
    writeAndTts: TestTiming | null
    media: TestTiming | null
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
  reportEntry: TestReportEntry
}

export interface TestReportDurationMetric {
  estimatedMs: number | null
  actualMs: number | null
}

export interface TestReportPrimaryStepMetric extends TestReportDurationMetric {
  key: TestPrimaryStepKey
}

export interface TestReportCostMetrics {
  estimatedUsd: number | null
  runtimeEstimatedUsd: number | null
}

export interface TestReportEntry {
  category: TestBenchmarkCategory
  serviceName: string
  modelName: string
  runAt: string
  durations: {
    endToEnd: TestReportDurationMetric
    primaryStep: TestReportPrimaryStepMetric
  }
  cost: TestReportCostMetrics
}

export interface TestReport {
  schemaVersion: 2
  generatedAt: string
  tests: TestReportEntry[]
}

export interface TestDefinitionInput {
  type: "local" | "url"
  path?: string
  url?: string
  urlType?: "direct-file" | "document" | "streaming" | "youtube"
}

export interface TestDefinitionTranscription {
  service: string
  model: string
}

export interface TestDefinitionLLM {
  service: string
  model: string
  prompts: string[]
}

export interface TestDefinitionDocument {
  service: "mistral-ocr" | "glm" | "openai" | "claude" | "gemini" | "grok" | "deapi"
  model: string
}

export interface TestDefinitionTTS {
  enabled: boolean
  service?: "openai" | "elevenlabs" | "deepgram" | "gemini" | "grok" | "groq" | "runway" | "deapi"
  voice?: string
  model?: string
}

export interface TestDefinitionImage {
  enabled: boolean
  service?: "openai" | "gemini" | "minimax" | "grok" | "runway" | "deepinfra" | "deapi" | "flux" | "glm"
  model?: string
  prompts?: string[]
  aspectRatio?: string
}

export interface TestDefinitionMusic {
  enabled: boolean
  service?: "elevenlabs" | "minimax" | "deapi"
  model?: string
  genre?: string
  preset?: "cheap" | "balanced" | "quality"
  durationSeconds?: number
  instrumental?: boolean
  sampleRate?: 16000 | 24000 | 32000 | 44100
  bitrate?: 32000 | 64000 | 128000 | 256000
}

export interface TestDefinitionVideo {
  enabled: boolean
  service?: "gemini" | "deepinfra" | "minimax" | "grok" | "runway" | "glm" | "deapi"
  model?: string
  prompts?: string[]
  size?: string
  duration?: number
  aspectRatio?: string
}

export interface TestDefinition {
  id: string
  name: string
  description: string
  tags: string[]
  input: TestDefinitionInput
  transcription: TestDefinitionTranscription
  llm: TestDefinitionLLM
  document?: TestDefinitionDocument
  tts: TestDefinitionTTS
  image: TestDefinitionImage
  music: TestDefinitionMusic
  video: TestDefinitionVideo
}
