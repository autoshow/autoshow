import OpenAI from 'openai'
import type { Step5Metadata, IProgressTracker } from '~/types'
import { l } from '~/utils/logging'
import { requireEnvKey } from '~/utils/env'
import { STEP_NUMBER, handleTTSError, buildTTSMetadata, logTTSStart } from './tts-helpers'

const SERVICE_NAME = 'Groq'
const MAX_CHUNK_LENGTH = 200

const splitTextIntoChunks = (text: string): string[] => {
  if (!text || text.trim().length === 0) {
    return []
  }

  const trimmedText = text.trim()

  if (trimmedText.length <= MAX_CHUNK_LENGTH) {
    return [trimmedText]
  }

  const chunks: string[] = []
  const sentences = trimmedText.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [trimmedText]

  let currentChunk = ''

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim()

    if (trimmedSentence.length === 0) continue

    if (trimmedSentence.length > MAX_CHUNK_LENGTH) {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim())
        currentChunk = ''
      }

      const words = trimmedSentence.split(/\s+/)
      let wordChunk = ''

      for (const word of words) {
        const potentialChunk = wordChunk.length === 0 ? word : `${wordChunk} ${word}`

        if (potentialChunk.length <= MAX_CHUNK_LENGTH) {
          wordChunk = potentialChunk
        } else {
          if (wordChunk.length > 0) {
            chunks.push(wordChunk)
          }
          wordChunk = word
        }
      }

      if (wordChunk.length > 0) {
        currentChunk = wordChunk
      }
    } else {
      const potentialChunk = currentChunk.length === 0
        ? trimmedSentence
        : `${currentChunk} ${trimmedSentence}`

      if (potentialChunk.length <= MAX_CHUNK_LENGTH) {
        currentChunk = potentialChunk
      } else {
        if (currentChunk.length > 0) {
          chunks.push(currentChunk.trim())
        }
        currentChunk = trimmedSentence
      }
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.trim())
  }

  return chunks
}

const concatenateAudioFiles = async (
  audioPaths: string[],
  outputPath: string
): Promise<void> => {
  if (audioPaths.length === 0) {
    throw new Error('No audio files to concatenate')
  }

  if (audioPaths.length === 1) {
    const sourceFile = Bun.file(audioPaths[0]!)
    await Bun.write(outputPath, sourceFile)
    return
  }

  const listContent = audioPaths.map(p => `file '${p}'`).join('\n')
  const listPath = `${outputPath}.list.txt`
  await Bun.write(listPath, listContent)

  try {
    const proc = Bun.spawn([
      'ffmpeg',
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-i', listPath,
      '-c', 'copy',
      outputPath
    ], {
      stdout: 'pipe',
      stderr: 'pipe'
    })

    const exitCode = await proc.exited

    if (exitCode !== 0) {
      const stderrText = await new Response(proc.stderr).text()
      throw new Error(`FFmpeg concatenation failed: ${stderrText}`)
    }
  } finally {
    try {
      await Bun.file(listPath).exists() && await Bun.write(listPath, '')
      await Bun.file(listPath).delete()
    } catch {}
  }
}

export const runGroqTTS = async (
  text: string,
  outputDir: string,
  voice: string = 'hannah',
  model: string = 'canopylabs/orpheus-v1-english',
  progressTracker?: IProgressTracker,
  instructions?: string,
  jobId?: string
): Promise<{ audioPath: string, metadata: Step5Metadata }> => {
  try {
    const apiKey = requireEnvKey('GROQ_API_KEY')
    const startTime = Date.now()

    logTTSStart(SERVICE_NAME, voice, model, text.length)
    progressTracker?.updateStepProgress(STEP_NUMBER, 10, `Preparing text for ${SERVICE_NAME} TTS`)

    const client = new OpenAI({
      apiKey,
      baseURL: 'https://api.groq.com/openai/v1'
    })

    const chunks = splitTextIntoChunks(text)

    l('Text split into chunks', { chunkCount: chunks.length, maxChunkLength: MAX_CHUNK_LENGTH })

    if (chunks.length === 0) {
      throw new Error('No text to convert to speech')
    }

    progressTracker?.updateStepProgress(STEP_NUMBER, 20, `Processing ${chunks.length} text chunks`)

    const chunkAudioPaths: string[] = []

    try {
      for (let i = 0; i < chunks.length; i++) {
        let chunkText = chunks[i]!

        if (i === 0 && instructions) {
          chunkText = `[${instructions}] ${chunkText}`
        }

        const progress = 20 + Math.floor((i / chunks.length) * 50)
        progressTracker?.updateStepProgress(STEP_NUMBER, progress, `Generating audio chunk ${i + 1}/${chunks.length}`)

        l('Generating audio for chunk', { chunkIndex: i + 1, chunkLength: chunkText.length })

        const response = await client.audio.speech.create({
          model,
          voice: voice as any,
          input: chunkText,
          response_format: 'wav'
        })

        const chunkPath = `${outputDir}/chunk_${i.toString().padStart(4, '0')}.wav`
        const buffer = Buffer.from(await response.arrayBuffer())
        await Bun.write(chunkPath, buffer)
        chunkAudioPaths.push(chunkPath)
      }

      progressTracker?.updateStepProgress(STEP_NUMBER, 75, 'Concatenating audio chunks')

      const audioFileName = 'speech.wav'
      const audioPath = `${outputDir}/${audioFileName}`

      await concatenateAudioFiles(chunkAudioPaths, audioPath)

      l('Audio chunks concatenated', { totalChunks: chunkAudioPaths.length })

      for (const chunkPath of chunkAudioPaths) {
        try {
          await Bun.file(chunkPath).delete()
        } catch {}
      }

      progressTracker?.updateStepProgress(STEP_NUMBER, 85, 'Verifying audio file')

      const audioFile = Bun.file(audioPath)
      const audioFileSize = audioFile.size

      let ttsS3Url: string | undefined
      if (jobId) {
        const { uploadToS3 } = await import('~/utils/s3-upload')
        const s3Result = await uploadToS3(audioPath, jobId, 'tts')
        ttsS3Url = s3Result?.s3Url
      }

      progressTracker?.updateStepProgress(STEP_NUMBER, 90, 'Calculating audio duration')

      const metadata = await buildTTSMetadata(
        'groq', model, voice, startTime, audioPath, audioFileName, audioFileSize, text.length, ttsS3Url
      )

      return { audioPath, metadata }
    } catch (error) {
      for (const chunkPath of chunkAudioPaths) {
        try {
          await Bun.file(chunkPath).delete()
        } catch {}
      }
      throw error
    }
  } catch (error) {
    return handleTTSError(error, SERVICE_NAME, progressTracker)
  }
}
