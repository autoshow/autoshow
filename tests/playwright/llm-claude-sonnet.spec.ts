import { test } from '@playwright/test'
import { runServiceTest } from './utils/test-utils'

test('llm: claude sonnet 4.5', async ({ page, request }) => {
  await runServiceTest(page, request, {
    name: 'llm-claude-sonnet',
    transcription: {
      service: 'groq',
      model: 'whisper-large-v3-turbo',
      buttonService: 'Groq Whisper',
      buttonTitle: 'whisper-large-v3-turbo',
    },
    llm: {
      service: 'claude',
      model: 'claude-sonnet-4-5-20250929',
      buttonTitle: 'Claude Sonnet 4.5',
    },
  })
})
