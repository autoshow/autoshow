import { err } from '../../src/utils/logging'
import { runDockerCommand, findDockerfile, parseTarHeader } from './docker-utils'
import type { DirectorySizes, VolumeInfo, TarAnalysisResult } from '../cli-types'

export const analyzeImageLayers = async (imageName: string): Promise<string> => {
  let output = '\nLayer Analysis\n\nTop 10 Largest Layers:\n\n'
  
  try {
    const historyOutput = await runDockerCommand(['history', '--no-trunc', '--format', '{{.Size}}\t{{.CreatedBy}}', imageName])
    
    const layers = historyOutput.split('\n')
      .filter(line => line && !line.startsWith('0B'))
      .slice(0, 10)
      .map(line => {
        const [size, cmd] = line.split('\t')
        const cleanCmd = (cmd || '')
          .replace(/^.*\/bin\/sh -c /, '')
          .slice(0, 80)
        return { size: size || '', cmd: cleanCmd }
      })
    
    layers.map(({ size, cmd }) => {
      output += `  - ${size}\n    ${cmd}\n`
    })
    
    if (layers.length === 0) {
      output += '  - Error: Could not analyze image history\n'
    }
  } catch (error) {
    err(`Layer analysis failed: ${error}`)
    output += '  - Error: Could not analyze image history\n'
  }
  
  output += '\n'
  return output
}

export const analyzeCombinedTar = async (tarPath: string): Promise<TarAnalysisResult> => {
  const dirSizes: DirectorySizes = {}
  const devTools: string[] = []
  let libSize = 0
  
  const devToolPatterns = [
    'usr/bin/gcc',
    'usr/bin/g\\+\\+',
    'usr/bin/make',
    'usr/bin/cmake',
    'usr/bin/git',
    'python.+-dev',
    'build-essential'
  ]
  const regex = new RegExp(devToolPatterns.join('|'))
  
  try {
    const file = Bun.file(tarPath)
    const arrayBuffer = await file.arrayBuffer()
    const view = new DataView(arrayBuffer)
    
    let offset = 0
    const blockSize = 512
    let processedLayers = 0
    const blobTars: Array<{ offset: number; size: number; name: string }> = []
    
    while (offset < view.byteLength) {
      const header = parseTarHeader(view, offset)
      
      if (!header?.name) {
        offset += blockSize
        continue
      }
      
      const { name, size, type } = header
      
      if (name.startsWith('blobs/sha256/') && type === '0' && size > 0) {
        blobTars.push({ offset: offset + blockSize, size, name })
      }
      
      offset += blockSize + Math.ceil(size / blockSize) * blockSize
    }
    
    for (const blob of blobTars) {
      processedLayers++
      
      try {
        const compressedData = new Uint8Array(arrayBuffer, blob.offset, blob.size)
        const decompressed = Bun.gunzipSync(compressedData)
        const decompressedView = new DataView(decompressed.buffer)
        
        let blobOffset = 0
        
        while (blobOffset < decompressed.length) {
          const blobHeader = parseTarHeader(decompressedView, blobOffset)
          
          if (!blobHeader?.name) {
            blobOffset += blockSize
            continue
          }
          
          const { name: blobName, size: blobSize, type: blobType } = blobHeader
          
          if (blobType !== '5' && blobSize > 0 && !blobName.endsWith('/')) {
            const normalizedPath = blobName.startsWith('./') ? blobName.slice(2) : blobName
            const firstSlash = normalizedPath.indexOf('/')
            
            if (firstSlash > 0 && !normalizedPath.startsWith('.')) {
              const topDir = `/${normalizedPath.slice(0, firstSlash)}`
              dirSizes[topDir] = (dirSizes[topDir] || 0) + blobSize
            }
            
            if (regex.test(blobName) && devTools.length < 20) {
              devTools.push(blobName)
            }
            
            if (blobName.endsWith('.so') || blobName.includes('.so.')) {
              libSize += blobSize
            }
          }
          
          blobOffset += blockSize + Math.ceil(blobSize / blockSize) * blockSize
        }
      } catch {
        continue
      }
    }
  } catch (error) {
    err(`Tar analysis failed: ${error}`)
  }
  
  return { dirSizes, devTools, libSize }
}

