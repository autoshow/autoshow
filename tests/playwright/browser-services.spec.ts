import { test } from "@playwright/test"
import { ALL_BROWSER_SERVICE_CASES } from "./browser-test-cases"
import { runServiceTest } from "./utils/test-utils"

test.describe.configure({ mode: "parallel" })

for (const browserCase of ALL_BROWSER_SERVICE_CASES) {
  test(browserCase.title, async ({ page, request }, testInfo) => {
    await runServiceTest(page, request, browserCase, testInfo)
  })
}
