import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenAI } from '@google/genai'
import { l, err } from '~/utils/logging'
import { LLM_CONFIG } from '~/models/llm-config'
import { TRANSCRIPTION_CONFIG } from '~/models/transcription-config'
import { TTS_CONFIG } from '~/models/tts-config'
import { IMAGE_CONFIG } from '~/models/image-config'
import { DOCUMENT_CONFIG } from '~/models/document-config'
import { MUSIC_CONFIG } from '~/models/music-config'
import { VIDEO_CONFIG } from '~/models/video-config'
import type {
  OpenAIModel,
  ClaudeModel,
  GeminiModel,
  GroqModel,
  ElevenLabsModel,
  ModelsDevModel,
  ModelsResponse,
  ImplementedModels
} from './fetch-models-types'

async function fetchOpenAIModels(): Promise<{ models: OpenAIModel[], error?: string }> {
  const apiKey = process.env['OPENAI_API_KEY']
  if (!apiKey) {
    return { models: [], error: 'OPENAI_API_KEY not configured' }
  }

  try {
    const client = new OpenAI({ apiKey })
    const list = await client.models.list()
    const models: OpenAIModel[] = []
    for await (const model of list) {
      models.push({
        id: model.id,
        object: model.object,
        created: model.created,
        owned_by: model.owned_by
      })
    }
    l(`Fetched ${models.length} OpenAI models`)
    return { models }
  } catch (error) {
    err('Failed to fetch OpenAI models', error)
    return { models: [], error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function fetchClaudeModels(): Promise<{ models: ClaudeModel[], error?: string }> {
  const apiKey = process.env['ANTHROPIC_API_KEY']
  if (!apiKey) {
    return { models: [], error: 'ANTHROPIC_API_KEY not configured' }
  }

  try {
    const client = new Anthropic({ apiKey })
    const models: ClaudeModel[] = []
    for await (const model of client.models.list()) {
      models.push({
        id: model.id,
        created_at: model.created_at,
        display_name: model.display_name,
        type: model.type
      })
    }
    l(`Fetched ${models.length} Claude models`)
    return { models }
  } catch (error) {
    err('Failed to fetch Claude models', error)
    return { models: [], error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function fetchGeminiModels(): Promise<{ models: GeminiModel[], error?: string }> {
  const apiKey = process.env['GEMINI_API_KEY']
  if (!apiKey) {
    return { models: [], error: 'GEMINI_API_KEY not configured' }
  }

  try {
    const ai = new GoogleGenAI({ apiKey })
    const pager = await ai.models.list()
    const models: GeminiModel[] = []

    for await (const model of pager) {
      const geminiModel: GeminiModel = {
        name: model.name || '',
        version: model.version || '',
        displayName: model.displayName || '',
        description: model.description || '',
        inputTokenLimit: model.inputTokenLimit || 0,
        outputTokenLimit: model.outputTokenLimit || 0
      }
      if (model.supportedActions) geminiModel.supportedActions = model.supportedActions
      if (model.thinking !== undefined) geminiModel.thinking = model.thinking
      if (model.temperature !== undefined) geminiModel.temperature = model.temperature
      if (model.maxTemperature !== undefined) geminiModel.maxTemperature = model.maxTemperature
      if (model.topP !== undefined) geminiModel.topP = model.topP
      if (model.topK !== undefined) geminiModel.topK = model.topK
      models.push(geminiModel)
    }
    l(`Fetched ${models.length} Gemini models`)
    return { models }
  } catch (error) {
    err('Failed to fetch Gemini models', error)
    return { models: [], error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function fetchGroqModels(): Promise<{ models: GroqModel[], error?: string }> {
  const apiKey = process.env['GROQ_API_KEY']
  if (!apiKey) {
    return { models: [], error: 'GROQ_API_KEY not configured' }
  }

  try {
    const client = new OpenAI({
      apiKey,
      baseURL: 'https://api.groq.com/openai/v1'
    })
    const list = await client.models.list()
    const models: GroqModel[] = []
    for await (const model of list) {
      const groqModel = model as unknown as GroqModel
      models.push({
        id: groqModel.id,
        object: groqModel.object,
        created: groqModel.created,
        owned_by: groqModel.owned_by,
        active: groqModel.active,
        context_window: groqModel.context_window,
        public_apps: groqModel.public_apps
      })
    }
    l(`Fetched ${models.length} Groq models`)
    return { models }
  } catch (error) {
    err('Failed to fetch Groq models', error)
    return { models: [], error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function fetchElevenLabsModels(): Promise<{ models: ElevenLabsModel[], error?: string }> {
  const apiKey = process.env['ELEVENLABS_API_KEY']
  if (!apiKey) {
    return { models: [], error: 'ELEVENLABS_API_KEY not configured' }
  }

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/models', {
      headers: {
        'xi-api-key': apiKey
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`ElevenLabs API returned ${response.status}: ${errorText}`)
    }

    const models = await response.json() as ElevenLabsModel[]
    l(`Fetched ${models.length} ElevenLabs models`)
    return { models }
  } catch (error) {
    err('Failed to fetch ElevenLabs models', error)
    return { models: [], error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function fetchModelsDevModels(): Promise<{ models: ModelsDevModel[], error?: string }> {
  try {
    const response = await fetch('https://models.dev/api.json')

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`models.dev API returned ${response.status}: ${errorText}`)
    }

    const data = await response.json() as Record<string, { id: string, name: string, models: Record<string, Omit<ModelsDevModel, 'id' | 'provider'>> }>
    const models: ModelsDevModel[] = []

    for (const [, providerData] of Object.entries(data)) {
      for (const [modelId, modelData] of Object.entries(providerData.models)) {
        models.push({
          id: modelId,
          provider: providerData.name,
          ...modelData
        })
      }
    }

    l(`Fetched ${models.length} models.dev models`)
    return { models }
  } catch (error) {
    err('Failed to fetch models.dev models', error)
    return { models: [], error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function fetchAllModels(): Promise<ModelsResponse> {
  const startTime = Date.now()
  l('Fetching models from all services')

  const [openai, claude, gemini, groq, elevenlabs, modelsDev] = await Promise.all([
    fetchOpenAIModels(),
    fetchClaudeModels(),
    fetchGeminiModels(),
    fetchGroqModels(),
    fetchElevenLabsModels(),
    fetchModelsDevModels()
  ])

  const response: ModelsResponse = {
    openai,
    claude,
    gemini,
    groq,
    elevenlabs,
    modelsDev
  }

  const responseTime = Date.now() - startTime
  l(`Models fetched in ${responseTime}ms`, {
    openai: openai.models.length,
    claude: claude.models.length,
    gemini: gemini.models.length,
    groq: groq.models.length,
    elevenlabs: elevenlabs.models.length,
    modelsDev: modelsDev.models.length
  })

  return response
}

export function getImplementedModels(): ImplementedModels {
  const llm: string[] = []
  for (const provider of Object.values(LLM_CONFIG)) {
    for (const model of provider.models) {
      llm.push(model.id)
    }
  }

  const transcription: string[] = []
  for (const category of Object.values(TRANSCRIPTION_CONFIG)) {
    for (const provider of Object.values(category)) {
      for (const model of provider.models) {
        transcription.push(model.id)
      }
    }
  }

  const tts: string[] = []
  for (const provider of Object.values(TTS_CONFIG)) {
    for (const model of provider.models) {
      tts.push(model.id)
    }
  }

  const image: string[] = []
  for (const provider of Object.values(IMAGE_CONFIG)) {
    for (const model of provider.models) {
      image.push(model.id)
    }
  }

  const document: string[] = []
  for (const provider of Object.values(DOCUMENT_CONFIG)) {
    for (const model of provider.models) {
      document.push(model.id)
    }
  }

  const music: string[] = []
  for (const provider of Object.values(MUSIC_CONFIG)) {
    if (provider?.model) {
      music.push(provider.model)
    }
  }

  const video: string[] = []
  for (const provider of Object.values(VIDEO_CONFIG)) {
    if (provider?.models) {
      for (const model of provider.models) {
        video.push(model.id)
      }
    }
  }

  const all = [...new Set([...llm, ...transcription, ...tts, ...image, ...document, ...music, ...video])]

  return { llm, transcription, tts, image, document, music, video, all }
}
