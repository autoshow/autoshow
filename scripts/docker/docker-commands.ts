import { l, err } from '~/utils/logging'
import { detectImageName, runDockerCommand, ensureDirectory, saveImage, cleanupTempFiles, ensureDockerComposeRunning } from './docker-utils'
import { analyzeImageLayers, analyzeFilesystem, analyzePackages, analyzeDockerfile, analyzeCombinedTar } from './docker-analysis'
import { compareWithHistory, generateReportHeader, generateRecommendations } from './save-docker-report'
import type { ShellErrorLike, BuildStrategy } from '~/types'

const COMPOSE_FILE = '.github/docker-compose.yml'
const CRITICAL_FILES = [
  '.github/Dockerfile',
  '.github/docker-compose.yml',
  'package.json',
  'bun.lock',
  'tsconfig.json',
  'app.config.ts'
]

const isShellError = (error: unknown): error is ShellErrorLike =>
  typeof error === 'object' &&
  error !== null &&
  'exitCode' in error &&
  'stderr' in error &&
  'stdout' in error

const formatShellError = (error: unknown): string => {
  if (isShellError(error)) {
    const stderr = error.stderr.toString().trim()
    const stdout = error.stdout.toString().trim()
    const output = stderr || stdout
    if (output) {
      return `\n${output}`
    }
    return ` exit code ${error.exitCode}`
  }
  return ` ${String(error)}`
}

export const runPrune = async (): Promise<void> => {
  try {
    l('Pruning Docker resources')

    await Bun.$`docker kill $(docker ps -q)`.nothrow().quiet()
    await Bun.$`docker rm -f $(docker ps -aq)`.nothrow().quiet()
    await Bun.$`docker builder prune -af`.quiet()
    await Bun.$`docker network prune -f`.quiet()
    await Bun.$`docker image prune -af`.quiet()
    await Bun.$`docker volume prune -af`.quiet()
    await Bun.$`docker system prune -af --volumes`.quiet()
    await Bun.$`docker network rm $(docker network ls -q)`.nothrow().quiet()

    l('Docker prune completed')
  } catch (error) {
    err(`Docker prune failed:${formatShellError(error)}`)
    process.exit(1)
  }
}

const detectBuildStrategy = async (): Promise<BuildStrategy> => {
  try {
    const hasCriticalChanges = await checkCriticalFileChanges()
    if (hasCriticalChanges) {
      l('  Critical files changed, using no-cache build')
      return 'no-cache'
    }

    const hasSourceChanges = await checkSourceChanges()
    if (hasSourceChanges) {
      l('  Source files changed, using cached build')
      return 'cache'
    }

    const hasImageIssues = await checkImageHealth()
    if (hasImageIssues) {
      l('  Image health issues detected, will prune')
      return 'prune'
    }

    const hasVolumeIssues = await checkVolumeHealth()
    if (hasVolumeIssues) {
      l('  Volume issues detected, will prune')
      return 'prune'
    }

    l('  No changes detected, using cached build')
    return 'cache'
  } catch (error) {
    l('  Detection failed, defaulting to cached build')
    return 'cache'
  }
}

const checkCriticalFileChanges = async (): Promise<boolean> => {
  try {
    const result = await Bun.$`git diff --name-only HEAD`.text()
    const changedFiles = result.trim().split('\n').filter(Boolean)
    return CRITICAL_FILES.some(file => changedFiles.includes(file))
  } catch {
    return false
  }
}

const checkSourceChanges = async (): Promise<boolean> => {
  try {
    const result = await Bun.$`git diff --name-only HEAD`.text()
    const changedFiles = result.trim().split('\n').filter(Boolean)
    return changedFiles.some(file => 
      file.startsWith('src/') || 
      file.startsWith('scripts/') ||
      file.endsWith('.ts') ||
      file.endsWith('.tsx')
    )
  } catch {
    return false
  }
}

