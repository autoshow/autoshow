import { detectImageName, runDockerCommand, ensureDirectory, saveImage, cleanupTempFiles, ensureDockerComposeRunning } from './docker-utils'
import { analyzeImageLayers, analyzeFilesystem, analyzePackages, analyzeDockerfile, analyzeCombinedTar } from './docker-analysis'
import { compareWithHistory, generateReportHeader, generateRecommendations } from './save-docker-report'
import { resolveDockerRuntimeConfig } from './docker-runtime'
import type { ShellErrorLike } from '~/types'
import { joinOutputBlocks, renderLines, writeStderr, writeStdout } from '../utils/terminal-output'

const COMPOSE_FILE = '.github/docker-compose.yml'
const ENV_FILE = '.env'

const composeCommand = (...args: string[]): string[] => [
  'docker',
  'compose',
  '-f',
  COMPOSE_FILE,
  '--env-file',
  ENV_FILE,
  ...args,
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

const writeSectionTitle = (title: string): void => {
  writeStdout(renderLines(['', title]))
}

const printAutoshowLogs = (env: Record<string, string>): void => {
  writeSectionTitle('Autoshow logs:')
  Bun.spawnSync(composeCommand('logs', '--tail', '200', '--no-log-prefix', 'autoshow'), {
    env,
    stdout: 'inherit',
    stderr: 'inherit'
  })
}

const runPruneSequence = async (quiet: boolean): Promise<void> => {
  if (quiet) {
    await Bun.$`docker stop $(docker ps -aq) 2>/dev/null || true`.quiet()
    await Bun.$`docker rm -f $(docker ps -aq) 2>/dev/null || true`.quiet()
    await Bun.$`docker builder prune -af`.quiet()
    await Bun.$`docker network prune -f`.quiet()
    await Bun.$`docker image prune -af`.quiet()
    await Bun.$`docker volume prune -af`.quiet()
    await Bun.$`docker system prune -af --volumes`.quiet()
    return
  }

  await Bun.$`docker stop $(docker ps -aq) 2>/dev/null || true`
  await Bun.$`docker rm -f $(docker ps -aq) 2>/dev/null || true`
  await Bun.$`docker builder prune -af`
  await Bun.$`docker network prune -f`
  await Bun.$`docker image prune -af`
  await Bun.$`docker volume prune -af`
  await Bun.$`docker system prune -af --volumes`
}

export const runInfo = async (): Promise<void> => {
  try {
    writeSectionTitle('Compose Services:')
    await Bun.$`docker compose -f ${COMPOSE_FILE} ls`

    writeSectionTitle('Build Check:')
    await Bun.$`docker compose -f ${COMPOSE_FILE} build --check`.nothrow()

    writeSectionTitle('Images:')
    await Bun.$`docker compose -f ${COMPOSE_FILE} images`

    writeSectionTitle('Containers:')
    await Bun.$`docker compose -f ${COMPOSE_FILE} ps`

    writeSectionTitle('Volumes:')
    await Bun.$`docker compose -f ${COMPOSE_FILE} volumes`

    writeSectionTitle('Top Processes:')
    await Bun.$`docker compose -f ${COMPOSE_FILE} top`
  } catch (error) {
    writeStderr(`Info gathering failed:${formatShellError(error)}`)
    process.exit(1)
  }
}

export const runAnalyze = async (providedImageName?: string): Promise<void> => {
  const startTime = Date.now()

  await ensureDockerComposeRunning()

  const imageName = await detectImageName(providedImageName)

  if (!imageName) {
    writeStderr('No autoshow image found')
    writeStdout('Available images:')
    Bun.spawnSync(['docker', 'image', 'ls'], {
      stdout: 'inherit',
      stderr: 'inherit'
    })
    writeStdout(renderLines(['', 'Usage: bun as analyze [image-name]']))
    process.exit(1)
  }

  const timestamp = new Date().toISOString().replace(/:/g, '').replace(/\..+/, '').replace('T', '-').substring(0, 15)
  const reportFile = `docker-analysis-${timestamp}.md`
  const tempSaveFile = `/tmp/docker_save_${process.pid}.tar`
  const historyFile = `${process.env.HOME}/.autoshow/docker-analysis-history.json`

  try {
    await ensureDirectory(`${process.env.HOME}/.autoshow`)

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

    writeStdout(joinOutputBlocks([
      report,
      renderLines([
        `Analysis complete in ${duration}s`,
        `Report saved: ${process.cwd()}/${reportFile}`,
      ]),
    ]))
  } catch (error) {
    writeStderr(`Analysis failed:${formatShellError(error)}`)
    process.exit(1)
  } finally {
    await cleanupTempFiles([tempSaveFile])
  }
}

const runUp = async (shouldPrune: boolean): Promise<void> => {
  try {
    if (shouldPrune) {
      await runPruneSequence(true)
    }

    const runtimeConfig = await resolveDockerRuntimeConfig()
    const upProc = Bun.spawnSync(
      composeCommand('up', '-d', '--build', '--wait'),
      {
        env: runtimeConfig.composeEnv,
        stdout: 'inherit',
        stderr: 'inherit'
      }
    )

    if (upProc.exitCode !== 0) {
      printAutoshowLogs(runtimeConfig.composeEnv)
      throw new Error(`docker compose up exited with code ${upProc.exitCode}`)
    }

    const proc = Bun.spawn(
      composeCommand('logs', '-f', '--no-log-prefix', 'autoshow'),
      {
        env: runtimeConfig.composeEnv,
        stdout: 'inherit',
        stderr: 'inherit'
      }
    )
    await proc.exited
  } catch (error) {
    writeStderr(`Docker up failed:${formatShellError(error)}`)
    process.exit(1)
  }
}

const runPrune = async (): Promise<void> => {
  try {
    await runPruneSequence(false)
  } catch (error) {
    writeStderr(`Prune failed:${formatShellError(error)}`)
    process.exit(1)
  }
}

export const executeDockerCommand = async (subcommand: string | undefined, positionals: string[]): Promise<void> => {
  const runLogs = async (): Promise<void> => {
    const runtimeConfig = await resolveDockerRuntimeConfig()
    const tailCount = positionals[1] || '500'
    Bun.spawnSync(
      composeCommand('logs', '--tail', tailCount, '--no-log-prefix', 'autoshow'),
      {
        env: { ...process.env, ...runtimeConfig.composeEnv },
        stdout: 'inherit',
        stderr: 'inherit',
      }
    )
  }

  const commandMap: Record<string, () => Promise<void>> = {
    up: () => runUp(positionals[1] === 'prune'),
    prune: runPrune,
    info: runInfo,
    report: () => runAnalyze(positionals[1]),
    logs: runLogs,
  }

  const commandFn = subcommand ? commandMap[subcommand] : undefined

  if (commandFn) {
    await commandFn()
    return
  }

  const errorMessage = subcommand ? `Unknown docker command: ${subcommand}` : 'No docker subcommand provided'
  writeStderr(errorMessage)
  writeStdout(renderLines([
    "Usage: bun as docker <command> [options]",
    "Available commands: up, prune, info, report, logs",
  ]))
  process.exit(1)
}
