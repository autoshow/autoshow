// src/pages/api/download-audio.ts

import type { APIRoute } from "astro"
import { fileTypeFromBuffer } from "file-type"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"
import { s3Service } from "../../services/s3"
import { fileURLToPath, execPromise, readFile, access, rename, execFilePromise, env, mkdirSync, existsSync, unlink, dirname, resolve, basename, l, err } from "../../utils"
import { T_CONFIG } from '../../types.ts'

export const POST: APIRoute = async ({ request }) => {
  const pre = "[api/download-audio]"
  l(`${pre} Starting audio download and processing`)
  
  try {
    const body = await request.json()
    const type = body?.type
    const url = body?.url
    const filePath = body?.filePath
    const options = body?.options || {}
    
    if (!type || !['video', 'file'].includes(type)) {
      return new Response(JSON.stringify({ error: 'Valid type is required' }), { status: 400 })
    }
    
    if (type === 'video' && !url) {
      return new Response(JSON.stringify({ error: 'URL is required for video' }), { status: 400 })
    }
    
    if (type === 'file' && !filePath) {
      return new Response(JSON.stringify({ error: 'File path is required for file' }), { status: 400 })
    }
    
    if (type === 'video') {
      options.video = url
    } else {
      options.file = filePath
    }
    
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = dirname(__filename)
    const projectRoot = resolve(__dirname, '../../../../')
    
    function sanitizeTitle(title: string): string {
      return title
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-')
        .toLowerCase()
        .slice(0, 200)
    }
    
    function buildFrontMatter(metadata: {
      showLink: string,
      channel: string,
      channelURL: string,
      title: string,
      description: string,
      publishDate: string,
      coverImage: string
    }): string[] {
      return [
        '---',
        `showLink: "${metadata.showLink}"`,
        `channel: "${metadata.channel}"`,
        `channelURL: "${metadata.channelURL}"`,
        `title: "${metadata.title}"`,
        `description: "${metadata.description}"`,
        `publishDate: "${metadata.publishDate}"`,
        `coverImage: "${metadata.coverImage}"`,
        '---\n',
      ]
    }
    
    let filename = ''
    let metadata = {
      showLink: '',
      channel: '',
      channelURL: '',
      title: '',
      description: '',
      publishDate: '',
      coverImage: '',
    }
    
    if (options.video) {
      l(`${pre} Processing video URL: ${url}`)
      const { stdout } = await execFilePromise('yt-dlp', [
        '--restrict-filenames',
        '--print', '%(webpage_url)s',
        '--print', '%(channel)s',
        '--print', '%(uploader_url)s',
        '--print', '%(title)s',
        '--print', '%(upload_date>%Y-%m-%d)s',
        '--print', '%(thumbnail)s',
        url
      ])
      
      const [
        showLink = '',
        videoChannel = '',
        uploader_url = '',
        videoTitle = '',
        formattedDate = '',
        thumbnail = ''
      ] = stdout.trim().split('\n')
      
      const timestamp = new Date().getTime()
      const uniqueId = `${timestamp}-${Math.floor(Math.random() * 1000)}`
      filename = `${formattedDate}-${sanitizeTitle(videoTitle)}-${uniqueId}`
      
      metadata = {
        showLink,
        channel: videoChannel,
        channelURL: uploader_url,
        title: videoTitle,
        description: '',
        publishDate: formattedDate,
        coverImage: thumbnail,
      }
    } else {
      l(`${pre} Processing local file: ${filePath}`)
      const originalFilename = filePath.split('/').pop() || ''
      const filenameWithoutExt = originalFilename.replace(/\.[^/.]+$/, '')
      const timestamp = new Date().getTime()
      const uniqueId = `${timestamp}-${Math.floor(Math.random() * 1000)}`
      filename = `${sanitizeTitle(filenameWithoutExt)}-${uniqueId}`
      
      metadata = {
        showLink: originalFilename,
        channel: '',
        channelURL: '',
        title: originalFilename,
        description: '',
        publishDate: new Date().toISOString().split('T')[0],
        coverImage: '',
      }
    }
    
    const finalPath = `autoshow/content/${filename}`
    const outputPath = `${finalPath}.wav`
    const absoluteOutputPath = resolve(projectRoot, outputPath)
    l(`${pre} Output path: ${absoluteOutputPath}`)
    
    const contentDir = dirname(resolve(projectRoot, outputPath))
    mkdirSync(contentDir, { recursive: true })
    
    const frontMatter = buildFrontMatter({
      showLink: metadata.showLink || '',
      channel: metadata.channel || '',
      channelURL: metadata.channelURL || '',
      title: metadata.title,
      description: metadata.description || '',
      publishDate: metadata.publishDate || '',
      coverImage: metadata.coverImage || ''
    }).join('\n')
    
    try {
      await access(outputPath)
      const renamedPath = `${finalPath}-renamed.wav`
      await rename(outputPath, renamedPath)
    } catch (error) {
    }
    
    async function executeWithRetry(command: string, args: string[]) {
      const maxRetries = 7
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          if (attempt > 1) {
            l(`${pre} Retry attempt ${attempt}/${maxRetries}`)
          }
          const {} = await execFilePromise(command, args)
          return
        } catch (error) {
          if (attempt === maxRetries) {
            throw error
          }
          const delayMs = 1000 * 2 ** (attempt - 1)
          await new Promise((resolve) => setTimeout(resolve, delayMs))
        }
      }
    }
    
    let audioDurationInSeconds = 0
    
    if (options.video) {
      l(`${pre} Downloading video from URL`)
      await executeWithRetry('yt-dlp', [
        '--no-warnings',
        '--restrict-filenames',
        '--extract-audio',
        '--audio-format', 'wav',
        '--postprocessor-args', 'ffmpeg:-ar 16000 -ac 1',
        '--no-playlist',
        '-o', absoluteOutputPath,
        url
      ])
      l(`${pre} Video download completed`)
    } else if (options.file) {
      l(`${pre} Converting local file to WAV`)
      const supportedFormats = new Set([
        'wav', 'mp3', 'm4a', 'aac', 'ogg', 'flac', 'mp4', 'mkv', 'avi', 'mov', 'webm'
      ])
      
      const resolvedFilePath = resolve(projectRoot, filePath)
      await access(resolvedFilePath)
      
      const buffer = await readFile(resolvedFilePath)
      const uint8Array = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
      const fileType = await fileTypeFromBuffer(uint8Array)
      
      if (!fileType || !supportedFormats.has(fileType.ext)) {
        const errorMsg = fileType ? `Unsupported file type: ${fileType.ext}` : 'Unable to determine file type'
        throw new Error(errorMsg)
      }
      
      await execPromise(`ffmpeg -i "${resolvedFilePath}" -ar 16000 -ac 1 -c:a pcm_s16le "${absoluteOutputPath}"`, { maxBuffer: 10000 * 1024 })
      l(`${pre} File conversion completed`)
    } else {
      throw new Error('Invalid option for audio download/processing.')
    }
    
    if (!existsSync(absoluteOutputPath)) {
      throw new Error(`File was not created at: ${absoluteOutputPath}`)
    }
    
    try {
      audioDurationInSeconds = await getAudioDurationInSeconds(absoluteOutputPath)
      l(`${pre} Retrieved audio duration before upload: ${audioDurationInSeconds} seconds`)
    } catch (error) {
      console.warn(`${pre} Could not get audio duration: ${error}`)
      audioDurationInSeconds = 300
      l(`${pre} Using default duration estimate: ${audioDurationInSeconds} seconds`)
    }
    
    const region = env['AWS_REGION'] || 'us-east-2'
    const bucket = env['S3_BUCKET_NAME'] || 'autoshow-test'
    const key = basename(outputPath)
    
    const fileBuffer = await readFile(absoluteOutputPath)
    const client = new S3Client({ region })
    
    const putCommand = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: fileBuffer,
      ContentType: 'audio/wav'
    })
    
    await client.send(putCommand)
    l(`${pre} File uploaded to S3`)
    
    try {
      await unlink(absoluteOutputPath)
      l(`${pre} Local WAV file deleted: ${absoluteOutputPath}`)
    } catch (error) {
      console.warn(`${pre} Failed to delete local WAV file: ${error}`)
    }
    
    const getCommand = new GetObjectCommand({ Bucket: bucket, Key: key })
    const s3Url = await getSignedUrl(client, getCommand, { expiresIn: 86400 })
    l(`${pre} Generated pre-signed URL with 24-hour expiration: ${s3Url}`)
    
    l(`${pre} Creating show note in S3`)
    const { id } = await s3Service.createShowNote({
      title: metadata.title,
      publishDate: metadata.publishDate,
      frontmatter: frontMatter,
      showLink: metadata.showLink || '',
      channel: metadata.channel || '',
      channelURL: metadata.channelURL || '',
      description: metadata.description || '',
      coverImage: metadata.coverImage || '',
    })
    
    l(`${pre} Computing transcription costs using duration: ${audioDurationInSeconds} seconds`)
    const transcriptionCosts = computeAllTranscriptCosts(audioDurationInSeconds)
    
    return new Response(JSON.stringify({
      id: parseInt(id),
      frontMatter,
      finalPath,
      metadata,
      outputPath: absoluteOutputPath,
      s3Url,
      transcriptionCost: transcriptionCosts,
      audioDuration: audioDurationInSeconds
    }), { status: 200 })
  } catch (error) {
    err(`${pre} Error:`, error)
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    return new Response(JSON.stringify({
      error: `An error occurred while processing the audio: ${errorMessage}`,
      stack: error instanceof Error ? error.stack : undefined
    }), { status: 500 })
  }
}

