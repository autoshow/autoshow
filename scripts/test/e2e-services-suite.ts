import { statSync } from "node:fs"
import { readFile } from "node:fs/promises"
import { basename } from "node:path"
import type { ProcessingOptions, TestDefinition } from "~/types"
import { estimateTotalCost } from "~/utils/cost/cost-estimation"
import {
  applyInputVariants,
  inferDocumentTypeFromInput,
  resolveDefinitionPaths,
} from "./harness/definitions"
import { KNOWN_DURATIONS_SEC, KNOWN_PAGE_COUNTS, findKnownInputSize } from "./harness/input-fixtures"

export interface ServiceModeDefinitionCandidate {
  path: string
  definition: TestDefinition
}

type RankedServiceModeDefinition = {
  path: string
  price: number
}

function getSelectionPrice(definition: TestDefinition): number {
  try {
    return estimateTotalCost(buildSelectionProcessingOptions(definition))
  } catch {
    return Number.POSITIVE_INFINITY
  }
}

function getPrimaryTestCategory(definition: TestDefinition): string {
  if (definition.tags.includes("video") || definition.video.enabled) return "video"
  if (definition.tags.includes("music") || definition.music.enabled) return "music"
  if (definition.tags.includes("image") || definition.image.enabled) return "image"
  if (definition.tags.includes("tts") || definition.tts.enabled) return "tts"
  if (definition.tags.includes("document") || definition.tags.includes("document-parsing") || definition.document) return "document"
  if (definition.tags.includes("llm")) return "llm"
  if (definition.tags.includes("transcription")) return "transcription"
  return "llm"
}

function getReportedServiceAndModel(definition: TestDefinition): { serviceName: string; modelName: string } {
  switch (getPrimaryTestCategory(definition)) {
    case "video":
      return {
        serviceName: definition.video.service ?? "unknown",
        modelName: definition.video.model ?? "default",
      }
    case "music":
      return {
        serviceName: definition.music.service ?? "unknown",
        modelName: definition.music.model ?? "default",
      }
    case "image":
      return {
        serviceName: definition.image.service ?? "unknown",
        modelName: definition.image.model ?? "default",
      }
    case "tts":
      return {
        serviceName: definition.tts.service ?? "unknown",
        modelName: definition.tts.model ?? "default",
      }
    case "document":
      return {
        serviceName: definition.document?.service ?? "unknown",
        modelName: definition.document?.model ?? "default",
      }
    case "transcription":
      return {
        serviceName: definition.transcription.service,
        modelName: definition.transcription.model,
      }
    case "llm":
    default:
      return {
        serviceName: definition.llm.service,
        modelName: definition.llm.model,
      }
  }
}

function getLocalFileSize(path: string | undefined): number | undefined {
  if (!path) {
    return undefined
  }

  try {
    return statSync(path).size
  } catch {
    return undefined
  }
}

function getSyntheticSourceUrl(definition: TestDefinition): string {
  if (definition.input.type === "url" && definition.input.url) {
    return definition.input.url
  }

  const fileName = definition.input.type === "local" && definition.input.path
    ? basename(definition.input.path)
    : "input"
  return `https://autoshow.test/${encodeURIComponent(fileName || "input")}`
}

function buildSelectionProcessingOptions(definition: TestDefinition): ProcessingOptions {
  const isDocument = !!definition.document
  const { value: urlDuration } = findKnownInputSize(definition, KNOWN_DURATIONS_SEC)
  const { value: documentPageCount } = findKnownInputSize(definition, KNOWN_PAGE_COUNTS)

  return {
    url: getSyntheticSourceUrl(definition),
    outputDir: "",
    transcriptionService: definition.transcription.service as ProcessingOptions["transcriptionService"],
    transcriptionModel: definition.transcription.model,
    llmEnabled: definition.llm.prompts.length > 0,
    llmService: definition.llm.service as ProcessingOptions["llmService"],
    llmModel: definition.llm.model,
    selectedPrompts: definition.llm.prompts,
    ...(definition.input.type === "url" ? { urlType: definition.input.urlType ?? "direct-file" } : {}),
    useResilientDownload: definition.input.type === "url" && (definition.input.urlType ?? "direct-file") === "direct-file",
    ...(urlDuration !== null ? { urlDuration } : {}),
    ...(definition.input.type === "local" && definition.input.path
      ? {
          isLocalFile: true,
          localFilePath: definition.input.path,
          localFileName: basename(definition.input.path),
          localFileSize: getLocalFileSize(definition.input.path),
        }
      : {}),
    ttsEnabled: definition.tts.enabled,
    ...(definition.tts.enabled && definition.tts.service ? { ttsService: definition.tts.service } : {}),
    ...(definition.tts.enabled && definition.tts.voice ? { ttsVoice: definition.tts.voice } : {}),
    ...(definition.tts.enabled && definition.tts.model ? { ttsModel: definition.tts.model } : {}),
    imageGenEnabled: definition.image.enabled,
    ...(definition.image.enabled && definition.image.service ? { imageService: definition.image.service } : {}),
    ...(definition.image.enabled && definition.image.model ? { imageModel: definition.image.model } : {}),
    ...(definition.image.enabled && definition.image.aspectRatio ? { imageDimensionOrRatio: definition.image.aspectRatio } : {}),
    ...(definition.image.enabled ? { selectedImagePrompts: definition.image.prompts ?? [] } : {}),
    musicGenEnabled: definition.music.enabled,
    ...(definition.music.enabled && definition.music.service ? { musicService: definition.music.service } : {}),
    ...(definition.music.enabled && definition.music.model ? { musicModel: definition.music.model } : {}),
    ...(definition.music.enabled && definition.music.genre ? { selectedMusicGenre: definition.music.genre } : {}),
    ...(definition.music.enabled && definition.music.preset ? { musicPreset: definition.music.preset } : {}),
    ...(definition.music.enabled && definition.music.durationSeconds ? { musicDurationSeconds: definition.music.durationSeconds } : {}),
    ...(definition.music.enabled && definition.music.instrumental !== undefined ? { musicInstrumental: definition.music.instrumental } : {}),
    ...(definition.music.enabled && definition.music.sampleRate ? { musicSampleRate: definition.music.sampleRate } : {}),
    ...(definition.music.enabled && definition.music.bitrate ? { musicBitrate: definition.music.bitrate } : {}),
    videoGenEnabled: definition.video.enabled,
    ...(definition.video.enabled && definition.video.service ? { videoService: definition.video.service } : {}),
    ...(definition.video.enabled && definition.video.model ? { videoModel: definition.video.model } : {}),
    ...(definition.video.enabled
      ? {
          selectedVideoPrompts:
            (definition.video.prompts ?? []) as NonNullable<ProcessingOptions["selectedVideoPrompts"]>,
        }
      : {}),
    ...(definition.video.enabled && definition.video.size ? { videoSize: definition.video.size } : {}),
    ...(definition.video.enabled && definition.video.duration ? { videoDuration: definition.video.duration } : {}),
    ...(definition.video.enabled && definition.video.aspectRatio ? { videoAspectRatio: definition.video.aspectRatio } : {}),
    inputType: isDocument ? "document" : "audio-video",
    ...(definition.document?.service ? { documentService: definition.document.service } : {}),
    ...(definition.document?.model
      ? {
          documentModel: definition.document.model as ProcessingOptions["documentModel"],
        }
      : {}),
    ...(isDocument ? { documentType: inferDocumentTypeFromInput(definition.input) ?? undefined } : {}),
    ...(documentPageCount !== null ? { documentPageCount } : {}),
    disableDocumentCache: false,
  }
}

