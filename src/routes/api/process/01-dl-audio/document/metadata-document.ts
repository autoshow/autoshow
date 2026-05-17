import type { DocumentMetadata,SourceRoutesApiProcess01DlAudioDocumentMetadataDocumentDocumentUrlMetadata as DocumentUrlMetadata } from '~/types'
import { PublicHttpMaxBytesExceededError } from '~/utils/security/public-http'
import { fetchUrlHeaders,getDocumentType } from '../dl-utils'
import { MAX_REMOTE_DOCUMENT_BYTES } from '../remote-source-limits'

export const getDocumentMetadata = async (url: string): Promise<DocumentUrlMetadata> => {
  try {

    const { fileSize, mimeType } = await fetchUrlHeaders(url)
    const documentType = getDocumentType(url)

    if (fileSize !== undefined) {
      if (fileSize > MAX_REMOTE_DOCUMENT_BYTES) {
        return {
          ...(fileSize !== undefined && { fileSize }),
          ...(mimeType !== undefined && { mimeType }),
          ...(documentType !== null && { documentType }),
          error: new PublicHttpMaxBytesExceededError(MAX_REMOTE_DOCUMENT_BYTES, fileSize).message
        }
      }
    }

    if (mimeType !== undefined) {
    }

    return {
      ...(fileSize !== undefined && { fileSize }),
      ...(mimeType !== undefined && { mimeType }),
      ...(documentType !== null && { documentType })
    }
  } catch (error) {
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

    return {
      title,
      fileSize,
      source: 'local',
      documentType
    }
  } catch (error) {
    throw error
  }
}
