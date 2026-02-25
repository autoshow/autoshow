import { l, err } from '~/utils/logging'
import type { DocumentBackupMetadata } from '~/types'
import { createS3Client, isS3Configured, presignS3Url, getContentType } from '~/utils/s3-upload'

export const backupDocumentToRailway = async (
  documentPath: string | null,
  documentUrl: string | null,
  jobId: string,
  originalFileName: string
): Promise<DocumentBackupMetadata | null> => {
  if (!isS3Configured()) {
    l('Railway S3 credentials not configured, skipping document backup')
    return null
  }

  try {
    const client = createS3Client()
    if (!client) return null

    const objectKey = `document-backups/${jobId}/${originalFileName}`
    const contentType = getContentType(originalFileName)

    l('Backing up document to Railway', { objectKey, contentType })

    let fileContent: ArrayBuffer
    let fileSize: number

    if (documentPath) {
      const file = Bun.file(documentPath)
      fileContent = await file.arrayBuffer()
      fileSize = file.size
    } else if (documentUrl) {
      const response = await fetch(documentUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch document URL: ${response.status}`)
      }
      fileContent = await response.arrayBuffer()
      fileSize = fileContent.byteLength
    } else {
      throw new Error('Either documentPath or documentUrl must be provided')
    }

    const s3File = client.file(objectKey)
    await s3File.write(new Uint8Array(fileContent), {
      type: contentType
    })

    const bucketUrl = presignS3Url(client, objectKey)

    l('Document backed up successfully', { objectKey, size: fileSize })

    return {
      bucketUrl,
      objectKey,
      uploadedAt: Date.now()
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    err('Failed to backup document to Railway: ' + errorMessage)
    return null
  }
}
