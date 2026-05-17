import { expect } from '@playwright/test'
import type {
  APIRequestContext,
  Page,
  Request as PlaywrightRequest,
  TestInfo,
} from '@playwright/test'
import * as fs from 'fs'
import type { TestDefinition } from '~/types'
import { TRANSCRIPTION_CONFIG } from '~/models'
import { getJobProgressTimingKey } from '~/utils/job-progress'
import { resolveTestOutputPath, writeMirroredBenchmarkReport } from '../../../scripts/test/harness/output'

const STEP_HEARTBEAT_MS = Number(process.env.AUTOSHOW_PLAYWRIGHT_STEP_HEARTBEAT_MS ?? '15000')

interface ActiveRequest {
  method: string
  url: string
  resourceType: string
  startedAt: number
}

type VerifyUrlResponse = {
  urlType?: string
  error?: string
}

type UrlVerificationUiState = 'verified' | 'error'

type PlaywrightRequestContext = {
  requestHeaders: Record<string, string>
}

async function createPlaywrightRequestContext(): Promise<PlaywrightRequestContext> {
  return { requestHeaders: {} }
}

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
  inputUrl?: string
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

function formatDurationMs(valueMs: number): string {
  if (valueMs < 1000) {
    return `${valueMs}ms`
  }
  return `${(valueMs / 1000).toFixed(1)}s`
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value
  }
  return `${value.slice(0, maxLength - 3)}...`
}

function logPlaywright(testName: string, message: string): void {
  if (process.env.AUTOSHOW_PLAYWRIGHT_DEBUG !== '1') {
    return
  }

  console.log(`[playwright:${testName}] ${message}`)
}

function summarizeActiveRequests(
  activeRequests: Map<PlaywrightRequest, ActiveRequest>,
  now: number = Date.now()
): string {
  if (activeRequests.size === 0) {
    return 'none'
  }

  const entries = [...activeRequests.values()]
    .sort((left, right) => left.startedAt - right.startedAt)
    .slice(0, 3)
    .map((request) => {
      return `${request.method} ${request.resourceType} ${truncate(request.url, 110)} (${formatDurationMs(now - request.startedAt)})`
    })

  const extraCount = activeRequests.size - entries.length
  return extraCount > 0 ? `${entries.join('; ')}; +${extraCount} more` : entries.join('; ')
}

function getRuntimeStepTimingKey(stepName: string | null | undefined): 'download' | 'transcription' | 'writeAndTts' | 'media' | null {
  const stepKey = getJobProgressTimingKey(stepName)

  switch (stepKey) {
    case 'download':
      return 'download'
    case 'transcription':
      return 'transcription'
    case 'writeAndTts':
    case 'contentSelection':
    case 'llm':
    case 'tts':
      return 'writeAndTts'
    case 'media':
    case 'image':
    case 'music':
    case 'video':
      return 'media'
    default:
      return null
  }
}

function getModelOptionLocator(page: Page, inputName: string, inputValue: string) {
  const input = page.locator(`input[name="${inputName}"][value="${inputValue}"]`)
  return page.locator('label').filter({ has: input }).first()
}

function getCuratedOptionLocator(page: Page, modelInputName: string, inputValue: string) {
  const input = page.locator(`input[name="${modelInputName}-curated-model"][value="${inputValue}"]`)
  return page.locator('label').filter({ has: input }).first()
}

function getOptionCard(page: Page, inputName: string, value: string) {
  const input = page.locator(`input[name="${inputName}"][value="${value}"]`)
  return page.locator('label').filter({ has: input }).first()
}

const WHISPER_SERVICES = new Set(Object.keys(TRANSCRIPTION_CONFIG.whisper))
const DIARIZATION_SERVICES = new Set(Object.keys(TRANSCRIPTION_CONFIG.diarization))

async function selectSpeakerLabelMode(page: Page, service: string): Promise<void> {
  if (WHISPER_SERVICES.has(service)) {
    await getOptionCard(page, 'ui-transcription-speaker-labels', 'without').click({ timeout: 10000 })
    return
  }

  if (DIARIZATION_SERVICES.has(service)) {
    await getOptionCard(page, 'ui-transcription-speaker-labels', 'with').click({ timeout: 10000 })
  }
}

async function ensureModelListVisible(page: Page, modelInputName: string): Promise<void> {
  const modelInputs = page.locator(`input[name="${modelInputName}"]`)
  if (await modelInputs.count() > 0) {
    return
  }

  await getCuratedOptionLocator(page, modelInputName, 'all-models').click({ timeout: 10000 })
  await modelInputs.first().waitFor({ state: 'attached', timeout: 10000 })
}

export async function waitForUrlVerificationUi(
  page: Page,
  expectedErrorText?: string
): Promise<{ bodyText: string, status: UrlVerificationUiState }> {
  await page.waitForFunction((expectedError) => {
    const bodyText = document.body.innerText
    return bodyText.includes('URL Verified')
      || bodyText.includes('Failed to verify URL')
      || (typeof expectedError === 'string' && expectedError.length > 0 && bodyText.includes(expectedError))
  }, expectedErrorText ?? null, { timeout: 30000 })

  const bodyText = await page.locator('body').innerText()
  return {
    bodyText,
    status: bodyText.includes('URL Verified') ? 'verified' : 'error',
  }
}