const checkImageHealth = async (): Promise<boolean> => {
  try {
    const images = await Bun.$`docker images -f "dangling=true" -q`.text()
    const hasDanglingImages = images.trim().length > 0

    const composeImages = await Bun.$`docker compose -f ${COMPOSE_FILE} images -q`.nothrow().text()
    const hasComposeImage = composeImages.trim().length > 0

    return hasDanglingImages || !hasComposeImage
  } catch {
    return false
  }
}

const checkVolumeHealth = async (): Promise<boolean> => {
  try {
    const volumes = await Bun.$`docker volume ls -f "dangling=true" -q`.text()
    return volumes.trim().length > 0
  } catch {
    return false
  }
}

export const runStop = async (): Promise<void> => {
  try {
    l('Stopping containers')
    await Bun.$`docker compose -f ${COMPOSE_FILE} down --remove-orphans`.nothrow().quiet()
    l('Containers stopped')
  } catch (error) {
    err(`Stop failed:${formatShellError(error)}`)
    process.exit(1)
  }
}

export const runBuild = async (noCache = false): Promise<string> => {
  try {
    const buildStart = performance.now()
    if (noCache) {
      l('Building image (no cache)')
      await Bun.$`docker compose -f ${COMPOSE_FILE} build --no-cache`.quiet()
    } else {
      l('Building image')
      await Bun.$`docker compose -f ${COMPOSE_FILE} build`.quiet()
    }
    const duration = ((performance.now() - buildStart) / 1000).toFixed(2)
    l(`Build completed in ${duration}s`)
    return duration
  } catch (error) {
    err(`Build failed:${formatShellError(error)}`)
    process.exit(1)
  }
}

export const runStart = async (): Promise<string> => {
  try {
    const startTime = performance.now()
    l('Starting containers')
    await Bun.$`docker compose -f ${COMPOSE_FILE} up -d --wait`.quiet()
    const duration = ((performance.now() - startTime) / 1000).toFixed(2)
    l(`Containers started in ${duration}s`)
    return duration
  } catch (error) {
    err(`Start failed:${formatShellError(error)}`)
    process.exit(1)
  }
}

export const runHealth = async (): Promise<void> => {
  try {
    l('Running health check')
    await Bun.$`docker compose -f ${COMPOSE_FILE} exec autoshow curl -f http://localhost:4321/api/health`.nothrow().quiet()
    l('Health check passed')
  } catch (error) {
    err(`Health check failed:${formatShellError(error)}`)
  }
}

export const runLogs = async (): Promise<void> => {
  const logsProc = Bun.spawn(['docker', 'compose', '-f', COMPOSE_FILE, 'logs', '-f', '--no-log-prefix', 'autoshow'], {
    stdout: 'inherit',
    stderr: 'inherit'
  })
  await logsProc.exited
}

const strategyMessages: Record<BuildStrategy, string> = {
  'cache': 'Using cached build',
  'no-cache': 'Using no-cache build',
  'prune': 'Full prune and rebuild'
}

export const runUp = async (shouldPrune: boolean): Promise<void> => {
  try {
    if (shouldPrune) {
      await runPrune()
    }

    const strategy = shouldPrune ? 'prune' : await detectBuildStrategy()
    l(strategyMessages[strategy])

    if (strategy === 'prune') {
      await runPrune()
    }

    await runStop()
    const buildTime = await runBuild(strategy === 'no-cache')
    const startTime = await runStart()
    await runHealth()

    l(`Docker ready (build: ${buildTime}s, start: ${startTime}s)`)
    await runLogs()
  } catch (error) {
    err(`Up command failed:${formatShellError(error)}`)
    process.exit(1)
  }
}

