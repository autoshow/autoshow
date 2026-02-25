import { json } from "@solidjs/router"
import type { APIEvent } from "@solidjs/start/server"
import * as v from 'valibot'
import { l, err } from "~/utils/logging"
import { formatDurationHuman, formatFileSize } from '~/utils/audio'
import { VerifyUrlRequestSchema, validationErrorResponse, type UrlType, type UrlMetadata, type SupportedDocumentType } from '~/types'
import { getDirectFileMetadata } from '~/routes/api/process/01-dl-audio/file/metadata-file'
import { getDocumentMetadata } from '~/routes/api/process/01-dl-audio/document/metadata-document'
import { getYouTubeMetadata, getNonYouTubeStreamingMetadata } from '~/routes/api/process/01-dl-audio/video/metadata-video'

const STREAMING_PATTERNS = [
  /youtube\.com\/watch/i,
  /youtu\.be\//i,
  /vimeo\.com\//i,
  /twitch\.tv\//i,
  /dailymotion\.com\//i,
  /facebook\.com\/watch/i,
  /soundcloud\.com\//i
]

const DIRECT_FILE_EXTENSIONS = [
  '.mp3', '.mp4', '.wav', '.m4a', '.flac', '.ogg', '.webm',
  '.mpeg', '.mpga', '.avi', '.mov', '.mkv', '.aac', '.wma'
]

const DOCUMENT_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.tiff', '.tif', '.txt', '.docx']

const detectUrlType = (url: string): UrlType => {
  try {
    const urlObj = new URL(url)
    
    const isStreaming = STREAMING_PATTERNS.some(pattern => pattern.test(url))
    if (isStreaming) {
      const isYoutube = /youtube\.com|youtu\.be/i.test(url)
      return isYoutube ? 'youtube' : 'streaming'
    }
    
    const pathname = urlObj.pathname.toLowerCase()
    
    const isDocument = DOCUMENT_EXTENSIONS.some(ext => pathname.endsWith(ext))
    if (isDocument) {
      return 'document'
    }
    
    const isDirectFile = DIRECT_FILE_EXTENSIONS.some(ext => pathname.endsWith(ext))
    if (isDirectFile) {
      return 'direct-file'
    }
    
    return 'invalid'
  } catch {
    return 'invalid'
  }
}

const verifyUrl = async (url: string): Promise<UrlMetadata> => {
  l('Verifying URL type and metadata', { url })

  const urlType = detectUrlType(url)
  l('Detected URL type', { urlType })
  
  if (urlType === 'invalid') {
    l('Invalid URL or unsupported format', { url, urlType })
    return {
      urlType,
      error: 'Invalid URL or unsupported format'
    }
  }
  
  let metadata: { duration?: number, fileSize?: number, mimeType?: string, documentType?: SupportedDocumentType } = {}
  
  if (urlType === 'direct-file') {
    metadata = await getDirectFileMetadata(url)
  } else if (urlType === 'youtube') {
    metadata = await getYouTubeMetadata(url)
  } else if (urlType === 'streaming') {
    metadata = await getNonYouTubeStreamingMetadata(url)
  } else if (urlType === 'document') {
    metadata = await getDocumentMetadata(url)
  }
  
  const result: UrlMetadata = {
    urlType,
    ...(metadata.duration !== undefined && { 
      duration: metadata.duration,
      durationFormatted: formatDurationHuman(metadata.duration)
    }),
    ...(metadata.fileSize !== undefined && { 
      fileSize: metadata.fileSize,
      fileSizeFormatted: formatFileSize(metadata.fileSize)
    }),
    ...(metadata.mimeType !== undefined && { mimeType: metadata.mimeType }),
    ...(metadata.documentType !== undefined && { documentType: metadata.documentType })
  }
  
  l('URL verification complete', {
    urlType,
    ...(result.durationFormatted && { duration: result.durationFormatted }),
    ...(result.fileSizeFormatted && { fileSize: result.fileSizeFormatted })
  })
  return result
}

export async function POST({ request }: APIEvent) {
  try {
    const body = await request.json()
    
    const bodyResult = v.safeParse(VerifyUrlRequestSchema, body)
    if (!bodyResult.success) {
      return validationErrorResponse(bodyResult.issues)
    }
    
    const { url } = bodyResult.output
    
    const metadata = await verifyUrl(url)

    if (metadata.error) {
      return json(metadata, { status: 200 })
    }

    l('URL verified', { urlType: metadata.urlType })
    return json(metadata)
  } catch (error) {
    err("Failed to verify URL", error)
    return json(
      { error: "Failed to verify URL" },
      { status: 500 }
    )
  }
}