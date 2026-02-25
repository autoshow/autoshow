import { l, err } from "~/utils/logging"
import { formatFileSize } from '~/utils/audio'
import { fetchUrlHeaders, getDocumentType } from '../dl-utils'
import type { SupportedDocumentType, DocumentMetadata } from '~/types'

const MAX_DOCUMENT_SIZE = 300 * 1024 * 1024

export const getDocumentMetadata = async (url: string): Promise<{ fileSize?: number, mimeType?: string, documentType?: SupportedDocumentType }> => {
  try {
    l('Getting document metadata')
    
    const { fileSize, mimeType } = await fetchUrlHeaders(url)
    
    if (fileSize !== undefined) {
      l(`Document file size: ${formatFileSize(fileSize)}`)
      if (fileSize > MAX_DOCUMENT_SIZE) {
        err(`Document exceeds maximum size of ${formatFileSize(MAX_DOCUMENT_SIZE)}`)
      }
    }
    
    if (mimeType !== undefined) {
      l(`Document MIME type: ${mimeType}`)
    }
    
    const documentType = getDocumentType(url)
    
    return { 
      ...(fileSize !== undefined && { fileSize }),
      ...(mimeType !== undefined && { mimeType }),
      ...(documentType !== null && { documentType })
    }
  } catch (error) {
    err(`Failed to get document metadata`, error)
    return {}
  }
}

export const extractDocumentMetadata = async (filePath: string, fileName: string): Promise<DocumentMetadata> => {
  try {
    const file = Bun.file(filePath)
    const fileSize = file.size
    const documentType = getDocumentType(filePath)
    
    if (!documentType) {
      throw new Error(`Unsupported document type: ${filePath}`)
    }
    
    const title = fileName.replace(/\.[^/.]+$/, '')
    
    l('Extracted document metadata', { title, fileSize, documentType })
    
    return {
      title,
      fileSize,
      source: 'local',
      documentType
    }
  } catch (error) {
    err('Failed to extract document metadata', error)
    throw error
  }
}
