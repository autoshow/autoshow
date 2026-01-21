const MODELS_API_URL = "https://models.dev/api.json"
const TARGET_MODELS = ["gpt-5", "gpt-5-mini", "gpt-5-nano", "gpt-5.1", "gpt-5.2", "gpt-5.2-pro"] as const
const OUTPUT_FILE = "gpt5-models.json"

interface ModelInfo {
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

interface ProviderData {
  id: string
  name: string
  models: Record<string, ModelInfo>
}

interface ModelsApiResponse {
  openai: ProviderData
  [key: string]: ProviderData
}

async function fetchGPT5Models(): Promise<void> {
  console.log(`Fetching models from ${MODELS_API_URL}...`)

  const response = await fetch(MODELS_API_URL)
  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`)
  }

  const data = (await response.json()) as ModelsApiResponse

  const openaiProvider = data.openai
  if (!openaiProvider) {
    throw new Error("OpenAI provider not found in API response")
  }

  console.log(`Found OpenAI provider with ${Object.keys(openaiProvider.models).length} models`)

  const gpt5Models: Record<string, ModelInfo> = {}

  for (const modelId of TARGET_MODELS) {
    const model = openaiProvider.models[modelId]
    if (!model) {
      console.warn(`Warning: Model "${modelId}" not found in OpenAI models`)
      continue
    }
    gpt5Models[modelId] = model
    console.log(`  ✓ Found ${model.name}`)
  }

  if (Object.keys(gpt5Models).length === 0) {
    throw new Error("No target models found")
  }

  const outputPath = new URL(OUTPUT_FILE, import.meta.url).pathname
  await Bun.write(outputPath, JSON.stringify(gpt5Models, null, 2))

  console.log(`\nWritten ${Object.keys(gpt5Models).length} models to ${outputPath}`)
}

fetchGPT5Models().catch((error) => {
  console.error("Error:", error.message)
  process.exit(1)
})