async function runLoggedStep<T>(
  testName: string,
  label: string,
  page: Page,
  activeRequests: Map<PlaywrightRequest, ActiveRequest>,
  fn: () => Promise<T>
): Promise<T> {
  const startedAt = Date.now()
  logPlaywright(testName, `${label} started`)

  const interval = STEP_HEARTBEAT_MS > 0
    ? setInterval(() => {
        const now = Date.now()
        const currentUrl = page.url() || 'about:blank'
        logPlaywright(
          testName,
          `${label} still waiting after ${formatDurationMs(now - startedAt)}; page=${currentUrl}; active requests: ${summarizeActiveRequests(activeRequests, now)}`
        )
      }, STEP_HEARTBEAT_MS)
    : undefined

  if (interval && typeof interval.unref === 'function') {
    interval.unref()
  }

  try {
    const result = await fn()
    logPlaywright(testName, `${label} completed in ${formatDurationMs(Date.now() - startedAt)}`)
    return result
  } catch (error) {
    logPlaywright(
      testName,
      `${label} failed after ${formatDurationMs(Date.now() - startedAt)}: ${error instanceof Error ? error.message : String(error)}`
    )
    throw error
  } finally {
    if (interval) {
      clearInterval(interval)
    }
  }
}

async function captureFailureArtifacts(
  page: Page,
  testName: string,
  testInfo?: TestInfo
): Promise<void> {
  if (!testInfo) {
    return
  }

  const safeName = testName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const screenshotPath = testInfo.outputPath(`${safeName}-failure.png`)
  const htmlPath = testInfo.outputPath(`${safeName}-failure.html`)

  try {
    await page.screenshot({ path: screenshotPath, fullPage: true })
    logPlaywright(testName, `Failure screenshot written to: ${screenshotPath}`)
  } catch (error) {
    logPlaywright(
      testName,
      `Failed to write failure screenshot: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  try {
    fs.writeFileSync(htmlPath, await page.content())
    logPlaywright(testName, `Failure HTML written to: ${htmlPath}`)
  } catch (error) {
    logPlaywright(
      testName,
      `Failed to write failure HTML: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

export async function runServiceTest(
  page: Page,
  request: APIRequestContext,
  config: TestConfig,
  testInfo?: TestInfo
): Promise<void> {
  const testStartTime = Date.now()
  const pollLogs: string[] = []
  const timestamp = getTimestampPrefix()
  const safeName = config.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const pollLogsPath = resolveTestOutputPath(`${timestamp}-playwright-${safeName}-poll.log`)
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || process.env.BASE_URL || 'http://localhost:3000'
  const activeRequests = new Map<PlaywrightRequest, ActiveRequest>()

  fs.writeFileSync(pollLogsPath, '')
  const pushPollLog = (message: string): void => {
    const line = `[${formatTimestamp()}] ${message}`
    pollLogs.push(line)
    fs.appendFileSync(pollLogsPath, `${line}\n`)
  }

  page.on('request', (browserRequest) => {
    activeRequests.set(browserRequest, {
      method: browserRequest.method(),
      url: browserRequest.url(),
      resourceType: browserRequest.resourceType(),
      startedAt: Date.now(),
    })
  })
  page.on('requestfinished', (browserRequest) => {
    activeRequests.delete(browserRequest)
  })
  page.on('requestfailed', (browserRequest) => {
    const failure = browserRequest.failure()?.errorText || 'unknown error'
    activeRequests.delete(browserRequest)
    logPlaywright(config.name, `request failed: ${browserRequest.method()} ${browserRequest.url()} (${failure})`)
  })
  page.on('response', (response) => {
    if (response.status() >= 400) {
      logPlaywright(
        config.name,
        `HTTP ${response.status()} ${response.request().method()} ${response.url()}`
      )
    }
  })
  page.on('pageerror', (error) => {
    logPlaywright(config.name, `page error: ${error.stack || error.message}`)
  })
  page.on('console', (message) => {
    if (message.type() !== 'warning' && message.type() !== 'error') {
      return
    }

    const location = message.location()
    const locationText = location.url
      ? ` (${location.url}:${location.lineNumber ?? 0}:${location.columnNumber ?? 0})`
      : ''
    logPlaywright(config.name, `browser console ${message.type()}: ${message.text()}${locationText}`)
  })
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) {
      logPlaywright(config.name, `navigated to ${frame.url()}`)
    }
  })

  logPlaywright(config.name, `Starting browser test against ${baseUrl}`)

  try {
    const requestContext = await createPlaywrightRequestContext()
    await page.context().setExtraHTTPHeaders(requestContext.requestHeaders)

    const stepTimings: Record<'download' | 'transcription' | 'writeAndTts' | 'media', TestTiming | null> = {
      download: null,
      transcription: null,
      writeAndTts: null,
      media: null,
    }

    let currentStepKey: keyof typeof stepTimings | null = null
    let currentStepStartTime: number | null = null

    await runLoggedStep(config.name, 'navigate to /create', page, activeRequests, async () => {
      await page.goto('/create')
    })
    await runLoggedStep(config.name, 'wait for create page to become idle', page, activeRequests, async () => {
      await page.waitForLoadState('networkidle')
    })
    await runLoggedStep(config.name, 'wait for create form to render', page, activeRequests, async () => {
      await page.locator('input#url').waitFor({ state: 'visible' })
    })

    const urlFillStart = Date.now()
    await runLoggedStep(config.name, 'fill source URL', page, activeRequests, async () => {
      await page.fill('input#url', config.inputUrl ?? 'https://ajc.pics/audio/fsjam-short.mp3')
    })
    const verifyResponse = await runLoggedStep(config.name, 'submit URL verification', page, activeRequests, async () => {
      const responsePromise = page.waitForResponse((response) => {
        return response.url().includes('/api/download/verify-url') && response.request().method() === 'POST'
      }, { timeout: 30000 })

      await page.click('button:has-text("Verify")')
      return await responsePromise
    })
    const verifyResult = await runLoggedStep(config.name, 'read URL verification response', page, activeRequests, async () => {
      return await verifyResponse.json() as VerifyUrlResponse
    })
    const { bodyText: pageTextAfterVerify, status: verificationStatus } = await runLoggedStep(
      config.name,
      'wait for URL verification UI state',
      page,
      activeRequests,
      async () => waitForUrlVerificationUi(page, verifyResult.error)
    )
    if (verifyResult.error) {
      throw new Error(`URL verification failed: ${verifyResult.error}`)
    }
    if (!verifyResult.urlType || verificationStatus !== 'verified') {
      throw new Error(`URL verification did not update the UI state: ${pageTextAfterVerify}`)
    }
    const urlVerifyTiming: TestTiming = {
      step: 'urlVerify',
      startedAt: urlFillStart,
      completedAt: Date.now(),
      durationMs: Date.now() - urlFillStart,
    }
    pushPollLog(`URL verified (${verifyResult.urlType})`)

    await runLoggedStep(config.name, 'open full wizard for verified source', page, activeRequests, async () => {
      await openFullWizardForConfiguredSource(page, /^Step \d+: Extract Text$/)
    })

    await runLoggedStep(config.name, 'assert transcription picker is present', page, activeRequests, async () => {
      if (WHISPER_SERVICES.has(config.transcription.service) || DIARIZATION_SERVICES.has(config.transcription.service)) {
        await expect(page.locator('input[name="ui-transcription-speaker-labels"][value="without"]')).toHaveCount(1)
        await expect(page.locator('input[name="ui-transcription-speaker-labels"][value="with"]')).toHaveCount(1)
        await expect(page.locator('input[name="ui-transcription-model-curated-model"][value="cheapest"]')).toHaveCount(0)
        return
      }

      await expect(page.locator('input[name="ui-transcription-model-curated-model"][value="cheapest"]')).toHaveCount(1)
    })

    await runLoggedStep(config.name, 'select transcription model', page, activeRequests, async () => {
      await selectSpeakerLabelMode(page, config.transcription.service)
      await ensureModelListVisible(page, 'ui-transcription-model')
      await getModelOptionLocator(
        page,
        'ui-transcription-model',
        `${config.transcription.service}:${config.transcription.model}`
      ).click({ timeout: 10000 })
    })
    pushPollLog(
      `Selected transcription: ${config.transcription.buttonService} - ${config.transcription.buttonTitle}`
    )

    await runLoggedStep(config.name, 'go to write and tts step', page, activeRequests, async () => {
      await clickNextAndExpectStep(page, /^Step \d+: Write and TTS$/)
    })

    await runLoggedStep(config.name, 'enable write mode', page, activeRequests, async () => {
      await ensureOptionSelected(page, 'ui-write-mode', 'write')
    })

    await runLoggedStep(config.name, 'select LLM prompt', page, activeRequests, async () => {
      await ensureOptionSelected(page, 'ui-selected-prompt', 'shortSummary')
      await expect(page.getByRole('button', { name: 'Next' })).toBeEnabled()
    })

    await runLoggedStep(config.name, 'assert llm model picker is present', page, activeRequests, async () => {
      await expect(page.locator('input[name="ui-llm-model-curated-model"][value="all-models"]')).toHaveCount(1)
    })

    await runLoggedStep(config.name, 'select LLM model', page, activeRequests, async () => {
      await ensureModelListVisible(page, 'ui-llm-model')
      await getModelOptionLocator(
        page,
        'ui-llm-model',
        `${config.llm.service}:${config.llm.model}`
      ).click({ timeout: 10000 })
    })
    pushPollLog(`Selected LLM: ${config.llm.buttonTitle}`)

    await runLoggedStep(config.name, 'go to media step', page, activeRequests, async () => {
      await clickNextAndExpectStep(page, /^Step \d+: Image, Video, and Music$/)
      await expect(page.getByRole('button', { name: 'Next' })).toBeEnabled()
    })

    await runLoggedStep(config.name, 'go to review step', page, activeRequests, async () => {
      await clickNextAndExpectStep(page, /^Step \d+: Review$/)
      await expect(page.getByRole('button', { name: 'Generate Show Note' })).toBeEnabled({ timeout: 30000 })
    })

    const submitStart = Date.now()
    await runLoggedStep(config.name, 'submit show note job', page, activeRequests, async () => {
      await page.click('button:has-text("Generate Show Note")')
      await page.waitForURL(/\?job=/)
    })

    const url = new URL(page.url())
    const jobId = url.searchParams.get('job')
    expect(jobId).toBeTruthy()

    const submitTiming: TestTiming = {
      step: 'jobSubmission',
      startedAt: submitStart,
      completedAt: Date.now(),
      durationMs: Date.now() - submitStart,
    }
    pushPollLog(`Job submitted: ${jobId}`)

    let job: Job | null = null
    const pollTimeout = 300_000
    const pollStart = Date.now()
    let lastLogKey = ''
    let lastStatusChangeAt = pollStart
    let lastHeartbeatAt = pollStart

    logPlaywright(config.name, `Polling job status at ${baseUrl}/api/jobs/${jobId}`)

    while (Date.now() - pollStart < pollTimeout) {
      const response = await request.get(`${baseUrl}/api/jobs/${jobId}`, {
        headers: requestContext.requestHeaders,
      })
      expect(response.ok()).toBeTruthy()

      job = await response.json()
      const now = Date.now()
      const logKey = `${job!.status}-${job!.stepName || 'waiting'}-${job!.overallProgress}`

      if (logKey !== lastLogKey) {
        pushPollLog(
          `Job ${jobId}: ${job!.status} - ${job!.stepName || 'waiting'} (${job!.overallProgress}%)`
        )
        lastLogKey = logKey
        lastStatusChangeAt = now
        lastHeartbeatAt = now
      } else if (
        STEP_HEARTBEAT_MS > 0 &&
        now - lastStatusChangeAt >= STEP_HEARTBEAT_MS &&
        now - lastHeartbeatAt >= STEP_HEARTBEAT_MS
      ) {
        pushPollLog(
          `Job ${jobId}: no state change for ${formatDurationMs(now - lastStatusChangeAt)}; still ${job!.status} - ${job!.stepName || 'waiting'} (${job!.overallProgress}%); active requests: ${summarizeActiveRequests(activeRequests, now)}`
        )
        lastHeartbeatAt = now
      }

      const stepKey = getRuntimeStepTimingKey(job!.stepName)

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

    if (!job || job.status !== 'completed') {
      throw new Error(
        `Job polling timed out after ${formatDurationMs(Date.now() - pollStart)}; last known status=${job?.status || 'unknown'} step=${job?.stepName || 'waiting'} progress=${job?.overallProgress ?? 0}%`
      )
    }

    expect(job).toBeTruthy()
    expect(job.status).toBe('completed')
    expect(job!.showNoteId).toBeTruthy()

    const fetchStart = Date.now()
    const showNoteResponse = await runLoggedStep(
      config.name,
      'fetch show note page',
      page,
      activeRequests,
      async () => request.get(`${baseUrl}/show-notes/${job!.showNoteId}`, {
        headers: requestContext.requestHeaders,
      })
    )
    expect(showNoteResponse.ok()).toBeTruthy()
    expect(showNoteResponse.url()).toContain(`/show-notes/${job!.showNoteId}`)
    const showNoteHtml = await runLoggedStep(
      config.name,
      'read show note HTML',
      page,
      activeRequests,
      async () => showNoteResponse.text()
    )
    const fetchTiming: TestTiming = {
      step: 'showNoteFetch',
      startedAt: fetchStart,
      completedAt: Date.now(),
      durationMs: Date.now() - fetchStart,
    }
    pushPollLog(`Show note fetched: ${job!.showNoteId}`)

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
            writeAndTts: stepTimings.writeAndTts,
            media: stepTimings.media,
            showNoteFetch: fetchTiming,
          },
          input: {
            url: config.inputUrl ?? 'https://ajc.pics/audio/fsjam-short.mp3',
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

    const { reportPath, mirroredReportPath } = await writeMirroredBenchmarkReport(
      `${timestamp}-playwright-${safeName}-report.json`,
      report
    )

    logPlaywright(config.name, `Test report written to: ${reportPath}`)
    if (mirroredReportPath !== reportPath) {
      logPlaywright(config.name, `Mirrored test report written to: ${mirroredReportPath}`)
    }
    logPlaywright(config.name, `Poll logs written to: ${pollLogsPath}`)

    await runLoggedStep(config.name, 'return to /create', page, activeRequests, async () => {
      await page.goto('/create')
      await page.waitForLoadState('networkidle')
    })
  } catch (error) {
    logPlaywright(
      config.name,
      `Browser test failed at ${page.url() || 'about:blank'}; active requests: ${summarizeActiveRequests(activeRequests)}`
    )
    await captureFailureArtifacts(page, config.name, testInfo)
    throw error
  }
}

function isDocumentSourcePath(pathLike: string): boolean {
  return /\.(pdf|png|jpe?g|tiff?|txt|docx|pptx|xlsx)$/i.test(pathLike)
}

function isDocumentDefinition(def: TestDefinition): boolean {
  if (def.document) {
    return true
  }

  if (def.input.type === 'local' && def.input.path) {
    return isDocumentSourcePath(def.input.path)
  }

  return def.input.type === 'url' && def.input.urlType === 'document'
}

async function expectStepHeading(page: Page, pattern: RegExp): Promise<void> {
  await expect(page.getByRole('heading', { name: pattern })).toHaveCount(1)
}

export async function openFullWizardForConfiguredSource(page: Page, pattern: RegExp): Promise<void> {
  const targetHeading = page.getByRole('heading', { name: pattern })
  if (await targetHeading.count() > 0) {
    await expect(targetHeading).toHaveCount(1)
    return
  }

  await expectStepHeading(page, /^Step \d+: Choose Target$/)
  const nextButton = page.getByRole('button', { name: 'Next' })
  await expect(nextButton).toBeEnabled({ timeout: 30000 })
  await nextButton.click()
  await expectStepHeading(page, pattern)
}

async function clickNextAndExpectStep(page: Page, pattern: RegExp): Promise<void> {
  await page.getByRole('button', { name: 'Next' }).click()
  await expectStepHeading(page, pattern)
}

async function ensureOptionSelected(
  page: Page,
  inputName: string,
  value: string,
  timeout: number = 10000
): Promise<void> {
  const input = page.locator(`input[name="${inputName}"][value="${value}"]`).first()
  await input.waitFor({ state: 'attached', timeout })

  if (await input.isChecked()) {
    return
  }

  await page.locator('label').filter({ has: input }).first().click({ timeout })
  await expect(input).toBeChecked()
}

async function selectMusicDuration(page: Page, seconds: number): Promise<void> {
  const presetChip = page.locator(`input[name="ui-music-duration"][value="${seconds}"]`).first()
  if (await presetChip.count() > 0) {
    await ensureOptionSelected(page, 'ui-music-duration', String(seconds))
    return
  }

  const numericInput = page.locator('input[type="number"]').first()
  await numericInput.fill(String(seconds))
  await expect(numericInput).toHaveValue(String(seconds))
}

async function configureDefinitionSource(
  page: Page,
  testName: string,
  def: TestDefinition,
  activeRequests: Map<PlaywrightRequest, ActiveRequest>,
  pushPollLog: (message: string) => void
): Promise<TestTiming> {
  const startedAt = Date.now()

  await runLoggedStep(testName, 'navigate to /create', page, activeRequests, async () => {
    await page.goto('/create')
  })
  await runLoggedStep(testName, 'wait for create page to become idle', page, activeRequests, async () => {
    await page.waitForLoadState('networkidle')
  })

  if (def.input.type === 'local' && def.input.path) {
    const localInputPath = def.input.path
    await runLoggedStep(testName, 'upload local input file', page, activeRequests, async () => {
      await page.locator('input#fileUpload').setInputFiles(localInputPath)
    })
    await runLoggedStep(testName, 'open full wizard for uploaded source', page, activeRequests, async () => {
      await openFullWizardForConfiguredSource(page, /^Step \d+: Extract Text$/)
    })
    pushPollLog(`Uploaded local input: ${localInputPath}`)
  } else if (def.input.type === 'url' && def.input.url) {
    await runLoggedStep(testName, 'wait for create form to render', page, activeRequests, async () => {
      await page.locator('input#url').waitFor({ state: 'visible' })
    })
    await runLoggedStep(testName, 'fill source URL', page, activeRequests, async () => {
      await page.fill('input#url', def.input.url!)
    })

    const verifyResponse = await runLoggedStep(testName, 'submit URL verification', page, activeRequests, async () => {
      const responsePromise = page.waitForResponse((response) => {
        return response.url().includes('/api/download/verify-url') && response.request().method() === 'POST'
      }, { timeout: 30000 })

      await page.click('button:has-text("Verify")')
      return await responsePromise
    })
    const verifyResult = await runLoggedStep(testName, 'read URL verification response', page, activeRequests, async () => {
      return await verifyResponse.json() as VerifyUrlResponse
    })
    const { bodyText, status } = await runLoggedStep(
      testName,
      'wait for URL verification UI state',
      page,
      activeRequests,
      async () => waitForUrlVerificationUi(page, verifyResult.error)
    )

    if (verifyResult.error) {
      throw new Error(`URL verification failed: ${verifyResult.error}`)
    }
    if (!verifyResult.urlType || status !== 'verified') {
      throw new Error(`URL verification did not update the UI state: ${bodyText}`)
    }

    await runLoggedStep(testName, 'open full wizard for verified source', page, activeRequests, async () => {
      await openFullWizardForConfiguredSource(page, /^Step \d+: Extract Text$/)
    })
    pushPollLog(`URL verified (${verifyResult.urlType})`)
  } else {
    throw new Error(`Unsupported browser definition input for ${def.id}`)
  }

  return {
    step: 'sourceSetup',
    startedAt,
    completedAt: Date.now(),
    durationMs: Date.now() - startedAt,
  }
}

async function configureDefinitionStep2(
  page: Page,
  testName: string,
  def: TestDefinition,
  activeRequests: Map<PlaywrightRequest, ActiveRequest>,
  pushPollLog: (message: string) => void
): Promise<void> {
  if (isDocumentDefinition(def)) {
    if (!def.document) {
      throw new Error(`Document browser test ${def.id} is missing document service/model config`)
    }

    await runLoggedStep(testName, 'select document extraction model', page, activeRequests, async () => {
      await expectStepHeading(page, /^Step \d+: Extract Text$/)
      await ensureModelListVisible(page, 'ui-document-model')
      await ensureOptionSelected(
        page,
        'ui-document-model',
        `${def.document!.service}:${def.document!.model}`
      )
    })
    pushPollLog(`Selected document model: ${def.document.service}:${def.document.model}`)
    return
  }

  await runLoggedStep(testName, 'select transcription model', page, activeRequests, async () => {
    await expectStepHeading(page, /^Step \d+: Extract Text$/)
    await selectSpeakerLabelMode(page, def.transcription.service)
    await ensureModelListVisible(page, 'ui-transcription-model')
    await ensureOptionSelected(
      page,
      'ui-transcription-model',
      `${def.transcription.service}:${def.transcription.model}`
    )
  })
  pushPollLog(`Selected transcription: ${def.transcription.service}:${def.transcription.model}`)
}

async function configureWriteAndTtsStep(
  page: Page,
  testName: string,
  def: TestDefinition,
  activeRequests: Map<PlaywrightRequest, ActiveRequest>,
  pushPollLog: (message: string) => void
): Promise<void> {
  await runLoggedStep(testName, 'go to write and tts step', page, activeRequests, async () => {
    await clickNextAndExpectStep(page, /^Step \d+: Write and TTS$/)
  })

  const writeMode = def.llm.prompts.length === 0
    ? 'skip'
    : def.tts.enabled
      ? 'write+tts'
      : 'write'

  await runLoggedStep(testName, 'configure write and tts settings', page, activeRequests, async () => {
    await ensureOptionSelected(page, 'ui-write-mode', writeMode)

    if (writeMode === 'skip') {
      await expect(page.getByRole('button', { name: 'Next' })).toBeEnabled()
      return
    }

    for (const promptKey of def.llm.prompts) {
      await ensureOptionSelected(page, 'ui-selected-prompt', promptKey)
    }

    await ensureModelListVisible(page, 'ui-llm-model')
    await ensureOptionSelected(page, 'ui-llm-model', `${def.llm.service}:${def.llm.model}`)

    if (writeMode === 'write+tts' && def.tts.service && def.tts.model) {
      await ensureModelListVisible(page, 'ui-tts-model')
      await ensureOptionSelected(page, 'ui-tts-model', `${def.tts.service}:${def.tts.model}`)
      if (def.tts.voice) {
        await ensureOptionSelected(page, 'ui-tts-voice', def.tts.voice)
      }
    }

    await expect(page.getByRole('button', { name: 'Next' })).toBeEnabled()
  })

  pushPollLog(`Write mode: ${writeMode}`)
  if (def.llm.prompts.length > 0) {
    pushPollLog(`Selected prompts: ${def.llm.prompts.join(', ')}`)
    pushPollLog(`Selected LLM: ${def.llm.service}:${def.llm.model}`)
  }
  if (writeMode === 'write+tts' && def.tts.service && def.tts.model) {
    pushPollLog(`Selected TTS: ${def.tts.service}:${def.tts.model}${def.tts.voice ? ` (${def.tts.voice})` : ''}`)
  }
}

async function configureMediaStep(
  page: Page,
  testName: string,
  def: TestDefinition,
  activeRequests: Map<PlaywrightRequest, ActiveRequest>,
  pushPollLog: (message: string) => void
): Promise<void> {
  await runLoggedStep(testName, 'go to media step', page, activeRequests, async () => {
    await clickNextAndExpectStep(page, /^Step \d+: Image, Video, and Music$/)
  })

  await runLoggedStep(testName, 'configure media settings', page, activeRequests, async () => {
    if (def.image.enabled) {
      await ensureOptionSelected(page, 'ui-media-toggle', 'image')
      await ensureModelListVisible(page, 'ui-image-model')
      await ensureOptionSelected(page, 'ui-image-model', `${def.image.service}:${def.image.model}`)
      if (def.image.aspectRatio) {
        await ensureOptionSelected(page, 'ui-image-dimension', def.image.aspectRatio)
      }

      const imagePrompt = def.image.prompts?.[0]
      if (!imagePrompt) {
        throw new Error(`Image browser test ${def.id} is missing an image prompt`)
      }
      await ensureOptionSelected(page, 'ui-image-prompt', imagePrompt)
    }

    if (def.video.enabled) {
      await ensureOptionSelected(page, 'ui-media-toggle', 'video')
      await ensureModelListVisible(page, 'ui-video-model')
      await ensureOptionSelected(page, 'ui-video-model', `${def.video.service}:${def.video.model}`)
      if (def.video.size) {
        await ensureOptionSelected(page, 'ui-video-size', def.video.size)
      }
      if (def.video.duration) {
        await ensureOptionSelected(page, 'ui-video-duration', String(def.video.duration))
      }
      if (def.video.aspectRatio) {
        const ratioInput = page.locator(`input[name="ui-video-aspect-ratio"][value="${def.video.aspectRatio}"]`).first()
        if (await ratioInput.count() > 0) {
          await ensureOptionSelected(page, 'ui-video-aspect-ratio', def.video.aspectRatio)
        }
      }

      const videoPrompt = def.video.prompts?.[0]
      if (!videoPrompt) {
        throw new Error(`Video browser test ${def.id} is missing a video prompt`)
      }
      await ensureOptionSelected(page, 'ui-video-prompt', videoPrompt)
    }

    if (def.music.enabled) {
      await ensureOptionSelected(page, 'ui-media-toggle', 'music')
      await ensureModelListVisible(page, 'ui-music-model')
      await ensureOptionSelected(page, 'ui-music-model', `${def.music.service}:${def.music.model}`)
      if (def.music.genre) {
        await ensureOptionSelected(page, 'ui-music-genre', def.music.genre)
      }
      if (def.music.preset) {
        await ensureOptionSelected(page, 'ui-music-preset', def.music.preset)
      }
      if (def.music.durationSeconds) {
        await selectMusicDuration(page, def.music.durationSeconds)
      }

      const instrumentalCheckbox = page.getByLabel(/Instrumental only \(skip lyric generation\)/)
      if (def.music.instrumental && !(await instrumentalCheckbox.isChecked())) {
        await instrumentalCheckbox.check()
      }
      if (def.music.instrumental === false && await instrumentalCheckbox.isChecked()) {
        await instrumentalCheckbox.uncheck()
      }

      if (def.music.service === 'minimax' && (def.music.sampleRate || def.music.bitrate)) {
        await page.locator('details summary').filter({ hasText: 'Advanced MiniMax Audio Settings' }).click()
      }
      if (def.music.service === 'minimax' && def.music.sampleRate) {
        await ensureOptionSelected(page, 'ui-music-sample-rate', String(def.music.sampleRate))
      }
      if (def.music.service === 'minimax' && def.music.bitrate) {
        await ensureOptionSelected(page, 'ui-music-bitrate', String(def.music.bitrate))
      }
    }

    await expect(page.getByRole('button', { name: 'Next' })).toBeEnabled()
  })

  const enabledMedia = [
    def.image.enabled ? 'image' : null,
    def.video.enabled ? 'video' : null,
    def.music.enabled ? 'music' : null,
  ].filter(Boolean)
  pushPollLog(`Enabled media: ${enabledMedia.join(', ') || 'none'}`)
  if (def.image.enabled) {
    pushPollLog(`Selected image: ${def.image.service}:${def.image.model}`)
  }
  if (def.video.enabled) {
    pushPollLog(`Selected video: ${def.video.service}:${def.video.model}`)
  }
  if (def.music.enabled) {
    pushPollLog(`Selected music: ${def.music.service}:${def.music.model}`)
  }
}

export async function runDefinitionTest(
  page: Page,
  request: APIRequestContext,
  def: TestDefinition,
  definitionPath?: string,
  testInfo?: TestInfo
): Promise<void> {
  const testName = def.id
  const testStartTime = Date.now()
  const pollLogs: string[] = []
  const timestamp = getTimestampPrefix()
  const safeName = testName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const pollLogsPath = resolveTestOutputPath(`${timestamp}-playwright-${safeName}-poll.log`)
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || process.env.BASE_URL || 'http://localhost:3000'
  const activeRequests = new Map<PlaywrightRequest, ActiveRequest>()

  fs.writeFileSync(pollLogsPath, '')
  const pushPollLog = (message: string): void => {
    const line = `[${formatTimestamp()}] ${message}`
    pollLogs.push(line)
    fs.appendFileSync(pollLogsPath, `${line}\n`)
  }

  page.on('request', (browserRequest) => {
    activeRequests.set(browserRequest, {
      method: browserRequest.method(),
      url: browserRequest.url(),
      resourceType: browserRequest.resourceType(),
      startedAt: Date.now(),
    })
  })
  page.on('requestfinished', (browserRequest) => {
    activeRequests.delete(browserRequest)
  })
  page.on('requestfailed', (browserRequest) => {
    const failure = browserRequest.failure()?.errorText || 'unknown error'
    activeRequests.delete(browserRequest)
    logPlaywright(testName, `request failed: ${browserRequest.method()} ${browserRequest.url()} (${failure})`)
  })
  page.on('response', (response) => {
    if (response.status() >= 400) {
      logPlaywright(
        testName,
        `HTTP ${response.status()} ${response.request().method()} ${response.url()}`
      )
    }
  })
  page.on('pageerror', (error) => {
    logPlaywright(testName, `page error: ${error.stack || error.message}`)
  })
  page.on('console', (message) => {
    if (message.type() !== 'warning' && message.type() !== 'error') {
      return
    }

    const location = message.location()
    const locationText = location.url
      ? ` (${location.url}:${location.lineNumber ?? 0}:${location.columnNumber ?? 0})`
      : ''
    logPlaywright(testName, `browser console ${message.type()}: ${message.text()}${locationText}`)
  })
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) {
      logPlaywright(testName, `navigated to ${frame.url()}`)
    }
  })

  logPlaywright(testName, `Starting browser definition test against ${baseUrl}`)

  try {
    const requestContext = await createPlaywrightRequestContext()
    await page.context().setExtraHTTPHeaders(requestContext.requestHeaders)

    const stepTimings: Record<'download' | 'transcription' | 'writeAndTts' | 'media', TestTiming | null> = {
      download: null,
      transcription: null,
      writeAndTts: null,
      media: null,
    }

    let currentStepKey: keyof typeof stepTimings | null = null
    let currentStepStartTime: number | null = null

    const sourceSetupTiming = await configureDefinitionSource(page, testName, def, activeRequests, pushPollLog)
    await configureDefinitionStep2(page, testName, def, activeRequests, pushPollLog)
    await configureWriteAndTtsStep(page, testName, def, activeRequests, pushPollLog)
    await configureMediaStep(page, testName, def, activeRequests, pushPollLog)

    await runLoggedStep(testName, 'go to review step', page, activeRequests, async () => {
      await clickNextAndExpectStep(page, /^Step \d+: Review$/)
      await expect(page.getByRole('button', { name: 'Generate Show Note' })).toBeEnabled({ timeout: 30000 })
    })

    const submitStart = Date.now()
    await runLoggedStep(testName, 'submit show note job', page, activeRequests, async () => {
      await page.click('button:has-text("Generate Show Note")')
      await page.waitForURL(/\?job=/)
    })

    const pageUrl = new URL(page.url())
    const jobId = pageUrl.searchParams.get('job')
    expect(jobId).toBeTruthy()

    const submitTiming: TestTiming = {
      step: 'jobSubmission',
      startedAt: submitStart,
      completedAt: Date.now(),
      durationMs: Date.now() - submitStart,
    }
    pushPollLog(`Job submitted: ${jobId}`)

    let job: Job | null = null
    const pollTimeout = 300_000
    const pollStart = Date.now()
    let lastLogKey = ''
    let lastStatusChangeAt = pollStart
    let lastHeartbeatAt = pollStart

    while (Date.now() - pollStart < pollTimeout) {
      const response = await request.get(`${baseUrl}/api/jobs/${jobId}`, {
        headers: requestContext.requestHeaders,
      })
      expect(response.ok()).toBeTruthy()

      job = await response.json()
      const now = Date.now()
      const logKey = `${job!.status}-${job!.stepName || 'waiting'}-${job!.overallProgress}`

      if (logKey !== lastLogKey) {
        pushPollLog(`Job ${jobId}: ${job!.status} - ${job!.stepName || 'waiting'} (${job!.overallProgress}%)`)
        lastLogKey = logKey
        lastStatusChangeAt = now
        lastHeartbeatAt = now
      } else if (
        STEP_HEARTBEAT_MS > 0 &&
        now - lastStatusChangeAt >= STEP_HEARTBEAT_MS &&
        now - lastHeartbeatAt >= STEP_HEARTBEAT_MS
      ) {
        pushPollLog(
          `Job ${jobId}: no state change for ${formatDurationMs(now - lastStatusChangeAt)}; still ${job!.status} - ${job!.stepName || 'waiting'} (${job!.overallProgress}%); active requests: ${summarizeActiveRequests(activeRequests, now)}`
        )
        lastHeartbeatAt = now
      }

      const stepKey = getRuntimeStepTimingKey(job!.stepName)
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

    if (!job || job.status !== 'completed') {
      throw new Error(
        `Job polling timed out after ${formatDurationMs(Date.now() - pollStart)}; last known status=${job?.status || 'unknown'} step=${job?.stepName || 'waiting'} progress=${job?.overallProgress ?? 0}%`
      )
    }

    expect(job.showNoteId).toBeTruthy()

    const fetchStart = Date.now()
    const showNoteResponse = await runLoggedStep(
      testName,
      'fetch show note page',
      page,
      activeRequests,
      async () => request.get(`${baseUrl}/show-notes/${job!.showNoteId}`, {
        headers: requestContext.requestHeaders,
      })
    )
    expect(showNoteResponse.ok()).toBeTruthy()
    expect(showNoteResponse.url()).toContain(`/show-notes/${job!.showNoteId}`)
    const showNoteHtml = await runLoggedStep(
      testName,
      'read show note HTML',
      page,
      activeRequests,
      async () => showNoteResponse.text()
    )
    expect(showNoteHtml).toContain(job!.showNoteId!)
    expect(showNoteHtml.length).toBeGreaterThan(1000)

    const fetchTiming: TestTiming = {
      step: 'showNoteFetch',
      startedAt: fetchStart,
      completedAt: Date.now(),
      durationMs: Date.now() - fetchStart,
    }
    pushPollLog(`Show note fetched: ${job!.showNoteId}`)

    const testEndTime = Date.now()
    const report = {
      reportGeneratedAt: new Date().toISOString(),
      environment: {
        platform: process.platform,
        nodeVersion: process.version,
        testRunner: 'playwright',
        browserE2EMode: process.env.AUTOSHOW_PLAYWRIGHT_E2E_MODE ?? null,
      },
      summary: {
        totalTests: 1,
        passed: 1,
        failed: 0,
        totalDurationMs: testEndTime - testStartTime,
      },
      tests: [
        {
          testName,
          status: 'passed',
          definitionPath: definitionPath ?? null,
          timestamps: {
            testStartedAt: new Date(testStartTime).toISOString(),
            testCompletedAt: new Date(testEndTime).toISOString(),
            totalDurationMs: testEndTime - testStartTime,
          },
          timings: {
            sourceSetup: sourceSetupTiming,
            jobSubmission: submitTiming,
            download: stepTimings.download,
            transcription: stepTimings.transcription,
            writeAndTts: stepTimings.writeAndTts,
            media: stepTimings.media,
            showNoteFetch: fetchTiming,
          },
          input: {
            type: def.input.type,
            source: def.input.type === 'local' ? def.input.path : def.input.url,
            urlType: def.input.type === 'url' ? def.input.urlType : null,
            transcriptionService: def.transcription.service,
            transcriptionModel: def.transcription.model,
            llmService: def.llm.service,
            llmModel: def.llm.model,
            selectedPrompts: def.llm.prompts,
            ttsEnabled: def.tts.enabled,
            ttsService: def.tts.service ?? null,
            ttsModel: def.tts.model ?? null,
            imageGenEnabled: def.image.enabled,
            selectedImagePrompts: def.image.prompts ?? [],
            musicGenEnabled: def.music.enabled,
            videoGenEnabled: def.video.enabled,
            selectedVideoPrompts: def.video.prompts ?? [],
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

    const { reportPath, mirroredReportPath } = await writeMirroredBenchmarkReport(
      `${timestamp}-playwright-${safeName}-report.json`,
      report
    )

    logPlaywright(testName, `Test report written to: ${reportPath}`)
    if (mirroredReportPath !== reportPath) {
      logPlaywright(testName, `Mirrored test report written to: ${mirroredReportPath}`)
    }
    logPlaywright(testName, `Poll logs written to: ${pollLogsPath}`)
  } catch (error) {
    logPlaywright(
      testName,
      `Browser definition test failed at ${page.url() || 'about:blank'}; active requests: ${summarizeActiveRequests(activeRequests)}`
    )
    await captureFailureArtifacts(page, testName, testInfo)
    throw error
  }
}
