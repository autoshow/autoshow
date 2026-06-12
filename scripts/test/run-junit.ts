import { existsSync, readFileSync } from "node:fs"
import type { JUnitSummary } from "./run-types"

export function parseJUnitSummary(path: string): JUnitSummary | undefined {
  if (!existsSync(path)) {
    return undefined
  }

  const xml = readFileSync(path, "utf8")
  const root = xml.match(/<(testsuites|testsuite)\b([^>]*)>/)
  if (!root) {
    return undefined
  }

  const attrs = root[2] ?? ""
  const tests = Number(attrs.match(/\btests="(\d+)"/)?.[1] ?? "0")
  const failures = Number(attrs.match(/\bfailures="(\d+)"/)?.[1] ?? "0")
  const errors = Number(attrs.match(/\berrors="(\d+)"/)?.[1] ?? "0")
  const skipped = Number(attrs.match(/\bskipped="(\d+)"/)?.[1] ?? "0")
  const failed = failures + errors

  return {
    tests,
    failed,
    skipped,
    passed: Math.max(0, tests - failed - skipped),
  }
}
