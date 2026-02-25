import { test } from '@playwright/test'
import { runServiceTest } from './utils/test-utils'

test('transcription: gladia v2', async ({ page, request }) => {
  await runServiceTest(page, request, {
    name: 'transcription-gladia',
    transcription: {
      service: 'gladia',
      model: 'gladia-v2',
      buttonService: 'Gladia',
      buttonTitle: 'Gladia V2',
    },
    llm: {
      service: 'groq',
      model: 'openai/gpt-oss-20b',
      buttonTitle: 'GPT OSS 20B',
    },
  })
})
