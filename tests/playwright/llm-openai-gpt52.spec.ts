import { test } from '@playwright/test'
import { runServiceTest } from './utils/test-utils'

test('llm: openai gpt-5.2', async ({ page, request }) => {
  await runServiceTest(page, request, {
    name: 'llm-openai-gpt52',
    transcription: {
      service: 'groq',
      model: 'whisper-large-v3-turbo',
      buttonService: 'Groq Whisper',
      buttonTitle: 'whisper-large-v3-turbo',
    },
    llm: {
      service: 'openai',
      model: 'gpt-5.2',
      buttonTitle: 'gpt-5.2',
    },
  })
})
