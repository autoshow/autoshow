import { l, err } from '../../src/utils/logging'
import { formatTime, calculateGrade, waitForServer, setupPlaywright } from './build-report-utils'
import { analyzeBundle, analyzeCSS, analyzeLazyLoading, analyzeWithPlaywright } from './build-analysis'
import { saveReport } from './save-build-report'
import type { BuildAnalysisResult } from '../cli-types'

const PORT = 4321
const URL = `http://localhost:${PORT}`

export const analyzeBuild = async (): Promise<void> => {
  l('Starting build analysis')
  
  const playwrightReady = await setupPlaywright()
  if (!playwrightReady) {
    err('Playwright setup failed - run: npx playwright install chromium')
    process.exit(1)
  }
  
  l('Building application')
  const buildStart = Date.now()
  const buildProc = Bun.spawnSync(['bun', 'run', 'build'], {
    stdout: 'inherit',
    stderr: 'inherit'
  })
  const buildDuration = Date.now() - buildStart
  
  if (buildProc.exitCode !== 0) {
    err('Build failed')
    process.exit(1)
  }
  l(`Build completed in ${formatTime(buildDuration)}`)
  
  l('Starting preview server with bun')
  const serverProc = Bun.spawn(['bun', '.output/server/index.mjs'], {
    stdout: 'inherit',
    stderr: 'inherit',
    env: { ...process.env, PORT: PORT.toString() }
  })
  
  await Bun.sleep(3000)
  
  const serverReady = await waitForServer(URL)
  if (!serverReady) {
    err('Server failed to start')
    serverProc.kill()
    process.exit(1)
  }
  
  try {
    l('Analyzing with Playwright')
    const { performance, requests, cssCoverage } = await analyzeWithPlaywright(URL)
    
    const { chromium } = await import('playwright')
    const browser = await chromium.launch({ headless: true })
    const page = await (await browser.newContext()).newPage()
    await page.goto(URL, { waitUntil: 'networkidle' })
    
    const bundle = analyzeBundle(requests)
    const css = await analyzeCSS(page, requests, cssCoverage)
    const lazyLoading = await analyzeLazyLoading(page)
    
    await browser.close()
    
    const allRecommendations = [
      ...bundle.recommendations,
      ...css.recommendations,
      ...lazyLoading.recommendations
    ]
    
    if (performance.fcp && performance.fcp > 2000) {
      allRecommendations.push(`⚠️  First Contentful Paint is ${formatTime(performance.fcp)} - aim for under 2000ms`)
    }
    
    if (performance.lcp && performance.lcp > 2500) {
      allRecommendations.push(`⚠️  Largest Contentful Paint is ${formatTime(performance.lcp)} - aim for under 2500ms`)
    }
    
    let score = 100
    if (bundle.totalSize > 500000) score -= 20
    if (bundle.largestBundle.size > 200000) score -= 15
    if (!bundle.hasCodeSplitting) score -= 15
    if (!css.hasCriticalCSS) score -= 15
    if (css.unusedBytes > 10000) score -= 10
    if (performance.fcp && performance.fcp > 3000) score -= 10
    if (performance.lcp && performance.lcp > 4000) score -= 10
    if (lazyLoading.imagesTotal > 0 && lazyLoading.imagesLazy / lazyLoading.imagesTotal < 0.7) score -= 5
    
    score = Math.max(0, Math.min(100, score))
    const grade = calculateGrade(score)
    
    const analysis: BuildAnalysisResult = {
      timestamp: new Date().toISOString(),
      buildDuration,
      performance,
      bundle,
      css,
      lazyLoading,
      networkRequests: requests,
      score,
      grade,
      recommendations: allRecommendations
    }
    
    await saveReport(analysis, 'build-analysis')
    l('Analysis complete')
    
  } catch (error) {
    err('Analysis failed', error)
    throw error
  } finally {
    l('Shutting down preview server')
    serverProc.kill()
    await Bun.sleep(1000)
  }
}

if (import.meta.main) {
  analyzeBuild().catch(() => process.exit(1))
}