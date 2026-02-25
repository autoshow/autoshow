import { join } from 'path'

const ENV_PATH = join(process.cwd(), '.env')

export async function readEnvFile(): Promise<Map<string, string>> {
  const env = new Map<string, string>()
  
  try {
    const file = Bun.file(ENV_PATH)
    if (!await file.exists()) {
      return env
    }
    
    const content = await file.text()
    const lines = content.split('\n')
    
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed === '' || trimmed.startsWith('#')) {
        continue
      }
      
      const eqIndex = trimmed.indexOf('=')
      if (eqIndex === -1) {
        continue
      }
      
      const key = trimmed.slice(0, eqIndex)
      const value = trimmed.slice(eqIndex + 1)
      env.set(key, value)
    }
  } catch {
    return env
  }
  
  return env
}

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
