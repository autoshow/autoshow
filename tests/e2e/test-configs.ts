export interface TranscriptionConfig {
  id: number
  transcriptionOption: string
  transcriptionModel: string
  nameSuffix: string
}

export const TRANSCRIPTION_SERVICES: TranscriptionConfig[] = [
  { id: 1, transcriptionOption: "groq", transcriptionModel: "whisper-large-v3-turbo", nameSuffix: "groq-whisper-large-v3-turbo" },
  { id: 2, transcriptionOption: "groq", transcriptionModel: "whisper-large-v3", nameSuffix: "groq-whisper-large-v3" },
  { id: 3, transcriptionOption: "deepinfra", transcriptionModel: "openai/whisper-large-v3-turbo", nameSuffix: "deepinfra-whisper-large-v3-turbo" },
  { id: 4, transcriptionOption: "deepinfra", transcriptionModel: "openai/whisper-large-v3", nameSuffix: "deepinfra-whisper-large-v3" },
  { id: 5, transcriptionOption: "lemonfox", transcriptionModel: "whisper-large-v3", nameSuffix: "lemonfox-whisper-large-v3" },
]

export const DEFAULT_TRANSCRIPTION: TranscriptionConfig = TRANSCRIPTION_SERVICES[0]!

export interface LLMConfig {
  id: number
  service: string
  model: string
  nameSuffix: string
}

export const LLM_CONFIGS: LLMConfig[] = [
  { id: 1, service: "openai", model: "gpt-5", nameSuffix: "openai-gpt-5" },
  { id: 2, service: "openai", model: "gpt-5-mini", nameSuffix: "openai-gpt-5-mini" },
  { id: 3, service: "openai", model: "gpt-5-nano", nameSuffix: "openai-gpt-5-nano" },
  { id: 4, service: "openai", model: "gpt-5.1", nameSuffix: "openai-gpt-5.1" },
  { id: 5, service: "openai", model: "gpt-5.2", nameSuffix: "openai-gpt-5.2" },
  { id: 6, service: "openai", model: "gpt-5.2-pro", nameSuffix: "openai-gpt-5.2-pro" },
  { id: 7, service: "anthropic", model: "claude-sonnet-4-5-20250929", nameSuffix: "anthropic-claude-sonnet-4.5" },
  { id: 8, service: "anthropic", model: "claude-opus-4-5-20251101", nameSuffix: "anthropic-claude-opus-4.5" },
  { id: 9, service: "anthropic", model: "claude-haiku-4-5-20251001", nameSuffix: "anthropic-claude-haiku-4.5" },
  { id: 10, service: "gemini", model: "gemini-3-pro-preview", nameSuffix: "gemini-3-pro" },
  { id: 11, service: "gemini", model: "gemini-3-flash-preview", nameSuffix: "gemini-3-flash" }
]

export const DEFAULT_LLM_SERVICE = "openai"

export interface TestSuiteConfig {
  prefix: string
  type: "local" | "direct"
  source: string
  expectedFileName?: string
}

export const TEST_SUITES: Record<string, TestSuiteConfig> = {
  "1m-local": { prefix: "1m", type: "local", source: "tests/e2e/1.mp3", expectedFileName: "1.mp3" },
  "5m-local": { prefix: "5m", type: "local", source: "tests/e2e/5.mp3", expectedFileName: "5.mp3" },
  "10min-direct": { prefix: "10m", type: "direct", source: "https://ajc.pics/autoshow/10.mp3" },
  "20min-direct": { prefix: "20m", type: "direct", source: "https://ajc.pics/autoshow/20.mp3" },
}

export const DEFAULT_LLM_MODEL = "gpt-5-nano"
export const DEFAULT_PROMPTS = "shortSummary"
export const TEST_TIMEOUT = 3_600_000
export const POLL_TIMEOUT = 3_600_000
export const DELAY_BETWEEN_TESTS_MS = 2000
