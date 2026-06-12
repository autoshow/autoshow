import { join } from 'path'

const ENV_PATH = join(process.cwd(), '.env')

export async function updateEnvFile(updates: Record<string, string>): Promise<void> {
  const file = Bun.file(ENV_PATH)
  let content = ''
  let lines: string[] = []
  
  if (await file.exists()) {
    content = await file.text()
    lines = content.split('\n')
  }
  
  const updatedKeys = new Set<string>()
  
  const updatedLines = lines.map(line => {
    const trimmed = line.trim()
    if (trimmed === '' || trimmed.startsWith('#')) {
      return line
    }
    
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) {
      return line
    }
    
    const key = trimmed.slice(0, eqIndex)
    if (key in updates) {
      updatedKeys.add(key)
      return `${key}=${updates[key]}`
    }
    
    return line
  })
  
  for (const [key, value] of Object.entries(updates)) {
    if (!updatedKeys.has(key)) {
      updatedLines.push(`${key}=${value}`)
    }
  }
  
  await Bun.write(ENV_PATH, updatedLines.join('\n'))
}

export function maskSecret(value: string, prefixLen = 8, suffixLen = 4): string {
  if (value.length <= prefixLen + suffixLen) {
    return '***'
  }
  const prefix = value.slice(0, prefixLen)
  const suffix = value.slice(-suffixLen)
  return `${prefix}...${suffix}`
}

export function getEnvVar(key: string): string | undefined {
  return process.env[key]
}

/**
 * Writes `updates` to `.env` and populates `process.env` so that subsequent
 * `getEnvVar()` calls see the new values in the same process.
 * Returns `true` when at least one key was written, `false` when `updates` is empty.
 */
export async function commitEnvUpdates(updates: Record<string, string>): Promise<boolean> {
  if (Object.keys(updates).length === 0) return false

  await updateEnvFile(updates)

  for (const [key, value] of Object.entries(updates)) {
    process.env[key] = value
  }

  return true
}
