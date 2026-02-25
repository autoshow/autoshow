import type { ModelInfo, ModelsApiResponse, ProviderKey } from '~/types'

const MODELS_API_URL = "https://models.dev/api.json"

const TARGET_MODELS = {
  llm: {
    openai: ["gpt-5.1", "gpt-5.2", "gpt-5.2-pro"],
    claude: ["claude-sonnet-4-5-20250929", "claude-opus-4-5-20251101", "claude-haiku-4-5-20251001"],
    gemini: ["gemini-3-pro-preview", "gemini-3-flash-preview"],
    groq: ["openai/gpt-oss-20b", "openai/gpt-oss-120b"]
  }
} as const

const OUTPUT_FILE = "all-models.json"

async function fetchAllModels(): Promise<void> {
  console.log(`Fetching models from ${MODELS_API_URL}...\n`)

  const response = await fetch(MODELS_API_URL)
  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`)
  }

  const data = (await response.json()) as ModelsApiResponse

  const allModels: Record<string, Record<string, Record<string, ModelInfo>>> = {}
  let totalFound = 0
  let totalNotFound = 0

  for (const [category, providers] of Object.entries(TARGET_MODELS)) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`${category.toUpperCase()}`)
    console.log(`${'='.repeat(60)}`)
    
    if (!allModels[category]) {
      allModels[category] = {}
    }

    for (const [provider, modelIds] of Object.entries(providers)) {
      const providerKey = provider === 'gemini' ? 'google' : provider as ProviderKey
      const providerData = data[providerKey]
      
      if (!providerData) {
        console.warn(`\n⚠️  ${provider} provider not found in API`)
        totalNotFound += (modelIds as readonly string[]).length
        continue
      }

      console.log(`\n${providerData.name}`)
      console.log(`  Available: ${Object.keys(providerData.models).length} models`)
      
      if (!allModels[category][provider]) {
        allModels[category][provider] = {}
      }

      for (const modelId of modelIds as readonly string[]) {
        const model = providerData.models[modelId]
        if (!model) {
          console.log(`  ✗ ${modelId} - NOT FOUND`)
          totalNotFound++
          continue
        }
        allModels[category][provider][modelId] = model
        totalFound++
        console.log(`  ✓ ${model.name}`)
      }
    }
  }

  const outputPath = new URL(OUTPUT_FILE, import.meta.url).pathname
  await Bun.write(outputPath, JSON.stringify(allModels, null, 2))

  console.log(`\n${'='.repeat(60)}`)
  console.log(`SUMMARY`)
  console.log(`${'='.repeat(60)}`)
  console.log(`✓ Found: ${totalFound} models`)
  console.log(`✗ Not found: ${totalNotFound} models`)
  console.log(`📁 Output: ${outputPath}`)
  console.log(`${'='.repeat(60)}\n`)
}

fetchAllModels().catch((error) => {
  console.error("Error:", error.message)
  process.exit(1)
})
