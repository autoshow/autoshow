const isBrowser = typeof window !== 'undefined'

const RESET = '\x1b[0m'
const BOLD = '\x1b[1m'
const UNDERLINE = '\x1b[4m'

const STEP_PATTERN = /^Step \d+:/

const isStepTitle = (message: string): boolean => {
  return STEP_PATTERN.test(message)
}

type Colors = {
  timestamp: string
  message: string
  path: string
  value: string
  jsonKey: string
  jsonValue: string
  error: string
  success: string
  stepTitle: string
}

let colorsCache: Colors | null = null

const getColors = (): Colors => {
  if (colorsCache) return colorsCache
  if (isBrowser) {
    colorsCache = {
      timestamp: '',
      message: '',
      path: '',
      value: '',
      jsonKey: '',
      jsonValue: '',
      error: '',
      success: '',
      stepTitle: ''
    }
    return colorsCache
  }
  colorsCache = {
    timestamp: Bun.color('#6b7280', 'ansi-16m') || '',
    message: Bun.color('#e5e7eb', 'ansi-16m') || '',
    path: Bun.color('#60a5fa', 'ansi-16m') || '',
    value: Bun.color('#fbbf24', 'ansi-16m') || '',
    jsonKey: Bun.color('#a78bfa', 'ansi-16m') || '',
    jsonValue: Bun.color('#34d399', 'ansi-16m') || '',
    error: Bun.color('#ef4444', 'ansi-16m') || '',
    success: Bun.color('#22c55e', 'ansi-16m') || '',
    stepTitle: Bun.color('#f472b6', 'ansi-16m') || ''
  }
  return colorsCache
}

const getTimestamp = (): string => {
  if (isBrowser) return ''
  const c = getColors()
  const iso = new Date().toISOString().split('T')[1] || ''
  const time = iso.slice(0, 12)
  return `${c.timestamp}[${time}]${RESET} `
}

const isPath = (str: string): boolean => {
  return str.startsWith('./') || 
         str.startsWith('/') || 
         str.startsWith('../') ||
         /\.[a-z]{2,4}$/.test(str) ||
         str.includes('/output/')
}

const formatJsonObject = (obj: Record<string, unknown>, indent = 2): string => {
  const c = getColors()
  const entries = Object.entries(obj)
  const lines = entries.map(([key, val]) => {
    const spaces = ' '.repeat(indent)
    const formattedKey = `${c.jsonKey}${key}${RESET}`
    
    if (val === null) {
      return `${spaces}${formattedKey}: ${c.jsonValue}null${RESET}`
    }
    
    if (Array.isArray(val)) {
      if (val.length === 0) {
        return `${spaces}${formattedKey}: ${c.jsonValue}[]${RESET}`
      }
      const arrayItems = val.map(item => {
        const itemSpaces = ' '.repeat(indent + 2)
        if (typeof item === 'string') {
          return `${itemSpaces}${c.jsonValue}"${item}"${RESET}`
        }
        return `${itemSpaces}${c.jsonValue}${JSON.stringify(item)}${RESET}`
      }).join(',\n')
      return `${spaces}${formattedKey}: [\n${arrayItems}\n${spaces}]`
    }
    
    if (typeof val === 'object') {
      return `${spaces}${formattedKey}: ${c.jsonValue}${JSON.stringify(val)}${RESET}`
    }
    
    if (typeof val === 'string') {
      const displayVal = isPath(val) 
        ? `${c.path}"${val}"${RESET}`
        : `${c.jsonValue}"${val}"${RESET}`
      return `${spaces}${formattedKey}: ${displayVal}`
    }
    
    return `${spaces}${formattedKey}: ${c.jsonValue}${val}${RESET}`
  })
  
  return `{\n${lines.join(',\n')}\n}`
}

export const l = (message: string, data?: Record<string, unknown>): void => {
  if (isBrowser) {
    console.log(message, data || '')
    return
  }
  
  const c = getColors()
  const timestamp = getTimestamp()
  
  if (isStepTitle(message)) {
    const coloredMessage = `${BOLD}${UNDERLINE}${c.stepTitle}${message}${RESET}`
    if (data) {
      console.log(`\n${timestamp}${coloredMessage} ${formatJsonObject(data)}`)
    } else {
      console.log(`\n${timestamp}${coloredMessage}`)
    }
    return
  }
  
  const coloredMessage = `${c.message}${message}${RESET}`
  
  if (data) {
    console.log(`${timestamp}${coloredMessage} ${formatJsonObject(data)}`)
  } else {
    console.log(`${timestamp}${coloredMessage}`)
  }
}

export const err = (message: string, errorObj?: unknown): void => {
  if (isBrowser) {
    console.error(message, errorObj || '')
    return
  }
  
  const c = getColors()
  const timestamp = getTimestamp()
  const errorMessage = errorObj instanceof Error ? `: ${errorObj.message}` : ''
  console.error(`${timestamp}${c.error}${message}${errorMessage}${RESET}`)
}

export const success = (message: string, data?: Record<string, unknown>): void => {
  if (isBrowser) {
    console.log(message, data || '')
    return
  }
  
  const c = getColors()
  const timestamp = getTimestamp()
  const coloredMessage = `${c.success}${message}${RESET}`
  
  if (data) {
    console.log(`${timestamp}${coloredMessage} ${formatJsonObject(data)}`)
  } else {
    console.log(`${timestamp}${coloredMessage}`)
  }
}
