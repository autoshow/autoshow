import type { TestDefinition } from "~/types"
import { parseE2EMode } from "../../scripts/test/e2e-flags"
import {
  resolveDefinitionPathsForE2EMode,
  type ResolvableE2EMode,
} from "../../scripts/test/e2e-mode-selection"
import { loadTestDefinitionsFromPaths } from "../../scripts/test/harness/definitions"

export const BROWSER_E2E_DEFINITIONS_SPEC_PATH = "tests/playwright/browser-e2e-definitions.spec.ts"

export interface BrowserE2EDefinitionCase {
  title: string
  definitionPath: string
  definition: TestDefinition
}

function getConfiguredBrowserE2EMode(): ResolvableE2EMode | null {
  const rawMode = process.env.AUTOSHOW_PLAYWRIGHT_E2E_MODE
  if (!rawMode) {
    return null
  }

  const parsedMode = parseE2EMode(rawMode)
  if (parsedMode === "paths") {
    throw new Error("AUTOSHOW_PLAYWRIGHT_E2E_MODE does not support paths mode")
  }

  return parsedMode
}

export async function resolveBrowserE2EDefinitionCases(): Promise<BrowserE2EDefinitionCase[]> {
  const e2eMode = getConfiguredBrowserE2EMode()
  if (!e2eMode) {
    return []
  }

  const definitionPaths = await resolveDefinitionPathsForE2EMode(
    e2eMode,
    process.env.INPUT_VARIANTS
  )
  const definitions = await loadTestDefinitionsFromPaths(definitionPaths)

  return definitions.map((definition, index) => ({
    title: definition.id,
    definitionPath: definitionPaths[index]!,
    definition,
  }))
}
