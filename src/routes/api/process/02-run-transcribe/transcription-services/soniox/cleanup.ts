import { l, err } from '~/utils/logging'

const SONIOX_API_BASE = 'https://api.soniox.com/v1'

export const cleanupSonioxResources = async (
  apiKey: string,
  transcriptionId?: string,
  fileId?: string
): Promise<void> => {
  if (transcriptionId) {
    try {
      const response = await fetch(`${SONIOX_API_BASE}/transcriptions/${transcriptionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      })

      if (response.ok) {
        l('Soniox transcription deleted', { transcriptionId })
      } else {
        const errorText = await response.text()
        err('Failed to delete Soniox transcription', { transcriptionId, status: response.status, error: errorText })
      }
    } catch (error) {
      err('Error deleting Soniox transcription', { transcriptionId, error })
    }
  }

  if (fileId) {
    try {
      const response = await fetch(`${SONIOX_API_BASE}/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      })

      if (response.ok) {
        l('Soniox file deleted', { fileId })
      } else {
        const errorText = await response.text()
        err('Failed to delete Soniox file', { fileId, status: response.status, error: errorText })
      }
    } catch (error) {
      err('Error deleting Soniox file', { fileId, error })
    }
  }
}
