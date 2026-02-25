import { test } from '@playwright/test'
import { runServiceTest } from './utils/test-utils'

test('llm: groq gpt-oss-20b', async ({ page, request }) => {
  await runServiceTest(page, request, {
    name: 'llm-groq-20b',
    transcription: {
      service: 'groq',
      model: 'whisper-large-v3-turbo',
      buttonService: 'Groq Whisper',
      buttonTitle: 'whisper-large-v3-turbo',
    },
    llm: {
      service: 'groq',
      model: 'openai/gpt-oss-20b',
      buttonTitle: 'GPT OSS 20B',
    },
  })
})
