import * as v from 'valibot'
import { documentExtractionServiceConfigSchema } from './step-2-document-types'
import { transcriptionServiceConfigSchema } from './step-2-transcription-types'
import { llmServiceConfigSchema,ttsServiceConfigSchema } from './step-3-types'
import { imageGenServiceConfigSchema,musicServiceConfigSchema,videoGenServiceConfigSchema } from './step-4-types'

export const ServicesConfigSchema = v.object({
  transcription: v.object({
    whisper: v.object({
      groq: transcriptionServiceConfigSchema,
      deepinfra: transcriptionServiceConfigSchema
    }),
    diarization: v.object({
      gladia: transcriptionServiceConfigSchema,
      assembly: transcriptionServiceConfigSchema,
      deepgram: transcriptionServiceConfigSchema,
      soniox: transcriptionServiceConfigSchema
    }),
    streaming: v.object({
      youtube: transcriptionServiceConfigSchema,
      happyscribe: transcriptionServiceConfigSchema,
      gladia: transcriptionServiceConfigSchema,
      deapi: transcriptionServiceConfigSchema,
      supadata: transcriptionServiceConfigSchema
    })
  }),
  llm: v.object({
    openai: llmServiceConfigSchema,
    claude: llmServiceConfigSchema,
    gemini: llmServiceConfigSchema,
    minimax: llmServiceConfigSchema,
    deepinfra: llmServiceConfigSchema,
    grok: llmServiceConfigSchema,
    groq: llmServiceConfigSchema,
    glm: llmServiceConfigSchema
  }),
  tts: v.object({
    openai: ttsServiceConfigSchema,
    elevenlabs: ttsServiceConfigSchema,
    deepgram: ttsServiceConfigSchema,
    gemini: ttsServiceConfigSchema,
    grok: ttsServiceConfigSchema,
    groq: ttsServiceConfigSchema,
    runway: ttsServiceConfigSchema,
    deapi: ttsServiceConfigSchema
  }),
  imageGen: v.object({
    openai: imageGenServiceConfigSchema,
    gemini: imageGenServiceConfigSchema,
    minimax: imageGenServiceConfigSchema,
    grok: imageGenServiceConfigSchema,
    runway: imageGenServiceConfigSchema,
    deepinfra: imageGenServiceConfigSchema,
    deapi: imageGenServiceConfigSchema,
    flux: imageGenServiceConfigSchema,
    glm: imageGenServiceConfigSchema
  }),
  music: v.object({
    elevenlabs: musicServiceConfigSchema,
    minimax: musicServiceConfigSchema,
    deapi: musicServiceConfigSchema
  }),
  videoGen: v.object({
    gemini: v.optional(videoGenServiceConfigSchema),
    deepinfra: videoGenServiceConfigSchema,
    minimax: videoGenServiceConfigSchema,
    grok: videoGenServiceConfigSchema,
    runway: videoGenServiceConfigSchema,
    glm: videoGenServiceConfigSchema,
    deapi: videoGenServiceConfigSchema
  }),
  documentExtraction: v.object({
    'mistral-ocr': documentExtractionServiceConfigSchema,
    glm: documentExtractionServiceConfigSchema,
    openai: documentExtractionServiceConfigSchema,
    claude: documentExtractionServiceConfigSchema,
    gemini: documentExtractionServiceConfigSchema,
    grok: documentExtractionServiceConfigSchema,
    deapi: documentExtractionServiceConfigSchema
  })
})
