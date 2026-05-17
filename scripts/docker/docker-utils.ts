import type { TarHeader } from '~/types'
import { resolveDockerRuntimeConfig } from './docker-runtime'

const COMPOSE_FILE = '.github/docker-compose.yml'

export const ensureDockerComposeRunning = async (): Promise<void> => {
  try {
    const runtimeConfig = await resolveDockerRuntimeConfig()
    const proc = Bun.spawnSync(['docker', 'compose', '-f', COMPOSE_FILE, '--env-file', '.env', 'up', '-d'], {
      env: runtimeConfig.composeEnv,
      stdout: 'pipe',
      stderr: 'pipe'
    })

    if (proc.exitCode !== 0) {
      const stderr = proc.stderr.toString()
      throw new Error(`Docker Compose failed: ${stderr}`)
    }
  } catch (error) {
    throw error instanceof Error
      ? error
      : new Error(`Failed to start Docker Compose services: ${String(error)}`)
  }
}

export const runDockerCommand = async (args: string[]): Promise<string> => {
  try {
    const proc = Bun.spawnSync(['docker', ...args], {
      stdout: 'pipe',
      stderr: 'pipe'
    })

    const output = proc.stdout.toString()

    return proc.exitCode === 0 ? output.trim() : ''
  } catch {
    return ''
  }
}

export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes.toFixed(1)}B`

  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB']
  let unit = 0
  let size = bytes

  while (size >= 1024 && unit < 4) {
    size = size / 1024
    unit++
  }

  return `${size.toFixed(1)}${units[unit]}`
}

export const ensureDirectory = async (path: string): Promise<void> => {
  try {
    await Bun.$`mkdir -p ${path}`.quiet()
  } catch (error) {
    throw error instanceof Error
      ? error
      : new Error(`Failed to create directory ${path}: ${String(error)}`)
  }
}

export const saveImage = async (imageName: string, saveFile: string): Promise<void> => {
  try {
    const proc = Bun.spawnSync(['docker', 'save', imageName], {
      stdout: 'pipe',
      stderr: 'pipe'
    })

    if (proc.exitCode !== 0) {
      const stderr = proc.stderr.toString()
      throw new Error(`Failed to save image: ${stderr}`)
    }

    await Bun.write(saveFile, proc.stdout)
  } catch (error) {
    throw error instanceof Error ? error : new Error(`Image save failed: ${String(error)}`)
  }
}

export const cleanupTempFiles = async (files: string[]): Promise<void> => {
  try {
    await Promise.all(files.map(file => Bun.$`rm -f ${file}`.quiet()))
  } catch {}
}

export const findDockerfile = async (): Promise<string> => {
  const paths = ['Dockerfile', '.github/Dockerfile']

  for (const path of paths) {
    const file = Bun.file(path)
    if (await file.exists()) return path
  }

  return ''
}

export const parseTarHeader = (view: DataView, offset: number): TarHeader | null => {
  try {
    const decoder = new TextDecoder('utf8')
    const nameBytes = new Uint8Array(view.buffer, offset, 100)
    const name = nameBytes.findIndex(b => b === 0) > 0
      ? decoder.decode(nameBytes.subarray(0, nameBytes.findIndex(b => b === 0)))
      : decoder.decode(nameBytes).trim()

    if (!name) return null

    const sizeBytes = new Uint8Array(view.buffer, offset + 124, 12)
    const sizeOctal = decoder.decode(sizeBytes).replace(/\0.*$/g, '').trim()
    const size = parseInt(sizeOctal, 8) || 0
    const type = String.fromCharCode(view.getUint8(offset + 156))

    return { name, size, type }
  } catch {
    return null
  }
}

export const detectImageFromCompose = async (): Promise<string> => {
  try {
    const composeFile = Bun.file('docker-compose.yml')

    if (!(await composeFile.exists())) {
      return ''
    }

    const proc = Bun.spawnSync(['docker', 'compose', 'images', '--format', 'json'], {
      stdout: 'pipe',
      stderr: 'pipe'
    })

    if (proc.exitCode !== 0) {
      return ''
    }

    const output = proc.stdout.toString()

    if (!output) {
      return ''
    }

    const images = JSON.parse(output)

    if (Array.isArray(images) && images.length > 0) {
      const firstImage = images[0]
      const imageName = `${firstImage.Repository}:${firstImage.Tag}`

      if (imageName !== 'null:null' && imageName !== ':') {
        return imageName
      }
    }

    return ''
  } catch {
    return ''
  }
}

export const detectAutoshowImage = async (): Promise<string> => {
  try {
    const output = await runDockerCommand(['image', 'ls', '--format', '{{.Repository}}:{{.Tag}}'])

    if (!output) {
      return ''
    }

    const images = output.split('\n')
    const autoshowImage = images.find(img => img.toLowerCase().includes('autoshow'))

    if (autoshowImage) {
      return autoshowImage
    }

    return ''
  } catch {
    return ''
  }
}

export const detectImageName = async (providedName?: string): Promise<string> => {
  if (providedName) {
    const exists = await runDockerCommand(['image', 'inspect', providedName])

    if (exists) {
      return providedName
    }
  }

  const composeImage = await detectImageFromCompose()

  if (composeImage) {
    return composeImage
  }

  const autoshowImage = await detectAutoshowImage()

  if (autoshowImage) {
    return autoshowImage
  }

  return ''
}
