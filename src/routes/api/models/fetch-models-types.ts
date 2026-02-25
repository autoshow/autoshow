export interface OpenAIModel {
  id: string
  object: string
  created: number
  owned_by: string
}

export interface ClaudeModel {
  id: string
  created_at: string
  display_name: string
  type: string
}

export interface GeminiModel {
  name: string
  version: string
  displayName: string
  description: string
  inputTokenLimit: number
  outputTokenLimit: number
  supportedActions?: string[]
  thinking?: boolean
  temperature?: number
  maxTemperature?: number
  topP?: number
  topK?: number
}

export interface GroqModel {
  id: string
  object: string
  created: number
  owned_by: string
  active: boolean
  context_window: number
  public_apps: unknown
}

export interface ElevenLabsLanguage {
  language_id: string
  name: string
}

export interface ElevenLabsModelRates {
  character_cost_multiplier: number
}

export interface ElevenLabsModel {
  model_id: string
  name?: string
  can_be_finetuned?: boolean
  can_do_text_to_speech?: boolean
  can_do_voice_conversion?: boolean
  can_use_style?: boolean
  can_use_speaker_boost?: boolean
  serves_pro_voices?: boolean
  token_cost_factor?: number
  description?: string
  requires_alpha_access?: boolean
  max_characters_request_free_user?: number
  max_characters_request_subscribed_user?: number
  maximum_text_length_per_request?: number
  languages?: ElevenLabsLanguage[]
  model_rates?: ElevenLabsModelRates
  concurrency_group?: string
}

export interface ModelsDevModel {
  id: string
  name: string
  family: string
  provider: string
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

export interface ModelsResponse {
  openai: { models: OpenAIModel[], error?: string }
  claude: { models: ClaudeModel[], error?: string }
  gemini: { models: GeminiModel[], error?: string }
  groq: { models: GroqModel[], error?: string }
  elevenlabs: { models: ElevenLabsModel[], error?: string }
  modelsDev: { models: ModelsDevModel[], error?: string }
}

export interface ImplementedModels {
  llm: string[]
  transcription: string[]
  tts: string[]
  image: string[]
  document: string[]
  music: string[]
  video: string[]
  all: string[]
}
