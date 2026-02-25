import { l, err } from "~/utils/logging"
import { formatDurationHuman, formatFileSize } from '~/utils/audio'
import { executeCommand, fetchUrlHeaders } from '../dl-utils'

export const getDirectFileMetadata = async (url: string): Promise<{ duration?: number, fileSize?: number, mimeType?: string }> => {
  try {
    l('Getting direct file metadata', { url })

    const { fileSize, mimeType } = await fetchUrlHeaders(url)

    const probeResult = await executeCommand('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      url
    ])

    let duration: number | undefined = undefined
    if (probeResult.exitCode === 0 && probeResult.stdout.trim()) {
      duration = parseFloat(probeResult.stdout.trim())
    }

    l('Direct file metadata retrieved', {
      ...(fileSize !== undefined && { fileSize: formatFileSize(fileSize) }),
      ...(mimeType !== undefined && { mimeType }),
      ...(duration !== undefined && { duration: formatDurationHuman(duration) })
    })
    
    return { 
      ...(duration !== undefined && { duration }),
      ...(fileSize !== undefined && { fileSize }),
      ...(mimeType !== undefined && { mimeType })
    }
  } catch (error) {
    err(`Failed to get direct file metadata`, error)
    return {}
  }
}
