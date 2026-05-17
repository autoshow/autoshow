import path from 'node:path'
import type { ShowNote,ShowNoteAsset,ShowNoteStorageLink } from '~/types'
import { getConfiguredS3UrlOrigin,parseObjectKeyFromS3Url } from './s3-utils'

export type ShowNoteStorageTarget = 'document' | 'audio' | 'tts' | 'music' | 'image' | 'video' | 'thumbnail'
export type ShowNoteAssetStorageTarget = 'file' | 'thumbnail'

type StorageResolveResult =
  | { ok: true, objectKey: string }
  | { ok: false, reason: 'invalid-target' | 'invalid-index' | 'missing' }

type MetadataRecord = Record<string, unknown>

const STORAGE_FIELDS: Array<keyof ShowNote> = [
  'document_backup_url',
  'document_backup_key',
  'audio_s3_url',
  'tts_s3_url',
  'image_s3_urls',
  'music_s3_url',
  'video_s3_urls',
  'thumbnail_s3_url',
]

const STORAGE_TARGETS = new Set<ShowNoteStorageTarget>([
  'document',
  'audio',
  'tts',
  'music',
  'image',
  'video',
  'thumbnail',
])

export const isShowNoteStorageTarget = (value: string): value is ShowNoteStorageTarget => {
  return STORAGE_TARGETS.has(value as ShowNoteStorageTarget)
}

export const isAllowedPrivateStorageObjectKey = (objectKey: string): boolean => {
  return objectKey.startsWith('document-backups/') || objectKey.startsWith('media/')
}

export const splitStorageUrlList = (value: string | null | undefined): string[] => {
  if (!value) return []
  return value.split(',').map(item => item.trim()).filter(Boolean)
}

export const getStorageUrlAtIndex = (
  value: string | null | undefined,
  index: number
): string | null => {
  const values = splitStorageUrlList(value)
  return values[index] ?? null
}

export const sanitizeShowNoteForClient = (note: ShowNote): ShowNote => {
  const sanitized = { ...note }
  for (const field of STORAGE_FIELDS) {
    sanitized[field] = null as never
  }
  return sanitized
}

const isConfiguredS3Url = (value: string): boolean => {
  const origin = getConfiguredS3UrlOrigin()
  return origin != null && value.startsWith(`${origin}/`)
}

const sanitizeS3References = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return isConfiguredS3Url(value) || isAllowedPrivateStorageObjectKey(value) ? null : value
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeS3References)
  }

  if (value && typeof value === 'object') {
    const sanitized: MetadataRecord = {}
    for (const [key, entry] of Object.entries(value as MetadataRecord)) {
      sanitized[key] = sanitizeS3References(entry)
    }
    return sanitized
  }

  return value
}

export const sanitizeShowNoteAssetForClient = (asset: ShowNoteAsset): ShowNoteAsset => {
  if (!asset.metadata_json) {
    return asset
  }

  try {
    const metadata = JSON.parse(asset.metadata_json) as unknown
    return {
      ...asset,
      metadata_json: JSON.stringify(sanitizeS3References(metadata)),
    }
  } catch {
    return {
      ...asset,
      metadata_json: isConfiguredS3Url(asset.metadata_json) ? null : asset.metadata_json,
    }
  }
}

export const sanitizeShowNoteAssetsForClient = (assets: ShowNoteAsset[]): ShowNoteAsset[] => {
  return assets.map(sanitizeShowNoteAssetForClient)
}

const parseMetadataRecord = (metadataJson: string | null | undefined): MetadataRecord | null => {
  if (!metadataJson) return null

  try {
    const parsed = JSON.parse(metadataJson) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as MetadataRecord
      : null
  } catch {
    return null
  }
}

const getNestedRecord = (value: unknown): MetadataRecord | null => {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as MetadataRecord
    : null
}

const getMetadataString = (
  metadata: MetadataRecord | null,
  key: string,
  nestedKey?: string
): string | null => {
  const direct = metadata?.[key]
  if (typeof direct === 'string' && direct.length > 0) {
    return direct
  }

  const nested = nestedKey ? getNestedRecord(metadata?.[nestedKey])?.[key] : undefined
  return typeof nested === 'string' && nested.length > 0 ? nested : null
}

const objectKeyFromStoredUrl = (url: string | null | undefined): string | null => {
  if (!url) return null
  const objectKey = parseObjectKeyFromS3Url(url)
  return objectKey && isAllowedPrivateStorageObjectKey(objectKey) ? objectKey : null
}

const objectKeyFromStoredKey = (objectKey: string | null | undefined): string | null => {
  if (!objectKey) return null
  return isAllowedPrivateStorageObjectKey(objectKey) ? objectKey : null
}

const getIndexedStorageField = (
  note: ShowNote,
  target: Extract<ShowNoteStorageTarget, 'image' | 'video' | 'thumbnail'>
): string | null | undefined => {
  if (target === 'image') return note.image_s3_urls
  if (target === 'video') return note.video_s3_urls
  return note.thumbnail_s3_url
}

const getSingleStorageUrl = (
  note: ShowNote,
  target: Extract<ShowNoteStorageTarget, 'audio' | 'tts' | 'music'>
): string | null | undefined => {
  if (target === 'audio') return note.audio_s3_url
  if (target === 'tts') return note.tts_s3_url
  return note.music_s3_url
}

