import type { Step5Metadata, IProgressTracker, ProcessingOptions, StructuredLLMResponse } from '~/types'
import { l, err } from '~/utils/logging'
import { runOpenAITTS } from './tts-services/run-openai-tts'
import { runElevenLabsTTS } from './tts-services/run-elevenlabs-tts'
import { runGroqTTS } from './tts-services/run-groq-tts'

export const runTTS = async (
  text: string,
  outputDir: string,
  voice: string,
  model: string,
  progressTracker?: IProgressTracker,
  service: string = 'openai',
  instructions?: string,
  jobId?: string
): Promise<{ audioPath: string, metadata: Step5Metadata }> => {
  l('Step 5: Text-to-Speech Generation', {
    service,
    model,
    voice
  })

  progressTracker?.updateStepProgress(5, 10, 'Starting text-to-speech generation')

  let result: { audioPath: string, metadata: Step5Metadata }

  if (service === 'elevenlabs') {
    l('Routing to ElevenLabs TTS service', { service })
    result = await runElevenLabsTTS(text, outputDir, voice, model, progressTracker, jobId)
  } else if (service === 'openai') {
    l('Routing to OpenAI TTS service', { service })
    result = await runOpenAITTS(text, outputDir, voice, model, progressTracker, instructions, jobId)
  } else if (service === 'groq') {
    l('Routing to Groq TTS service', { service })
    result = await runGroqTTS(text, outputDir, voice, model, progressTracker, instructions, jobId)
  } else {
    err(`Unknown TTS service: ${service}`)
    throw new Error(`Unknown TTS service: ${service}`)
  }

  progressTracker?.completeStep(5, 'Text-to-speech generation complete')

  return result
}

export const processTTS = async (
  options: ProcessingOptions,
  progressTracker: IProgressTracker,
  jobId?: string
) => {
  l('Step 5: Text-to-Speech', {
    ttsEnabled: options.ttsEnabled,
    ttsService: options.ttsService,
    ttsVoice: options.ttsVoice
  })

  if (!options.ttsEnabled) {
    return undefined
  }
  if (!options.ttsVoice || !options.ttsService || !options.ttsModel) {
    err('TTS service, model, and voice are required when TTS is enabled')
    throw new Error('TTS service, model, and voice are required when TTS is enabled')
  }

  progressTracker.startStep(5, 'Starting text-to-speech generation')

  const textOutputPath = `${options.outputDir}/text-output.json`
  const textOutputJson = await Bun.file(textOutputPath).json() as StructuredLLMResponse
  const parts: string[] = []
  if (textOutputJson.shortSummary) parts.push(textOutputJson.shortSummary)
  if (textOutputJson.longSummary) parts.push(textOutputJson.longSummary)
  if (textOutputJson.bulletPoints?.length) parts.push(textOutputJson.bulletPoints.join('\n'))
  if (textOutputJson.takeaways?.length) parts.push(textOutputJson.takeaways.join('\n'))
  if (textOutputJson.faq?.length) parts.push(textOutputJson.faq.map(f => `${f.question}\n${f.answer}`).join('\n\n'))
  const textOutputText = parts.join('\n\n')

  const ttsResult = await runTTS(
    textOutputText,
    options.outputDir,
    options.ttsVoice,
    options.ttsModel,
    progressTracker,
    options.ttsService,
    undefined,
    jobId
  )

  return ttsResult.metadata
}
