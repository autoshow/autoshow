import { LLM_CONFIG } from '~/models/models-config/llm-config'
import {
attachModelEstimations,
buildLLMDocumentModelEstimation,
buildOCRDocumentModelEstimation
} from '~/models/models-utils/estimate-speed'
import { createDocumentSpeedProfile } from '~/models/models-utils/speed'
import type {
DocumentConfig,DocumentExtractionModel,DocumentExtractionServiceType,SourceModelsModelsConfigDocumentConfigDocumentPreprocessPlan as DocumentPreprocessPlan,DocumentRuntimeCapabilities,
SupportedDocumentType
} from '~/types'

const DEFAULT_DOCUMENT_RUNTIME_CAPABILITIES: DocumentRuntimeCapabilities = {
  canConvertTiffToPng: false
}

const DOCUMENT_SERVICE_PREFERENCE: DocumentExtractionServiceType[] = ['mistral-ocr', 'openai', 'claude', 'gemini', 'grok', 'glm', 'deapi']

let runtimeCapabilitiesCache: DocumentRuntimeCapabilities | null = null

const getLLMDocumentModels = (service: 'openai' | 'claude' | 'gemini' | 'grok') => {
  return LLM_CONFIG[service].models.map(model => ({
    id: model.id,
    name: model.name,
    description: model.description,
    speedProfile: model.speedProfile,
    quality: model.quality,
    cost: model.cost,
    estimationHeuristics: model.estimationHeuristics
  }))
}

const detectMagickAvailability = (): boolean => {
  if (typeof window !== 'undefined' || typeof Bun === 'undefined') {
    return false
  }

  try {
    const result = Bun.spawnSync(['sh', '-lc', 'command -v magick >/dev/null 2>&1'])
    return result.exitCode === 0
  } catch {
    return false
  }
}

export const getServerDocumentRuntimeCapabilities = (): DocumentRuntimeCapabilities => {
  if (runtimeCapabilitiesCache) {
    return runtimeCapabilitiesCache
  }

  runtimeCapabilitiesCache = {
    canConvertTiffToPng: detectMagickAvailability()
  }

  return runtimeCapabilitiesCache
}

export const resolveDocumentRuntimeCapabilities = (
  runtimeCapabilities?: DocumentRuntimeCapabilities | null
): DocumentRuntimeCapabilities => {
  if (runtimeCapabilities) {
    return runtimeCapabilities
  }

  if (typeof window !== 'undefined') {
    return DEFAULT_DOCUMENT_RUNTIME_CAPABILITIES
  }

  return getServerDocumentRuntimeCapabilities()
}

