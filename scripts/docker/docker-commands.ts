import { l, err } from '../../src/utils/logging'
import { detectImageName, runDockerCommand, ensureDirectory, saveImage, cleanupTempFiles, ensureDockerComposeRunning } from './docker-utils'
import { analyzeImageLayers, analyzeFilesystem, analyzePackages, analyzeDockerfile, analyzeCombinedTar } from './docker-analysis'
import { compareWithHistory, generateReportHeader, generateRecommendations } from './save-docker-report'
import { checkFrontendCache, saveFrontendCache, restoreFrontendCache, clearFrontendCache } from './frontend-hash'

const COMPOSE_FILE = '.github/docker-compose.yml'

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

    await clearFrontendCache()
    l('Frontend build cache cleared')
  } catch (error) {
    err(`Docker prune failed: ${error}`)
    process.exit(1)
  }
}

export const runUp = async (shouldPrune: boolean): Promise<void> => {
  try {
    if (shouldPrune) {
      await runPrune()
    }

    l('Starting Docker services')

    const buildStart = performance.now()

    const { skipBuild: skipFrontendBuild, hash: frontendHash } = await checkFrontendCache()

    if (skipFrontendBuild) {
      l('  Using cached frontend build')
      await restoreFrontendCache()
    }

    l('  Building image...')

    const buildArgs = skipFrontendBuild
      ? ['--build-arg', 'SKIP_FRONTEND_BUILD=true']
      : []

    await Bun.$`docker compose -f ${COMPOSE_FILE} build ${buildArgs}`.quiet()

    const buildDuration = ((performance.now() - buildStart) / 1000).toFixed(2)
    l(`  Build completed in ${buildDuration}s`)

    if (!skipFrontendBuild) {
      await saveFrontendCache(frontendHash)
    }

    const upStart = performance.now()
    l('  Starting containers...')
    await Bun.$`docker compose -f ${COMPOSE_FILE} up -d`.quiet()
    const upDuration = ((performance.now() - upStart) / 1000).toFixed(2)
    l(`  Containers started in ${upDuration}s`)

    const totalDuration = ((performance.now() - buildStart) / 1000).toFixed(2)
    l(`Docker services started (total: ${totalDuration}s)`)

    const logsProc = Bun.spawn(['docker', 'compose', '-f', COMPOSE_FILE, 'logs', '-f', '--no-log-prefix', 'autoshow'], {
      stdout: 'inherit',
      stderr: 'inherit'
    })

    await logsProc.exited
  } catch (error) {
    err(`Up command failed: ${error}`)
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
    err(`Info gathering failed: ${error}`)
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
    err(`Analysis failed: ${error}`)
    process.exit(1)
  } finally {
    await cleanupTempFiles([tempSaveFile])
  }
}

export const executeDockerCommand = async (command: string | undefined, positionals: string[], shouldPrune: boolean): Promise<void> => {
  const commandMap: Record<string, () => Promise<void>> = {
    up: () => runUp(shouldPrune),
    prune: runPrune,
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
  console.log("Available commands: up, up prune, prune, info, docker-report")
  console.log("To generate show notes, use the web application.")
  console.log("Run 'bun up' to start the development server.")
  process.exit(1)
}