import { test } from '@playwright/test'
import { runServiceTest } from './utils/test-utils'

test('transcription: groq whisper-large-v3', async ({ page, request }) => {
  await runServiceTest(page, request, {
    name: 'transcription-groq-v3',
    transcription: {
      service: 'groq',
      model: 'whisper-large-v3',
      buttonService: 'Groq Whisper',
      buttonTitle: 'whisper-large-v3',
    },
    llm: {
      service: 'groq',
      model: 'openai/gpt-oss-20b',
      buttonTitle: 'GPT OSS 20B',
    },
  })
})
