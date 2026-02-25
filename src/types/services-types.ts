import * as v from 'valibot'
import { transcriptionServiceConfigSchema } from './step-2-transcription-types'
import { documentExtractionServiceConfigSchema } from './step-2-document-types'
import { llmServiceConfigSchema } from './step-4-types'
import { ttsServiceConfigSchema } from './step-5-types'
import { imageGenServiceConfigSchema } from './step-6-types'
import { musicServiceConfigSchema } from './step-7-types'
import { videoGenServiceConfigSchema } from './step-8-types'

export const ServicesConfigSchema = v.object({
  transcription: v.object({
    whisper: v.object({
      groq: transcriptionServiceConfigSchema,
      deepinfra: transcriptionServiceConfigSchema
    }),
    diarization: v.object({
      fal: transcriptionServiceConfigSchema,
      gladia: transcriptionServiceConfigSchema,
      elevenlabs: transcriptionServiceConfigSchema,
      rev: transcriptionServiceConfigSchema,
      assembly: transcriptionServiceConfigSchema,
      deepgram: transcriptionServiceConfigSchema,
      soniox: transcriptionServiceConfigSchema
    }),
    streaming: v.object({
      happyscribe: transcriptionServiceConfigSchema,
      gladia: transcriptionServiceConfigSchema
    })
  }),
  llm: v.object({
    openai: llmServiceConfigSchema,
    claude: llmServiceConfigSchema,
    gemini: llmServiceConfigSchema,
    minimax: llmServiceConfigSchema,
    grok: llmServiceConfigSchema,
    groq: llmServiceConfigSchema
  }),
  tts: v.object({
    openai: ttsServiceConfigSchema,
    elevenlabs: ttsServiceConfigSchema,
    groq: ttsServiceConfigSchema
  }),
  imageGen: v.object({
    openai: imageGenServiceConfigSchema,
    gemini: imageGenServiceConfigSchema,
    minimax: imageGenServiceConfigSchema,
    grok: imageGenServiceConfigSchema
  }),
  music: v.object({
    elevenlabs: musicServiceConfigSchema,
    minimax: musicServiceConfigSchema
  }),
  videoGen: v.object({
    openai: videoGenServiceConfigSchema,
    gemini: v.optional(videoGenServiceConfigSchema),
    minimax: videoGenServiceConfigSchema,
    grok: videoGenServiceConfigSchema
  }),
  documentExtraction: v.object({
    llamaparse: documentExtractionServiceConfigSchema,
    'mistral-ocr': documentExtractionServiceConfigSchema
  })
})

export type ServicesConfig = v.InferOutput<typeof ServicesConfigSchema>
