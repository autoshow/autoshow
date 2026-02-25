import { test } from '@playwright/test'
import { runServiceTest } from './utils/test-utils'

test('llm: claude haiku 4.5', async ({ page, request }) => {
  await runServiceTest(page, request, {
    name: 'llm-claude-haiku',
    transcription: {
      service: 'groq',
      model: 'whisper-large-v3-turbo',
      buttonService: 'Groq Whisper',
      buttonTitle: 'whisper-large-v3-turbo',
    },
    llm: {
      service: 'claude',
      model: 'claude-haiku-4-5-20251001',
      buttonTitle: 'Claude Haiku 4.5',
    },
  })
})
