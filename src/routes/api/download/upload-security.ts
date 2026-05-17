import { mkdir,readdir,rm,stat } from 'node:fs/promises'
import { join,resolve } from 'node:path'
import { checkRateLimit,getRateLimitClientIp,getRateLimitKey } from '~/utils/security/rate-limit'
import { CHUNKS_ROOT,UPLOAD_REFS_ROOT,UPLOAD_ROOT } from './upload-paths'
import { cleanupStaleUploadRegistryEntries } from './upload-registry'

const sanitizeUploadSegment = (value: string, maxLength: number = 128): string => {
  const normalized = value.trim().replace(/[^a-zA-Z0-9._-]/g, '_')
  if (!normalized) return 'upload'
  if (normalized.length <= maxLength) return normalized
  return normalized.slice(0, maxLength)
}

const ONE_MIB = 1024 * 1024
const CLEANUP_INTERVAL_MS = 60_000
const METADATA_FILE = '.upload-meta.json'
const parseLimit = (envKey: string, fallback: number): number => {
  const raw = process.env[envKey]
  if (!raw) return fallback

  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

const isNotFound = (error: unknown): boolean => {
  return error instanceof Error && 'code' in error && (error as { code?: string }).code === 'ENOENT'
}

export const UPLOAD_LIMITS = {
  maxUploadBytes: parseLimit('AUTOSHOW_MAX_UPLOAD_BYTES', 1024 * ONE_MIB),
  maxChunkBytes: parseLimit('AUTOSHOW_MAX_UPLOAD_CHUNK_BYTES', 8 * ONE_MIB),
  maxTotalChunks: parseLimit('AUTOSHOW_MAX_UPLOAD_CHUNKS', 256),
  maxConcurrentGlobalChunkUploads: parseLimit('AUTOSHOW_MAX_CONCURRENT_GLOBAL_UPLOADS', 256),
  staleUploadTtlMs: parseLimit('AUTOSHOW_UPLOAD_TTL_MS', 24 * 60 * 60 * 1000),
} as const

let lastCleanupAt = 0

const getChunkUploadDirs = async (): Promise<string[]> => {
  try {
    const entries = await readdir(resolve(CHUNKS_ROOT), { withFileTypes: true })
    return entries.filter(entry => entry.isDirectory()).map(entry => entry.name)
  } catch (error) {
    if (isNotFound(error)) return []
    throw error
  }
}

const removeExpiredEntries = async (
  parentDir: string,
  now: number,
  skippedNames: ReadonlySet<string> = new Set()
): Promise<void> => {
  let entries
  try {
    entries = await readdir(parentDir, { withFileTypes: true })
  } catch (error) {
    if (isNotFound(error)) return
    throw error
  }

  for (const entry of entries) {
    if (parentDir === resolve(UPLOAD_ROOT) && skippedNames.has(entry.name)) continue

    const entryPath = join(parentDir, entry.name)
    try {
      const entryStat = await stat(entryPath)
      if (now - entryStat.mtimeMs <= UPLOAD_LIMITS.staleUploadTtlMs) continue

      await rm(entryPath, { recursive: true, force: true })
    } catch (error) {
      if (isNotFound(error)) continue
      throw error
    }
  }
}

export const buildScopedChunkUploadId = (fileId: string): string => {
  return sanitizeUploadSegment(fileId, 128)
}

export const getChunkMetadataPath = (chunkDir: string): string => join(chunkDir, METADATA_FILE)

async function cleanupStaleUploads(force: boolean = false): Promise<void> {
  const now = Date.now()
  if (!force && now - lastCleanupAt < CLEANUP_INTERVAL_MS) {
    return
  }

  lastCleanupAt = now

  try {
    await mkdir(resolve(UPLOAD_ROOT), { recursive: true })
    await mkdir(resolve(CHUNKS_ROOT), { recursive: true })
    await mkdir(resolve(UPLOAD_REFS_ROOT), { recursive: true })

    await removeExpiredEntries(resolve(UPLOAD_ROOT), now, new Set(['chunks', 'refs']))
    await removeExpiredEntries(resolve(CHUNKS_ROOT), now)
    await cleanupStaleUploadRegistryEntries(UPLOAD_LIMITS.staleUploadTtlMs, now)
  } catch (error) {
  }
}

export { CHUNKS_ROOT,sanitizeUploadSegment,UPLOAD_REFS_ROOT,UPLOAD_ROOT }

export const createUploadSessionId = (): string => {
  return `upload_session_${Date.now()}_${crypto.randomUUID()}`
}

export const buildDirectUploadObjectKey = (
  uploadSessionId: string,
  fileName: string
): string => {
  return [
    'uploads',
    sanitizeUploadSegment(uploadSessionId, 160),
    sanitizeUploadSegment(fileName, 200),
  ].join('/')
}

export const normalizeUploadContentType = (contentType: string | undefined): string => {
  const trimmed = contentType?.trim()
  if (!trimmed) return 'application/octet-stream'
  if (trimmed.length > 200 || /[\r\n\0]/.test(trimmed)) {
    throw new Error('Invalid content type')
  }
  return trimmed
}

export const ensureValidUploadFileName = (fileName: string): void => {
  const trimmed = fileName.trim()
  if (!trimmed) {
    throw new Error('File name is required')
  }
  if (
    trimmed === '.' ||
    trimmed === '..' ||
    trimmed.includes('/') ||
    trimmed.includes('\\') ||
    trimmed.includes('\0')
  ) {
    throw new Error('Invalid file name')
  }
}

export const ensureSimpleUploadAllowed = (fileSize: number): void => {
  if (fileSize <= 0) {
    throw new Error('Empty files are not allowed')
  }
  if (fileSize > UPLOAD_LIMITS.maxUploadBytes) {
    throw new Error('File exceeds maximum allowed upload size')
  }
}

export const ensureChunkUploadAllowed = (
  chunkSize: number,
  chunkIndex: number,
  totalChunks: number
): void => {
  if (chunkSize <= 0) throw new Error('Empty chunks are not allowed')
  if (chunkSize > UPLOAD_LIMITS.maxChunkBytes) throw new Error('Chunk exceeds maximum allowed size')
  if (chunkIndex >= totalChunks) throw new Error('Invalid chunk index')
  if (totalChunks > UPLOAD_LIMITS.maxTotalChunks) throw new Error('Too many chunks for one upload')
  if (totalChunks * UPLOAD_LIMITS.maxChunkBytes > UPLOAD_LIMITS.maxUploadBytes) {
    throw new Error('Upload exceeds maximum allowed size')
  }
}

const enforceUploadRateLimit = async (
  keyPrefix: string,
  identifier: string,
  configName: 'uploadSimpleIp' | 'uploadChunkIp'
): Promise<void> => {
  const rateLimit = await checkRateLimit(getRateLimitKey(keyPrefix, identifier), configName)
  if (!rateLimit.allowed) {
    throw new Error('Too many upload requests. Please try again later.')
  }
}

export async function enforceUploadRequestPolicy(
  headers: Headers,
  mode: 'simple' | 'chunk' | 'direct'
): Promise<void> {
  await cleanupStaleUploads()

  const clientIp = getRateLimitClientIp(headers)
  if (!clientIp) return

  if (mode === 'simple' || mode === 'direct') {
    await enforceUploadRateLimit('upload:simple:ip', clientIp, 'uploadSimpleIp')
    return
  }

  await enforceUploadRateLimit('upload:chunk:ip', clientIp, 'uploadChunkIp')
}

export async function ensureChunkUploadCapacity(scopedChunkUploadId: string): Promise<void> {
  const chunkDir = resolve(CHUNKS_ROOT, scopedChunkUploadId)
  try {
    await stat(chunkDir)
    return
  } catch (error) {
    if (!isNotFound(error)) throw error
  }

  const chunkDirs = await getChunkUploadDirs()
  if (chunkDirs.length >= UPLOAD_LIMITS.maxConcurrentGlobalChunkUploads) {
    throw new Error('Upload queue is full. Please retry shortly.')
  }

  await mkdir(chunkDir, { recursive: true })
}
