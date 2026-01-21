import type { Step8Metadata, VideoGenerationResult, VideoModel, VideoSize, VideoPromptType } from '~/types/main'
import type { TranscriptionResult } from '~/types/main'
import type { VideoMetadata } from '~/types/main'
import type { IProgressTracker } from '~/types/progress'
import { l } from '~/utils/logging'
import { runOpenAIModel } from '~/routes/api/process/04-run-llm/llm-services/run-chatgpt'
import { generateVideo } from './video-services/run-sora-video'
import { buildVideoScenePrompt } from '~/prompts/video-prompts'

export const generateVideos = async (
  metadata: VideoMetadata,
  transcription: TranscriptionResult,
  selectedPrompts: VideoPromptType[],
  model: VideoModel,
  size: VideoSize,
  duration: number,
  outputDir: string,
  llmModel: string,
  progressTracker?: IProgressTracker
): Promise<{ results: VideoGenerationResult[], metadata: Step8Metadata }> => {
  const stepNumber = 8
  
  l('Step 8: Generate Videos', {
    videoTypes: selectedPrompts,
    model,
    size,
    duration: `${duration}s`,
    llmModel
  })
  
  const startTime = Date.now()
  const results: VideoGenerationResult[] = []
  const totalVideos = selectedPrompts.length
  
  for (let i = 0; i < selectedPrompts.length; i++) {
    const videoType = selectedPrompts[i]
    if (!videoType) continue
    
    const videoIndex = i + 1
    const baseProgress = Math.floor((i / totalVideos) * 100)
    const progressPerVideo = Math.floor(100 / totalVideos)
    
    l('Generating video', {
      index: `${videoIndex}/${totalVideos}`,
      videoType
    })
    
    progressTracker?.updateStepWithSubStep(
      stepNumber,
      videoIndex,
      totalVideos,
      `Video ${videoIndex}/${totalVideos}`,
      `Generating scene description for ${videoType}`
    )
    
    const scenePrompt = buildVideoScenePrompt(metadata, transcription, videoType, size, duration)
    
    const scenePromptPath = `${outputDir}/video-scene-${videoType}.md`
    await Bun.write(scenePromptPath, scenePrompt)
    l('Scene prompt saved', { path: scenePromptPath })
    
    progressTracker?.updateStepProgress(
      stepNumber,
      baseProgress + Math.floor(progressPerVideo * 0.1),
      `Requesting scene description from LLM for ${videoType}`
    )
    
    const sceneStartTime = Date.now()
    const { response: sceneDescription } = await runOpenAIModel(scenePrompt, llmModel, progressTracker)
    const sceneGenerationTime = Date.now() - sceneStartTime
    
    l('Scene description generated', {
      generationTime: `${sceneGenerationTime}ms`,
      length: `${sceneDescription.length} characters`
    })
    
    const sceneDescriptionPath = `${outputDir}/video-scene-description-${videoType}.md`
    await Bun.write(sceneDescriptionPath, sceneDescription)
    l('Scene description saved', { path: sceneDescriptionPath })
    
    progressTracker?.updateStepProgress(
      stepNumber,
      baseProgress + Math.floor(progressPerVideo * 0.2),
      `Starting Sora video render for ${videoType}`
    )
    
    const videoStartTime = Date.now()
    const { videoPath, thumbnailPath, fileSize } = await generateVideo(
      sceneDescription,
      model,
      size,
      duration,
      outputDir,
      videoType,
      progressTracker,
      stepNumber,
      baseProgress + Math.floor(progressPerVideo * 0.2),
      baseProgress + Math.floor(progressPerVideo * 0.95)
    )
    const videoGenerationTime = Date.now() - videoStartTime
    
    l('Video generated', {
      path: videoPath,
      generationTime: `${(videoGenerationTime / 1000).toFixed(1)}s`
    })
    
    const videoFileName = videoPath.split('/').pop() || `video_${videoType}.mp4`
    const thumbnailFileName = thumbnailPath ? thumbnailPath.split('/').pop() : undefined
    
    results.push({
      promptType: videoType,
      fileName: videoFileName,
      fileSize,
      processingTime: videoGenerationTime + sceneGenerationTime,
      duration,
      size,
      thumbnailFileName,
      scenePrompt: sceneDescription,
      scenePromptGenerationTime: sceneGenerationTime
    })
    
    progressTracker?.updateStepProgress(
      stepNumber,
      baseProgress + progressPerVideo,
      `Video ${videoIndex}/${totalVideos} complete`
    )
  }
  
  const totalProcessingTime = Date.now() - startTime
  
  l('Video generation completed', {
    totalTime: `${(totalProcessingTime / 1000).toFixed(1)}s`,
    videosGenerated: results.length
  })
  
  const step8Metadata: Step8Metadata = {
    videoGenService: 'openai',
    videoGenModel: model,
    processingTime: totalProcessingTime,
    videosGenerated: results.length,
    selectedPrompts,
    selectedSize: size,
    selectedDuration: duration,
    results
  }
  
  progressTracker?.completeStep(stepNumber, 'Video generation complete')
  
  return { results, metadata: step8Metadata }
}
