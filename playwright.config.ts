import { defineConfig } from '@playwright/test'
import { PLAYWRIGHT_OUTPUT_ROOT } from './src/utils/artifact-paths'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || process.env.BASE_URL || 'http://localhost:3000'
const disableWebServer = process.env.PLAYWRIGHT_DISABLE_WEBSERVER === '1'
const reuseExistingServer = process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER === '1'
const outputDir = process.env.PLAYWRIGHT_OUTPUT_DIR || PLAYWRIGHT_OUTPUT_ROOT
const defaultWorkers = process.env.PLAYWRIGHT_WORKERS || '5'
const perTestTimeoutMs = 15 * 60 * 1000
const suiteTimeoutMs = 60 * 60 * 1000

export default defineConfig({
  testDir: './tests/playwright',
  timeout: perTestTimeoutMs,
  globalTimeout: suiteTimeoutMs,
  workers: Number(defaultWorkers),
  fullyParallel: false,
  outputDir,
  reporter: process.env.PLAYWRIGHT_JUNIT_REPORT
    ? [['list'], ['junit', { outputFile: process.env.PLAYWRIGHT_JUNIT_REPORT }]]
    : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  ...(disableWebServer
    ? {}
    : {
        webServer: {
          command: 'bun dev',
          env: {
            NODE_ENV: 'test',
            RESEND_API_KEY: '',
            VITE_SITE_URL: baseURL,
          },
          url: baseURL,
          reuseExistingServer,
          timeout: 3600000,
        },
      }),
})
