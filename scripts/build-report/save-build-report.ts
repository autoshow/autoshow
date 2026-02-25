import { l } from '~/utils/logging'
import { formatBytes, formatTime } from './build-report-utils'
import type { BuildAnalysisResult } from '~/types'

const generateReport = (analysis: BuildAnalysisResult): string => {
  const lines: string[] = []
  
  lines.push('# Build Analysis Report')
  lines.push(`Generated: ${analysis.timestamp}`)
  lines.push(`Build Duration: ${formatTime(analysis.buildDuration)}`)
  lines.push(`Performance Grade: ${analysis.grade} (${analysis.score}/100)`)
  lines.push(`Framework: SolidStart (Vinxi)\n`)
  
  lines.push('## Executive Summary')
  if (analysis.score >= 80) {
    lines.push('Your application is well-optimized with minor areas for improvement.')
  } else if (analysis.score >= 60) {
    lines.push('Your application has moderate optimization opportunities.')
  } else {
    lines.push('Your application requires significant optimization.')
  }
  lines.push('')
  
  lines.push('## Performance Metrics')
  lines.push(`- DOM Content Loaded: ${formatTime(analysis.performance.domContentLoaded)}`)
  lines.push(`- Page Load: ${formatTime(analysis.performance.load)}`)
  if (analysis.performance.fcp) {
    const fcpStatus = analysis.performance.fcp <= 1800 ? '✅' : analysis.performance.fcp <= 3000 ? '⚠️' : '❌'
    lines.push(`- First Contentful Paint: ${formatTime(analysis.performance.fcp)} ${fcpStatus}`)
  }
  if (analysis.performance.lcp) {
    const lcpStatus = analysis.performance.lcp <= 2500 ? '✅' : analysis.performance.lcp <= 4000 ? '⚠️' : '❌'
    lines.push(`- Largest Contentful Paint: ${formatTime(analysis.performance.lcp)} ${lcpStatus}`)
  }
  lines.push('')
  
  lines.push('## Bundle Analysis')
  lines.push(`- JavaScript Files: ${analysis.bundle.jsFiles}`)
  lines.push(`- CSS Files: ${analysis.bundle.cssFiles}`)
  lines.push(`- Total Bundle Size: ${formatBytes(analysis.bundle.totalSize)}`)
  if (analysis.bundle.largestBundle.size > 0) {
    lines.push(`- Largest Bundle: ${analysis.bundle.largestBundle.name} (${formatBytes(analysis.bundle.largestBundle.size)})`)
  }
  lines.push(`- Code Splitting: ${analysis.bundle.hasCodeSplitting ? '✅ Yes' : '❌ No'}`)
  lines.push('')
  
  lines.push('## CSS Analysis')
  lines.push(`- Total Stylesheets: ${analysis.css.totalStylesheets}`)
  lines.push(`- Critical CSS: ${analysis.css.hasCriticalCSS ? '✅ Yes' : '❌ No'}`)
  if (analysis.css.unusedBytes > 0) {
    lines.push(`- Unused CSS: ${formatBytes(analysis.css.unusedBytes)}`)
  }
  lines.push('')
  
  lines.push('## Lazy Loading Analysis')
  lines.push(`- Images: ${analysis.lazyLoading.imagesLazy}/${analysis.lazyLoading.imagesTotal} lazy-loaded`)
  lines.push(`- Scripts: ${analysis.lazyLoading.scriptsDeferred}/${analysis.lazyLoading.scriptsTotal} deferred`)
  lines.push('')
  
  lines.push('## Network Analysis')
  lines.push(`- Total Requests: ${analysis.networkRequests.length}`)
  const requestsByType = analysis.networkRequests.reduce((acc, r) => {
    acc[r.resourceType] = (acc[r.resourceType] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  Object.entries(requestsByType).forEach(([type, count]) => {
    lines.push(`- ${type}: ${count}`)
  })
  lines.push('')
  
  if (analysis.networkRequests.length > 0) {
    lines.push('## Top 10 Largest Resources')
    const largest = [...analysis.networkRequests]
      .sort((a, b) => b.size - a.size)
      .slice(0, 10)
    largest.forEach((r, i) => {
      const name = r.url.split('/').pop() || r.url
      const status = r.status === 200 ? '✅' : '❌'
      lines.push(`${i + 1}. ${name} (${r.resourceType}) - ${formatBytes(r.size)} ${status}`)
    })
    lines.push('')
  }
  
  if (analysis.recommendations.length > 0) {
    lines.push('## Recommendations')
    analysis.recommendations.forEach(rec => {
      lines.push(`- ${rec}`)
    })
    lines.push('')
  }
  
  return lines.join('\n')
}

export const saveReport = async (analysis: BuildAnalysisResult, outputDir: string): Promise<void> => {
  await Bun.$`mkdir -p ${outputDir}`.quiet()
  
  const timestamp = new Date().toISOString().split('T')[0]
  const reportPath = `${outputDir}/analysis-${timestamp}.md`
  const jsonPath = `${outputDir}/analysis-${timestamp}.json`
  
  const report = generateReport(analysis)
  await Bun.write(reportPath, report)
  await Bun.write(jsonPath, JSON.stringify(analysis, null, 2))
  
  l(`Report saved: ${reportPath}`)
  console.log('\n' + report)
}