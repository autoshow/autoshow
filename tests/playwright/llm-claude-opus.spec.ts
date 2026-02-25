import { test } from '@playwright/test'
import { runServiceTest } from './utils/test-utils'

test('llm: claude opus 4.5', async ({ page, request }) => {
  await runServiceTest(page, request, {
    name: 'llm-claude-opus',
    transcription: {
      service: 'groq',
      model: 'whisper-large-v3-turbo',
      buttonService: 'Groq Whisper',
      buttonTitle: 'whisper-large-v3-turbo',
    },
    llm: {
      service: 'claude',
      model: 'claude-opus-4-5-20251101',
      buttonTitle: 'Claude Opus 4.5',
    },
  })
})
