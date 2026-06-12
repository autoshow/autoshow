import type { TestDefinition, TestDefinitionInput } from "~/types"
import { readFile } from "node:fs/promises"
import { readdirSync } from "node:fs"
import { join } from "node:path"
export { getTimestampPrefix } from "../timestamp"
import {
  getDocumentServicesForType,
  getDocumentTypeFromExtension,
} from "~/models"
export { buildFormDataFromDefinition } from "./form-data"

export const TEST_TIMEOUT = 1_200_000
export const POLL_TIMEOUT = 1_200_000
export const DELAY_BETWEEN_TESTS_MS = 2000

export function walkJsonFiles(dir: string): string[] {
  const files: string[] = []
  const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
  for (const entry of entries) {
    const resolved = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...walkJsonFiles(resolved))
      continue
    }
    if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(resolved)
    }
  }
  return files
}

const AUDIO_VARIANTS: Record<string, TestDefinitionInput> = {
  "1m-local": { type: "local", path: "scripts/test/fixtures/input/1.mp3" },
  "1m-direct": { type: "url", url: "https://ajc.pics/autoshow/1.mp3", urlType: "direct-file" },
  "1m-streaming": { type: "url", url: "https://www.youtube.com/watch?v=nXtaETBZ29g", urlType: "streaming" },
  "2m-streaming": { type: "url", url: "https://www.youtube.com/watch?v=MORMZXEaONk", urlType: "streaming" },
  "5m-direct": { type: "url", url: "https://ajc.pics/autoshow/5.mp3", urlType: "direct-file" },
  "10m-direct": { type: "url", url: "https://ajc.pics/autoshow/10.mp3", urlType: "direct-file" },
  "20m-direct": { type: "url", url: "https://ajc.pics/autoshow/20.mp3", urlType: "direct-file" },
}

const DOCUMENT_VARIANTS: Record<string, TestDefinitionInput> = {
  "1p-local": { type: "local", path: "scripts/test/fixtures/input/1.pdf" },
  "1p-direct": { type: "url", url: "https://ajc.pics/autoshow/textract-1.pdf", urlType: "document" },
  "3p-local": { type: "local", path: "scripts/test/fixtures/input/3.pdf" },
  "10p-direct": { type: "url", url: "https://ajc.pics/autoshow/textract-10.pdf", urlType: "document" },
}

const KNOWN_VARIANTS = new Set([
  ...Object.keys(AUDIO_VARIANTS),
  ...Object.keys(DOCUMENT_VARIANTS),
])
const VARIANT_TAG_PARTS = new Set([...KNOWN_VARIANTS].flatMap(variant => variant.split("-").filter(Boolean)))

type DefinitionInputMode = "audio-non-streaming" | "audio-streaming" | "document"

function isDocumentTest(def: TestDefinition): boolean {
  return def.tags.includes("document") || def.tags.includes("document-parsing") || !!def.document
}

function isYouTubeCaptionTest(def: TestDefinition): boolean {
  return def.input.type === "url"
    && def.input.urlType === "youtube"
    && def.transcription.service === "youtube"
    && def.transcription.model === "captions"
}

function getVariantMap(def: TestDefinition): Record<string, TestDefinitionInput> {
  return isDocumentTest(def) ? DOCUMENT_VARIANTS : AUDIO_VARIANTS
}

function getVariantTags(variant: string): string[] {
  const parts = variant.split("-")
  if (parts.length === 2 && parts[0] && parts[1]) {
    return [parts[0], parts[1]]
  }
  return [variant]
}

function getInputMode(input: TestDefinitionInput): DefinitionInputMode {
  if (input.type === "url" && input.urlType === "document") {
    return "document"
  }

  if (input.type === "url" && (input.urlType === "streaming" || input.urlType === "youtube")) {
    return "audio-streaming"
  }

  return "audio-non-streaming"
}

function getDefinitionInputMode(def: TestDefinition): DefinitionInputMode {
  if (isDocumentTest(def)) {
    return "document"
  }

  return getInputMode(def.input)
}

export function inferDocumentTypeFromInput(input: TestDefinitionInput): ReturnType<typeof getDocumentTypeFromExtension> {
  const pathLike = input.type === "local" ? input.path : input.url
  if (!pathLike) {
    return null
  }

  if (input.type === "url") {
    try {
      return getDocumentTypeFromExtension(new URL(pathLike).pathname)
    } catch {
      return getDocumentTypeFromExtension(pathLike)
    }
  }

  return getDocumentTypeFromExtension(pathLike)
}

