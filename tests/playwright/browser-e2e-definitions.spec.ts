import { test } from "@playwright/test"
import { resolveBrowserE2EDefinitionCases } from "./browser-e2e-cases"
import { runDefinitionTest } from "./utils/test-utils"

test.describe.configure({ mode: "parallel" })

const browserCases = await resolveBrowserE2EDefinitionCases()

for (const browserCase of browserCases) {
  test(browserCase.title, async ({ page, request }, testInfo) => {
    await runDefinitionTest(page, request, browserCase.definition, browserCase.definitionPath, testInfo)
  })
}
