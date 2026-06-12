import { expect, test, type Page } from "@playwright/test"
import { DOCUMENT_CONFIG, getAvailableDocumentModels } from "~/models"
import type { CuratedModelCandidate } from "~/routes/create/StepsComponents/shared/curated-models"
import {
  buildCandidateKey,
  estimateDocumentModelCostScore,
  getCuratedModelChoices,
  getDocumentModelQuality
} from "~/routes/create/StepsComponents/shared/curated-models"
import { openFullWizardForConfiguredSource, waitForUrlVerificationUi } from "./utils/test-utils"

const STEP_2_AUDIO_URL = "https://ajc.pics/audio/fsjam-short.mp3"
const DESKTOP_VIEWPORT = { width: 1280, height: 900 }
const NARROW_VIEWPORT = { width: 390, height: 844 }

function getOptionCard(page: Page, inputName: string, value: string) {
  const input = page.locator(`input[name="${inputName}"][value="${value}"]`)
  return page.locator("label").filter({ has: input }).first()
}

function getFirstOptionCard(page: Page, inputName: string) {
  const input = page.locator(`input[name="${inputName}"]`).first()
  return page.locator("label").filter({ has: input }).first()
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function getFieldsetByLegend(page: Page, legendText: string) {
  const legendMatcher = new RegExp(`^${escapeRegExp(legendText)}$`)
  return page.locator("fieldset").filter({
    has: page.locator("legend").filter({ hasText: legendMatcher })
  }).first()
}

async function expectLegendToClearFieldsetBorder(page: Page, legendText: string): Promise<void> {
  const fieldset = getFieldsetByLegend(page, legendText)
  await expect(fieldset).toBeVisible()

  const layout = await fieldset.evaluate((node) => {
    const legend = node.querySelector("legend")
    const firstContent = legend?.nextElementSibling

    if (!(legend instanceof HTMLElement)) {
      return null
    }

    const fieldsetRect = node.getBoundingClientRect()
    const legendRect = legend.getBoundingClientRect()
    const firstContentRect = firstContent instanceof HTMLElement
      ? firstContent.getBoundingClientRect()
      : null

    return {
      fieldsetDisplay: getComputedStyle(node).display,
      legendDisplay: getComputedStyle(legend).display,
      legendBackgroundColor: getComputedStyle(legend).backgroundColor,
      legendPaddingInlineStart: getComputedStyle(legend).paddingInlineStart,
      gapBelowLegend: firstContentRect ? firstContentRect.top - legendRect.bottom : null,
      legendLeft: legendRect.left,
      legendRight: legendRect.right,
      legendWidth: legendRect.width,
      fieldsetLeft: fieldsetRect.left,
      fieldsetRight: fieldsetRect.right,
      fieldsetWidth: fieldsetRect.width
    }
  })

  expect(layout).not.toBeNull()
  expect(layout!.fieldsetDisplay).toBe("block")
  expect(layout!.legendDisplay).not.toBe("inline")
  expect(layout!.legendBackgroundColor).not.toBe("rgba(0, 0, 0, 0)")
  expect(layout!.legendPaddingInlineStart).not.toBe("0px")
  expect(layout!.gapBelowLegend).not.toBeNull()
  expect(layout!.gapBelowLegend!).toBeGreaterThan(0)
  expect(layout!.legendLeft).toBeGreaterThanOrEqual(layout!.fieldsetLeft)
  expect(layout!.legendRight).toBeLessThanOrEqual(layout!.fieldsetRight)
  expect(layout!.legendWidth).toBeLessThanOrEqual(layout!.fieldsetWidth)
}

async function openTranscriptionStep2(
  page: Page
): Promise<{ verifyResult: { urlType?: string, error?: string }, bodyText: string }> {
  await page.goto("/create")
  await page.waitForLoadState("networkidle")
  await page.locator("input#url").waitFor({ state: "visible" })

  await page.fill("input#url", STEP_2_AUDIO_URL)
  const verifyResponsePromise = page.waitForResponse((response) => {
    return response.url().includes("/api/download/verify-url") && response.request().method() === "POST"
  }, { timeout: 30000 })
  await page.click('button:has-text("Verify")')
  const verifyResponse = await verifyResponsePromise
  const verifyResult = await verifyResponse.json() as { urlType?: string, error?: string }

  expect(verifyResult.error).toBeFalsy()
  const { bodyText, status } = await waitForUrlVerificationUi(page, verifyResult.error)
  expect(status).toBe("verified")
  expect(verifyResult.urlType).toBeTruthy()
  await openFullWizardForConfiguredSource(page, /^Step \d+: Extract Text$/)

  return { verifyResult, bodyText }
}

async function openDocumentStep2(page: Page): Promise<void> {
  await page.goto("/create")
  await page.waitForLoadState("networkidle")
  await page.locator("input#fileUpload").setInputFiles("scripts/test/fixtures/input/1.pdf")

  await openFullWizardForConfiguredSource(page, /^Step \d+: Extract Text$/)
}

function buildPdfDocumentCandidates(): CuratedModelCandidate[] {
  return Object.entries(DOCUMENT_CONFIG).flatMap(([serviceId, serviceConfig]) => {
    const modelIds = getAvailableDocumentModels(serviceId as keyof typeof DOCUMENT_CONFIG, "pdf")

    return modelIds.flatMap((modelId) => {
      const model = serviceConfig.models.find(candidate => candidate.id === modelId)
      if (!model) return []

      return [{
        key: buildCandidateKey(serviceId, model.id),
        serviceId,
        serviceName: serviceConfig.name,
        modelId: model.id,
        modelName: model.name,
        description: model.description,
        speedProfile: model.speedProfile,
        quality: getDocumentModelQuality(serviceId as keyof typeof DOCUMENT_CONFIG, model.id),
        costScore: estimateDocumentModelCostScore(serviceId as keyof typeof DOCUMENT_CONFIG, model.id, "pdf")
      } satisfies CuratedModelCandidate]
    })
  })
}

const PDF_DOCUMENT_CANDIDATES = buildPdfDocumentCandidates()
const PDF_DOCUMENT_CHOICES = getCuratedModelChoices(PDF_DOCUMENT_CANDIDATES, "document")
const PDF_EXPANDED_SELECTION = PDF_DOCUMENT_CANDIDATES
  .find(candidate => candidate.key !== PDF_DOCUMENT_CHOICES.fastest.key)

function getDocumentSelectionKey(page: Page): Promise<string> {
  return Promise.all([
    page.locator('input[name="documentService"]').inputValue(),
    page.locator('input[name="documentModel"]').inputValue()
  ]).then(([service, model]) => `${service}:${model}`)
}

test("upload examples cover supported formats below the file input", async ({ page }) => {
  const removedFormatSummary = /^Supports audio \(MP3, WAV, M4A, FLAC, OGG, AAC, WMA, MPEG\/MPGA\), video \(MP4, MOV, AVI, MKV, WEBM, WMV, FLV, M4V\), documents \(PDF, DOCX, PPTX, XLSX, TXT\), and images \(PNG, JPG\/JPEG, TIFF\/TIF\)\.$/
  const uploadExamples = [
    {
      name: "podcast-episode.mp3",
      formats: "MP3, WAV, M4A, FLAC, OGG, AAC, WMA, MPEG/MPGA"
    },
    {
      name: "meeting-recording.mp4",
      formats: "MP4, MOV, AVI, MKV, WEBM, WMV, FLV, M4V"
    },
    {
      name: "research-paper.pdf",
      formats: "PDF, DOCX, PPTX, XLSX, TXT document"
    },
    {
      name: "screenshot.png",
      formats: "PNG, JPG/JPEG, TIFF/TIF image"
    }
  ] as const

  for (const viewport of [DESKTOP_VIEWPORT, NARROW_VIEWPORT]) {
    await page.setViewportSize(viewport)
    await page.goto("/create")
    await page.waitForLoadState("networkidle")

    const fileInput = page.locator("input#fileUpload")

    await expect(page.getByText("Start with a URL or upload a file.")).toHaveCount(1)
    await expect(page.getByText("Use a URL", { exact: true })).toHaveCount(1)
    await expect(page.getByText("Upload a file", { exact: true })).toHaveCount(1)
    await expect(page.getByRole("button", { name: "Next" })).toBeDisabled()
    await expect(fileInput).toBeVisible()
    await expect(page.getByText(removedFormatSummary)).toHaveCount(0)

    const inputBox = await fileInput.boundingBox()

    expect(inputBox).not.toBeNull()

    for (const { name, formats } of uploadExamples) {
      const exampleRow = page.locator("li").filter({ hasText: name })
      await expect(exampleRow).toHaveCount(1)
      await expect(exampleRow).toContainText(formats)
      await expect(exampleRow).toBeVisible()

      const exampleBox = await exampleRow.boundingBox()
      expect(exampleBox).not.toBeNull()
      expect(exampleBox!.y).toBeGreaterThanOrEqual(inputBox!.y + inputBox!.height - 1)
    }
  }
})

test("step 2 legends clear the fieldset border for transcription and document flows", async ({ page }) => {
  for (const viewport of [DESKTOP_VIEWPORT, NARROW_VIEWPORT]) {
    await page.setViewportSize(viewport)

    await openTranscriptionStep2(page)
    await expectLegendToClearFieldsetBorder(page, "Speaker Labels")

    await getOptionCard(page, "ui-transcription-speaker-labels", "without").click()
    await expectLegendToClearFieldsetBorder(page, "Without Speaker Labels")

    await openDocumentStep2(page)
    await expectLegendToClearFieldsetBorder(page, "Select Document Extraction Model")
  }
})

test("step 2 top wizard label uses Run for transcription and document flows", async ({ page }) => {
  await openTranscriptionStep2(page)
  await expect(page.locator('li[aria-current="step"]')).toContainText("Run")

  await openDocumentStep2(page)
  await expect(page.locator('li[aria-current="step"]')).toContainText("Run")
})

test("shows curated model pickers for optional outputs", async ({ page }) => {
  const { verifyResult, bodyText } = await openTranscriptionStep2(page)
  const nextButton = page.getByRole("button", { name: "Next" })

  await expect(page.locator('input[name="ui-transcription-speaker-labels"][value="without"]')).not.toBeChecked()
  await expect(page.locator('input[name="ui-transcription-speaker-labels"][value="with"]')).not.toBeChecked()
  await expect(page.locator('input[name="ui-transcription-model-curated-model"][value="cheapest"]')).toHaveCount(0)
  await expect(nextButton).toBeDisabled()

  await getOptionCard(page, "ui-transcription-speaker-labels", "without").click()
  await expect(page.locator('input[name="ui-transcription-model-curated-model"][value="cheapest"]')).toHaveCount(1)
  await expect(nextButton).toBeDisabled()
  await getOptionCard(page, "ui-transcription-model-curated-model", "cheapest").click()
  await expect(nextButton).toBeEnabled()

  await nextButton.click()
  await expect(page.getByRole("heading", { name: "Step 3: Write and TTS" })).toHaveCount(1)
  await expect(page.locator('input[name="ui-write-mode"][value="skip"]')).not.toBeChecked()
  await expect(nextButton).toBeDisabled()
  await getOptionCard(page, "ui-write-mode", "skip").click()
  await expect(nextButton).toBeEnabled()
  await expect(page.getByText("Writing is skipped for this run")).toHaveCount(0)

  await getOptionCard(page, "ui-write-mode", "llm").click()
  await expect(nextButton).toBeEnabled()
  await nextButton.click()
  await expect(nextButton).toBeDisabled()
  await getOptionCard(page, "ui-selected-prompt", "shortSummary").click()
  await expect(nextButton).toBeEnabled()
  await expect(page.locator('input[name="ui-selected-prompt"][value="shortSummary"]')).toBeChecked()
  await nextButton.click()

  await expect(page.locator('input[name="ui-llm-model-curated-model"][value="cheapest"]')).toHaveCount(1)
  await getOptionCard(page, "ui-llm-model-curated-model", "cheapest").click()
  await expect(nextButton).toBeEnabled()
  await nextButton.click()

  await expect(page.locator('input[name="ui-tts-decision"][value="pick"]')).toHaveCount(1)
  await expect(nextButton).toBeDisabled()
  await getOptionCard(page, "ui-tts-decision", "pick").click()
  await expect(nextButton).toBeEnabled()
  await nextButton.click()

  await expect(page.locator('input[name="ui-tts-model-curated-model"][value="all-models"]')).toHaveCount(1)
  await getOptionCard(page, "ui-tts-model-curated-model", "all-models").click()
  const openAiTtsCard = getOptionCard(page, "ui-tts-model", "openai:gpt-4o-mini-tts")
  await expect(openAiTtsCard).toContainText("0.23¢")
  await openAiTtsCard.click()
  await expect(nextButton).toBeDisabled()
  await getOptionCard(page, "ui-tts-voice", "coral").click()
  await expect(nextButton).toBeEnabled()

  await nextButton.click()
  await expect(page.getByRole("heading", { name: "Step 4: Image, Video, and Music" })).toHaveCount(1)
  await expect(nextButton).toBeDisabled()
  await getOptionCard(page, "ui-media-decision", "skip").click()
  await expect(nextButton).toBeEnabled()
  await expect(page.getByText("Media is skipped for this run")).toHaveCount(0)
  await getOptionCard(page, "ui-media-toggle", "image").click()
  await getOptionCard(page, "ui-media-toggle", "video").click()
  await getOptionCard(page, "ui-media-toggle", "music").click()
  await expect(nextButton).toBeEnabled()
  await nextButton.click()

  await expect(page.locator('input[name="ui-image-model-curated-model"][value="fastest"]')).toHaveCount(1)
  await expect(nextButton).toBeDisabled()
  await getOptionCard(page, "ui-image-model-curated-model", "all-models").click()
  const openAiImageCard = getOptionCard(page, "ui-image-model", "openai:gpt-image-1.5")
  await openAiImageCard.click()
  const openAiImageBeforeDimensionChange = await openAiImageCard.textContent()
  await expect(openAiImageCard).toContainText("¢")
  await getOptionCard(page, "ui-image-dimension", "1536x1024").click()
  await getOptionCard(page, "ui-image-prompt", "keyMoment").click()
  await expect(openAiImageCard).toContainText("¢")
  await expect.poll(async () => await openAiImageCard.textContent()).not.toBe(openAiImageBeforeDimensionChange)
  await expect(nextButton).toBeEnabled()
  await nextButton.click()

  await expect(page.locator('input[name="ui-video-model-curated-model"][value="all-models"]')).toHaveCount(1)
  await expect(nextButton).toBeDisabled()
  await getOptionCard(page, "ui-video-model-curated-model", "all-models").click()
  const runwayCard = getOptionCard(page, "ui-video-model", "runway:gen4.5")
  await runwayCard.click()
  const runwayBeforeDurationChange = await runwayCard.textContent()
  await getOptionCard(page, "ui-video-size", "1280x720").click()
  await getOptionCard(page, "ui-video-duration", "4").click()
  await getOptionCard(page, "ui-video-prompt", "explainer").click()
  await expect(runwayCard).toContainText("¢")
  await expect.poll(async () => await runwayCard.textContent()).not.toBe(runwayBeforeDurationChange)
  await expect(nextButton).toBeEnabled()
  await nextButton.click()

  await expect(page.locator('input[name="ui-music-model-curated-model"][value="highestQuality"]')).toHaveCount(1)
  await expect(nextButton).toBeDisabled()
  await getOptionCard(page, "ui-music-model-curated-model", "all-models").click()
  const deapiMusicCard = getOptionCard(page, "ui-music-model", "deapi:AceStep_1_5_Turbo")
  await deapiMusicCard.click()
  await getFirstOptionCard(page, "ui-music-genre").click()
  await getOptionCard(page, "ui-music-preset", "balanced").click()
  await page.getByLabel("Instrumental only (skip lyric generation)").check()
  const deapiMusicBeforeDurationChange = await deapiMusicCard.textContent()
  await expect(deapiMusicCard).toContainText("¢")
  await getOptionCard(page, "ui-music-duration", "120").click()
  await expect(deapiMusicCard).toContainText("¢")
  await expect.poll(async () => await deapiMusicCard.textContent()).not.toBe(deapiMusicBeforeDurationChange)
  await expect(nextButton).toBeEnabled()

  await nextButton.click()
  await expect(page.getByRole("heading", { name: "Step 5: Review" })).toHaveCount(1)

  expect(verifyResult.urlType).toBeTruthy()
  expect(bodyText).toContain("Step 1: Choose Target")
})

test("llm model selection persists when prompts change", async ({ page }) => {
  await openTranscriptionStep2(page)

  await getOptionCard(page, "ui-transcription-speaker-labels", "without").click()
  await getOptionCard(page, "ui-transcription-model-curated-model", "cheapest").click()
  await page.getByRole("button", { name: "Next" }).click()
  await expect(page.getByRole("heading", { name: "Step 3: Write and TTS" })).toHaveCount(1)

  await getOptionCard(page, "ui-write-mode", "write").click()
  await getOptionCard(page, "ui-selected-prompt", "shortSummary").click()

  await getOptionCard(page, "ui-llm-model-curated-model", "all-models").click()
  await getOptionCard(page, "ui-llm-model", "openai:gpt-5.4-mini").click()

  await getOptionCard(page, "ui-selected-prompt", "longSummary").click()

  await expect(page.locator('input[name="ui-selected-prompt"][value="shortSummary"]')).toBeChecked()
  await expect(page.locator('input[name="ui-selected-prompt"][value="longSummary"]')).toBeChecked()
  await expect(page.locator('input[name="llmService"]')).toHaveValue("openai")
  await expect(page.locator('input[name="llmModel"]')).toHaveValue("gpt-5.4-mini")
})

test("document model picker selections persist for curated and expanded choices", async ({ page }) => {
  await openDocumentStep2(page)

  await getOptionCard(page, "ui-document-model-curated-model", "fastest").click()
  await expect.poll(() => getDocumentSelectionKey(page)).toBe(PDF_DOCUMENT_CHOICES.fastest.key)
  await expect(page.locator('input[name="ui-document-model-curated-model"][value="fastest"]')).toBeChecked()

  await getOptionCard(page, "ui-document-model-curated-model", "all-models").click()
  await expect(page.locator('input[name="ui-document-model"]')).toHaveCount(PDF_DOCUMENT_CANDIDATES.length)

  expect(PDF_EXPANDED_SELECTION).toBeDefined()
  await getOptionCard(page, "ui-document-model", PDF_EXPANDED_SELECTION!.key).click()
  await expect.poll(() => getDocumentSelectionKey(page)).toBe(PDF_EXPANDED_SELECTION!.key)
  await expect(page.locator(`input[name="ui-document-model"][value="${PDF_EXPANDED_SELECTION!.key}"]`)).toBeChecked()
})

test("reset source returns to step 1 with a clean input state", async ({ page }) => {
  await openTranscriptionStep2(page)

  await page.getByRole("button", { name: "Reset", exact: true }).click()

  await expect(page.getByRole("heading", { name: "Step 1: Choose Target" })).toHaveCount(1)
  await expect(page.locator("input#url")).toHaveValue("")
  await expect(page.getByText(/URL Verified/)).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Next" })).toBeDisabled()
})
