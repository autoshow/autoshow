import { mkdir,rm } from 'node:fs/promises'
import { basename } from 'node:path'
import { getDocumentPreprocessPlan,getServerDocumentRuntimeCapabilities } from '~/models'
import { executeCommand } from '~/routes/api/process/01-dl-audio/dl-utils'
import { MAX_REMOTE_DOCUMENT_BYTES } from '~/routes/api/process/01-dl-audio/remote-source-limits'
import type { SourceRoutesApiProcess02RunTranscribeDocumentServicesPreprocessDocumentPreprocessDocumentInput as PreprocessDocumentInput,SourceRoutesApiProcess02RunTranscribeDocumentServicesPreprocessDocumentPreprocessedDocumentDescriptor as PreprocessedDocumentDescriptor,SupportedDocumentType } from '~/types'
import { downloadPublicHttpUrlToFile,readPublicHttpUrlText } from '~/utils/security/public-http'
import { extractOfficeDocumentToMarkdown } from './office-document-extractor'

const MIME_TYPES: Record<SupportedDocumentType, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  tiff: 'image/tiff',
  txt: 'text/plain',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
}

const buildTempPath = (outputDir: string, baseName: string, extension: string): string => {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  const normalizedBaseName = baseName.replace(/[^a-z0-9._-]/gi, '-').replace(/-+/g, '-')
  return `${outputDir}/document-preprocess/${stamp}-${normalizedBaseName}.${extension}`
}

const getSourceFileName = (documentPath: string | null, documentUrl: string | null, documentType: SupportedDocumentType): string => {
  if (documentPath) {
    return basename(documentPath)
  }

  if (!documentUrl) {
    return `document.${documentType}`
  }

  try {
    const url = new URL(documentUrl)
    const urlFileName = basename(url.pathname)
    if (urlFileName.length > 0) {
      return urlFileName
    }
  } catch {
  }

  return `document.${documentType}`
}

const getPdfPageCount = async (path: string): Promise<number> => {
  try {
    const result = await executeCommand('pdfinfo', [path])
    if (result.exitCode !== 0) {
      return 1
    }

    const match = result.stdout.match(/Pages:\s+(\d+)/i)
    return match?.[1] ? Math.max(1, parseInt(match[1], 10)) : 1
  } catch {
    return 1
  }
}

const downloadRemoteFile = async (
  documentUrl: string,
  outputDir: string,
  fileName: string
): Promise<string> => {
  const extension = fileName.includes('.') ? fileName.split('.').pop() : 'bin'
  const downloadPath = buildTempPath(outputDir, fileName.replace(/\.[^/.]+$/, ''), extension || 'bin')
  await downloadPublicHttpUrlToFile(documentUrl, downloadPath, MAX_REMOTE_DOCUMENT_BYTES)
  return downloadPath
}

const readTextSource = async (documentPath: string | null, documentUrl: string | null): Promise<string> => {
  if (documentPath) {
    return await Bun.file(documentPath).text()
  }

  if (!documentUrl) {
    throw new Error('Text document source is missing')
  }

  return await readPublicHttpUrlText(documentUrl, MAX_REMOTE_DOCUMENT_BYTES)
}

const convertTiffToPng = async (inputPath: string, outputDir: string, fileName: string): Promise<string> => {
  const pngPath = buildTempPath(outputDir, fileName.replace(/\.[^/.]+$/, ''), 'png')
  const result = await executeCommand('magick', [inputPath, pngPath])

  if (result.exitCode !== 0) {
    throw new Error(`Failed to convert TIFF to PNG: ${result.stderr || result.stdout}`)
  }

  return pngPath
}

export const preprocessDocumentInput = async ({
  documentPath,
  documentUrl,
  documentType,
  documentService,
  outputDir,
  runtimeCapabilities
}: PreprocessDocumentInput): Promise<PreprocessedDocumentDescriptor> => {
  const resolvedCapabilities = runtimeCapabilities ?? getServerDocumentRuntimeCapabilities()
  const preprocessPlan = getDocumentPreprocessPlan(documentService, documentType, resolvedCapabilities)

  if (!preprocessPlan.supported) {
    throw new Error(preprocessPlan.reason)
  }

  const cleanupPaths: string[] = []
  const sourceFileName = getSourceFileName(documentPath, documentUrl, documentType)
  const preprocessedFromType = documentType !== preprocessPlan.effectiveType ? documentType : undefined

  await mkdir(`${outputDir}/document-preprocess`, { recursive: true })

  if (preprocessPlan.action === 'extract-office-to-markdown') {
    let localPath = documentPath
    if (!localPath) {
      if (!documentUrl) {
        throw new Error('Document source is missing')
      }

      localPath = await downloadRemoteFile(documentUrl, outputDir, sourceFileName)
      cleanupPaths.push(localPath)
    }

    const fileBuffer = await Bun.file(localPath).arrayBuffer()
    const extracted = extractOfficeDocumentToMarkdown(fileBuffer, documentType as 'pptx' | 'xlsx')

    return {
      inputMode: 'text',
      text: extracted.markdown,
      mimeType: MIME_TYPES.txt,
      effectiveType: 'txt',
      originalType: documentType,
      fileName: sourceFileName,
      pageCount: extracted.pageCount,
      cleanup: async () => {
        await Promise.all(cleanupPaths.map(async path => {
          await rm(path, { force: true })
        }))
      }
    }
  }

  if (preprocessPlan.inputMode === 'text') {
    const text = await readTextSource(documentPath, documentUrl)
    return {
      inputMode: 'text',
      text,
      mimeType: MIME_TYPES.txt,
      effectiveType: 'txt',
      originalType: documentType,
      fileName: sourceFileName,
      pageCount: 1,
      cleanup: async () => {}
    }
  }

  let localPath = documentPath
  if (!localPath) {
    if (!documentUrl) {
      throw new Error('Document source is missing')
    }

    localPath = await downloadRemoteFile(documentUrl, outputDir, sourceFileName)
    cleanupPaths.push(localPath)
  }

  let effectivePath = localPath
  let effectiveType = preprocessPlan.effectiveType
  let effectiveFileName = sourceFileName

  if (preprocessPlan.action === 'convert-tiff-to-png') {
    effectivePath = await convertTiffToPng(localPath, outputDir, sourceFileName)
    cleanupPaths.push(effectivePath)
    effectiveType = 'png'
    effectiveFileName = `${sourceFileName.replace(/\.[^/.]+$/, '')}.png`
  }

  const pageCount = effectiveType === 'pdf' ? await getPdfPageCount(effectivePath) : 1

  return {
    inputMode: 'file',
    path: effectivePath,
    mimeType: MIME_TYPES[effectiveType],
    effectiveType,
    originalType: preprocessedFromType ?? documentType,
    fileName: effectiveFileName,
    pageCount,
    cleanup: async () => {
      await Promise.all(cleanupPaths.map(async path => {
        await rm(path, { force: true })
      }))
    }
  }
}
