import { executeCommand } from '~/routes/api/process/01-dl-audio/dl-utils'

export type AudioSegmentPlanItem = {
  index: number
  startSeconds: number
  durationSeconds: number
}

export const createAudioSegmentPlan = (
  totalDurationSeconds: number,
  segmentDurationMinutes: number = 10
): AudioSegmentPlanItem[] => {
  const segmentDurationSeconds = segmentDurationMinutes * 60

  if (!Number.isFinite(totalDurationSeconds) || totalDurationSeconds <= 0) {
    return []
  }

  if (!Number.isFinite(segmentDurationSeconds) || segmentDurationSeconds <= 0) {
    throw new Error('Segment duration must be greater than zero')
  }

  const totalSegments = Math.ceil(totalDurationSeconds / segmentDurationSeconds)

  return Array.from({ length: totalSegments }, (_, index) => {
    const startSeconds = index * segmentDurationSeconds
    const remainingSeconds = totalDurationSeconds - startSeconds
    return {
      index,
      startSeconds,
      durationSeconds: Math.min(segmentDurationSeconds, remainingSeconds)
    }
  })
}

export const splitAudioFile = async (audioPath: string, outputDir: string, segmentDurationMinutes: number = 10): Promise<string[]> => {
  const segmentsDir = `${outputDir}/segments`
  const { exitCode } = await Bun.$`mkdir -p ${segmentsDir}`.quiet()
  if (exitCode !== 0) throw new Error(`Failed to create directory: ${segmentsDir}`)

  const durationResult = await executeCommand('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    audioPath
  ])

  const totalDuration = parseFloat(durationResult.stdout.trim())
  const segmentPlan = createAudioSegmentPlan(totalDuration, segmentDurationMinutes)
  const segmentPaths: string[] = []

  for (const segment of segmentPlan) {
    const segmentPath = `${segmentsDir}/segment_${String(segment.index + 1).padStart(3, '0')}.wav`

    const ffmpegArgs = [
      '-i', audioPath,
      '-ss', String(segment.startSeconds),
      '-t', String(segment.durationSeconds),
      '-acodec', 'pcm_s16le',
      '-ar', '16000',
      '-ac', '1',
      '-y',
      segmentPath
    ]

    const result = await executeCommand('ffmpeg', ffmpegArgs)

    if (result.exitCode !== 0) {
      throw new Error(`Failed to create segment ${segment.index + 1}`)
    }
    segmentPaths.push(segmentPath)
  }

  return segmentPaths
}

export const getAudioDuration = async (audioPath: string): Promise<number> => {
  const result = await executeCommand('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    audioPath
  ])

  return parseFloat(result.stdout.trim())
}
