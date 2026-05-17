import type {
  StepTimings,
  TestBenchmarkCategory,
  TestDefinition,
  TestPrimaryStepKey,
  TestReportEntry,
} from "~/types"
import { estimateModelDurationMs } from "~/models/models-utils/estimate-speed"
import {
  findDocumentModel,
  findImageModel,
  findLLMModel,
  findMusicModel,
  findTranscriptionModel,
  findTTSModel,
  findVideoModel,
} from "~/models/models-utils/model-lookup"
import { buildLLMEstimationContext } from "~/utils/cost-helpers"
import { estimateNarratableCharacterCount } from "~/utils/cost/runtime-estimation"
import { KNOWN_DURATIONS_SEC, KNOWN_PAGE_COUNTS, findKnownInputSize } from "./input-fixtures"
import { estimateTestDefinitionPrice } from "./pricing"

const LOCAL_INPUT_OVERHEAD_MS = 1_000
const URL_INPUT_OVERHEAD_MS = 400
const FIXED_HARNESS_OVERHEAD_MS = 600

function inferDocumentType(def: TestDefinition): "pdf" | "png" | "jpg" | "tiff" | "txt" | "docx" | "pptx" | "xlsx" | undefined {
  const pathLike = def.input.type === 'local' ? def.input.path : def.input.url
  if (!pathLike) {
    return undefined
  }

  const resolvedPath = def.input.type === 'url'
    ? (() => {
      try {
        return new URL(pathLike).pathname
      } catch {
        return pathLike
      }
    })()
    : pathLike

  if (resolvedPath.endsWith('.pdf')) return 'pdf'
  if (resolvedPath.endsWith('.png')) return 'png'
  if (resolvedPath.endsWith('.jpg') || resolvedPath.endsWith('.jpeg')) return 'jpg'
  if (resolvedPath.endsWith('.tif') || resolvedPath.endsWith('.tiff')) return 'tiff'
  if (resolvedPath.endsWith('.txt')) return 'txt'
  if (resolvedPath.endsWith('.docx')) return 'docx'
  if (resolvedPath.endsWith('.pptx')) return 'pptx'
  if (resolvedPath.endsWith('.xlsx')) return 'xlsx'
  return undefined
}

function getKnownAudioMinutes(def: TestDefinition): number {
  const { value: audioDurationSec } = findKnownInputSize(def, KNOWN_DURATIONS_SEC)
  return Math.max(1, (audioDurationSec ?? 60) / 60)
}

function getKnownPageCount(def: TestDefinition): number {
  const { value: pageCount } = findKnownInputSize(def, KNOWN_PAGE_COUNTS)
  return Math.max(1, pageCount ?? 1)
}

function getInputOverheadMs(def: TestDefinition): number {
  return def.input.type === "local" ? LOCAL_INPUT_OVERHEAD_MS : URL_INPUT_OVERHEAD_MS
}

function getDefinitionInputBytes(def: TestDefinition): number | undefined {
  if (def.input.type !== "local" || !def.input.path) {
    return undefined
  }

  return Bun.file(def.input.path).size
}

function estimateSelectedTranscriptionStepMs(def: TestDefinition): number | null {
  const model = findTranscriptionModel(def.transcription.service, def.transcription.model)
  if (!model) {
    return null
  }

  return estimateModelDurationMs(model.estimation, {
    inputMinutes: getKnownAudioMinutes(def)
  })
}

function estimateSelectedLLMStepMs(def: TestDefinition): number | null {
  const model = findLLMModel(def.llm.service, def.llm.model)
  if (!model) {
    return null
  }

  return estimateModelDurationMs(
    model.estimation,
    buildLLMEstimationContext(
      def.llm.prompts,
      def.document ? undefined : (getKnownAudioMinutes(def) * 60),
      def.document
        ? {
          sourceType: "document",
          documentPages: getKnownPageCount(def),
          documentType: inferDocumentType(def),
          inputBytes: getDefinitionInputBytes(def),
        }
        : undefined
    )
  )
}

