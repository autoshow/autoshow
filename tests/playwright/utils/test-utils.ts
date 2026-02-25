import { expect } from '@playwright/test'
import type { Page, APIRequestContext } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

export interface TestTiming {
  step: string
  startedAt: number
  completedAt: number
  durationMs: number
}

export interface Job {
  id: string
  status: string
  currentStep: number
  stepName: string
  stepProgress: number
  overallProgress: number
  error: string | null
  showNoteId: string | null
  createdAt: number
  startedAt: number | null
  completedAt: number | null
}

export interface TestConfig {
  name: string
  transcription: {
    service: string
    model: string
    buttonService: string
    buttonTitle: string
  }
  llm: {
    service: string
    model: string
    buttonTitle: string
  }
}

export const STEP_NAME_TO_KEY: Record<string, string> = {
  'Download Audio': 'download',
  'Transcription': 'transcription',
  'Content Selection': 'contentSelection',
  'LLM Generation': 'llm',
  'Text-to-Speech': 'tts',
  'Image Generation': 'image',
  'Music Generation': 'music',
  'Video Generation': 'video',
}

export function getTimestampPrefix(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const h = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d}-${h}${min}`
}

export function formatTimestamp(): string {
  const now = new Date()
  const hours = now.getHours().toString().padStart(2, '0')
  const minutes = now.getMinutes().toString().padStart(2, '0')
  const seconds = now.getSeconds().toString().padStart(2, '0')
  const millis = now.getMilliseconds().toString().padStart(3, '0')
  return `${hours}:${minutes}:${seconds}.${millis}`
}

export async function runServiceTest(
  page: Page,
  request: APIRequestContext,
  config: TestConfig
): Promise<void> {
  const testStartTime = Date.now()
  const serverLogStartTime = Date.now()
  const pollLogs: string[] = []
  const baseUrl = 'http://localhost:3000'

  const stepTimings: Record<string, TestTiming | null> = {
    download: null,
    transcription: null,
    contentSelection: null,
    llm: null,
    tts: null,
    image: null,
    music: null,
    video: null,
  }

  let currentStepKey: string | null = null
  let currentStepStartTime: number | null = null

  await page.goto('/create')
  await page.waitForLoadState('networkidle')

  const urlFillStart = Date.now()
  await page.fill('input#url', 'https://ajc.pics/audio/fsjam-short.mp3')
  await page.click('button:has-text("Verify")')
  await page.waitForSelector('text=URL Verified', { timeout: 30000 })
  const urlVerifyTiming: TestTiming = {
    step: 'urlVerify',
    startedAt: urlFillStart,
    completedAt: Date.now(),
    durationMs: Date.now() - urlFillStart,
  }
  pollLogs.push(`[${formatTimestamp()}] URL verified`)

  await page.waitForTimeout(500)

  const transcriptionButton = page.locator(`button:has-text("${config.transcription.buttonService}"):has-text("${config.transcription.buttonTitle}")`).first()
  await transcriptionButton.click({ timeout: 10000 })
  pollLogs.push(`[${formatTimestamp()}] Selected transcription: ${config.transcription.buttonService} - ${config.transcription.buttonTitle}`)

  await page.locator(`button:has-text("${config.llm.buttonTitle}")`).first().click({ timeout: 10000 })
  pollLogs.push(`[${formatTimestamp()}] Selected LLM: ${config.llm.buttonTitle}`)

  await page.getByLabel('Skip text-to-speech generation').check()
  await page.getByLabel('Skip AI image generation').check()
  await page.getByLabel('Skip music generation').check()
  await page.getByLabel('Skip AI video generation').check()

  const submitStart = Date.now()
  await page.click('button:has-text("Create Show Note")')
  await page.waitForURL(/\?job=/)

  const url = new URL(page.url())
  const jobId = url.searchParams.get('job')
  expect(jobId).toBeTruthy()

  const submitTiming: TestTiming = {
    step: 'jobSubmission',
    startedAt: submitStart,
    completedAt: Date.now(),
    durationMs: Date.now() - submitStart,
  }
  pollLogs.push(`[${formatTimestamp()}] Job submitted: ${jobId}`)

  let job: Job | null = null
  const pollTimeout = 300_000
  const pollStart = Date.now()
  let lastLogKey = ''

  while (Date.now() - pollStart < pollTimeout) {
    const response = await request.get(`${baseUrl}/api/jobs/${jobId}`)
    expect(response.ok()).toBeTruthy()

    job = await response.json()
    const now = Date.now()
    const logKey = `${job!.status}-${job!.stepName || 'waiting'}-${job!.overallProgress}`

    if (logKey !== lastLogKey) {
      const logLine = `[${formatTimestamp()}] Job ${jobId}: ${job!.status} - ${job!.stepName || 'waiting'} (${job!.overallProgress}%)`
      pollLogs.push(logLine)
      lastLogKey = logKey
    }

    const stepKey = job!.stepName ? STEP_NAME_TO_KEY[job!.stepName] : null

    if (stepKey && stepKey !== currentStepKey) {
      if (currentStepKey && currentStepStartTime) {
        stepTimings[currentStepKey] = {
          step: currentStepKey,
          startedAt: currentStepStartTime,
          completedAt: now,
          durationMs: now - currentStepStartTime,
        }
      }
      currentStepKey = stepKey
      currentStepStartTime = now
    }

    if (job!.status === 'completed') {
      if (currentStepKey && currentStepStartTime) {
        stepTimings[currentStepKey] = {
          step: currentStepKey,
          startedAt: currentStepStartTime,
          completedAt: now,
          durationMs: now - currentStepStartTime,
        }
      }
      break
    }

    if (job!.status === 'error') {
      throw new Error(`Job failed: ${job!.error || 'Unknown error'}`)
    }

    await page.waitForTimeout(100)
  }

  expect(job).toBeTruthy()
  expect(job!.status).toBe('completed')
  expect(job!.showNoteId).toBeTruthy()

  const fetchStart = Date.now()
  const showNoteResponse = await request.get(`${baseUrl}/show-notes/${job!.showNoteId}`)
  expect(showNoteResponse.ok()).toBeTruthy()
  const showNoteHtml = await showNoteResponse.text()
  const fetchTiming: TestTiming = {
    step: 'showNoteFetch',
    startedAt: fetchStart,
    completedAt: Date.now(),
    durationMs: Date.now() - fetchStart,
  }
  pollLogs.push(`[${formatTimestamp()}] Show note fetched: ${job!.showNoteId}`)

  const serverLogsResponse = await request.get(`${baseUrl}/api/server-logs?since=${serverLogStartTime}&format=text`)
  const serverLogs = serverLogsResponse.ok() ? await serverLogsResponse.text() : '(failed to fetch server logs)'

  const testEndTime = Date.now()

  const report = {
    reportGeneratedAt: new Date().toISOString(),
    environment: {
      platform: process.platform,
      nodeVersion: process.version,
      testRunner: 'playwright',
    },
    summary: {
      totalTests: 1,
      passed: 1,
      failed: 0,
      totalDurationMs: testEndTime - testStartTime,
    },
    tests: [
      {
        testName: config.name,
        status: 'passed',
        timestamps: {
          testStartedAt: new Date(testStartTime).toISOString(),
          testCompletedAt: new Date(testEndTime).toISOString(),
          totalDurationMs: testEndTime - testStartTime,
        },
        timings: {
          urlVerify: urlVerifyTiming,
          jobSubmission: submitTiming,
          download: stepTimings.download,
          transcription: stepTimings.transcription,
          contentSelection: stepTimings.contentSelection,
          llm: stepTimings.llm,
          tts: stepTimings.tts,
          image: stepTimings.image,
          music: stepTimings.music,
          video: stepTimings.video,
          showNoteFetch: fetchTiming,
        },
        input: {
          url: 'https://ajc.pics/audio/fsjam-short.mp3',
          transcriptionService: config.transcription.service,
          transcriptionModel: config.transcription.model,
          llmService: config.llm.service,
          llmModel: config.llm.model,
          selectedPrompts: ['shortSummary'],
          ttsEnabled: false,
          imageGenEnabled: false,
          musicGenEnabled: false,
          videoGenEnabled: false,
        },
        job: {
          jobId: job!.id,
          status: job!.status,
          showNoteId: job!.showNoteId,
          createdAt: job!.createdAt,
          startedAt: job!.startedAt,
          completedAt: job!.completedAt,
          totalJobDurationMs:
            job!.completedAt && job!.startedAt ? job!.completedAt - job!.startedAt : 0,
        },
        showNotePage: {
          id: job!.showNoteId,
          hasTranscription: showNoteHtml.includes('Transcription') || showNoteHtml.includes('transcription'),
          hasSummary: showNoteHtml.includes('Summary') || showNoteHtml.includes('summary'),
          pageSize: showNoteHtml.length,
        },
      },
    ],
  }

  const timestamp = getTimestampPrefix()
  const logsDir = path.join(process.cwd(), 'logs')
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true })
  }

  const safeName = config.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const reportPath = path.join(logsDir, `${timestamp}-playwright-${safeName}-report.json`)
  const serverLogsPath = path.join(logsDir, `${timestamp}-playwright-${safeName}-server.log`)
  const pollLogsPath = path.join(logsDir, `${timestamp}-playwright-${safeName}-poll.log`)

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  fs.writeFileSync(serverLogsPath, serverLogs)
  fs.writeFileSync(pollLogsPath, pollLogs.join('\n'))

  console.log(`\nTest report written to: ${reportPath}`)
  console.log(`Server logs written to: ${serverLogsPath}`)
  console.log(`Poll logs written to: ${pollLogsPath}`)

  await page.goto('/create')
  await page.waitForLoadState('networkidle')
}