export const resolveShowNoteStorageObjectKey = (
  note: ShowNote,
  target: string,
  index = 0
): StorageResolveResult => {
  if (!isShowNoteStorageTarget(target)) {
    return { ok: false, reason: 'invalid-target' }
  }

  if (!Number.isInteger(index) || index < 0) {
    return { ok: false, reason: 'invalid-index' }
  }

  if (target === 'document') {
    const objectKey = objectKeyFromStoredKey(note.document_backup_key)
      ?? objectKeyFromStoredUrl(note.document_backup_url)
    return objectKey ? { ok: true, objectKey } : { ok: false, reason: 'missing' }
  }

  if (target === 'audio' || target === 'tts' || target === 'music') {
    if (index !== 0) {
      return { ok: false, reason: 'invalid-index' }
    }
    const objectKey = objectKeyFromStoredUrl(getSingleStorageUrl(note, target))
    return objectKey ? { ok: true, objectKey } : { ok: false, reason: 'missing' }
  }

  if (target === 'image' || target === 'video' || target === 'thumbnail') {
    const fieldValue = getIndexedStorageField(note, target)
    const urls = splitStorageUrlList(fieldValue)
    if (index >= urls.length) {
      return { ok: false, reason: 'invalid-index' }
    }

    const objectKey = objectKeyFromStoredUrl(urls[index])
    return objectKey ? { ok: true, objectKey } : { ok: false, reason: 'missing' }
  }

  return { ok: false, reason: 'invalid-target' }
}

export const resolveShowNoteAssetStorageObjectKey = (
  asset: ShowNoteAsset,
  target: ShowNoteAssetStorageTarget
): string | null => {
  const metadata = parseMetadataRecord(asset.metadata_json)

  if (target === 'thumbnail') {
    const thumbnailUrl = asset.kind === 'video'
      ? getMetadataString(metadata, 'thumbnailS3Url', 'result')
      : null
    return objectKeyFromStoredUrl(thumbnailUrl)
  }

  let fileUrl: string | null = null
  if (asset.kind === 'tts') {
    fileUrl = getMetadataString(metadata, 'ttsS3Url')
  } else if (asset.kind === 'image') {
    fileUrl = getMetadataString(metadata, 's3Url', 'result')
  } else if (asset.kind === 'music') {
    fileUrl = getMetadataString(metadata, 'musicS3Url')
  } else if (asset.kind === 'video') {
    fileUrl = getMetadataString(metadata, 's3Url', 'result')
  }

  return objectKeyFromStoredUrl(fileUrl)
}

export const getStorageDownloadFilename = (objectKey: string): string => {
  return path.basename(objectKey) || 'download'
}

const buildStorageHref = (
  showNoteId: string,
  target: ShowNoteStorageTarget,
  index?: number
): string => {
  const encodedId = encodeURIComponent(showNoteId)
  const encodedTarget = encodeURIComponent(target)
  const indexPath = index === undefined ? '' : `/${index}`
  return `/api/show-notes/${encodedId}/storage/${encodedTarget}${indexPath}`
}

const buildAssetStorageHref = (
  showNoteId: string,
  assetId: string,
  target: ShowNoteAssetStorageTarget
): string => {
  return `/api/show-notes/${encodeURIComponent(showNoteId)}/storage/asset/${encodeURIComponent(assetId)}/${target}`
}

const toDescriptor = (
  label: string,
  viewHref: string,
  uploadedAt?: number | null
): ShowNoteStorageLink => ({
  label,
  viewHref,
  downloadHref: `${viewHref}?download=1`,
  ...(uploadedAt != null ? { uploadedAt } : {}),
})

export const buildShowNoteStorageLinks = (
  note: ShowNote,
  assets: ShowNoteAsset[] = []
): ShowNoteStorageLink[] => {
  const links: ShowNoteStorageLink[] = []
  const addTargetLink = (
    label: string,
    target: ShowNoteStorageTarget,
    index?: number,
    uploadedAt?: number | null
  ) => {
    const resolved = resolveShowNoteStorageObjectKey(note, target, index ?? 0)
    if (!resolved.ok) return
    links.push(toDescriptor(label, buildStorageHref(note.id, target, index), uploadedAt))
  }

  addTargetLink('Document backup', 'document', undefined, note.document_backup_uploaded_at)
  addTargetLink('Source audio backup', 'audio')
  addTargetLink('Generated TTS backup', 'tts')
  addTargetLink('Generated music backup', 'music')

  splitStorageUrlList(note.image_s3_urls).forEach((_url, index) => {
    addTargetLink(`Generated image ${index + 1}`, 'image', index)
  })
  splitStorageUrlList(note.video_s3_urls).forEach((_url, index) => {
    addTargetLink(`Generated video ${index + 1}`, 'video', index)
  })
  splitStorageUrlList(note.thumbnail_s3_url).forEach((_url, index) => {
    addTargetLink(`Generated video thumbnail ${index + 1}`, 'thumbnail', index)
  })

  for (const asset of assets) {
    if (resolveShowNoteAssetStorageObjectKey(asset, 'file')) {
      links.push(toDescriptor(
        `Added ${asset.kind} asset`,
        buildAssetStorageHref(note.id, asset.id, 'file'),
        asset.created_at
      ))
    }

    if (resolveShowNoteAssetStorageObjectKey(asset, 'thumbnail')) {
      links.push(toDescriptor(
        'Added video asset thumbnail',
        buildAssetStorageHref(note.id, asset.id, 'thumbnail'),
        asset.created_at
      ))
    }
  }

  return links
}
