import { mkdir,readdir,realpath,rm,stat } from 'node:fs/promises'
import { basename,join,relative,resolve } from 'node:path'
import * as v from 'valibot'
import type { ResolvedUploadSource,UploadRegistryEntry } from '~/types'
import { UploadRegistryEntrySchema } from '~/types'
import { downloadS3ObjectToFile } from '~/utils/s3-utils'
import { UPLOAD_REFS_ROOT,UPLOAD_ROOT } from './upload-paths'

const isNotFound = (error: unknown): boolean => {
  return error instanceof Error && 'code' in error && (error as { code?: string }).code === 'ENOENT'
}

const parseUploadRegistryEntry = (input: unknown): UploadRegistryEntry => {
  const result = v.safeParse(UploadRegistryEntrySchema, input)
  if (!result.success) {
    throw new Error('Invalid upload registry entry')
  }
  return result.output
}

const getUploadRegistryPath = (uploadId: string): string => {
  return join(UPLOAD_REFS_ROOT, `${uploadId}.json`)
}

const isPathWithinUploadRoot = (candidatePath: string): boolean => {
  const rootPath = resolve(UPLOAD_ROOT)
  const relativePath = relative(rootPath, candidatePath)
  return relativePath === '' || (!relativePath.startsWith('..') && !relativePath.startsWith('../'))
}

const createUploadId = (): string => {
  return `upload_${Date.now()}_${crypto.randomUUID()}`
}

type LocalUploadRegistryEntryParams = {
  uploadId?: string
  originalFileName: string
  storage?: 'local'
  storedFilePath: string
  fileSize: number
  duration?: number
}

type S3UploadRegistryEntryParams = {
  uploadId?: string
  originalFileName: string
  storage: 's3'
  objectKey: string
  bucketUrl?: string
  fileSize: number
  duration?: number
}

const getCachedS3UploadPath = (entry: UploadRegistryEntry): string => {
  return join(resolve(UPLOAD_ROOT), `${entry.uploadId}_${entry.storedFileName}`)
}

export const writeUploadRegistryEntry = async (
  params: LocalUploadRegistryEntryParams | S3UploadRegistryEntryParams
): Promise<UploadRegistryEntry> => {
  await mkdir(resolve(UPLOAD_REFS_ROOT), { recursive: true })

  const baseEntry = {
    uploadId: params.uploadId ?? createUploadId(),
    originalFileName: params.originalFileName,
    fileSize: params.fileSize,
    createdAt: Date.now(),
    ...(params.duration !== undefined ? { duration: params.duration } : {})
  }

  const entry: UploadRegistryEntry = params.storage === 's3'
    ? {
      ...baseEntry,
      storage: 's3',
      storedFileName: basename(params.objectKey),
      objectKey: params.objectKey,
      ...(params.bucketUrl !== undefined ? { bucketUrl: params.bucketUrl } : {})
    }
    : {
      ...baseEntry,
      storage: 'local',
      storedFileName: basename(params.storedFilePath),
      filePath: params.storedFilePath
    }

  await Bun.write(
    getUploadRegistryPath(entry.uploadId),
    `${JSON.stringify(entry, null, 2)}\n`
  )

  return entry
}

const readUploadRegistryEntry = async (uploadId: string): Promise<UploadRegistryEntry | null> => {
  const file = Bun.file(getUploadRegistryPath(uploadId))
  if (!(await file.exists())) {
    return null
  }

  const parsed = await file.json()
  return parseUploadRegistryEntry(parsed)
}

const resolveLocalRegistryEntry = async (
  entry: Extract<UploadRegistryEntry, { storage?: 'local' }>
): Promise<ResolvedUploadSource> => {
  let canonicalPath: string
  try {
    canonicalPath = await realpath(entry.filePath)
  } catch (error) {
    if (isNotFound(error)) {
      throw new Error('Uploaded file no longer exists')
    }
    throw error
  }

  if (!isPathWithinUploadRoot(canonicalPath)) {
    throw new Error('Uploaded file path is outside the upload root')
  }

  const fileStat = await stat(canonicalPath)

  return {
    uploadId: entry.uploadId,
    localFilePath: canonicalPath,
    localFileName: entry.originalFileName,
    localFileSize: fileStat.size,
    ...(entry.duration !== undefined ? { localFileDuration: entry.duration } : {})
  }
}

const resolveS3RegistryEntry = async (
  entry: Extract<UploadRegistryEntry, { storage: 's3' }>
): Promise<ResolvedUploadSource> => {
  const destinationPath = getCachedS3UploadPath(entry)
  const resolvedDestinationPath = resolve(destinationPath)

  if (!isPathWithinUploadRoot(resolvedDestinationPath)) {
    throw new Error('Uploaded file path is outside the upload root')
  }

  try {
    const cachedStat = await stat(resolvedDestinationPath)
    if (cachedStat.size === entry.fileSize) {
      return {
        uploadId: entry.uploadId,
        localFilePath: await realpath(resolvedDestinationPath),
        localFileName: entry.originalFileName,
        localFileSize: cachedStat.size,
        ...(entry.duration !== undefined ? { localFileDuration: entry.duration } : {})
      }
    }
  } catch (error) {
    if (!isNotFound(error)) throw error
  }

  await downloadS3ObjectToFile(entry.objectKey, resolvedDestinationPath)

  const downloadedPath = await realpath(resolvedDestinationPath)
  if (!isPathWithinUploadRoot(downloadedPath)) {
    await rm(downloadedPath, { force: true }).catch(() => {})
    throw new Error('Uploaded file path is outside the upload root')
  }

  const downloadedStat = await stat(downloadedPath)
  if (downloadedStat.size !== entry.fileSize) {
    await rm(downloadedPath, { force: true }).catch(() => {})
    throw new Error('Uploaded file size does not match registry entry')
  }

  return {
    uploadId: entry.uploadId,
    localFilePath: downloadedPath,
    localFileName: entry.originalFileName,
    localFileSize: downloadedStat.size,
    ...(entry.duration !== undefined ? { localFileDuration: entry.duration } : {})
  }
}

export const resolveUpload = async (uploadId: string): Promise<ResolvedUploadSource> => {
  const entry = await readUploadRegistryEntry(uploadId)
  if (!entry) {
    throw new Error('Uploaded file not found')
  }

  if (entry.storage === 's3') {
    return await resolveS3RegistryEntry(entry)
  }

  return await resolveLocalRegistryEntry(entry)
}

export async function cleanupStaleUploadRegistryEntries(
  ttlMs: number,
  now: number = Date.now()
): Promise<void> {
  let entries
  try {
    entries = await readdir(resolve(UPLOAD_REFS_ROOT), { withFileTypes: true })
  } catch (error) {
    if (isNotFound(error)) return
    throw error
  }

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) {
      continue
    }

    const refPath = join(resolve(UPLOAD_REFS_ROOT), entry.name)

    try {
      const parsed = parseUploadRegistryEntry(await Bun.file(refPath).json())
      const expired = now - parsed.createdAt > ttlMs

      if (expired) {
        if (parsed.storage === 's3') {
          await rm(getCachedS3UploadPath(parsed), { force: true }).catch(() => {})
          await rm(refPath, { force: true })
          continue
        }
        await rm(parsed.filePath, { force: true }).catch(() => {})
        await rm(refPath, { force: true })
        continue
      }

      if (parsed.storage !== 's3') {
        await stat(parsed.filePath)
      }
    } catch (error) {
      if (isNotFound(error) || error instanceof Error) {
        await rm(refPath, { force: true }).catch(() => {})
        continue
      }
      throw error
    }
  }
}