export const runInfo = async (): Promise<void> => {
  try {
    l('Gathering Docker Compose information')

    console.log('')
    l('Compose Services:')
    await Bun.$`docker compose -f ${COMPOSE_FILE} ls`

    console.log('')
    l('Build Check:')
    await Bun.$`docker compose -f ${COMPOSE_FILE} build --check`.nothrow()

    console.log('')
    l('Images:')
    await Bun.$`docker compose -f ${COMPOSE_FILE} images`

    console.log('')
    l('Containers:')
    await Bun.$`docker compose -f ${COMPOSE_FILE} ps`

    console.log('')
    l('Volumes:')
    await Bun.$`docker compose -f ${COMPOSE_FILE} volumes`

    console.log('')
    l('Top Processes:')
    await Bun.$`docker compose -f ${COMPOSE_FILE} top`

    l('Docker Compose information gathered')
  } catch (error) {
    err(`Info gathering failed:${formatShellError(error)}`)
    process.exit(1)
  }
}

export const runAnalyze = async (providedImageName?: string): Promise<void> => {
  const startTime = Date.now()
  
  await ensureDockerComposeRunning()
  
  const imageName = await detectImageName(providedImageName)
  
  if (!imageName) {
    err('No autoshow image found')
    l('Available images:')
    Bun.spawnSync(['docker', 'image', 'ls'], {
      stdout: 'inherit',
      stderr: 'inherit'
    })
    l('\nUsage: bun as analyze [image-name]')
    process.exit(1)
  }
  
  const timestamp = new Date().toISOString().replace(/:/g, '').replace(/\..+/, '').replace('T', '-').substring(0, 15)
  const reportFile = `docker-analysis-${timestamp}.md`
  const tempSaveFile = `/tmp/docker_save_${process.pid}.tar`
  const historyFile = `${process.env.HOME}/.autoshow/docker-analysis-history.json`
  
  try {
    await ensureDirectory(`${process.env.HOME}/.autoshow`)
    
    l(`Analyzing Docker image: ${imageName}`)
    
    const [imageSizeStr] = await Promise.all([
      runDockerCommand(['image', 'inspect', imageName, '--format', '{{.Size}}']),
      saveImage(imageName, tempSaveFile)
    ])
    
    const imageSize = parseInt(imageSizeStr || '0', 10)
    
    const [layersOutput, dockerfileOutput, tarAnalysis] = await Promise.all([
      analyzeImageLayers(imageName),
      analyzeDockerfile(),
      analyzeCombinedTar(tempSaveFile)
    ])
    
    const [header, filesystem, packages, recommendations, history] = await Promise.all([
      generateReportHeader(imageName, imageSize),
      Promise.resolve(analyzeFilesystem(tarAnalysis.dirSizes)),
      Promise.resolve(analyzePackages(tarAnalysis.devTools, tarAnalysis.libSize)),
      generateRecommendations(imageSize),
      compareWithHistory(imageName, imageSize, historyFile)
    ])
    
    const report = header + layersOutput + filesystem + packages + dockerfileOutput + recommendations + history
    
    await Bun.write(reportFile, report)
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    
    l(`Analysis complete in ${duration}s`)
    console.log(report)
    l(`Report saved: ${process.cwd()}/${reportFile}`)
  } catch (error) {
    err(`Analysis failed:${formatShellError(error)}`)
    process.exit(1)
  } finally {
    await cleanupTempFiles([tempSaveFile])
  }
}

export const executeDockerCommand = async (command: string | undefined, positionals: string[], shouldPrune: boolean): Promise<void> => {
  const commandMap: Record<string, () => Promise<void>> = {
    up: () => runUp(shouldPrune),
    prune: runPrune,
    stop: runStop,
    build: async () => { await runBuild(positionals.includes('--no-cache')) },
    start: async () => { await runStart() },
    logs: runLogs,
    info: runInfo,
    'docker-report': () => runAnalyze(positionals[1])
  }

  const commandFn = command ? commandMap[command] : undefined

  if (commandFn) {
    await commandFn()
    return
  }

  const errorMessage = command ? `Unknown command: ${command}` : 'No command provided'
  err(errorMessage)
  console.log("Usage: bun as <command> [options]")
  console.log("Available commands: up, up prune, prune, stop, build, start, logs, info, docker-report")
  console.log("To generate show notes, use the web application.")
  console.log("Run 'bun up' to start the development server.")
  process.exit(1)
}