import { open,rm } from 'node:fs/promises'
import type { SupportedDocumentType } from '~/types'

const GOOGLE_DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file'

const GOOGLE_DRIVE_METADATA_FIELDS = [
  'id',
  'name',
  'mimeType',
  'size',
  'trashed',
  'capabilities/canDownload',
].join(',')

const GOOGLE_APPS_PREFIX = 'application/vnd.google-apps.'

type GoogleDriveFetch = typeof fetch

type GoogleDriveTokenInfo = {
  aud?: string
  scope?: string
  expires_in?: string | number
}

type GoogleDriveFileMetadata = {
  id?: string
  name?: string
  mimeType?: string
  size?: string
  trashed?: boolean
  capabilities?: {
    canDownload?: boolean
  }
}

type GoogleDriveImportPlan = {
  fileName: string
  mimeType: string
  downloadUrl: string
  isExport: boolean
  size?: number
  documentType?: SupportedDocumentType
}

type GoogleDriveImportResult = {
  fileName: string
  storedFilePath: string
  fileSize: number
  mimeType: string
  documentType?: SupportedDocumentType
}

type GoogleDriveImportOptions = {
  accessToken: string
  clientId: string
  fileId: string
  destinationPath: string
  maxBytes: number
  resourceKey?: string | undefined
  fetchImpl?: GoogleDriveFetch | undefined
}

type WorkspaceExport = {
  mimeType: string
  extension: string
  documentType: SupportedDocumentType
}

export class GoogleDriveImportError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'GoogleDriveImportError'
    this.status = status
  }
}

const workspaceExports: Record<string, WorkspaceExport> = {
  'application/vnd.google-apps.document': {
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    extension: 'docx',
    documentType: 'docx',
  },
  'application/vnd.google-apps.spreadsheet': {
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    extension: 'xlsx',
    documentType: 'xlsx',
  },
  'application/vnd.google-apps.presentation': {
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    extension: 'pptx',
    documentType: 'pptx',
  },
  'application/vnd.google-apps.drawing': {
    mimeType: 'application/pdf',
    extension: 'pdf',
    documentType: 'pdf',
  },
}

const documentTypesByExtension: Record<string, SupportedDocumentType> = {
  pdf: 'pdf',
  png: 'png',
  jpg: 'jpg',
  jpeg: 'jpg',
  tiff: 'tiff',
  tif: 'tiff',
  txt: 'txt',
  docx: 'docx',
  pptx: 'pptx',
  xlsx: 'xlsx',
}

const supportedBlobExtensions = new Set([
  'mp3',
  'wav',
  'm4a',
  'flac',
  'ogg',
  'aac',
  'wma',
  'mpeg',
  'mpga',
  'mp4',
  'mov',
  'avi',
  'mkv',
  'webm',
  'wmv',
  'flv',
  'm4v',
  ...Object.keys(documentTypesByExtension),
])

const supportedExactBlobMimeTypes = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'image/png',
  'image/jpeg',
  'image/tiff',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/flac',
  'audio/ogg',
  'audio/aac',
  'audio/x-ms-wma',
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  'video/webm',
  'video/x-ms-wmv',
  'video/x-flv',
  'video/x-m4v',
])

const defaultExtensionByMimeType: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'text/plain': 'txt',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/tiff': 'tiff',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/mp4': 'm4a',
  'audio/flac': 'flac',
  'audio/ogg': 'ogg',
  'audio/aac': 'aac',
  'audio/x-ms-wma': 'wma',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/x-msvideo': 'avi',
  'video/x-matroska': 'mkv',
  'video/webm': 'webm',
  'video/x-ms-wmv': 'wmv',
  'video/x-flv': 'flv',
  'video/x-m4v': 'm4v',
}

const parsePositiveInteger = (value: string | undefined): number | undefined => {
  if (!value) return undefined
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
}

const splitScope = (scope: string | undefined): Set<string> => {
  return new Set((scope ?? '').split(/\s+/).filter(Boolean))
}

const getExtension = (fileName: string): string | null => {
  const lastSegment = fileName.split(/[\\/]/).pop() ?? fileName
  const dotIndex = lastSegment.lastIndexOf('.')
  if (dotIndex <= 0 || dotIndex === lastSegment.length - 1) return null
  return lastSegment.slice(dotIndex + 1).toLowerCase()
}

const ensureDestinationExtension = (destinationPath: string, fileName: string): string => {
  const extension = getExtension(fileName)
  if (!extension) return destinationPath
  return getExtension(destinationPath) === extension ? destinationPath : `${destinationPath}.${extension}`
}

const getDocumentTypeFromFileName = (fileName: string): SupportedDocumentType | undefined => {
  const extension = getExtension(fileName)
  return extension ? documentTypesByExtension[extension] : undefined
}

