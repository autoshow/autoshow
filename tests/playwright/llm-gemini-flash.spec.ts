import { test } from '@playwright/test'
import { runServiceTest } from './utils/test-utils'

test('llm: gemini 3 flash', async ({ page, request }) => {
  await runServiceTest(page, request, {
    name: 'llm-gemini-flash',
    transcription: {
      service: 'groq',
      model: 'whisper-large-v3-turbo',
      buttonService: 'Groq Whisper',
      buttonTitle: 'whisper-large-v3-turbo',
    },
    llm: {
      service: 'gemini',
      model: 'gemini-3-flash-preview',
      buttonTitle: 'Gemini 3 Flash',
    },
  })
})