function estimateSelectedDocumentStepMs(def: TestDefinition): number | null {
  if (!def.document) {
    return null
  }

  const model = findDocumentModel(def.document.service, def.document.model)
  if (!model) {
    return null
  }

  return estimateModelDurationMs(model.estimation, {
    documentPages: getKnownPageCount(def),
    documentType: inferDocumentType(def)
  })
}

function estimateSelectedTTSStepMs(def: TestDefinition): number | null {
  if (!def.tts.enabled || !def.tts.service || !def.tts.model) {
    return null
  }

  const model = findTTSModel(def.tts.service, def.tts.model)
  if (!model) {
    return null
  }

  return estimateModelDurationMs(model.estimation, {
    characters: estimateNarratableCharacterCount(def.llm.prompts) ?? 1_500
  })
}

function estimateSelectedImageStepMs(def: TestDefinition): number | null {
  if (!def.image.enabled || !def.image.service || !def.image.model) {
    return null
  }

  const model = findImageModel(def.image.service, def.image.model)
  if (!model) {
    return null
  }

  return estimateModelDurationMs(model.estimation, {
    promptCount: def.image.prompts?.length || 1,
    variant: def.image.aspectRatio
  })
}

function estimateSelectedMusicStepMs(def: TestDefinition): number | null {
  if (!def.music.enabled || !def.music.service || !def.music.model) {
    return null
  }

  const model = findMusicModel(def.music.service, def.music.model)
  if (!model) {
    return null
  }

  return estimateModelDurationMs(model.estimation, {
    outputSeconds: def.music.durationSeconds ?? 60
  })
}

function estimateSelectedVideoStepMs(def: TestDefinition): number | null {
  if (!def.video.enabled || !def.video.service || !def.video.model) {
    return null
  }

  const model = findVideoModel(def.video.service, def.video.model)
  if (!model) {
    return null
  }

  return estimateModelDurationMs(model.estimation, {
    promptCount: def.video.prompts?.length || 1,
    outputSeconds: def.video.duration ?? 5
  })
}

export function getPrimaryTestCategory(def: TestDefinition): TestBenchmarkCategory {
  if (def.tags.includes("video") || def.video.enabled) return "video"
  if (def.tags.includes("music") || def.music.enabled) return "music"
  if (def.tags.includes("image") || def.image.enabled) return "image"
  if (def.tags.includes("tts") || def.tts.enabled) return "tts"
  if (def.tags.includes("document") || def.tags.includes("document-parsing") || def.document) return "document"
  if (def.tags.includes("llm")) return "llm"
  if (def.tags.includes("transcription")) return "transcription"
  return "llm"
}

export function getReportedServiceAndModel(def: TestDefinition): { serviceName: string; modelName: string } {
  switch (getPrimaryTestCategory(def)) {
    case "video":
      return {
        serviceName: def.video.service ?? "unknown",
        modelName: def.video.model ?? "default",
      }
    case "music":
      return {
        serviceName: def.music.service ?? "unknown",
        modelName: def.music.model ?? "default",
      }
    case "image":
      return {
        serviceName: def.image.service ?? "unknown",
        modelName: def.image.model ?? "default",
      }
    case "tts":
      return {
        serviceName: def.tts.service ?? "unknown",
        modelName: def.tts.model ?? "default",
      }
    case "document":
      return {
        serviceName: def.document?.service ?? "unknown",
        modelName: def.document?.model ?? "default",
      }
    case "transcription":
      return {
        serviceName: def.transcription.service,
        modelName: def.transcription.model,
      }
    case "llm":
    default:
      return {
        serviceName: def.llm.service,
        modelName: def.llm.model,
      }
  }
}

