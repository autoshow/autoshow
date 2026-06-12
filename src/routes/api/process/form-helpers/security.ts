import type { ProcessingOptions } from '~/types'
import { detectRemoteSourceType } from '~/utils/remote-source-url'

const ensureApprovedStreamingHost = (url: string, urlType: ProcessingOptions['urlType']): void => {
  if (urlType !== 'youtube' && urlType !== 'streaming') {
    return
  }

  const detectedSourceType = detectRemoteSourceType(url)
  if (urlType === 'youtube') {
    if (detectedSourceType !== 'youtube') {
      throw new Error('Unsafe source URL: unsupported YouTube host')
    }
    return
  }

  if (detectedSourceType !== 'youtube' && detectedSourceType !== 'streaming') {
    throw new Error('Unsafe source URL: unsupported streaming host')
  }
}

/**
 * Validates processing source URLs against host allowlists.
 * DNS-level SSRF protection is handled downstream by each metadata/download
 * function via openPublicHttpResponse → requireResolvedPublicHttpUrl.
 */
export const enforceSafeProcessingSources = async (options: ProcessingOptions): Promise<ProcessingOptions> => {
  if (options.isLocalFile) {
    return options
  }

  ensureApprovedStreamingHost(options.url, options.urlType)

  return options
}
