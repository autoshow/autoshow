import type {
  NetworkRequest,
  BundleAnalysis,
  CSSAnalysis,
  LazyLoadingAnalysis,
  PerformanceMetrics
} from '~/types'

export const analyzeBundle = (requests: NetworkRequest[]): BundleAnalysis => {
  const jsFiles = requests.filter(r => r.resourceType === 'script')
  const cssFiles = requests.filter(r => r.resourceType === 'stylesheet')
  const totalSize = [...jsFiles, ...cssFiles].reduce((sum, r) => sum + r.size, 0)
  
  const largestBundle = [...jsFiles, ...cssFiles].reduce((largest, r) => 
    r.size > largest.size ? { name: r.url.split('/').pop() || r.url, size: r.size } : largest,
    { name: '', size: 0 }
  )
  
  const hasCodeSplitting = requests.some(r => 
    r.url.includes('chunk') || r.url.includes('lazy') || r.url.includes('async')
  )
  
  const recommendations: string[] = []
  
  if (totalSize > 500000) {
    recommendations.push(`⚠️  Total bundle size is ${Math.round(totalSize / 1024)}KB - implement code splitting`)
  }
  
  if (largestBundle.size > 200000) {
    recommendations.push(`⚠️  Largest bundle (${largestBundle.name}) is ${Math.round(largestBundle.size / 1024)}KB - split into smaller chunks`)
  }
  
  if (!hasCodeSplitting && jsFiles.length > 3) {
    recommendations.push('⚠️  No code splitting detected - implement route-based lazy loading')
  } else if (hasCodeSplitting) {
    recommendations.push('✅ Code splitting is active')
  }
  
  return {
    jsFiles: jsFiles.length,
    cssFiles: cssFiles.length,
    totalSize,
    largestBundle,
    hasCodeSplitting,
    recommendations
  }
}

export const analyzeCSS = async (page: any, requests: NetworkRequest[], cssCoverage: any[]): Promise<CSSAnalysis> => {
  const totalStylesheets = requests.filter(r => r.resourceType === 'stylesheet').length
  
  const hasCriticalCSS = await page.evaluate(() => 
    Array.from(document.querySelectorAll('style')).some((s: any) => 
      s.id === 'critical-css' || s.dataset?.critical === 'true'
    )
  ).catch(() => false)
  
  const unusedBytes = cssCoverage.reduce((total, entry) => {
    const unused = (entry.text?.length || 0) - entry.ranges.reduce((sum: number, range: { start: number; end: number }) => 
      sum + (range.end - range.start), 0
    )
    return total + unused
  }, 0)
  
  const recommendations: string[] = []
  
  if (!hasCriticalCSS) {
    recommendations.push('⚠️  No critical CSS detected - inline above-the-fold styles')
  }
  
  if (unusedBytes > 10000) {
    recommendations.push(`⚠️  ${Math.round(unusedBytes / 1024)}KB of unused CSS detected`)
  }
  
  return {
    totalStylesheets,
    hasCriticalCSS,
    unusedBytes,
    recommendations
  }
}

export const analyzeLazyLoading = async (page: any): Promise<LazyLoadingAnalysis> => {
  const imageData = await page.evaluate(() => {
    const images = Array.from(document.querySelectorAll('img'))
    const lazyImages = images.filter((img: any) => 
      img.loading === 'lazy' || img.dataset?.src || img.classList.contains('lazy')
    )
    return { total: images.length, lazy: lazyImages.length }
  }).catch(() => ({ total: 0, lazy: 0 }))
  
  const scriptData = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script[src]'))
    const deferred = scripts.filter((s: any) => s.defer || s.async || s.type === 'module')
    return { total: scripts.length, deferred: deferred.length }
  }).catch(() => ({ total: 0, deferred: 0 }))
  
  const recommendations: string[] = []
  
  if (imageData.total > 0 && imageData.lazy < imageData.total * 0.7) {
    recommendations.push(`⚠️  Only ${imageData.lazy}/${imageData.total} images are lazy-loaded`)
  }
  
  if (scriptData.total > 0 && scriptData.deferred < scriptData.total * 0.7) {
    recommendations.push(`⚠️  Only ${scriptData.deferred}/${scriptData.total} scripts are deferred`)
  }
  
  return {
    imagesTotal: imageData.total,
    imagesLazy: imageData.lazy,
    scriptsTotal: scriptData.total,
    scriptsDeferred: scriptData.deferred,
    recommendations
  }
}

export const analyzeWithPlaywright = async (url: string): Promise<{
  performance: PerformanceMetrics
  requests: NetworkRequest[]
  cssCoverage: any[]
}> => {
  const { chromium } = await import('playwright')
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()
  
  const requests: NetworkRequest[] = []
  
  page.on('response', async (response) => {
    try {
      const request = response.request()
      const headers = await response.allHeaders()
      requests.push({
        url: response.url(),
        resourceType: request.resourceType(),
        size: parseInt(headers['content-length'] || '0'),
        status: response.status()
      })
    } catch {}
  })
  
  await page.coverage.startCSSCoverage()
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(3000)
  
  const cssCoverage = await page.coverage.stopCSSCoverage()
  
  const metrics: PerformanceMetrics = await page.evaluate((): PerformanceMetrics => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    const paint: PerformanceEntry[] = performance.getEntriesByType('paint')
    const fcpEntry = paint.find((e: PerformanceEntry) => e.name === 'first-contentful-paint')
    const lcpEntry = performance.getEntriesByType('largest-contentful-paint')[0]
    
    return {
      domContentLoaded: nav ? nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart : 0,
      load: nav ? nav.loadEventEnd - nav.loadEventStart : 0,
      fcp: fcpEntry?.startTime,
      lcp: lcpEntry ? (lcpEntry as any).startTime : undefined
    }
  }).catch((): PerformanceMetrics => ({
    domContentLoaded: 0,
    load: 0,
    fcp: undefined,
    lcp: undefined
  }))
  
  await browser.close()
  
  return { performance: metrics, requests, cssCoverage }
}