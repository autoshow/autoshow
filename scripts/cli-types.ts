export type DirectorySizes = Record<string, number>

export type HistoryEntry = {
  image: string
  size: number
  timestamp: number
}

export type TarHeader = {
  name: string
  size: number
  type: string
}

export type TarAnalysisResult = {
  dirSizes: DirectorySizes
  devTools: string[]
  libSize: number
}

export type LogTiming = {
  step: string
  startedAt: number
  completedAt: number
  durationMs: number
}

export type LogTestData = {
  testName: string
  status: string
  timings: {
    transcription?: LogTiming
    llm?: LogTiming
    tts?: LogTiming
    image?: LogTiming
    music?: LogTiming
    video?: LogTiming
  }
  input: {
    transcriptionOption?: string
    transcriptionModel?: string
    llmModel?: string
    selectedPrompts?: string[]
  }
}

export type LogFile = {
  reportGeneratedAt: string
  summary: {
    totalTests: number
    passed: number
    failed: number
  }
  tests: LogTestData[]
}

export type LogPerformanceStats = {
  count: number
  total: number
  avg: number
  min: number
  max: number
  values: number[]
}

export type ModelInfo = {
  id: string
  name: string
  family: string
  attachment: boolean
  reasoning: boolean
  tool_call: boolean
  structured_output: boolean
  temperature: boolean
  knowledge: string
  release_date: string
  last_updated: string
  modalities: {
    input: string[]
    output: string[]
  }
  open_weights: boolean
  cost: {
    input: number
    output: number
    cache_read?: number
  }
  limit: {
    context: number
    output: number
  }
}

export type ProviderData = {
  id: string
  name: string
  models: Record<string, ModelInfo>
}

export type ModelsApiResponse = {
  openai: ProviderData
  claude: ProviderData
  google: ProviderData
  groq: ProviderData
  deepinfra: ProviderData
  elevenlabs: ProviderData
  happyscribe: ProviderData
  [key: string]: ProviderData
}

export type ProviderKey = 'openai' | 'claude' | 'google' | 'groq' | 'deepinfra' | 'elevenlabs' | 'happyscribe'

export type ShellErrorLike = {
  exitCode: number
  stderr: Buffer
  stdout: Buffer
}