export const DOCUMENT_CONFIG: DocumentConfig = {
  'mistral-ocr': {
    name: "Mistral OCR",
    description: "Vision-language model for high-accuracy document extraction",
    supportedTypes: ['pdf', 'png', 'jpg', 'tiff', 'txt', 'docx'],
    nativeTypes: ['pdf', 'png', 'jpg', 'tiff', 'txt', 'docx'],
    preprocessableTypes: [],
    models: attachModelEstimations([
      {
        id: "mistral-ocr-latest",
        name: "Mistral OCR Latest",
        description: "Latest Mistral OCR model with high accuracy text and table extraction",
        speedProfile: createDocumentSpeedProfile("A"),
        quality: "A",
        costPerPage: 0.001
      }
    ], buildOCRDocumentModelEstimation)
  },
  glm: {
    name: "GLM OCR",
    description: "Z.AI GLM-OCR model for document layout parsing and extraction",
    supportedTypes: ['pdf', 'png', 'jpg'],
    nativeTypes: ['pdf', 'png', 'jpg'],
    preprocessableTypes: [],
    models: attachModelEstimations([
      {
        id: "glm-ocr",
        name: "GLM OCR",
        description: "GLM OCR model for high-accuracy document layout parsing",
        speedProfile: createDocumentSpeedProfile("B"),
        quality: "B",
        costPerPage: 0.002
      }
    ], buildOCRDocumentModelEstimation)
  },
  openai: {
    name: LLM_CONFIG.openai.name,
    description: "OpenAI multimodal document extraction with native file, image, and text handling",
    supportedTypes: ['pdf', 'png', 'jpg', 'tiff', 'txt', 'docx', 'pptx', 'xlsx'],
    nativeTypes: ['pdf', 'png', 'jpg', 'txt', 'docx'],
    preprocessableTypes: ['tiff', 'pptx', 'xlsx'],
    models: attachModelEstimations(getLLMDocumentModels('openai'), buildLLMDocumentModelEstimation)
  },
  claude: {
    name: LLM_CONFIG.claude.name,
    description: "Claude document understanding for PDFs, images, and plain text extraction",
    supportedTypes: ['pdf', 'png', 'jpg', 'tiff', 'txt', 'pptx', 'xlsx'],
    nativeTypes: ['pdf', 'png', 'jpg', 'txt'],
    preprocessableTypes: ['tiff', 'pptx', 'xlsx'],
    models: attachModelEstimations(getLLMDocumentModels('claude'), buildLLMDocumentModelEstimation)
  },
  gemini: {
    name: LLM_CONFIG.gemini.name,
    description: "Gemini document understanding for PDFs, images, and text inputs",
    supportedTypes: ['pdf', 'png', 'jpg', 'tiff', 'txt', 'pptx', 'xlsx'],
    nativeTypes: ['pdf', 'png', 'jpg', 'txt'],
    preprocessableTypes: ['tiff', 'pptx', 'xlsx'],
    models: attachModelEstimations(getLLMDocumentModels('gemini'), buildLLMDocumentModelEstimation)
  },
  grok: {
    name: LLM_CONFIG.grok.name,
    description: "Grok document understanding for PDFs, images, and text inputs",
    supportedTypes: ['pdf', 'png', 'jpg', 'tiff', 'txt', 'pptx', 'xlsx'],
    nativeTypes: ['pdf', 'png', 'jpg', 'txt'],
    preprocessableTypes: ['tiff', 'pptx', 'xlsx'],
    models: attachModelEstimations(getLLMDocumentModels('grok'), buildLLMDocumentModelEstimation)
  },
  deapi: {
    name: "DeAPI OCR",
    description: "DeAPI OCR extraction for image-based documents",
    supportedTypes: ['png', 'jpg'],
    nativeTypes: ['png', 'jpg'],
    preprocessableTypes: [],
    models: attachModelEstimations([
      {
        id: "Nanonets_Ocr_S_F16",
        name: "Nanonets OCR S F16",
        description: "DeAPI-hosted Nanonets OCR model for image-based text extraction",
        speedProfile: createDocumentSpeedProfile("B", {
          baseMs: 17_000,
          perPageMs: 2_400
        }),
        quality: "B",
        costPerPage: 0.001
      }
    ], buildOCRDocumentModelEstimation)
  }
}

const getDocumentPreprocessFailureReason = (
  service: DocumentExtractionServiceType,
  documentType: SupportedDocumentType,
  runtimeCapabilities: DocumentRuntimeCapabilities
): string => {
  if (documentType === 'docx' && (service === 'claude' || service === 'gemini')) {
    return `${DOCUMENT_CONFIG[service].name} does not support DOCX extraction in this app`
  }

  if (documentType === 'tiff' && !runtimeCapabilities.canConvertTiffToPng && ['openai', 'claude', 'gemini', 'grok'].includes(service)) {
    return `TIFF extraction with ${DOCUMENT_CONFIG[service].name} requires ImageMagick (\`magick\`) at runtime`
  }

  return `${DOCUMENT_CONFIG[service].name} does not support ${documentType.toUpperCase()} inputs`
}

