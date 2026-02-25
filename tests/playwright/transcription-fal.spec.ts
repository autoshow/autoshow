import { test } from '@playwright/test'
import { runServiceTest } from './utils/test-utils'

test('transcription: fal whisper-large-v3', async ({ page, request }) => {
  await runServiceTest(page, request, {
    name: 'transcription-fal',
    transcription: {
      service: 'fal',
      model: 'fal-ai/whisper',
      buttonService: 'Fal Whisper',
      buttonTitle: 'whisper-large-v3',
    },
    llm: {
      service: 'groq',
      model: 'openai/gpt-oss-20b',
      buttonTitle: 'GPT OSS 20B',
    },
  })
})
