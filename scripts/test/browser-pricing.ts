import { isAbsolute, normalize, relative } from "node:path"
import type { ProcessingOptions, TestDefinition } from "~/types"
import { estimateTotalCost } from "~/utils/cost/cost-estimation"
import { renderTwoColumnBoxTable, writeStdout } from "../utils/terminal-output"
import { ALL_BROWSER_SERVICE_CASES, type BrowserServiceCase } from "../../tests/playwright/browser-test-cases"
import { KNOWN_DURATIONS_SEC, findKnownInputSize } from "./harness/input-fixtures"

const MAX_NAME_COL_WIDTH = 72
const DIRECT_FILE_EXTENSION_REGEX = /\.(aac|flac|m4a|mkv|mov|mp3|mp4|mpga|ogg|wav|webm)$/i

export interface BrowserPricedTestEntry {
  title: string
  usd: number | null
  warnings: string[]
}

export interface BrowserSuitePriceResult {
  perTest: BrowserPricedTestEntry[]
  totalUsd: number
}

function normalizeCliPath(pathLike: string): string {
  const relativePath = isAbsolute(pathLike) ? relative(process.cwd(), pathLike) : pathLike
  return normalize(relativePath).replace(/\\/g, "/").replace(/^\.\//, "")
}

function inferBrowserUrlType(url: string): "direct-file" | "streaming" {
  try {
    const pathname = new URL(url).pathname
    return DIRECT_FILE_EXTENSION_REGEX.test(pathname) ? "direct-file" : "streaming"
  } catch {
    return DIRECT_FILE_EXTENSION_REGEX.test(url) ? "direct-file" : "streaming"
  }
}

function inferBrowserUrlDuration(url: string): { value: number | null; warning: string | null } {
  const urlType = inferBrowserUrlType(url)
  const definition = {
    input: {
      type: "url",
      url,
      urlType,
    },
    tags: [],
  } as unknown as TestDefinition

  const { value, source } = findKnownInputSize(definition, KNOWN_DURATIONS_SEC)

  if (!source) {
    return {
      value: null,
      warning: "No input path or URL found on browser test",
    }
  }

  if (value !== null) {
    return { value, warning: null }
  }

  return {
    value: null,
    warning: `Unknown input "${source}": duration not recognized, using 30 min estimator default`,
  }
}

function buildBrowserProcessingOptions(browserCase: BrowserServiceCase): {
  options: ProcessingOptions
  warnings: string[]
} {
  const warnings: string[] = []
  const url = browserCase.inputUrl ?? "https://ajc.pics/audio/fsjam-short.mp3"
  const urlType = inferBrowserUrlType(url)
  const { value: urlDuration, warning } = inferBrowserUrlDuration(url)

  if (warning) {
    warnings.push(warning)
  }

  return {
    options: {
      url,
      llmEnabled: true,
      llmService: browserCase.llm.service as ProcessingOptions["llmService"],
      llmModel: browserCase.llm.model,
      outputDir: "",
      transcriptionService: browserCase.transcription.service as ProcessingOptions["transcriptionService"],
      transcriptionModel: browserCase.transcription.model,
      selectedPrompts: ["shortSummary"],
      urlType,
      ...(urlDuration !== null ? { urlDuration } : {}),
      useResilientDownload: urlType === "direct-file",
      inputType: "audio-video",
      ttsEnabled: false,
      imageGenEnabled: false,
      musicGenEnabled: false,
      videoGenEnabled: false,
      disableDocumentCache: false,
    },
    warnings,
  }
}

function estimateBrowserTestPrice(browserCase: BrowserServiceCase): BrowserPricedTestEntry {
  try {
    const { options, warnings } = buildBrowserProcessingOptions(browserCase)
    return {
      title: browserCase.title,
      usd: estimateTotalCost(options),
      warnings,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      title: browserCase.title,
      usd: null,
      warnings: [`Pricing error: ${message}`],
    }
  }
}

function resolveBrowserCases(
  browserPaths: string[],
  grep?: string
): BrowserServiceCase[] {
  const knownSpecPaths = new Set(ALL_BROWSER_SERVICE_CASES.map((browserCase) => browserCase.specPath))
  const normalizedBrowserPaths = [...new Set(browserPaths.map((pathLike) => normalizeCliPath(pathLike)))]
  const unsupportedPaths = normalizedBrowserPaths.filter((pathLike) => !knownSpecPaths.has(pathLike))

  if (unsupportedPaths.length > 0) {
    throw new Error(
      `--test-price for browser only supports shared service specs: ${unsupportedPaths.join(", ")}`
    )
  }

  let selectedCases = normalizedBrowserPaths.length === 0
    ? ALL_BROWSER_SERVICE_CASES
    : ALL_BROWSER_SERVICE_CASES.filter((browserCase) => normalizedBrowserPaths.includes(browserCase.specPath))

  if (!grep) {
    return selectedCases
  }

  let pattern: RegExp
  try {
    pattern = new RegExp(grep)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Invalid --grep pattern: ${message}`)
  }

  selectedCases = selectedCases.filter((browserCase) => pattern.test(browserCase.title))
  return selectedCases
}

function sumUsd(entries: BrowserPricedTestEntry[]): number {
  return entries.reduce((sum, entry) => sum + (entry.usd ?? 0), 0)
}

export function estimateBrowserSuitePrice(
  browserPaths: string[],
  grep?: string
): BrowserSuitePriceResult {
  const perTest = resolveBrowserCases(browserPaths, grep).map((browserCase) =>
    estimateBrowserTestPrice(browserCase)
  )

  return {
    perTest,
    totalUsd: sumUsd(perTest),
  }
}

export function printBrowserPricingTable(result: BrowserSuitePriceResult): void {
  const { perTest, totalUsd } = result
  const count = perTest.length
  const totalUsdStr = `$${totalUsd.toFixed(4)}`
  writeStdout(renderTwoColumnBoxTable({
    header: `Browser Test Price Estimate (${count} test${count === 1 ? "" : "s"})`,
    rows: perTest.map(({ title, usd, warnings }) => ({
      left: title,
      right: usd !== null ? `$${usd.toFixed(4)}` : "unknown",
      notes: warnings,
    })),
    emptyMessage: "No browser tests selected",
    totalRight: totalUsdStr,
    maxLeftWidth: MAX_NAME_COL_WIDTH,
  }))
}
