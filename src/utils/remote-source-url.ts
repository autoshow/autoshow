import type { SourceUtilsRemoteSourceUrlSupportedRemoteSourceType as SupportedRemoteSourceType } from '~/types'
const DIRECT_FILE_EXTENSIONS = [
  '.mp3', '.mp4', '.wav', '.m4a', '.flac', '.ogg', '.webm',
  '.mpeg', '.mpga', '.avi', '.mov', '.mkv', '.aac', '.wma'
]

const DOCUMENT_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.tiff', '.tif', '.txt', '.docx', '.pptx', '.xlsx']

const STREAMING_HOST_GROUPS = {
  youtube: ['youtube.com', 'youtu.be'],
  streaming: ['vimeo.com', 'twitch.tv', 'dailymotion.com', 'dai.ly', 'facebook.com', 'fb.watch', 'soundcloud.com']
} as const

const matchesAllowedHost = (hostname: string, allowedHosts: readonly string[]): boolean => {
  return allowedHosts.some(allowedHost => hostname === allowedHost || hostname.endsWith(`.${allowedHost}`))
}

const getNormalizedHostname = (rawUrl: string): string | null => {
  try {
    return new URL(rawUrl).hostname.toLowerCase()
  } catch {
    return null
  }
}

export const isApprovedStreamingHost = (rawUrl: string, sourceType: 'youtube' | 'streaming'): boolean => {
  const hostname = getNormalizedHostname(rawUrl)
  if (!hostname) return false

  return sourceType === 'youtube'
    ? matchesAllowedHost(hostname, STREAMING_HOST_GROUPS.youtube)
    : matchesAllowedHost(hostname, STREAMING_HOST_GROUPS.streaming)
}

export const detectRemoteSourceType = (rawUrl: string): SupportedRemoteSourceType => {
  try {
    const url = new URL(rawUrl)
    const hostname = url.hostname.toLowerCase()
    const pathname = url.pathname.toLowerCase()

    if (matchesAllowedHost(hostname, STREAMING_HOST_GROUPS.youtube)) {
      return 'youtube'
    }

    if (matchesAllowedHost(hostname, STREAMING_HOST_GROUPS.streaming)) {
      return 'streaming'
    }

    if (DOCUMENT_EXTENSIONS.some(extension => pathname.endsWith(extension))) {
      return 'document'
    }

    if (DIRECT_FILE_EXTENSIONS.some(extension => pathname.endsWith(extension))) {
      return 'direct-file'
    }

    return 'invalid'
  } catch {
    return 'invalid'
  }
}