function isVariantCompatibleWithDefinition(def: TestDefinition, variant: string): boolean {
  if (isYouTubeCaptionTest(def)) {
    return false
  }

  const definitionMode = getDefinitionInputMode(def)

  if (definitionMode === "document") {
    const variantInput = DOCUMENT_VARIANTS[variant]
    if (!variantInput) {
      return false
    }

    if (!def.document?.service) {
      return true
    }

    const documentType = inferDocumentTypeFromInput(variantInput)
    if (!documentType) {
      return false
    }

    return getDocumentServicesForType(documentType).includes(def.document.service)
  }

  const variantInput = AUDIO_VARIANTS[variant]
  if (!variantInput) {
    return false
  }

  return getInputMode(variantInput) === definitionMode
}

function applyInputVariant(def: TestDefinition, variant: string): TestDefinition {
  const isDocument = isDocumentTest(def)
  const variantMap = getVariantMap(def)
  const input = variantMap[variant]
  if (!input) {
    throw new Error(`Unknown variant "${variant}" for ${isDocument ? "document" : "audio"} test`)
  }
  const variantTags = getVariantTags(variant)
  const baseTags = def.tags.filter(t => !VARIANT_TAG_PARTS.has(t))
  return {
    ...def,
    id: `${def.id}-${variant}`,
    name: def.name.replace(/with \S+$/, `with ${variant}`),
    description: def.description.replace(/using \S+ (audio|document) input$/, `using ${variant} $1 input`),
    tags: [...baseTags, ...variantTags],
    input,
  }
}

function validateVariants(variants: string[]): void {
  const unknownVariants = [...new Set(variants.filter(variant => !KNOWN_VARIANTS.has(variant)))]
  if (unknownVariants.length === 0) {
    return
  }

  const label = unknownVariants.length === 1 ? "variant" : "variants"
  throw new Error(`Unknown input ${label}: ${unknownVariants.map(variant => `"${variant}"`).join(", ")}`)
}

function expandWithVariants(defs: TestDefinition[], variants: string[]): TestDefinition[] {
  validateVariants(variants)

  const result: TestDefinition[] = []
  let matchedDefinitions = 0

  for (const def of defs) {
    const compatibleVariant = variants.find(variant => isVariantCompatibleWithDefinition(def, variant))

    if (!compatibleVariant) {
      result.push(def)
      continue
    }

    matchedDefinitions++
    result.push(applyInputVariant(def, compatibleVariant))
  }

  if (defs.length > 0 && matchedDefinitions === 0) {
    throw new Error(`None of the requested input variants apply to the selected definitions: ${variants.join(", ")}`)
  }

  return result
}

function parseInputVariants(inputVariants?: string): string[] {
  if (!inputVariants) {
    return []
  }

  return [...new Set(inputVariants.split(",").map(variant => variant.trim()).filter(Boolean))]
}

export function applyInputVariants(definitions: TestDefinition[], inputVariants?: string): TestDefinition[] {
  const variants = parseInputVariants(inputVariants)
  if (variants.length === 0) {
    return definitions
  }

  return expandWithVariants(definitions, variants)
}

export async function loadTestDefinitionsFromPaths(paths: string[]): Promise<TestDefinition[]> {
  const definitions: TestDefinition[] = []
  for (const path of paths) {
    const content = await readFile(path, "utf8").catch(() => null)
    if (!content) continue
    definitions.push(JSON.parse(content) as TestDefinition)
  }

  return applyInputVariants(definitions, process.env.INPUT_VARIANTS)
}

type DefinitionEntry = {
  file: string
  definition: TestDefinition
}

function definitionMatchesPatterns(def: TestDefinition, patterns: string[]): boolean {
  return patterns.every(pattern => {
    if (def.id.includes(pattern)) return true
    if (def.tags.some(tag => tag === pattern)) return true
    return false
  })
}

async function loadDefinitionEntries(): Promise<DefinitionEntry[]> {
  const files = walkJsonFiles("tests/test-definitions")

  const entries: DefinitionEntry[] = []
  for (const file of files) {
    const content = JSON.parse(await readFile(file, "utf8")) as TestDefinition
    entries.push({
      file,
      definition: content,
    })
  }

  return entries
}

export async function resolveDefinitionPaths(patterns?: string[]): Promise<string[]> {
  if (patterns && patterns.length > 0 && patterns.every(pattern => pattern.endsWith(".json"))) {
    return [...patterns].sort((a, b) => a.localeCompare(b))
  }

  const entries = await loadDefinitionEntries()

  if (!patterns || patterns.length === 0) {
    return entries.map(entry => entry.file).sort((a, b) => a.localeCompare(b))
  }

  return entries
    .filter(({ definition }) => definitionMatchesPatterns(definition, patterns))
    .map(entry => entry.file)
    .sort((a, b) => a.localeCompare(b))
}
