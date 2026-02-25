import { test } from '@playwright/test'
import { runServiceTest } from './utils/test-utils'

test('transcription: elevenlabs scribe v2', async ({ page, request }) => {
  await runServiceTest(page, request, {
    name: 'transcription-elevenlabs',
    transcription: {
      service: 'elevenlabs',
      model: 'scribe_v2',
      buttonService: 'ElevenLabs Scribe',
      buttonTitle: 'Scribe V2',
    },
    llm: {
      service: 'groq',
      model: 'openai/gpt-oss-20b',
      buttonTitle: 'GPT OSS 20B',
    },
  })
})