function getPrimaryStepKey(def: TestDefinition): TestPrimaryStepKey {
  switch (getPrimaryTestCategory(def)) {
    case "transcription":
    case "document":
      return "transcription"
    case "llm":
      return "llm"
    case "tts":
      return "tts"
    case "image":
      return "image"
    case "music":
      return "music"
    case "video":
      return "video"
  }
}

function estimatePrimaryStepDurationMs(def: TestDefinition): number | null {
  switch (getPrimaryTestCategory(def)) {
    case "transcription":
      return estimateSelectedTranscriptionStepMs(def)
    case "llm":
      return estimateSelectedLLMStepMs(def)
    case "document":
      return estimateSelectedDocumentStepMs(def)
    case "tts":
      return estimateSelectedTTSStepMs(def)
    case "image":
      return estimateSelectedImageStepMs(def)
    case "music":
      return estimateSelectedMusicStepMs(def)
    case "video":
      return estimateSelectedVideoStepMs(def)
    default:
      return null
  }
}

function estimateBenchmarkDurations(def: TestDefinition): {
  category: TestBenchmarkCategory
  endToEnd: {
    estimatedMs: number | null
  }
  primaryStep: {
    key: TestPrimaryStepKey
    estimatedMs: number | null
  }
} {
  const category = getPrimaryTestCategory(def)
  const primaryStep = {
    key: getPrimaryStepKey(def),
    estimatedMs: estimatePrimaryStepDurationMs(def),
  }

  if (primaryStep.estimatedMs == null) {
    return {
      category,
      endToEnd: {
        estimatedMs: null,
      },
      primaryStep,
    }
  }

  let estimatedDurationMs = getInputOverheadMs(def) + FIXED_HARNESS_OVERHEAD_MS + primaryStep.estimatedMs

  switch (category) {
    case "transcription":
      estimatedDurationMs += estimateSelectedLLMStepMs(def) ?? 0
      break
    case "llm":
      estimatedDurationMs += estimateSelectedTranscriptionStepMs(def) ?? 0
      break
    case "document":
      estimatedDurationMs += estimateSelectedLLMStepMs(def) ?? 0
      break
    case "tts":
    case "image":
    case "music":
    case "video":
      estimatedDurationMs += (estimateSelectedTranscriptionStepMs(def) ?? 0)
      estimatedDurationMs += (estimateSelectedLLMStepMs(def) ?? 0)
      break
  }

  return {
    category,
    endToEnd: {
      estimatedMs: Math.round(estimatedDurationMs),
    },
    primaryStep,
  }
}

export function getActualPrimaryStepDurationMs(
  def: TestDefinition,
  stepTimings: StepTimings
): number | null {
  switch (getPrimaryStepKey(def)) {
    case "transcription":
      return stepTimings.transcription?.durationMs ?? null
    case "llm":
    case "tts":
      return stepTimings.writeAndTts?.durationMs ?? null
    case "image":
    case "music":
    case "video":
      return stepTimings.media?.durationMs ?? null
  }
}

export function buildBenchmarkReportEntry(
  def: TestDefinition,
  runAt: string,
  actualDurationMs: number,
  actualPrimaryStepDurationMs: number | null,
  runtimeEstimatedCostUsd: number | null
): TestReportEntry {
  const { serviceName, modelName } = getReportedServiceAndModel(def)
  const estimatedCost = estimateTestDefinitionPrice(def)
  const estimates = estimateBenchmarkDurations(def)

  return {
    category: estimates.category,
    serviceName,
    modelName,
    runAt,
    durations: {
      endToEnd: {
        estimatedMs: estimates.endToEnd.estimatedMs,
        actualMs: actualDurationMs,
      },
      primaryStep: {
        key: estimates.primaryStep.key,
        estimatedMs: estimates.primaryStep.estimatedMs,
        actualMs: actualPrimaryStepDurationMs,
      },
    },
    cost: {
      estimatedUsd: estimatedCost.usd,
      runtimeEstimatedUsd: runtimeEstimatedCostUsd,
    },
  }
}