export const getDocumentPreprocessPlan = (
  service: DocumentExtractionServiceType,
  documentType: SupportedDocumentType,
  runtimeCapabilities?: DocumentRuntimeCapabilities | null
): DocumentPreprocessPlan => {
  const resolvedCapabilities = resolveDocumentRuntimeCapabilities(runtimeCapabilities)
  const config = DOCUMENT_CONFIG[service]

  if (!config.supportedTypes.includes(documentType)) {
    return {
      supported: false,
      action: 'reject',
      reason: getDocumentPreprocessFailureReason(service, documentType, resolvedCapabilities)
    }
  }

  if (config.nativeTypes.includes(documentType)) {
    return {
      supported: true,
      action: 'none',
      effectiveType: documentType,
      inputMode: documentType === 'txt' ? 'text' : 'file'
    }
  }

  if (documentType === 'tiff' && config.preprocessableTypes.includes(documentType) && resolvedCapabilities.canConvertTiffToPng) {
    return {
      supported: true,
      action: 'convert-tiff-to-png',
      effectiveType: 'png',
      inputMode: 'file'
    }
  }

  if ((documentType === 'pptx' || documentType === 'xlsx') && config.preprocessableTypes.includes(documentType)) {
    return {
      supported: true,
      action: 'extract-office-to-markdown',
      effectiveType: 'txt',
      inputMode: 'text'
    }
  }

  return {
    supported: false,
    action: 'reject',
    reason: getDocumentPreprocessFailureReason(service, documentType, resolvedCapabilities)
  }
}

export const isDocumentServiceSupportedForType = (
  service: DocumentExtractionServiceType,
  documentType: SupportedDocumentType,
  runtimeCapabilities?: DocumentRuntimeCapabilities | null
): boolean => {
  return getDocumentPreprocessPlan(service, documentType, runtimeCapabilities).supported
}

export const getDocumentServicesForType = (
  documentType: SupportedDocumentType,
  runtimeCapabilities?: DocumentRuntimeCapabilities | null
): DocumentExtractionServiceType[] => {
  return DOCUMENT_SERVICE_PREFERENCE.filter(service =>
    isDocumentServiceSupportedForType(service, documentType, runtimeCapabilities)
  )
}

export const getAvailableDocumentModels = (
  service: DocumentExtractionServiceType,
  documentType: SupportedDocumentType,
  runtimeCapabilities?: DocumentRuntimeCapabilities | null
): DocumentExtractionModel[] => {
  if (!isDocumentServiceSupportedForType(service, documentType, runtimeCapabilities)) {
    return []
  }

  return DOCUMENT_CONFIG[service].models.map(model => model.id as DocumentExtractionModel)
}
export const getDefaultDocumentModel = (
  service?: DocumentExtractionServiceType,
  documentType?: SupportedDocumentType,
  runtimeCapabilities?: DocumentRuntimeCapabilities | null
): DocumentExtractionModel => {
  const resolvedService = service ?? getDefaultDocumentService(documentType, runtimeCapabilities)
  const availableModels = documentType
    ? getAvailableDocumentModels(resolvedService, documentType, runtimeCapabilities)
    : DOCUMENT_CONFIG[resolvedService].models.map(model => model.id as DocumentExtractionModel)

  if (availableModels.length > 0) {
    return availableModels[0]!
  }

  return DOCUMENT_CONFIG['mistral-ocr'].models[0]!.id as DocumentExtractionModel
}

export const getDefaultDocumentService = (
  documentType?: SupportedDocumentType,
  runtimeCapabilities?: DocumentRuntimeCapabilities | null
): DocumentExtractionServiceType => {
  if (documentType) {
    return getDocumentServicesForType(documentType, runtimeCapabilities)[0] ?? 'mistral-ocr'
  }

  return 'mistral-ocr'
}

export const isDocumentExtension = (filename: string): boolean => {
  const ext = filename.toLowerCase()
  return ext.endsWith('.pdf') || ext.endsWith('.png') || ext.endsWith('.jpg') ||
         ext.endsWith('.jpeg') || ext.endsWith('.tiff') || ext.endsWith('.tif') ||
         ext.endsWith('.txt') || ext.endsWith('.docx') || ext.endsWith('.pptx') ||
         ext.endsWith('.xlsx')
}

export const getDocumentTypeFromExtension = (filename: string): SupportedDocumentType | null => {
  const ext = filename.toLowerCase()
  if (ext.endsWith('.pdf')) return 'pdf'
  if (ext.endsWith('.png')) return 'png'
  if (ext.endsWith('.jpg') || ext.endsWith('.jpeg')) return 'jpg'
  if (ext.endsWith('.tiff') || ext.endsWith('.tif')) return 'tiff'
  if (ext.endsWith('.txt')) return 'txt'
  if (ext.endsWith('.docx')) return 'docx'
  if (ext.endsWith('.pptx')) return 'pptx'
  if (ext.endsWith('.xlsx')) return 'xlsx'
  return null
}
