import { resolve,sep } from "node:path"
import type { SourceRoutesApiMediaPathUtilsParsedMediaPath as ParsedMediaPath } from '~/types'
import { resolveOutputRoot } from "~/utils/artifact-paths"

const isUnsafeSegment = (segment: string): boolean => {
  return segment.includes('/') || segment.includes('\\') || segment.includes('\0')
}

export const parseMediaPath = (rawPath: string | undefined): ParsedMediaPath | null => {
  if (!rawPath) return null

  const segments = rawPath.split('/').filter(Boolean)
  if (segments.length < 2) return null

  const decodedSegments: string[] = []
  for (const segment of segments) {
    let decoded: string
    try {
      decoded = decodeURIComponent(segment)
    } catch {
      return null
    }

    if (!decoded || isUnsafeSegment(decoded)) {
      return null
    }

    decodedSegments.push(decoded)
  }

  const showNoteId = decodedSegments[0]
  const fileName = decodedSegments.slice(1).join('/')

  if (!showNoteId || !fileName) return null

  return { showNoteId, fileName }
}

export const resolveScopedMediaPath = (showNoteId: string, fileName: string): string | null => {
  const outputRoot = resolveOutputRoot()
  const showNoteDir = resolve(outputRoot, showNoteId)
  const candidatePath = resolve(showNoteDir, fileName)

  const scopedDirPrefix = `${showNoteDir}${sep}`
  if (!candidatePath.startsWith(scopedDirPrefix)) {
    return null
  }

  return candidatePath
}
