import { describe, test, expect, beforeAll, afterAll } from "bun:test"
import type { TestDefinition, ServerInfo } from "./test-types"
import type { ShowNote } from "~/types"
import { uploadTestFile, submitProcessingJob, pollJobUntilComplete } from "./test-runner/api"
import { buildFormDataFromDefinition } from "./test-runner/form-builder"
import { POLL_TIMEOUT, getTimestampPrefix } from "./test-runner/constants"
import { setupTestServer, stopServer, waitForServerReady } from "./test-runner/container"
import { PROMPT_CONFIG } from "~/prompts/text-prompts/text-prompt-config"

const CHEAPEST_MODELS = {
  groq: { service: "groq", model: "openai/gpt-oss-20b", costInput: 0.075, costOutput: 0.3 },
  grok: { service: "grok", model: "grok-4-1-fast-non-reasoning", costInput: 0.2, costOutput: 0.5 },
  gemini: { service: "gemini", model: "gemini-3-flash-preview", costInput: 0.5, costOutput: 3 },
  claude: { service: "claude", model: "claude-haiku-4-5-20251001", costInput: 1, costOutput: 5 },
  minimax: { service: "minimax", model: "MiniMax-M2.1", costInput: 0.3, costOutput: 1.2 },
  openai: { service: "openai", model: "gpt-5.1", costInput: 1.25, costOutput: 10 }
} as const

const ALL_PROMPTS = Object.keys(PROMPT_CONFIG)

interface PromptBenchmarkResult {
  service: string
  model: string
  prompt: string
  status: "passed" | "failed"
  error?: string
  inputTokens: number
  outputTokens: number
  costUSD: number
  executionTimeMs: number
  outputLength: number
  timestamp: string
}

interface BenchmarkReport {
  generatedAt: string
  testInputFile: string
  transcriptionService: string
  transcriptionModel: string
  totalTests: number
  passed: number
  failed: number
  totalCostUSD: number
  totalExecutionTimeMs: number
  results: PromptBenchmarkResult[]
}

function generateTestDefinition(
  service: string,
  model: string,
  prompt: string
): TestDefinition {
  return {
    id: `prompt-benchmark-${service}-${prompt}`,
    name: `Prompt Benchmark: ${service} ${model} - ${prompt}`,
    description: `Benchmark ${prompt} prompt with ${service} ${model}`,
    tags: ["prompt-benchmark", service, prompt],
    input: {
      type: "local",
      path: "tests/test-input-files/1.mp3"
    },
    transcription: {
      service: "groq",
      model: "whisper-large-v3-turbo"
    },
    llm: {
      service,
      model,
      prompts: [prompt]
    },
    tts: { enabled: false },
    image: { enabled: false },
    music: { enabled: false },
    video: { enabled: false }
  }
}

function calculateCost(
  service: keyof typeof CHEAPEST_MODELS,
  inputTokens: number,
  outputTokens: number
): number {
  const config = CHEAPEST_MODELS[service]
  return (inputTokens * config.costInput + outputTokens * config.costOutput) / 1_000_000
}

async function fetchShowNoteData(
  baseUrl: string,
  showNoteId: string
): Promise<ShowNote | null> {
  const response = await fetch(`${baseUrl}/api/db`)
  if (!response.ok) {
    throw new Error(`Failed to fetch database: ${response.status}`)
  }
  const data = await response.json() as { showNotes: ShowNote[] }
  return data.showNotes.find(note => note.id === showNoteId) || null
}

