import { test } from '@playwright/test'
import { runServiceTest } from './utils/test-utils'

test('transcription: deepinfra whisper-large-v3', async ({ page, request }) => {
  await runServiceTest(page, request, {
    name: 'transcription-deepinfra-v3',
    transcription: {
      service: 'deepinfra',
      model: 'openai/whisper-large-v3',
      buttonService: 'DeepInfra Whisper',
      buttonTitle: 'whisper-large-v3',
    },
    llm: {
      service: 'groq',
      model: 'openai/gpt-oss-20b',
      buttonTitle: 'GPT OSS 20B',
    },
  })
})
