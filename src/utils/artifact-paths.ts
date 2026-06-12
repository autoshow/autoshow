import { join,posix,resolve } from "node:path"

const ARTIFACTS_ROOT = "artifacts"
export const LOGS_ROOT = join(ARTIFACTS_ROOT, "logs")
const OUTPUT_ROOT = join(ARTIFACTS_ROOT, "output")
const TEST_RESULTS_ROOT = join(ARTIFACTS_ROOT, "test-results")
export const UPLOAD_ROOT = join(ARTIFACTS_ROOT, "uploads")
export const CHUNKS_ROOT = join(UPLOAD_ROOT, "chunks")
export const UPLOAD_REFS_ROOT = join(UPLOAD_ROOT, "refs")
export const UPLOAD_SESSIONS_ROOT = join(UPLOAD_ROOT, "sessions")
export const UNIFIED_TEST_RUNS_ROOT = join(LOGS_ROOT, "test-runs")
export const PLAYWRIGHT_OUTPUT_ROOT = join(TEST_RESULTS_ROOT, "playwright")

export const resolveOutputRoot = (): string => resolve(process.cwd(), OUTPUT_ROOT)

export const getShowNoteOutputDir = (showNoteId: string): string => join(OUTPUT_ROOT, showNoteId)

export const getAppendAssetsOutputDir = (showNoteId: string, jobId: string): string => {
  return join(getShowNoteOutputDir(showNoteId), "assets", jobId)
}

export const getAppendAssetRelativePath = (jobId: string, fileName: string): string => {
  const safeFileName = fileName.replace(/\\/g, "/").split("/").filter(Boolean).pop() || "asset"
  return posix.join("assets", jobId, safeFileName)
}