async function runSingleBenchmark(
  def: TestDefinition,
  baseUrl: string,
  serviceConfig: typeof CHEAPEST_MODELS[keyof typeof CHEAPEST_MODELS]
): Promise<PromptBenchmarkResult> {
  const startTime = Date.now()
  const prompt = def.llm.prompts[0]!

  try {
    const formData = buildFormDataFromDefinition(def)

    if (def.input.type === "local" && def.input.path) {
      const upload = await uploadTestFile(baseUrl, def.input.path)
      formData.append("uploadedFilePath", upload.filePath)
      formData.append("uploadedFileName", upload.fileName)
    }

    const jobId = await submitProcessingJob(baseUrl, formData)
    const { job } = await pollJobUntilComplete(baseUrl, jobId, POLL_TIMEOUT)

    if (job.status !== "completed" || !job.showNoteId) {
      throw new Error(job.error || "Job did not complete successfully")
    }

    const showNote = await fetchShowNoteData(baseUrl, job.showNoteId)
    if (!showNote) {
      throw new Error("Show note not found in database")
    }

    const inputTokens = Number(showNote.llm_input_token_count ?? 0)
    const outputTokens = Number(showNote.llm_output_token_count ?? 0)
    const llmTime = Number(showNote.llm_processing_time ?? 0)
    const outputLength = showNote.text_output?.length ?? 0

    return {
      service: serviceConfig.service,
      model: serviceConfig.model,
      prompt,
      status: "passed",
      inputTokens,
      outputTokens,
      costUSD: calculateCost(serviceConfig.service as keyof typeof CHEAPEST_MODELS, inputTokens, outputTokens),
      executionTimeMs: llmTime,
      outputLength,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    return {
      service: serviceConfig.service,
      model: serviceConfig.model,
      prompt,
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
      inputTokens: 0,
      outputTokens: 0,
      costUSD: 0,
      executionTimeMs: Date.now() - startTime,
      outputLength: 0,
      timestamp: new Date().toISOString()
    }
  }
}

async function writeBenchmarkReport(report: BenchmarkReport): Promise<string> {
  const timestamp = getTimestampPrefix()
  const reportPath = `logs/${timestamp}-prompt-benchmark-report.json`
  await Bun.write(reportPath, JSON.stringify(report, null, 2))
  return reportPath
}

function printSummaryTable(results: PromptBenchmarkResult[]): void {
  console.log("\n" + "=".repeat(120))
  console.log("PROMPT BENCHMARK RESULTS")
  console.log("=".repeat(120))

  const header = [
    "Service".padEnd(10),
    "Model".padEnd(30),
    "Prompt".padEnd(18),
    "Status".padEnd(8),
    "In Tok".padStart(8),
    "Out Tok".padStart(8),
    "Cost ($)".padStart(10),
    "Time (ms)".padStart(10)
  ].join(" | ")

  console.log(header)
  console.log("-".repeat(120))

  for (const r of results) {
    const row = [
      r.service.padEnd(10),
      r.model.slice(0, 28).padEnd(30),
      r.prompt.padEnd(18),
      r.status.padEnd(8),
      r.inputTokens.toString().padStart(8),
      r.outputTokens.toString().padStart(8),
      r.costUSD.toFixed(6).padStart(10),
      r.executionTimeMs.toString().padStart(10)
    ].join(" | ")
    console.log(row)
  }

  console.log("=".repeat(120))

  const totalCost = results.reduce((sum, r) => sum + r.costUSD, 0)
  const totalTime = results.reduce((sum, r) => sum + r.executionTimeMs, 0)
  const passed = results.filter(r => r.status === "passed").length

  console.log(`Total: ${results.length} tests | Passed: ${passed} | Failed: ${results.length - passed}`)
  console.log(`Total Cost: $${totalCost.toFixed(6)} | Total LLM Time: ${totalTime}ms`)
  console.log("=".repeat(120) + "\n")
}

describe("Prompt Benchmark Suite", () => {
  let serverInfo: ServerInfo
  let baseUrl: string
  const results: PromptBenchmarkResult[] = []

  beforeAll(async () => {
    console.log("Starting server for prompt benchmark...")

    serverInfo = await setupTestServer()
    baseUrl = `http://localhost:${serverInfo.port}`

    const ready = await waitForServerReady(baseUrl, 120)
    if (!ready) {
      throw new Error("Server failed to become ready")
    }

    console.log(`Server ready at ${baseUrl}`)
  }, 600000)

  afterAll(async () => {
    printSummaryTable(results)

    const report: BenchmarkReport = {
      generatedAt: new Date().toISOString(),
      testInputFile: "tests/test-input-files/1.mp3",
      transcriptionService: "groq",
      transcriptionModel: "whisper-large-v3-turbo",
      totalTests: results.length,
      passed: results.filter(r => r.status === "passed").length,
      failed: results.filter(r => r.status === "failed").length,
      totalCostUSD: results.reduce((sum, r) => sum + r.costUSD, 0),
      totalExecutionTimeMs: results.reduce((sum, r) => sum + r.executionTimeMs, 0),
      results
    }

    const reportPath = await writeBenchmarkReport(report)
    console.log(`Benchmark report written to: ${reportPath}`)

    if (serverInfo) {
      await stopServer(serverInfo)
    }
  }, 30000)

  for (const [serviceName, serviceConfig] of Object.entries(CHEAPEST_MODELS)) {
    describe(`${serviceName} - ${serviceConfig.model}`, () => {
      for (const prompt of ALL_PROMPTS) {
        test(
          `${prompt}`,
          async () => {
            const def = generateTestDefinition(
              serviceConfig.service,
              serviceConfig.model,
              prompt
            )

            const result = await runSingleBenchmark(def, baseUrl, serviceConfig)
            results.push(result)

            if (result.status === "failed") {
              console.log(`  FAILED: ${serviceName}/${prompt} - ${result.error}`)
            } else {
              console.log(`  PASSED: ${serviceName}/${prompt} - ${result.inputTokens} in / ${result.outputTokens} out / $${result.costUSD.toFixed(6)} / ${result.executionTimeMs}ms`)
            }

            expect(result.status).toBe("passed")
          },
          300000
        )
      }
    })
  }
})
