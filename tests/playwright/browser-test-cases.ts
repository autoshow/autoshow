import { LLM_CONFIG, TRANSCRIPTION_CONFIG } from '~/models'
import type { TestConfig } from './utils/test-utils'

export interface BrowserServiceCase extends TestConfig {
  title: string
  specPath: string
}

export const DEFAULT_BROWSER_AUDIO_URL = 'https://ajc.pics/audio/fsjam-short.mp3'
export const DEFAULT_BROWSER_STREAMING_URL = 'https://www.youtube.com/watch?v=MORMZXEaONk'

const BROWSER_SERVICES_SPEC_PATH = "tests/playwright/browser-services.spec.ts"

const slug = (value: string): string => {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'model'
}

const BASE_TRANSCRIPTION_PROVIDER = TRANSCRIPTION_CONFIG.whisper.groq
const BASE_TRANSCRIPTION_MODEL = BASE_TRANSCRIPTION_PROVIDER.models[0]!

const BASE_TRANSCRIPTION = {
  service: 'groq',
  model: BASE_TRANSCRIPTION_MODEL.id,
  buttonService: BASE_TRANSCRIPTION_PROVIDER.name,
  buttonTitle: BASE_TRANSCRIPTION_MODEL.name,
} as const

const BASE_LLM_PROVIDER = LLM_CONFIG.groq
const BASE_LLM_MODEL = BASE_LLM_PROVIDER.models[0]!

const BASE_LLM = {
  service: 'groq',
  model: BASE_LLM_MODEL.id,
  buttonTitle: BASE_LLM_MODEL.name,
} as const

export const GROQ_SHORT_SUMMARY_CASES: BrowserServiceCase[] = [
  {
    title: 'process audio with groq',
    specPath: BROWSER_SERVICES_SPEC_PATH,
    name: 'groq-short-summary',
    transcription: BASE_TRANSCRIPTION,
    llm: BASE_LLM,
  },
]

export const LLM_MODEL_CASES: BrowserServiceCase[] = Object.entries(LLM_CONFIG).flatMap(([service, provider]) =>
  provider.models.map((model) => ({
    title: `llm: ${service} ${model.name.toLowerCase()}`,
    specPath: BROWSER_SERVICES_SPEC_PATH,
    name: `llm-${slug(service)}-${slug(model.id)}`,
    transcription: BASE_TRANSCRIPTION,
    llm: {
      service,
      model: model.id,
      buttonTitle: model.name,
    },
  }))
)

export const TRANSCRIPTION_MODEL_CASES: BrowserServiceCase[] = (() => {
  const cases: BrowserServiceCase[] = []
  const seen = new Set<string>()

  for (const [providers, inputUrl] of [
    [TRANSCRIPTION_CONFIG.whisper, DEFAULT_BROWSER_AUDIO_URL],
    [TRANSCRIPTION_CONFIG.diarization, DEFAULT_BROWSER_AUDIO_URL],
    [TRANSCRIPTION_CONFIG.streaming, DEFAULT_BROWSER_STREAMING_URL],
  ] as const) {
    for (const [service, provider] of Object.entries(providers)) {
      for (const model of provider.models) {
        const key = `${service}:${model.id}`

        if (seen.has(key)) {
          continue
        }
        seen.add(key)

        cases.push({
          title: `transcription: ${service} ${model.name.toLowerCase()}`,
          specPath: BROWSER_SERVICES_SPEC_PATH,
          name: `transcription-${slug(service)}-${slug(model.id)}`,
          inputUrl,
          transcription: {
            service,
            model: model.id,
            buttonService: provider.name,
            buttonTitle: model.name,
          },
          llm: BASE_LLM,
        })
      }
    }
  }

  return cases
})()

export const ALL_BROWSER_SERVICE_CASES: BrowserServiceCase[] = [
  ...GROQ_SHORT_SUMMARY_CASES,
  ...LLM_MODEL_CASES,
  ...TRANSCRIPTION_MODEL_CASES,
]