async function getAudioDurationInSeconds(filePath: string): Promise<number> {
  const pre = "[getAudioDurationInSeconds]"
  l(`${pre} Getting duration for file: ${filePath}`)
  
  if (!existsSync(filePath)) {
    err(`${pre} File not found: ${filePath}`)
    throw new Error(`File not found: ${filePath}`)
  }
  
  l(`${pre} Running ffprobe to get duration`)
  const cmd = `ffprobe -v error -show_entries format=duration -of csv=p=0 "${filePath}"`
  
  try {
    const { stdout } = await execPromise(cmd)
    l(`${pre} Raw ffprobe output: "${stdout.trim()}"`)
    
    const seconds = parseFloat(stdout.trim())
    if (isNaN(seconds)) {
      err(`${pre} Could not parse audio duration from ffprobe output`)
      throw new Error(`Could not parse audio duration for file: ${filePath}`)
    }
    
    l(`${pre} Audio duration: ${seconds} seconds`)
    return seconds
  } catch (error) {
    err(`${pre} Error running ffprobe:`, error)
    throw error
  }
}

function computeAllTranscriptCosts(durationInSeconds: number): Record<string, Array<{ modelId: string, cost: number }>> {
  const pre = "[computeAllTranscriptCosts]"
  l(`${pre} Computing transcription costs for duration: ${durationInSeconds} seconds`)
  
  const minutes = durationInSeconds / 60
  l(`${pre} Audio duration: ${durationInSeconds.toFixed(2)} seconds (${minutes.toFixed(2)} minutes)`)
  
  const result: Record<string, Array<{ modelId: string, cost: number }>> = {}
  
  Object.entries(T_CONFIG).forEach(([serviceName, config]) => {
    l(`${pre} Calculating costs for service: ${serviceName}`)
    result[serviceName] = []
    
    config.models.forEach(model => {
      const cost = model.costPerMinuteCents * minutes
      const finalCost = parseFloat(cost.toFixed(10))
      l(`${pre} ${serviceName}/${model.modelId}: ${minutes.toFixed(2)} minutes at ¢${model.costPerMinuteCents} = ¢${finalCost}`)
      result[serviceName].push({ modelId: model.modelId, cost: finalCost })
    })
  })
  
  l(`${pre} Completed cost calculations`)
  return result
}