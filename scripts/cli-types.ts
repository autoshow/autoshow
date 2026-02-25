export type NetworkRequest = {
  url: string
  resourceType: string
  size: number
  status: number
}

export type BundleAnalysis = {
  jsFiles: number
  cssFiles: number
  totalSize: number
  largestBundle: { name: string; size: number }
  hasCodeSplitting: boolean
  recommendations: string[]
}

export type CSSAnalysis = {
  totalStylesheets: number
  hasCriticalCSS: boolean
  unusedBytes: number
  recommendations: string[]
}

export type LazyLoadingAnalysis = {
  imagesTotal: number
  imagesLazy: number
  scriptsTotal: number
  scriptsDeferred: number
  recommendations: string[]
}

export type PerformanceMetrics = {
  fcp: number | undefined
  lcp: number | undefined
  domContentLoaded: number
  load: number
}

export type BuildAnalysisResult = {
  timestamp: string
  buildDuration: number
  performance: PerformanceMetrics
  bundle: BundleAnalysis
  css: CSSAnalysis
  lazyLoading: LazyLoadingAnalysis
  networkRequests: NetworkRequest[]
  score: number
  grade: string
  recommendations: string[]
}

export type DirectorySizes = Record<string, number>

export type VolumeInfo = {
  name: string
  size: string
}

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

export type BuildStrategy = 'cache' | 'no-cache' | 'prune'
