import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/playwright',
  timeout: 3600000,
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'bun dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 3600000,
  },
})