export const analyzeFilesystem = (dirSizes: DirectorySizes): string => {
  let output = '\nFilesystem Contents\n\nTop 20 Largest Directories:\n\n'
  
  try {
    const formatted = Object.entries(dirSizes)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .filter(([, size]) => size > 0)
      .map(([dir, size]) => `  - ${Math.floor(size / 1048576)} MB       ${dir}`)
      .join('\n')
    
    output += formatted || '  - No directories found\n'
  } catch (error) {
    err(`Filesystem formatting failed: ${error}`)
    output += '  - Error: Could not format filesystem data\n'
  }
  
  output += '\n'
  return output
}

export const analyzePackages = (devTools: string[], libSize: number): string => {
  let output = '\nInstalled Packages Analysis\n\nDevelopment Tools (Should Not Be in Production):\n\n'
  
  if (devTools.length === 0) {
    output += '  - ✓ No development tools found in production image\n'
  } else {
    devTools.map(tool => {
      output += `  - ⚠ ${tool}\n`
    })
  }
  
  output += '\n'
  output += '\nRuntime Requirements\n\n'
  output += `  - Shared libraries total: ${(libSize / 1048576).toFixed(1)}M\n\n`
  
  return output
}

export const analyzeVolumes = async (): Promise<string> => {
  let output = '\nVolume Analysis\n\n'
  
  try {
    const volumesOutput = await runDockerCommand(['volume', 'ls', '-q'])
    
    if (!volumesOutput) {
      output += '  - No volumes found\n\n'
      return output
    }
    
    const volumes = volumesOutput.split('\n').filter(v => v)
    const volumeInfos: VolumeInfo[] = []
    
    for (const volume of volumes) {
      try {
        const mountPoint = await runDockerCommand(['volume', 'inspect', '-f', '{{.Mountpoint}}', volume])
        
        if (!mountPoint) continue
        
        const proc = Bun.spawnSync(['du', '-sh', mountPoint], {
          stdout: 'pipe',
          stderr: 'pipe'
        })
        
        const sizeOutput = proc.stdout.toString()
        const size = sizeOutput.split('\t')[0]?.trim() || '0B'
        
        if (size !== '0B') {
          volumeInfos.push({ name: volume, size })
        }
      } catch {
        continue
      }
    }
    
    if (volumeInfos.length === 0) {
      output += '  - All volumes are empty\n'
    } else {
      volumeInfos.map(({ name, size }) => {
        output += `  - ${name.padEnd(40)} ${size}\n`
      })
    }
  } catch (error) {
    err(`Volume analysis failed: ${error}`)
    output += '  - Error: Could not analyze volumes\n'
  }
  
  output += '\n'
  return output
}

export const analyzeDockerfile = async (): Promise<string> => {
  let output = '\nDockerfile Efficiency Analysis\n\n'
  
  const dockerfilePath = await findDockerfile()
  
  if (!dockerfilePath) {
    output += 'Dockerfile not found in current directory or .github/\n\n'
    return output
  }
  
  const file = Bun.file(dockerfilePath)
  const content = await file.text()
  const lines = content.split('\n')
  
  output += `Dockerfile Location: ${dockerfilePath}\n\nMulti-Stage Build Detection:\n`
  
  const stages = lines.filter(line => line.startsWith('FROM')).length
  output += `  - Number of build stages: ${stages}\n`
  output += stages > 1 
    ? '  - ✓ Multi-stage build detected\n' 
    : '  - ⚠ Single-stage build (consider multi-stage for smaller images)\n'
  output += '\n'
  
  output += 'RUN Command Consolidation:\n'
  const runLines = lines.filter(line => line.startsWith('RUN'))
  const runCount = runLines.length
  output += `  - Total RUN commands: ${runCount}\n`
  output += runCount > 10
    ? '  - ⚠ High number of RUN commands (consider consolidating)\n'
    : '  - ✓ Reasonable number of RUN commands\n'
  output += '\n'
  
  const cleanupCount = runLines.filter(line => 
    line.includes('rm -rf') || line.includes('apt-get clean') || line.includes('cache')
  ).length
  const withoutCleanup = runCount - cleanupCount
  
  output += `  - RUN commands with cleanup: ${cleanupCount}\n`
  output += `  - RUN commands without cleanup: ${withoutCleanup}\n`
  if (withoutCleanup > 0) {
    output += '  - ⚠ Consider adding cleanup to RUN commands\n'
  }
  output += '\n'
  
  return output
}