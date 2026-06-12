import { resolveDefinitionPaths } from "./harness/definitions"
import {
  resolveCuratedMinimalE2EDefinitionPaths,
  resolveCuratedMinimalistE2EDefinitionPaths,
} from "./e2e-minimal-suite"
import {
  resolveCheapestService2xE2EDefinitionPaths,
  resolveCheapestServiceE2EDefinitionPaths,
} from "./e2e-services-suite"
import type { E2EMode } from "./e2e-flags"

export type ResolvableE2EMode = Exclude<E2EMode, "paths">

export async function resolveDefinitionPathsForE2EMode(
  e2eMode: ResolvableE2EMode,
  inputVariants?: string
): Promise<string[]> {
  if (e2eMode === "minimal") {
    return resolveCuratedMinimalE2EDefinitionPaths()
  }
  if (e2eMode === "minimalist") {
    return resolveCuratedMinimalistE2EDefinitionPaths()
  }
  if (e2eMode === "services") {
    return resolveCheapestServiceE2EDefinitionPaths(inputVariants)
  }
  if (e2eMode === "services2x") {
    return resolveCheapestService2xE2EDefinitionPaths(inputVariants)
  }
  if (e2eMode === "verify") {
    return resolveDefinitionPaths(["verify"])
  }
  return resolveDefinitionPaths()
}

export function getE2ESuiteName(e2eMode: E2EMode, definitionCount: number): string {
  if (e2eMode === "minimal") {
    return "E2E: Minimal Service Verification Suite"
  }
  if (e2eMode === "minimalist") {
    return "E2E: Minimalist Service Verification Suite"
  }
  if (e2eMode === "services") {
    return "E2E: Cheapest Model Per Service Suite"
  }
  if (e2eMode === "services2x") {
    return "E2E: Two Cheapest Models Per Service Suite"
  }
  if (e2eMode === "verify") {
    return "E2E: Model Verification Suite"
  }
  if (e2eMode === "all") {
    return "E2E: All Tests"
  }
  return `E2E: Path Tests (${definitionCount} files)`
}
