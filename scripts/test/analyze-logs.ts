import type { LogFile, LogPerformanceStats } from '~/types'

async function analyzeLogFiles() {
  const logsDir = '/Users/ajc/c/autoshow-bun/logs'
  const glob = new Bun.Glob('*.json')
  const jsonFiles = await Array.fromAsync(glob.scan({ cwd: logsDir }))

  const ttsStats = new Map<string, LogPerformanceStats>()
  const imageStats = new Map<string, LogPerformanceStats>()
  const musicStats = new Map<string, LogPerformanceStats>()
  const structuredStats = new Map<string, Map<string, LogPerformanceStats>>()

  for (const file of jsonFiles) {
    const log: LogFile = await Bun.file(`${logsDir}/${file}`).json()

    for (const test of log.tests) {
      if (test.status !== 'passed') continue

      if (test.timings.tts) {
        const provider = file.includes('-openai-') ? 'openai' :
                        file.includes('-elevenlabs-') ? 'elevenlabs' :
                        file.includes('-groq-') ? 'groq' : 'unknown'
        const voice = file.split('-').pop()?.replace('.json', '') || 'unknown'
        const key = `${provider}-${voice}`
        
        if (!ttsStats.has(key)) {
          ttsStats.set(key, { count: 0, total: 0, avg: 0, min: Infinity, max: 0, values: [] })
        }
        const stats = ttsStats.get(key)!
        stats.count++
        stats.total += test.timings.tts.durationMs
        stats.min = Math.min(stats.min, test.timings.tts.durationMs)
        stats.max = Math.max(stats.max, test.timings.tts.durationMs)
        stats.values.push(test.timings.tts.durationMs)
      }

      if (test.timings.image) {
        const match = file.match(/image-\d+-local-(\w+)-(.+)\.json/)
        if (match) {
          const [, provider, type] = match
          const key = `${provider}-${type}`
          
          if (!imageStats.has(key)) {
            imageStats.set(key, { count: 0, total: 0, avg: 0, min: Infinity, max: 0, values: [] })
          }
          const stats = imageStats.get(key)!
          stats.count++
          stats.total += test.timings.image.durationMs
          stats.min = Math.min(stats.min, test.timings.image.durationMs)
          stats.max = Math.max(stats.max, test.timings.image.durationMs)
          stats.values.push(test.timings.image.durationMs)
        }
      }

      if (test.timings.music) {
        const match = file.match(/music-\d+-local-(\w+)-(.+)\.json/)
        if (match) {
          const [, provider, type] = match
          const key = `${provider}-${type}`
          
          if (!musicStats.has(key)) {
            musicStats.set(key, { count: 0, total: 0, avg: 0, min: Infinity, max: 0, values: [] })
          }
          const stats = musicStats.get(key)!
          stats.count++
          stats.total += test.timings.music.durationMs
          stats.min = Math.min(stats.min, test.timings.music.durationMs)
          stats.max = Math.max(stats.max, test.timings.music.durationMs)
          stats.values.push(test.timings.music.durationMs)
        }
      }

      if (file.includes('structured')) {
        const model = test.input.llmModel || 'unknown'
        const promptType = test.input.selectedPrompts?.[0] || 'unknown'
        
        if (!structuredStats.has(model)) {
          structuredStats.set(model, new Map())
        }
        const modelStats = structuredStats.get(model)!
        
        if (!modelStats.has(promptType)) {
          modelStats.set(promptType, { count: 0, total: 0, avg: 0, min: Infinity, max: 0, values: [] })
        }
        const stats = modelStats.get(promptType)!
        
        if (test.timings.llm) {
          stats.count++
          stats.total += test.timings.llm.durationMs
          stats.min = Math.min(stats.min, test.timings.llm.durationMs)
          stats.max = Math.max(stats.max, test.timings.llm.durationMs)
          stats.values.push(test.timings.llm.durationMs)
        }
      }
    }
  }

  for (const stats of ttsStats.values()) {
    stats.avg = stats.total / stats.count
  }
  for (const stats of imageStats.values()) {
    stats.avg = stats.total / stats.count
  }
  for (const stats of musicStats.values()) {
    stats.avg = stats.total / stats.count
  }
  for (const modelMap of structuredStats.values()) {
    for (const stats of modelMap.values()) {
      stats.avg = stats.total / stats.count
    }
  }

  console.log('\n=== TEXT-TO-SPEECH PERFORMANCE ===\n')
  const ttsSorted = Array.from(ttsStats.entries()).sort((a, b) => a[1].avg - b[1].avg)
  for (const [key, stats] of ttsSorted) {
    console.log(`${key}:`)
    console.log(`  Average: ${(stats.avg / 1000).toFixed(2)}s`)
    console.log(`  Range: ${(stats.min / 1000).toFixed(2)}s - ${(stats.max / 1000).toFixed(2)}s`)
    console.log(`  Tests: ${stats.count}`)
    console.log()
  }

  console.log('\n=== IMAGE GENERATION PERFORMANCE ===\n')
  const imageSorted = Array.from(imageStats.entries()).sort((a, b) => a[1].avg - b[1].avg)
  for (const [key, stats] of imageSorted) {
    console.log(`${key}:`)
    console.log(`  Average: ${(stats.avg / 1000).toFixed(2)}s`)
    console.log(`  Range: ${(stats.min / 1000).toFixed(2)}s - ${(stats.max / 1000).toFixed(2)}s`)
    console.log(`  Tests: ${stats.count}`)
    console.log()
  }

  console.log('\n=== MUSIC GENERATION PERFORMANCE ===\n')
  const musicSorted = Array.from(musicStats.entries()).sort((a, b) => a[1].avg - b[1].avg)
  for (const [key, stats] of musicSorted) {
    console.log(`${key}:`)
    console.log(`  Average: ${(stats.avg / 1000).toFixed(2)}s`)
    console.log(`  Range: ${(stats.min / 1000).toFixed(2)}s - ${(stats.max / 1000).toFixed(2)}s`)
    console.log(`  Tests: ${stats.count}`)
    console.log()
  }

  console.log('\n=== STRUCTURED OUTPUT PERFORMANCE (by LLM Model and Prompt Type) ===\n')
  const modelsSorted = Array.from(structuredStats.entries()).sort((a, b) => {
    const avgA = Array.from(a[1].values()).reduce((sum, s) => sum + s.avg, 0) / a[1].size
    const avgB = Array.from(b[1].values()).reduce((sum, s) => sum + s.avg, 0) / b[1].size
    return avgA - avgB
  })
  
  for (const [model, promptStats] of modelsSorted) {
    console.log(`${model}:`)
    const sortedPrompts = Array.from(promptStats.entries()).sort((a, b) => a[1].avg - b[1].avg)
    for (const [promptType, stats] of sortedPrompts) {
      console.log(`  ${promptType}:`)
      console.log(`    Average: ${(stats.avg / 1000).toFixed(2)}s`)
      console.log(`    Range: ${(stats.min / 1000).toFixed(2)}s - ${(stats.max / 1000).toFixed(2)}s`)
      console.log(`    Tests: ${stats.count}`)
    }
    console.log()
  }

  return { ttsStats, imageStats, musicStats, structuredStats }
}

analyzeLogFiles().catch(console.error)
