import type { Step5Metadata } from '~/types/main'
import type { IProgressTracker } from '~/types/progress'
import { l, err } from '~/utils/logging'
import { generateSpeechOpenAI } from './tts-services/run-openai-tts'
import { generateSpeechElevenlabs } from './tts-services/run-elevenlabs-tts'

export const runTTS = async (
  text: string,
  outputDir: string,
  voice: string,
  model: string,
  progressTracker?: IProgressTracker,
  service: string = 'openai',
  instructions?: string
): Promise<{ audioPath: string, metadata: Step5Metadata }> => {
  l('Step 5: Text-to-Speech Generation', {
    service,
    model,
    voice
  })
  
  progressTracker?.updateStepProgress(5, 10, 'Starting text-to-speech generation')
  
  let result: { audioPath: string, metadata: Step5Metadata }
  
  if (service === 'elevenlabs') {
    l('Routing to Elevenlabs TTS service', { service })
    result = await generateSpeechElevenlabs(text, outputDir, voice, model, progressTracker)
  } else if (service === 'openai') {
    l('Routing to OpenAI TTS service', { service })
    result = await generateSpeechOpenAI(text, outputDir, voice, model, progressTracker, instructions)
  } else {
    err(`Unknown TTS service: ${service}`)
    throw new Error(`Unknown TTS service: ${service}`)
  }
  
  progressTracker?.completeStep(5, 'Text-to-speech generation complete')
  
  return result
}