export function getServiceModeSelectionKey(definition: TestDefinition): string {
  const category = getPrimaryTestCategory(definition)
  const { serviceName } = getReportedServiceAndModel(definition)
  return `${category}:${serviceName}`
}

function getServiceModeModelKey(definition: TestDefinition): string {
  const { modelName } = getReportedServiceAndModel(definition)
  return modelName
}

function sortRankedDefinitions(
  a: RankedServiceModeDefinition,
  b: RankedServiceModeDefinition
): number {
  if (a.price !== b.price) {
    return a.price - b.price
  }

  return a.path.localeCompare(b.path)
}

export function selectCheapestServiceModeE2EDefinitionPaths(
  candidates: ServiceModeDefinitionCandidate[],
  maxDefinitionsPerService: number
): string[] {
  if (!Number.isInteger(maxDefinitionsPerService) || maxDefinitionsPerService < 1) {
    throw new Error("maxDefinitionsPerService must be an integer >= 1")
  }

  const selectedByKey = new Map<string, Map<string, RankedServiceModeDefinition>>()

  for (const candidate of candidates) {
    const key = getServiceModeSelectionKey(candidate.definition)
    const modelKey = getServiceModeModelKey(candidate.definition)
    const selectedModels = selectedByKey.get(key) ?? new Map<string, RankedServiceModeDefinition>()
    const rankedCandidate = {
      path: candidate.path,
      price: getSelectionPrice(candidate.definition),
    }
    const existing = selectedModels.get(modelKey)

    if (!existing || sortRankedDefinitions(rankedCandidate, existing) < 0) {
      selectedModels.set(modelKey, rankedCandidate)
    }

    selectedByKey.set(key, selectedModels)
  }

  return [...selectedByKey.values()]
    .flatMap(entries =>
      [...entries.values()]
        .sort(sortRankedDefinitions)
        .slice(0, maxDefinitionsPerService)
        .map(entry => entry.path)
    )
    .sort((a, b) => a.localeCompare(b))
}

export function selectCheapestServiceE2EDefinitionPaths(
  candidates: ServiceModeDefinitionCandidate[]
): string[] {
  return selectCheapestServiceModeE2EDefinitionPaths(candidates, 1)
}

export function selectCheapestService2xE2EDefinitionPaths(
  candidates: ServiceModeDefinitionCandidate[]
): string[] {
  return selectCheapestServiceModeE2EDefinitionPaths(candidates, 2)
}

async function loadServiceModeDefinitionCandidates(
  paths: string[],
  inputVariants?: string
): Promise<ServiceModeDefinitionCandidate[]> {
  const definitions = await Promise.all(
    paths.map(async (path) => JSON.parse(await readFile(path, "utf8")) as TestDefinition)
  )
  const resolvedDefinitions = applyInputVariants(definitions, inputVariants)

  return paths.map((path, index) => ({
    path,
    definition: resolvedDefinitions[index]!,
  }))
}

export async function resolveCheapestServiceE2EDefinitionPaths(
  inputVariants?: string
): Promise<string[]> {
  const verifyDefinitionPaths = await resolveDefinitionPaths(["verify"])
  const candidates = await loadServiceModeDefinitionCandidates(verifyDefinitionPaths, inputVariants)
  return selectCheapestServiceE2EDefinitionPaths(candidates)
}

export async function resolveCheapestService2xE2EDefinitionPaths(
  inputVariants?: string
): Promise<string[]> {
  const verifyDefinitionPaths = await resolveDefinitionPaths(["verify"])
  const candidates = await loadServiceModeDefinitionCandidates(verifyDefinitionPaths, inputVariants)
  return selectCheapestService2xE2EDefinitionPaths(candidates)
}
