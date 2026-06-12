import { existsSync, mkdirSync } from "node:fs"
import { writeFile } from "node:fs/promises"
import { basename, isAbsolute, join, normalize, resolve, sep } from "node:path"
import { LOGS_ROOT } from "~/utils/artifact-paths"

interface MirroredBenchmarkReportWriteResult {
  reportPath: string
  mirroredReportPath: string
}

function ensureDirectory(path: string): string {
  const dir = resolve(path)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return dir
}

function getTestOutputDir(): string {
  return process.env.TEST_RUN_OUTPUT_DIR || LOGS_ROOT
}

function ensureTestOutputDir(): string {
  return ensureDirectory(getTestOutputDir())
}

function getBenchmarkResultsDir(): string {
  return resolve(process.cwd(), "project", "reports", "results")
}

function ensureBenchmarkResultsDir(resultsDir: string = getBenchmarkResultsDir()): string {
  return ensureDirectory(resultsDir)
}

export function resolveTestOutputPath(fileName: string): string {
  if (isAbsolute(fileName)) {
    return fileName
  }

  const normalizedFileName = normalize(fileName)
  const normalizedOutputDir = normalize(getTestOutputDir())
  if (
    normalizedFileName === normalizedOutputDir ||
    normalizedFileName.startsWith(`${normalizedOutputDir}${sep}`)
  ) {
    return resolve(normalizedFileName)
  }

  return join(ensureTestOutputDir(), normalizedFileName)
}

function resolveBenchmarkResultsPath(
  fileName: string,
  resultsDir: string = getBenchmarkResultsDir()
): string {
  return join(ensureBenchmarkResultsDir(resultsDir), basename(normalize(fileName)))
}

export async function writeMirroredBenchmarkReport(
  fileName: string,
  report: unknown,
  options?: {
    resultsDir?: string
  }
): Promise<MirroredBenchmarkReportWriteResult> {
  const reportPath = resolveTestOutputPath(fileName)
  const mirroredReportPath = resolveBenchmarkResultsPath(fileName, options?.resultsDir)
  const serializedReport = JSON.stringify(report, null, 2)

  await writeFile(reportPath, serializedReport, "utf8")
  if (mirroredReportPath !== reportPath) {
    await writeFile(mirroredReportPath, serializedReport, "utf8")
  }

  return {
    reportPath,
    mirroredReportPath,
  }
}
