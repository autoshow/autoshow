import OpenAI from 'openai'
import { l, err } from '~/utils/logging'
import type { Step6Metadata, ImageGenerationResult } from '~/types/main'
import type { IProgressTracker } from '~/types/progress'
import { IMAGE_PROMPT_TEMPLATES } from '~/prompts/image-prompts'

const OPENAI_API_KEY = process.env['OPENAI_API_KEY']

export const generateImages = async (
  title: string,
  summary: string,
  selectedPrompts: string[],
  outputDir: string,
  progressTracker?: IProgressTracker
): Promise<{ results: ImageGenerationResult[], metadata: Step6Metadata }> => {
  try {
    if (!OPENAI_API_KEY) {
      err('OPENAI_API_KEY not found in environment')
      progressTracker?.error(6, 'Configuration error', 'OPENAI_API_KEY environment variable is required')
      throw new Error('OPENAI_API_KEY environment variable is required')
    }

    l('Starting OpenAI image generation')
    
    const startTime = Date.now()
    const client = new OpenAI({ apiKey: OPENAI_API_KEY })
    
    const results: ImageGenerationResult[] = []
    
    for (let i = 0; i < selectedPrompts.length; i++) {
      const promptType = selectedPrompts[i]
      if (!promptType) {
        continue
      }
      
      const promptIndex = i + 1
      
      progressTracker?.updateStepWithSubStep(
        6,
        promptIndex,
        selectedPrompts.length,
        'Image ' + promptIndex + '/' + selectedPrompts.length,
        'Generating ' + promptType + ' image'
      )
      
      l('Generating image', {
        index: `${promptIndex}/${selectedPrompts.length}`,
        promptType
      })
      
      const promptTemplate = IMAGE_PROMPT_TEMPLATES[promptType]
      if (!promptTemplate) {
        l('Unknown prompt type', { promptType })
        continue
      }
      
      const prompt = promptTemplate
        .replace('{title}', title)
        .replace('{summary}', summary)
      
      const requestParams = {
        model: 'gpt-image-1',
        prompt,
        size: '1024x1024' as const,
        quality: 'high' as const
      }
      
      const imageStartTime = Date.now()
      
      let response
      try {
        response = await client.images.generate(requestParams)
        const apiCallTime = Date.now() - imageStartTime
        l('OpenAI API response received', { time: `${apiCallTime}ms` })
      } catch (apiError) {
        err('OpenAI API error for ' + promptType + ': ' + (apiError instanceof Error ? apiError.message : 'Unknown error'))
        throw apiError
      }
      
      const imageProcessingTime = Date.now() - imageStartTime
      
      if (!response.data || response.data.length === 0) {
        l('No image data received', { promptType })
        continue
      }
      
      const imageData = response.data[0]
      
      if (!imageData?.b64_json) {
        l('No base64 data in response', { promptType })
        continue
      }
      
      const imageFileName = 'image_' + promptType + '.png'
      const imagePath = outputDir + '/' + imageFileName
      
      const imageBuffer = Buffer.from(imageData.b64_json, 'base64')
      await Bun.write(imagePath, imageBuffer)
      
      const imageFileSize = imageBuffer.length
      
      l('Image created', {
        fileName: imageFileName,
        size: `${(imageFileSize / 1024).toFixed(0)} KB`
      })
      
      results.push({
        promptType,
        fileName: imageFileName,
        fileSize: imageFileSize,
        processingTime: imageProcessingTime,
        revisedPrompt: imageData.revised_prompt
      })
    }
    
    const totalProcessingTime = Date.now() - startTime
    
    l('Image generation completed', {
      totalTime: `${(totalProcessingTime / 1000).toFixed(1)}s`,
      imagesGenerated: results.length
    })
    
    const metadata: Step6Metadata = {
      imageGenService: 'openai',
      imageGenModel: 'gpt-image-1',
      processingTime: totalProcessingTime,
      imagesGenerated: results.length,
      selectedPrompts,
      results
    }
    
    return { results, metadata }
  } catch (error) {
    err('Image generation failed', error)
    progressTracker?.error(6, 'Image generation failed', error instanceof Error ? error.message : 'Unknown error')
    throw error
  }
}