import type { DocumentConfig, DocumentExtractionServiceType, DocumentExtractionModel } from '~/types'

export const DOCUMENT_CONFIG: DocumentConfig = {
  llamaparse: {
    name: "LlamaParse",
    description: "AI-powered document parsing with high fidelity extraction",
    supportedTypes: ['pdf', 'png', 'jpg', 'tiff', 'txt', 'docx'],
    models: [
      {
        id: "fast",
        name: "Fast",
        description: "Quick text extraction, basic formatting"
      },
      {
        id: "cost_effective",
        name: "Cost Effective",
        description: "Balanced quality and cost for most documents"
      },
      {
        id: "agentic",
        name: "Agentic",
        description: "AI reasoning for complex documents with images"
      },
      {
        id: "agentic_plus",
        name: "Agentic Plus",
        description: "Maximum fidelity for complex layouts and tables"
      }
    ]
  },
  'mistral-ocr': {
    name: "Mistral OCR",
    description: "Vision-language model for high-accuracy document extraction",
    supportedTypes: ['pdf', 'png', 'jpg', 'tiff', 'txt', 'docx'],
    models: [
      {
        id: "mistral-ocr-latest",
        name: "Mistral OCR Latest",
        description: "Latest Mistral OCR model with high accuracy text and table extraction"
      }
    ]
  }
}

export const getDocumentExtractionModels = (service?: DocumentExtractionServiceType): string[] => {
  if (service && DOCUMENT_CONFIG[service]) {
    return DOCUMENT_CONFIG[service].models.map(m => m.id)
  }
  return DOCUMENT_CONFIG.llamaparse.models.map(m => m.id)
}

export const getDefaultDocumentModel = (service?: DocumentExtractionServiceType): DocumentExtractionModel => {
  if (service === 'mistral-ocr') {
    return 'mistral-ocr-latest'
  }
  return 'cost_effective'
}

export const getDefaultDocumentService = (): DocumentExtractionServiceType => {
  return 'llamaparse'
}

export const getDocumentServiceName = (service: DocumentExtractionServiceType): string => {
  return DOCUMENT_CONFIG[service]?.name || service
}

export const isDocumentExtension = (filename: string): boolean => {
  const ext = filename.toLowerCase()
  return ext.endsWith('.pdf') || ext.endsWith('.png') || ext.endsWith('.jpg') || 
         ext.endsWith('.jpeg') || ext.endsWith('.tiff') || ext.endsWith('.tif') || 
         ext.endsWith('.txt') || ext.endsWith('.docx')
}

export const getDocumentTypeFromExtension = (filename: string): 'pdf' | 'png' | 'jpg' | 'tiff' | 'txt' | 'docx' | null => {
  const ext = filename.toLowerCase()
  if (ext.endsWith('.pdf')) return 'pdf'
  if (ext.endsWith('.png')) return 'png'
  if (ext.endsWith('.jpg') || ext.endsWith('.jpeg')) return 'jpg'
  if (ext.endsWith('.tiff') || ext.endsWith('.tif')) return 'tiff'
  if (ext.endsWith('.txt')) return 'txt'
  if (ext.endsWith('.docx')) return 'docx'
  return null
}
