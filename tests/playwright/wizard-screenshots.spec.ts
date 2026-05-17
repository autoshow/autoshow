import { expect, test, type Page } from "@playwright/test"
import * as fs from "fs"
import { basename, join } from "path"
import {
  openFullWizardForConfiguredSource,
  waitForUrlVerificationUi,
  getTimestampPrefix,
} from "./utils/test-utils"
import { PLAYWRIGHT_OUTPUT_ROOT } from "~/utils/artifact-paths"

const AUDIO_URL = "https://ajc.pics/audio/fsjam-short.mp3"
const WIZARD_SCREENSHOT_RUNS_TO_KEEP = 2
const WIZARD_SCREENSHOT_RUN_NAME_PATTERN = /^\d{4}-\d{2}-\d{2}-\d{4}(?:-\d+)?$/

const VIEWPORTS = {
  desktop: { width: 1280, height: 900 },
  ipad: { width: 820, height: 1180 },
  iphone: { width: 390, height: 844 },
} as const

const screenshotRoot = join(PLAYWRIGHT_OUTPUT_ROOT, "wizard-screenshots")
let screenshotDir: string | null = null

test.describe.configure({ mode: "serial" })
test.setTimeout(60_000)

test.beforeAll(() => {
  screenshotDir = createWizardScreenshotRunDir()
  pruneWizardScreenshotRuns(screenshotDir)
})

type WizardScreenshotTarget = {
  step: number
  order: number
  slug: string
}

function isFileExistsError(error: unknown): boolean {
  return typeof error === "object"
    && error !== null
    && "code" in error
    && (error as { code?: unknown }).code === "EEXIST"
}

function createWizardScreenshotRunDir(): string {
  fs.mkdirSync(screenshotRoot, { recursive: true })

  const timestamp = getTimestampPrefix()

  for (let attempt = 1; ; attempt += 1) {
    const runName = attempt === 1
      ? timestamp
      : `${timestamp}-${String(attempt).padStart(2, "0")}`
    const runDir = join(screenshotRoot, runName)

    try {
      fs.mkdirSync(runDir)
      return runDir
    } catch (error) {
      if (isFileExistsError(error)) {
        continue
      }

      throw error
    }
  }
}

function getWizardScreenshotRunNames(): string[] {
  if (!fs.existsSync(screenshotRoot)) {
    return []
  }

  return fs.readdirSync(screenshotRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && WIZARD_SCREENSHOT_RUN_NAME_PATTERN.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
}

function pruneWizardScreenshotRuns(currentRunDir: string): void {
  const currentRunName = basename(currentRunDir)
  const oldRunNames = getWizardScreenshotRunNames().filter((runName) => runName !== currentRunName)
  const oldRunsToKeep = Math.max(0, WIZARD_SCREENSHOT_RUNS_TO_KEEP - 1)
  const runNamesToDelete = oldRunNames.slice(0, Math.max(0, oldRunNames.length - oldRunsToKeep))

  for (const runName of runNamesToDelete) {
    fs.rmSync(join(screenshotRoot, runName), { recursive: true, force: true })
  }
}

function getScreenshotDir(): string {
  if (!screenshotDir) {
    throw new Error("Wizard screenshot run directory was not initialized")
  }

  return screenshotDir
}

function getOptionCard(page: Page, inputName: string, value: string) {
  const input = page.locator(`input[name="${inputName}"][value="${value}"]`)
  return page.locator("label").filter({ has: input }).first()
}

function getFirstOptionCard(page: Page, inputName: string) {
  const input = page.locator(`input[name="${inputName}"]`).first()
  return page.locator("label").filter({ has: input }).first()
}

async function captureWizardScreenshot(
  page: Page,
  target: WizardScreenshotTarget,
  viewportName: string
): Promise<void> {
  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }))
  await page.waitForFunction(() => window.scrollX === 0 && window.scrollY === 0)
  await page.waitForTimeout(100)

  const stepDir = join(getScreenshotDir(), `step-${target.step}`)
  const orderPrefix = String(target.order).padStart(2, "0")
  fs.mkdirSync(stepDir, { recursive: true })

  await page.screenshot({
    path: join(stepDir, `${orderPrefix}-${target.slug}-${viewportName}.png`),
    fullPage: true,
  })
}

