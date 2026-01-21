import type { APIEvent } from "@solidjs/start/server"
import * as v from 'valibot'
import { l, err } from "~/utils/logging"
import type { ProcessingOptions } from "~/types/main"
import { ProcessingFormDataSchema, validationErrorResponse } from "~/types/main"
import { SERVICES_CONFIG } from "~/utils/services"
import { getDatabase, initializeSchema } from "~/database/db"
import { createJob } from "~/database/jobs"
import { processJobInBackground } from "~/routes/api/jobs/process-job"

function generateJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

export async function POST({ request }: APIEvent) {
  try {
    const formData = await request.formData()
    const rawFormData: Record<string, unknown> = {}
    for (const [key, value] of formData.entries()) {
      if (typeof value === 'string') {
        rawFormData[key] = value
      }
    }

    const formResult = v.safeParse(ProcessingFormDataSchema, rawFormData)
    if (!formResult.success) {
      return validationErrorResponse(formResult.issues)
    }

    const {
      url,
      transcriptionOption,
      transcriptionModel,
      llmService,
      llmModel,
      uploadedFilePath,
      uploadedFileName,
      selectedPrompts: selectedPromptsString,
      urlType,
      urlDuration,
      urlFileSize,
      ttsEnabled: ttsEnabledString,
      ttsService,
      ttsVoice,
      imageGenEnabled: imageGenEnabledString,
      selectedImagePrompts: selectedImagePromptsString,
      musicGenSkipped: musicGenSkippedString,
      selectedMusicGenre,
      videoGenEnabled: videoGenEnabledString,
      selectedVideoPrompts: selectedVideoPromptsString,
      videoModel,
      videoSize,
      videoDuration
    } = formResult.output

    l('Form data received', {
      url: url ? 'present' : 'null',
      transcriptionOption,
      transcriptionModel,
      llmModel,
      uploadedFilePath: uploadedFilePath ? 'present' : 'null',
      uploadedFileName: uploadedFileName || 'null',
      selectedPrompts: selectedPromptsString || 'null',
      urlType: urlType || 'null',
      urlDuration: urlDuration || 'null',
      urlFileSize: urlFileSize || 'null',
      ttsEnabled: ttsEnabledString,
      ttsService: ttsService || 'null',
      ttsVoice: ttsVoice || 'null',
      imageGenEnabled: imageGenEnabledString,
      selectedImagePrompts: selectedImagePromptsString || 'null',
      musicGenSkipped: musicGenSkippedString,
      selectedMusicGenre: selectedMusicGenre || 'null',
      videoGenEnabled: videoGenEnabledString,
      selectedVideoPrompts: selectedVideoPromptsString || 'null',
      videoModel: videoModel || 'null',
      videoSize: videoSize || 'null',
      videoDuration: videoDuration || 'null'
    })

    const selectedPrompts = selectedPromptsString ? selectedPromptsString.split(',').filter(p => p.length > 0) : []
    
    if (selectedPrompts.length === 0) {
      return Response.json({ error: 'Please select at least one content type to generate' }, { status: 400 })
    }
    
    const ttsEnabled = ttsEnabledString === "true"
    const imageGenEnabled = imageGenEnabledString === "true"
    const selectedImagePrompts = selectedImagePromptsString ? selectedImagePromptsString.split(',').filter(p => p.length > 0) : []
    
    if (imageGenEnabled && selectedImagePrompts.length === 0) {
      return Response.json({ error: 'Please select at least one image prompt when image generation is enabled' }, { status: 400 })
    }

    const musicGenEnabled = musicGenSkippedString !== "true"
    const videoGenEnabled = videoGenEnabledString === "true"
    const selectedVideoPrompts = selectedVideoPromptsString ? selectedVideoPromptsString.split(',').filter(p => p.length > 0) : []
    
    if (videoGenEnabled && selectedVideoPrompts.length === 0) {
      return Response.json({ error: 'Please select at least one video type when video generation is enabled' }, { status: 400 })
    }
    
    const hasUrl = url && url.trim() && urlType
    const hasUploadedFile = uploadedFilePath && uploadedFileName
    
    const sourceCount = [hasUrl, hasUploadedFile].filter(Boolean).length
    
    if (sourceCount === 0) {
      return Response.json({ error: 'Please provide a URL or upload a file' }, { status: 400 })
    }
    
    if (sourceCount > 1) {
      return Response.json({ error: 'Please provide only one source (URL or uploaded file)' }, { status: 400 })
    }

    let options
    
    if (hasUrl) {
      let ttsModel: string | undefined = undefined
      
      if (ttsEnabled && ttsService) {
        if (ttsService === 'openai') {
          ttsModel = SERVICES_CONFIG.tts.openai.model
        } else if (ttsService === 'elevenlabs') {
          ttsModel = SERVICES_CONFIG.tts.elevenlabs.model
        }
      }

      options = {
        url,
        llmService: llmService ?? 'openai',
        llmModel,
        outputDir: "",
        transcriptionService: transcriptionOption as 'groq' | 'deepinfra' | 'happyscribe',
        isLocalFile: false,
        localFilePath: undefined,
        localFileName: undefined,
        selectedPrompts,
        urlType: urlType as 'youtube' | 'streaming' | 'direct-file',
        urlDuration: urlDuration ? parseFloat(urlDuration) : undefined,
        urlFileSize: urlFileSize ? parseFloat(urlFileSize) : undefined,
        useResilientDownload: urlType === 'direct-file',
        transcriptionModel: transcriptionModel || undefined,
        ttsEnabled,
        ttsService: ttsEnabled && ttsService ? ttsService as 'openai' | 'elevenlabs' : undefined,
        ttsVoice: ttsEnabled && ttsVoice ? ttsVoice : undefined,
        ttsModel,
        imageGenEnabled,
        selectedImagePrompts: imageGenEnabled ? selectedImagePrompts : undefined,
        musicGenEnabled,
        selectedMusicGenre: musicGenEnabled && selectedMusicGenre ? selectedMusicGenre as 'rap' | 'rock' | 'pop' | 'country' | 'folk' | 'jazz' : undefined,
        videoGenEnabled,
        selectedVideoPrompts: videoGenEnabled ? selectedVideoPrompts as ('explainer' | 'highlight' | 'intro' | 'outro' | 'social')[] : undefined,
        videoModel: videoGenEnabled && videoModel ? videoModel as 'sora-2' | 'sora-2-pro' : undefined,
        videoSize: videoGenEnabled && videoSize ? videoSize as '1920x1080' | '1080x1920' | '1280x720' | '720x1280' : undefined,
        videoDuration: videoGenEnabled && videoDuration ? parseInt(videoDuration) : undefined
      } satisfies ProcessingOptions
      
      l('Processing options', {
        url: 'present',
        llmModel,
        transcriptionService: transcriptionOption,
        isLocalFile: false,
        selectedPrompts,
        urlType,
        transcriptionModel: transcriptionModel || 'default',
        ttsEnabled,
        ttsService: ttsService || 'none',
        ttsVoice: ttsVoice || 'none',
        imageGenEnabled,
        selectedImagePrompts: imageGenEnabled ? selectedImagePrompts : 'none',
        musicGenEnabled,
        selectedMusicGenre: musicGenEnabled ? selectedMusicGenre : 'none',
        videoGenEnabled,
        selectedVideoPrompts: videoGenEnabled ? selectedVideoPrompts : 'none',
        videoModel: videoGenEnabled ? videoModel : 'none',
        videoSize: videoGenEnabled ? videoSize : 'none',
        videoDuration: videoGenEnabled ? videoDuration : 'none'
      })
    } else {
      let ttsModel: string | undefined = undefined
      
      if (ttsEnabled && ttsService) {
        if (ttsService === 'openai') {
          ttsModel = SERVICES_CONFIG.tts.openai.model
        } else if (ttsService === 'elevenlabs') {
          ttsModel = SERVICES_CONFIG.tts.elevenlabs.model
        }
      }

      options = {
        url: `file://${uploadedFilePath}`,
        llmService: llmService ?? 'openai',
        llmModel,
        outputDir: "",
        transcriptionService: transcriptionOption as 'groq' | 'deepinfra' | 'happyscribe',
        isLocalFile: true,
        localFilePath: uploadedFilePath,
        localFileName: uploadedFileName,
        selectedPrompts,
        useResilientDownload: false,
        transcriptionModel: transcriptionModel || undefined,
        ttsEnabled,
        ttsService: ttsEnabled && ttsService ? ttsService as 'openai' | 'elevenlabs' : undefined,
        ttsVoice: ttsEnabled && ttsVoice ? ttsVoice : undefined,
        ttsModel,
        imageGenEnabled,
        selectedImagePrompts: imageGenEnabled ? selectedImagePrompts : undefined,
        musicGenEnabled,
        selectedMusicGenre: musicGenEnabled && selectedMusicGenre ? selectedMusicGenre as 'rap' | 'rock' | 'pop' | 'country' | 'folk' | 'jazz' : undefined,
        videoGenEnabled,
        selectedVideoPrompts: videoGenEnabled ? selectedVideoPrompts as ('explainer' | 'highlight' | 'intro' | 'outro' | 'social')[] : undefined,
        videoModel: videoGenEnabled && videoModel ? videoModel as 'sora-2' | 'sora-2-pro' : undefined,
        videoSize: videoGenEnabled && videoSize ? videoSize as '1920x1080' | '1080x1920' | '1280x720' | '720x1280' : undefined,
        videoDuration: videoGenEnabled && videoDuration ? parseInt(videoDuration) : undefined
      } satisfies ProcessingOptions
      
      l('Processing options', {
        filePath: uploadedFilePath,
        fileName: uploadedFileName,
        llmModel,
        transcriptionService: transcriptionOption,
        isLocalFile: true,
        selectedPrompts,
        transcriptionModel: transcriptionModel || 'default',
        ttsEnabled,
        ttsService: ttsService || 'none',
        ttsVoice: ttsVoice || 'none',
        imageGenEnabled,
        selectedImagePrompts: imageGenEnabled ? selectedImagePrompts : 'none',
        musicGenEnabled,
        selectedMusicGenre: musicGenEnabled ? selectedMusicGenre : 'none',
        videoGenEnabled,
        selectedVideoPrompts: videoGenEnabled ? selectedVideoPrompts : 'none',
        videoModel: videoGenEnabled ? videoModel : 'none',
        videoSize: videoGenEnabled ? videoSize : 'none',
        videoDuration: videoGenEnabled ? videoDuration : 'none'
      })
    }

    const jobId = generateJobId()
    const db = getDatabase()
    initializeSchema(db)
    
    createJob(db, jobId, {
      status: 'pending',
      inputData: JSON.stringify(options),
      createdAt: Date.now()
    })

    processJobInBackground(jobId, options)

    return Response.json({ jobId })
    
  } catch (error) {
    err('Failed to create processing job', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to start processing' },
      { status: 500 }
    )
  }
}