const isSupportedBlobMimeType = (mimeType: string): boolean => {
  const normalized = mimeType.toLowerCase().split(';', 1)[0]?.trim() ?? ''
  return (
    normalized.startsWith('audio/') ||
    normalized.startsWith('video/') ||
    supportedExactBlobMimeTypes.has(normalized)
  )
}

const getDefaultExtensionForBlob = (mimeType: string): string | undefined => {
  const normalized = mimeType.toLowerCase().split(';', 1)[0]?.trim() ?? ''
  if (defaultExtensionByMimeType[normalized]) return defaultExtensionByMimeType[normalized]
  if (normalized.startsWith('audio/')) return 'mp3'
  if (normalized.startsWith('video/')) return 'mp4'
  return undefined
}

export const normalizeGoogleDriveFileName = (
  name: string | undefined,
  requiredExtension?: string | undefined
): string => {
  const trimmed = (name ?? '').trim()
  const baseName = trimmed || 'google-drive-file'
  const sanitized = baseName
    .replace(/[\0\r\n]/g, ' ')
    .replace(/[\\/]/g, '_')
    .replace(/[<>:"|?*]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
  const safeName = sanitized && sanitized !== '.' && sanitized !== '..'
    ? sanitized
    : 'google-drive-file'
  const extension = requiredExtension?.replace(/^\./, '').toLowerCase()
  const currentExtension = getExtension(safeName)
  const shouldReplaceExtension = !!currentExtension && supportedBlobExtensions.has(currentExtension)
  const extensionBaseName = shouldReplaceExtension
    ? safeName.slice(0, -(currentExtension!.length + 1))
    : safeName
  const withExtension = extension && currentExtension !== extension
    ? `${extensionBaseName}.${extension}`
    : safeName

  return withExtension.length <= 255 ? withExtension : withExtension.slice(0, 255)
}

const getGoogleWorkspaceExport = (mimeType: string): WorkspaceExport | null => {
  return workspaceExports[mimeType] ?? null
}

const resolveGoogleDriveImportPlan = (
  metadata: GoogleDriveFileMetadata,
  maxBytes: number,
  resourceKey?: string | undefined
): GoogleDriveImportPlan => {
  const fileId = metadata.id?.trim()
  const mimeType = metadata.mimeType?.trim()

  if (!fileId) {
    throw new GoogleDriveImportError('Google Drive file metadata is missing an id', 502)
  }
  if (!mimeType) {
    throw new GoogleDriveImportError('Google Drive file metadata is missing a MIME type', 415)
  }
  if (metadata.trashed) {
    throw new GoogleDriveImportError('Google Drive file is in the trash', 400)
  }
  if (metadata.capabilities?.canDownload === false) {
    throw new GoogleDriveImportError('Google Drive file cannot be downloaded by this account', 403)
  }

  const resourceKeyParam = resourceKey ? `&resourceKey=${encodeURIComponent(resourceKey)}` : ''

  if (mimeType.startsWith(GOOGLE_APPS_PREFIX)) {
    const exportConfig = getGoogleWorkspaceExport(mimeType)
    if (!exportConfig) {
      if (mimeType === 'application/vnd.google-apps.folder') {
        throw new GoogleDriveImportError('Google Drive folders are not supported', 415)
      }
      if (mimeType === 'application/vnd.google-apps.shortcut') {
        throw new GoogleDriveImportError('Google Drive shortcuts are not supported', 415)
      }
      throw new GoogleDriveImportError('This Google Workspace file type is not supported', 415)
    }

    return {
      fileName: normalizeGoogleDriveFileName(metadata.name, exportConfig.extension),
      mimeType: exportConfig.mimeType,
      downloadUrl: `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export?mimeType=${encodeURIComponent(exportConfig.mimeType)}${resourceKeyParam}`,
      isExport: true,
      documentType: exportConfig.documentType,
    }
  }

  const size = parsePositiveInteger(metadata.size)
  if (size !== undefined && size > maxBytes) {
    throw new GoogleDriveImportError('File exceeds maximum allowed upload size', 413)
  }

  const extension = getExtension(metadata.name ?? '')
  const supportedByExtension = extension ? supportedBlobExtensions.has(extension) : false
  const supportedByMime = isSupportedBlobMimeType(mimeType)
  if (!supportedByExtension && !supportedByMime) {
    throw new GoogleDriveImportError('Google Drive file type is not supported', 415)
  }

  const requiredExtension = extension ? undefined : getDefaultExtensionForBlob(mimeType)
  const fileName = normalizeGoogleDriveFileName(metadata.name, requiredExtension)
  const documentType = getDocumentTypeFromFileName(fileName)
  const plan: GoogleDriveImportPlan = {
    fileName,
    mimeType,
    downloadUrl: `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true${resourceKeyParam}`,
    isExport: false,
  }

  if (size !== undefined) plan.size = size
  if (documentType !== undefined) plan.documentType = documentType
  return plan
}

const verifyGoogleDriveAccessToken = async (
  accessToken: string,
  clientId: string,
  fetchImpl: GoogleDriveFetch = globalThis.fetch
): Promise<void> => {
  const tokenInfoUrl = `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`
  const response = await fetchImpl(tokenInfoUrl)
  if (!response.ok) {
    throw new GoogleDriveImportError('Invalid Google Drive access token', 401)
  }

  const tokenInfo = await response.json() as GoogleDriveTokenInfo
  if (tokenInfo.aud !== clientId) {
    throw new GoogleDriveImportError('Google Drive access token audience is not authorized for this app', 403)
  }
  if (!splitScope(tokenInfo.scope).has(GOOGLE_DRIVE_FILE_SCOPE)) {
    throw new GoogleDriveImportError('Google Drive access token is missing the required drive.file scope', 403)
  }
}

const fetchGoogleDriveMetadata = async (
  accessToken: string,
  fileId: string,
  resourceKey: string | undefined,
  fetchImpl: GoogleDriveFetch = globalThis.fetch
): Promise<GoogleDriveFileMetadata> => {
  const resourceKeyParam = resourceKey ? `&resourceKey=${encodeURIComponent(resourceKey)}` : ''
  const metadataUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=${encodeURIComponent(GOOGLE_DRIVE_METADATA_FIELDS)}&supportsAllDrives=true${resourceKeyParam}`
  const response = await fetchImpl(metadataUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (response.status === 404) {
    throw new GoogleDriveImportError('Google Drive file was not found', 404)
  }
  if (response.status === 401 || response.status === 403) {
    throw new GoogleDriveImportError('Google Drive file is not accessible with this token', 403)
  }
  if (!response.ok) {
    throw new GoogleDriveImportError('Failed to read Google Drive file metadata', 502)
  }

  return await response.json() as GoogleDriveFileMetadata
}

const downloadGoogleDriveResponseToFile = async (
  response: Response,
  destinationPath: string,
  maxBytes: number
): Promise<number> => {
  const contentLength = response.headers.get('content-length')
  const declaredSize = parsePositiveInteger(contentLength ?? undefined)
  if (declaredSize !== undefined && declaredSize > maxBytes) {
    throw new GoogleDriveImportError('File exceeds maximum allowed upload size', 413)
  }

  if (!response.body) {
    const buffer = new Uint8Array(await response.arrayBuffer())
    if (buffer.byteLength > maxBytes) {
      throw new GoogleDriveImportError('File exceeds maximum allowed upload size', 413)
    }
    await Bun.write(destinationPath, buffer)
    return buffer.byteLength
  }

  const handle = await open(destinationPath, 'w')
  let totalBytes = 0

  try {
    const reader = response.body.getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value) continue

      totalBytes += value.byteLength
      if (totalBytes > maxBytes) {
        await reader.cancel().catch(() => undefined)
        throw new GoogleDriveImportError('File exceeds maximum allowed upload size', 413)
      }

      await handle.write(value)
    }
  } finally {
    await handle.close()
  }

  return totalBytes
}

export const importGoogleDriveFile = async ({
  accessToken,
  clientId,
  fileId,
  destinationPath,
  maxBytes,
  resourceKey,
  fetchImpl = globalThis.fetch,
}: GoogleDriveImportOptions): Promise<GoogleDriveImportResult> => {
  await verifyGoogleDriveAccessToken(accessToken, clientId, fetchImpl)
  const metadata = await fetchGoogleDriveMetadata(accessToken, fileId, resourceKey, fetchImpl)
  const plan = resolveGoogleDriveImportPlan(metadata, maxBytes, resourceKey)
  const storedFilePath = ensureDestinationExtension(destinationPath, plan.fileName)

  try {
    const response = await fetchImpl(plan.downloadUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (response.status === 404) {
      throw new GoogleDriveImportError('Google Drive file content was not found', 404)
    }
    if (response.status === 401 || response.status === 403) {
      throw new GoogleDriveImportError('Google Drive file content is not accessible with this token', 403)
    }
    if (!response.ok) {
      throw new GoogleDriveImportError('Failed to download Google Drive file content', 502)
    }

    const fileSize = await downloadGoogleDriveResponseToFile(response, storedFilePath, maxBytes)
    if (fileSize <= 0) {
      throw new GoogleDriveImportError('Empty files are not allowed', 400)
    }

    return {
      fileName: plan.fileName,
      storedFilePath,
      fileSize,
      mimeType: plan.mimeType,
      ...(plan.documentType !== undefined ? { documentType: plan.documentType } : {}),
    }
  } catch (error) {
    await rm(storedFilePath, { force: true }).catch(() => undefined)
    throw error
  }
}