for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
  test(`wizard screenshots at ${viewportName} (${viewport.width}x${viewport.height})`, async ({ page }) => {
    await page.setViewportSize(viewport)

    // Navigate to create page
    await page.goto("/create")
    await page.waitForLoadState("networkidle")
    await expect(page.locator("input#url")).toBeVisible({ timeout: 10_000 })

    // Fill and verify URL
    await page.fill("input#url", AUDIO_URL)
    const verifyResponsePromise = page.waitForResponse(
      (r) => r.url().includes("/api/download/verify-url") && r.request().method() === "POST",
      { timeout: 30000 }
    )
    await page.click('button:has-text("Verify")')
    const verifyResponse = await verifyResponsePromise
    const verifyResult = await verifyResponse.json() as { error?: string }
    expect(verifyResult.error).toBeFalsy()

    const { status } = await waitForUrlVerificationUi(page, verifyResult.error)
    expect(status).toBe("verified")

    // Step 1: Source (with verified URL)
    await captureWizardScreenshot(page, { step: 1, order: 1, slug: "source" }, viewportName)

    // Advance to Step 2 via the enabled Step 1 Next button
    await openFullWizardForConfiguredSource(
      page,
      /^Step \d+: Extract Text$/
    )

    // Step 2: Source Config (default state before speaker label selection)
    await captureWizardScreenshot(page, { step: 2, order: 1, slug: "source-config" }, viewportName)

    // Step 2: With Speaker Labels
    await getOptionCard(page, "ui-transcription-speaker-labels", "with").click()
    await expect(page.locator('input[name="ui-transcription-model-curated-model"][value="cheapest"]')).toHaveCount(1)
    await captureWizardScreenshot(page, { step: 2, order: 2, slug: "with-speaker-labels" }, viewportName)

    // Step 2: With Speaker Labels, all available models
    await getOptionCard(page, "ui-transcription-model-curated-model", "all-models").click()
    await expect.poll(async () => page.locator('input[name="ui-transcription-model"]').count())
      .toBeGreaterThan(0)
    await captureWizardScreenshot(page, { step: 2, order: 3, slug: "with-speaker-labels-all-models" }, viewportName)

    // Select a diarization model to enable Next
    await getOptionCard(page, "ui-transcription-model", "soniox:stt-async-v4").click()
    await expect(page.getByRole("button", { name: "Next" })).toBeEnabled()

    // Step 3: Write and TTS
    await page.getByRole("button", { name: "Next" }).click()
    await expect(
      page.getByRole("heading", { name: /^Step \d+: Write and TTS$/ })
    ).toHaveCount(1)

    await captureWizardScreenshot(page, { step: 3, order: 1, slug: "write-and-tts" }, viewportName)

    // Step 3: Select LLM, then show prompt selection
    await getOptionCard(page, "ui-write-mode", "llm").click()
    await expect(page.getByRole("button", { name: "Next" })).toBeEnabled()
    await page.getByRole("button", { name: "Next" }).click()
    await expect(page.locator('input[name="ui-selected-prompt"][value="shortSummary"]')).toHaveCount(1)
    await captureWizardScreenshot(page, { step: 3, order: 2, slug: "llm-prompts" }, viewportName)

    // Step 3: Select a prompt, then show available LLM model choices
    await getOptionCard(page, "ui-selected-prompt", "shortSummary").click()
    await expect(page.getByRole("button", { name: "Next" })).toBeEnabled()
    await page.getByRole("button", { name: "Next" }).click()
    await expect(page.locator('input[name="ui-llm-model-curated-model"][value="cheapest"]')).toHaveCount(1)
    await captureWizardScreenshot(page, { step: 3, order: 3, slug: "llm-models" }, viewportName)

    // Step 3: All available LLM models
    await getOptionCard(page, "ui-llm-model-curated-model", "all-models").click()
    await expect.poll(async () => page.locator('input[name="ui-llm-model"]').count())
      .toBeGreaterThan(0)
    await captureWizardScreenshot(page, { step: 3, order: 4, slug: "llm-all-models" }, viewportName)

    // Select an LLM model, then skip TTS to enable the next wizard step
    await getOptionCard(page, "ui-llm-model", "openai:gpt-5.4-mini").click()
    await expect(page.getByRole("button", { name: "Next" })).toBeEnabled()
    await page.getByRole("button", { name: "Next" }).click()
    await expect(page.locator('input[name="ui-tts-decision"][value="skip"]')).toHaveCount(1)
    await getOptionCard(page, "ui-tts-decision", "skip").click()
    await expect(page.getByRole("button", { name: "Next" })).toBeEnabled()

    // Step 4: Media
    await page.getByRole("button", { name: "Next" }).click()
    await expect(
      page.getByRole("heading", { name: /^Step \d+: Image, Video, and Music$/ })
    ).toHaveCount(1)

    await captureWizardScreenshot(page, { step: 4, order: 1, slug: "media" }, viewportName)

    // Enable all media types, then capture each media configuration sub-step
    await getOptionCard(page, "ui-media-toggle", "image").click()
    await getOptionCard(page, "ui-media-toggle", "video").click()
    await getOptionCard(page, "ui-media-toggle", "music").click()
    await expect(page.getByRole("button", { name: "Next" })).toBeEnabled()
    await page.getByRole("button", { name: "Next" }).click()

    await expect(page.locator('input[name="ui-image-model-curated-model"][value="fastest"]')).toHaveCount(1)
    await captureWizardScreenshot(page, { step: 4, order: 2, slug: "image-config" }, viewportName)
    await getOptionCard(page, "ui-image-model-curated-model", "all-models").click()
    await getOptionCard(page, "ui-image-model", "openai:gpt-image-1.5").click()
    await getOptionCard(page, "ui-image-dimension", "1024x1024").click()
    await getOptionCard(page, "ui-image-prompt", "keyMoment").click()
    await expect(page.getByRole("button", { name: "Next" })).toBeEnabled()
    await page.getByRole("button", { name: "Next" }).click()

    await expect(page.locator('input[name="ui-video-model-curated-model"][value="fastest"]')).toHaveCount(1)
    await captureWizardScreenshot(page, { step: 4, order: 3, slug: "video-config" }, viewportName)
    await getOptionCard(page, "ui-video-model-curated-model", "all-models").click()
    await getOptionCard(page, "ui-video-model", "runway:gen4.5").click()
    await getOptionCard(page, "ui-video-size", "1280x720").click()
    await getOptionCard(page, "ui-video-duration", "4").click()
    await getOptionCard(page, "ui-video-prompt", "explainer").click()
    await expect(page.getByRole("button", { name: "Next" })).toBeEnabled()
    await page.getByRole("button", { name: "Next" }).click()

    await expect(page.locator('input[name="ui-music-model-curated-model"][value="fastest"]')).toHaveCount(1)
    await captureWizardScreenshot(page, { step: 4, order: 4, slug: "music-config" }, viewportName)
    await getOptionCard(page, "ui-music-model-curated-model", "fastest").click()
    await getFirstOptionCard(page, "ui-music-genre").click()
    await getOptionCard(page, "ui-music-preset", "cheap").click()
    await getOptionCard(page, "ui-music-duration", "60").click()
    await expect(page.getByRole("button", { name: "Next" })).toBeEnabled()

    // Step 5: Review
    await page.getByRole("button", { name: "Next" }).click()
    await expect(
      page.getByRole("heading", { name: /^Step \d+: Review$/ })
    ).toHaveCount(1)

    // Wait for preview to load (enables the submit button)
    await expect(
      page.getByRole("button", { name: "Generate Show Note" })
    ).toBeEnabled({ timeout: 30000 })

    await captureWizardScreenshot(page, { step: 5, order: 1, slug: "review" }, viewportName)
  })
}
