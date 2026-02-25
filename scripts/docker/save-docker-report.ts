import { err } from '~/utils/logging'
import { formatBytes, findDockerfile } from './docker-utils'
import type { HistoryEntry } from '~/types'

export const generateReportHeader = async (imageName: string, imageSize: number): Promise<string> => {
  const date = new Date()
  const timestamp = date.toISOString().replace('T', ' ').substring(0, 19)
  
  return `Docker Image Analysis Report\n\nImage: ${imageName}\nDate: ${timestamp}\nImage Size: ${formatBytes(imageSize)}\n\n----------------------------------------\n`
}

export const generateRecommendations = async (imageSize: number): Promise<string> => {
  let output = '\nOptimization Recommendations\n\n'
  
  try {
    let hasRecommendations = false
    
    const dockerfilePath = await findDockerfile()
    
    if (dockerfilePath) {
      const file = Bun.file(dockerfilePath)
      const content = await file.text()
      const lines = content.split('\n')
      
      const stages = lines.filter(line => line.startsWith('FROM')).length
      const runCount = lines.filter(line => line.startsWith('RUN')).length
      const cleanupCount = lines.filter(line => line.startsWith('RUN') && line.includes('rm -rf')).length
      
      if (stages === 1) {
        output += '  - Implement multi-stage build to separate build and runtime stages\n'
        hasRecommendations = true
      }
      
      if (runCount > 10) {
        output += `  - Consolidate ${runCount} RUN commands to reduce image layers\n`
        hasRecommendations = true
      }
      
      if (runCount > 0 && cleanupCount > 0) {
        const withoutCleanup = runCount - cleanupCount
        if (withoutCleanup > 0) {
          output += `  - Add cleanup commands to ${withoutCleanup} RUN statement(s) that install packages\n`
          hasRecommendations = true
        }
      }
      
      const dockerignoreExists = await Bun.file('.dockerignore').exists()
      
      if (!dockerignoreExists) {
        output += '  - Create .dockerignore to exclude unnecessary files\n'
        hasRecommendations = true
      }
    }
    
    if (imageSize > 1073741824) {
      output += '  - Image exceeds 1GB - review installed packages and dependencies\n'
      hasRecommendations = true
    }
    
    if (!hasRecommendations) {
      output += '  - ✓ No major optimization recommendations\n'
    }
    
    output += '\n'
    
    return output
  } catch (error) {
    err(`Failed to generate recommendations: ${error}`)
    return output + '  - Error: Could not generate recommendations\n\n'
  }
}

const readHistory = async (historyPath: string): Promise<HistoryEntry[]> => {
  try {
    const file = Bun.file(historyPath)
    
    if (!(await file.exists())) {
      const dirPath = historyPath.substring(0, historyPath.lastIndexOf('/'))
      await Bun.$`mkdir -p ${dirPath}`.quiet()
      await Bun.write(historyPath, '[]')
      return []
    }
    
    return JSON.parse(await file.text())
  } catch (error) {
    err(`Failed to read history: ${error}`)
    return []
  }
}

const writeHistory = async (historyPath: string, entries: HistoryEntry[]): Promise<void> => {
  try {
    await Bun.write(historyPath, JSON.stringify(entries.slice(-10), null, 2))
  } catch (error) {
    err(`Failed to write history: ${error}`)
  }
}

export const compareWithHistory = async (imageName: string, currentSize: number, historyPath: string): Promise<string> => {
  try {
    const entries = await readHistory(historyPath)
    
    let output = '\nHistorical Comparison\n\n'
    
    if (entries.length === 0) {
      output += `  - First analysis recorded\n  - Current size: ${formatBytes(currentSize)}\n\n`
    } else {
      const previousSize = entries[entries.length - 1]?.size ?? 0
      output += `  - Previous size: ${formatBytes(previousSize)}\n`
      output += `  - Current size:  ${formatBytes(currentSize)}\n`
      
      if (previousSize !== 0 && currentSize !== 0) {
        const delta = currentSize - previousSize
        
        if (delta > 0) {
          output += `  - Change:        +${formatBytes(delta)} (⚠ increased)\n`
        } else if (delta < 0) {
          output += `  - Change:        -${formatBytes(Math.abs(delta))} (✓ decreased)\n`
        } else {
          output += `  - Change:        0B (No change)\n`
        }
      }
      
      output += '\n'
    }
    
    await writeHistory(historyPath, [...entries, { image: imageName, size: currentSize, timestamp: Math.floor(Date.now() / 1000) }])
    
    return output
  } catch (error) {
    err(`Failed to compare with history: ${error}`)
    return '\n  - Error: Could not compare with history\n\n'
  }
}