import type { Job } from '~/types'

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

export interface ServerLogEntry {
  timestamp: number
  stream: "stdout" | "stderr"
  text: string
}

export interface ServerLogCollector {
  logs: ServerLogEntry[]
  getLogsSince: (since: number) => ServerLogEntry[]
  getLogsAsText: (since?: number) => string
}

export interface ServerInfo {
  pid: number
  port: number
  logCollector: ServerLogCollector
}

export interface JobPollResult {
  job: Job
  stepTimings: StepTimings
  pollLogs: string[]
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

export interface TestDefinitionInput {
  type: "local" | "url"
  path?: string
  url?: string
  urlType?: "direct-file" | "document" | "streaming"
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
  service: "llamaparse" | "mistral-ocr"
  model: string
}

export interface TestDefinitionTTS {
  enabled: boolean
  service?: "openai" | "elevenlabs" | "groq"
  voice?: string
  model?: string
}

export interface TestDefinitionImage {
  enabled: boolean
  service?: "openai" | "gemini" | "minimax" | "grok"
  model?: string
  prompts?: string[]
  aspectRatio?: string
}

export interface TestDefinitionMusic {
  enabled: boolean
  service?: "elevenlabs" | "minimax"
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
  service?: "openai" | "gemini" | "minimax" | "grok"
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
