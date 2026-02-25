import { test } from '@playwright/test'
import { runServiceTest } from './utils/test-utils'

test('transcription: groq whisper-large-v3-turbo', async ({ page, request }) => {
  await runServiceTest(page, request, {
    name: 'transcription-groq-turbo',
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
