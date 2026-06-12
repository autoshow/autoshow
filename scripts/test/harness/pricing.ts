import type { ResolvedUploadSource, TestDefinition } from "~/types"
import { statSync } from "node:fs"
import { estimateTotalCost } from "~/utils/cost/cost-estimation"
import { buildProcessingOptions, parseProcessingFormData } from "~/routes/api/process/form-helpers"
import { joinOutputBlocks, renderTwoColumnBoxTable, writeStdout } from "../../utils/terminal-output"
import { buildFormDataFromDefinition } from "./definitions"
import { KNOWN_DURATIONS_SEC, KNOWN_PAGE_COUNTS, findKnownInputSize } from "./input-fixtures"

const MAX_NAME_COL_WIDTH = 50
const TEST_UPLOAD_ID = "upload-pricing-fixture"

function buildResolvedUpload(def: TestDefinition): ResolvedUploadSource | undefined {
  if (def.input.type !== "local" || !def.input.path) {
    return undefined
  }

  const localFileSize = (() => {
    try {
      return statSync(def.input.path).size
    } catch {
      return 0
    }
  })()

  return {
    uploadId: TEST_UPLOAD_ID,
    localFilePath: def.input.path,
    localFileName: def.input.path.split("/").pop() || "test-input",
    localFileSize,
  }
}

function inferInputSize(
  def: TestDefinition,
  isDocument: boolean,
): { value: number | null; warning: string | null } {
  const lookup = isDocument ? KNOWN_PAGE_COUNTS : KNOWN_DURATIONS_SEC
  const { value, matchedKey, source } = findKnownInputSize(def, lookup)
  const src = matchedKey ?? source
  if (!src) {
    return { value: null, warning: "No input path or URL found on definition" }
  }

  if (value !== null) {
    return { value, warning: null }
  }

  const label = isDocument ? "page count" : "duration"
  const fallback = isDocument ? "1 page" : "30 min estimator default"
  return {
    value: null,
    warning: `Unknown input "${src}": ${label} not recognized, using ${fallback}`,
  }
}

interface TestPriceResult {
  usd: number | null
  warnings: string[]
}

interface PricedTestEntry {
  def: TestDefinition
  usd: number | null
  warnings: string[]
}

type BudgetSkipReason = "above-budget" | "unknown-price"

interface BudgetSkippedTestEntry extends PricedTestEntry {
  reason: BudgetSkipReason
}

interface SuitePriceResult {
  perTest: PricedTestEntry[]
  totalUsd: number
  budgetCenticents?: number
  skipped?: BudgetSkippedTestEntry[]
}

interface SuitePriceOptions {
  budgetCenticents?: number
}

function buildPricingFormData(
  def: TestDefinition,
  warnings: string[],
): FormData {
  const formData = buildFormDataFromDefinition(def)

  if (def.input.type === "local" && def.input.path) {
    formData.append("uploadId", TEST_UPLOAD_ID)
  } else if (def.input.type === "url" && def.input.url) {
    formData.append("url", def.input.url)
    formData.append("urlType", def.input.urlType || "direct-file")
  } else {
    warnings.push("No input path or URL found on definition")
    return formData
  }

  const isDocument = !!def.document
  const { value, warning } = inferInputSize(def, isDocument)
  if (warning) {
    warnings.push(warning)
  }

  if (value !== null) {
    formData.append(isDocument ? "documentPageCount" : "urlDuration", String(value))
  }

  return formData
}

export function estimateTestDefinitionPrice(def: TestDefinition): TestPriceResult {
  const warnings: string[] = []

  try {
    const formData = buildPricingFormData(def, warnings)
    const parsed = parseProcessingFormData(formData)
    if (!parsed.success) {
      throw new Error("Invalid processing form data generated from test definition")
    }

    const resolvedUpload = buildResolvedUpload(def)
    const processingOptions = buildProcessingOptions(parsed.output, resolvedUpload)
    const usd = estimateTotalCost(processingOptions)

    return { usd, warnings }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    warnings.push(`Pricing error: ${msg}`)
    return { usd: null, warnings }
  }
}

function priceTestDefinitions(defs: TestDefinition[]): PricedTestEntry[] {
  return defs.map((def) => {
    const { usd, warnings } = estimateTestDefinitionPrice(def)
    return { def, usd, warnings }
  })
}

function sumUsd(entries: Array<{ usd: number | null }>): number {
  return entries.reduce((sum, entry) => sum + (entry.usd ?? 0), 0)
}

function formatBudgetUsd(budgetCenticents: number): string {
  return `$${(budgetCenticents / 10_000).toFixed(4)}`
}

export function estimateTestSuitePrice(
  defs: TestDefinition[],
  options: SuitePriceOptions = {}
): SuitePriceResult {
  const pricedTests = priceTestDefinitions(defs)
  const { budgetCenticents } = options

  if (budgetCenticents === undefined) {
    return {
      perTest: pricedTests,
      totalUsd: sumUsd(pricedTests),
    }
  }

  const budgetUsd = budgetCenticents / 10_000
  const perTest: PricedTestEntry[] = []
  const skipped: BudgetSkippedTestEntry[] = []

  for (const entry of pricedTests) {
    if (entry.usd === null) {
      skipped.push({ ...entry, reason: "unknown-price" })
      continue
    }
    if (entry.usd > budgetUsd) {
      skipped.push({ ...entry, reason: "above-budget" })
      continue
    }
    perTest.push(entry)
  }

  const totalUsd = perTest.reduce((sum, t) => sum + (t.usd ?? 0), 0)

  return {
    perTest,
    totalUsd,
    budgetCenticents,
    skipped,
  }
}

export function getBudgetSummary(result: SuitePriceResult): string | null {
  if (result.budgetCenticents === undefined) {
    return null
  }

  const skipped = result.skipped ?? []
  const unknownPriceCount = skipped.filter(entry => entry.reason === "unknown-price").length
  const keptLabel = `${result.perTest.length} test${result.perTest.length === 1 ? "" : "s"}`
  const skippedLabel = `${skipped.length} test${skipped.length === 1 ? "" : "s"}`

  let summary = `Budget filter: <= ${formatBudgetUsd(result.budgetCenticents)} per test. Kept ${keptLabel}, skipped ${skippedLabel}.`
  if (unknownPriceCount > 0) {
    summary += ` ${unknownPriceCount} skipped due to unknown price.`
  }

  return summary
}

function renderPricingTable(result: SuitePriceResult): string {
  const { perTest, totalUsd } = result
  const count = perTest.length
  const totalUsdStr = `$${totalUsd.toFixed(4)}`
  const budgetSummary = getBudgetSummary(result)

  return joinOutputBlocks([
    budgetSummary,
    renderTwoColumnBoxTable({
      header: `Test Price Estimate (${count} test${count === 1 ? "" : "s"})`,
      rows: perTest.map(({ def, usd, warnings }) => ({
        left: def.name,
        right: usd !== null ? `$${usd.toFixed(4)}` : "unknown",
        notes: warnings,
      })),
      emptyMessage: result.budgetCenticents === undefined
        ? "No test definitions selected"
        : "No test definitions within budget",
      totalRight: totalUsdStr,
      maxLeftWidth: MAX_NAME_COL_WIDTH,
      notePrefix: "  ⚠ ",
    }),
  ], "\n")
}

export function printPricingTable(result: SuitePriceResult): void {
  writeStdout(renderPricingTable(result))
}
