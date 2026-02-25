import { l, err } from '~/utils/logging'

export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes}B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)}KB`
  const mb = kb / 1024
  return `${mb.toFixed(1)}MB`
}

export const formatTime = (ms: number): string => {
  if (ms < 1000) return `${ms.toFixed(0)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

export const calculateGrade = (score: number): string => {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

export const waitForServer = async (url: string, maxAttempts = 30): Promise<boolean> => {
  l(`Waiting for server at ${url}`)
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(url, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(2000)
      })
      if (response.ok || response.status === 404) {
        l(`Server ready at ${url}`)
        return true
      }
    } catch (error) {
      if (i < maxAttempts - 1) {
        await Bun.sleep(1000)
      }
    }
  }
  
  err(`Server failed to start after ${maxAttempts} attempts`)
  return false
}

export const setupPlaywright = async (): Promise<boolean> => {
  try {
    const { chromium } = await import('playwright')
    const browser = await chromium.launch({ headless: true, timeout: 15000 })
    await browser.close()
    l('Playwright is ready')
    return true
  } catch {
    l('Installing Playwright browsers...')
    const proc = Bun.spawnSync(['npx', 'playwright', 'install', 'chromium'], {
      stdout: 'inherit',
      stderr: 'inherit'
    })
    if (proc.exitCode !== 0) {
      err('Failed to install Playwright')
      return false
    }
    await Bun.sleep(3000)
    try {
      const { chromium } = await import('playwright')
      const browser = await chromium.launch({ headless: true, timeout: 15000 })
      await browser.close()
      l('Playwright installed successfully')
      return true
    } catch {
      err('Playwright installation verification failed')
      return false
    }
  }
}