import { test } from '@playwright/test'
import { runServiceTest } from './utils/test-utils'

test('llm: openai gpt-5.1', async ({ page, request }) => {
  await runServiceTest(page, request, {
    name: 'llm-openai-gpt51',
    transcription: {
      service: 'groq',
      model: 'whisper-large-v3-turbo',
      buttonService: 'Groq Whisper',
      buttonTitle: 'whisper-large-v3-turbo',
    },
    llm: {
      service: 'openai',
      model: 'gpt-5.1',
      buttonTitle: 'gpt-5.1',
    },
  })
})
