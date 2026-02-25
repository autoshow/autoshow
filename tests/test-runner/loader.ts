import type { TestDefinition, TestDefinitionInput } from "~/types"

const AUDIO_VARIANTS: Record<string, TestDefinitionInput> = {
  "1m-local": { type: "local", path: "tests/test-input-files/1.mp3" },
  "1m-direct": { type: "url", url: "https://ajc.pics/autoshow/1.mp3", urlType: "direct-file" },
  "5m-local": { type: "local", path: "tests/test-input-files/5.mp3" },
  "5m-direct": { type: "url", url: "https://ajc.pics/autoshow/5.mp3", urlType: "direct-file" },
  "10m-direct": { type: "url", url: "https://ajc.pics/autoshow/10.mp3", urlType: "direct-file" },
  "20m-direct": { type: "url", url: "https://ajc.pics/autoshow/20.mp3", urlType: "direct-file" },
}

const DOCUMENT_VARIANTS: Record<string, TestDefinitionInput> = {
  "1p-local": { type: "local", path: "tests/test-input-files/1.pdf" },
  "1p-direct": { type: "url", url: "https://ajc.pics/autoshow/textract-1.pdf", urlType: "document" },
  "3p-local": { type: "local", path: "tests/test-input-files/3.pdf" },
  "10p-direct": { type: "url", url: "https://ajc.pics/autoshow/textract-10.pdf", urlType: "document" },
}

function isDocumentTest(def: TestDefinition): boolean {
  return def.tags.includes("document") || def.tags.includes("document-parsing") || !!def.document
}

function getVariantTags(variant: string): string[] {
  const parts = variant.split("-")
  if (parts.length === 2 && parts[0] && parts[1]) {
    return [parts[0], parts[1]]
  }
  return [variant]
}

function applyInputVariant(def: TestDefinition, variant: string): TestDefinition {
  const isDocument = isDocumentTest(def)
  const variantMap = isDocument ? DOCUMENT_VARIANTS : AUDIO_VARIANTS
  const input = variantMap[variant]
  if (!input) {
    throw new Error(`Unknown variant "${variant}" for ${isDocument ? "document" : "audio"} test`)
  }
  const variantTags = getVariantTags(variant)
  const baseTags = def.tags.filter(t => !["1m", "5m", "10m", "20m", "1p", "3p", "10p", "local", "direct"].includes(t))
  return {
    ...def,
    id: `${def.id}-${variant}`,
    name: def.name.replace(/with \S+$/, `with ${variant}`),
    description: def.description.replace(/using \S+ (audio|document) input$/, `using ${variant} $1 input`),
    tags: [...baseTags, ...variantTags],
    input,
  }
}

function expandWithVariants(defs: TestDefinition[], variants: string[]): TestDefinition[] {
  const result: TestDefinition[] = []
  for (const def of defs) {
    for (const variant of variants) {
      result.push(applyInputVariant(def, variant))
    }
  }
  return result
}

export async function loadTestDefinitionsFromPaths(paths: string[]): Promise<TestDefinition[]> {
  const definitions: TestDefinition[] = []
  for (const path of paths) {
    const file = Bun.file(path)
    if (await file.exists()) {
      const content = await file.json()
      definitions.push(content as TestDefinition)
    } else {
      console.warn(`Test definition file not found: ${path}`)
    }
  }
  const variantsEnv = process.env.INPUT_VARIANTS
  if (variantsEnv) {
    const variants = variantsEnv.split(",").map(v => v.trim())
    return expandWithVariants(definitions, variants)
  }
  return definitions
}

export async function loadTestDefinitions(patterns?: string[]): Promise<TestDefinition[]> {
  if (patterns && patterns.length > 0 && patterns.every(p => p.endsWith(".json"))) {
    return loadTestDefinitionsFromPaths(patterns)
  }

  const glob = new Bun.Glob("tests/test-definitions/**/*.json")
  const files = await Array.fromAsync(glob.scan({ cwd: process.cwd() }))
  
  const definitions: TestDefinition[] = []
  for (const file of files) {
    const content = await Bun.file(file).json()
    definitions.push(content as TestDefinition)
  }

  if (!patterns || patterns.length === 0) {
    return definitions
  }

  return definitions.filter(def => {
    return patterns.every(pattern => {
      if (def.id.includes(pattern)) return true
      if (def.tags.some(tag => tag === pattern)) return true
      return false
    })
  })
}
