import type {
SourceUtilsLoggerLoggingAsyncLocalStorageModule as AsyncLocalStorageModule,LogColors,
LogContext,SourceUtilsLoggerLoggingLogContextStore as LogContextStore,LogLevel,SourceUtilsLoggerLoggingInternalsResolvedLogPayload as ResolvedLogPayload,StructuredLogRecord
} from '~/types'
import { LEVEL_PRIORITY,coerceLogData,normalizeLogContext,redactLogText,resolveErrorAndData,resolveLoggerConfig } from './logging-internals'

const formatPrettyContextParts = (context?: LogContext): string[] => {
  if (!context) return []

  const parts: string[] = []

  if (context.requestId) parts.push(`req=${context.requestId}`)
  if (context.traceId) parts.push(`trace=${context.traceId}`)
  if (context.jobId) parts.push(`job=${context.jobId}`)
  if (context.component) parts.push(`component=${context.component}`)

  if (context.method && context.route) {
    parts.push(`${context.method} ${context.route}`)
  } else if (context.method) {
    parts.push(context.method)
  } else if (context.route) {
    parts.push(context.route)
  }

  return parts
}

const isBrowser = typeof window !== 'undefined'
const loggerConfig = resolveLoggerConfig(
  process.env as Record<string, string | undefined>,
  !isBrowser ? { isBrowser, pid: process.pid } : { isBrowser }
)

const createFallbackLogContextStore = (): LogContextStore => {
  let currentContext: LogContext | undefined

  return {
    getStore: () => currentContext,
    run: <T>(store: LogContext, fn: () => T | Promise<T>): T | Promise<T> => {
      const previousContext = currentContext
      currentContext = store

      try {
        const result = fn()

        if (result && typeof (result as Promise<T>).finally === 'function') {
          return (result as Promise<T>).finally(() => {
            currentContext = previousContext
          })
        }

        currentContext = previousContext
        return result
      } catch (error) {
        currentContext = previousContext
        throw error
      }
    },
    enterWith: (store: LogContext): void => {
      currentContext = store
    }
  }
}

const createLogContextStore = (): LogContextStore => {
  if (isBrowser || typeof require !== 'function') {
    return createFallbackLogContextStore()
  }

  const { AsyncLocalStorage } = require('node:async_hooks') as AsyncLocalStorageModule
  return new AsyncLocalStorage()
}

const logContextStore = createLogContextStore()

const getCurrentContext = (): LogContext => {
  return logContextStore.getStore() ?? {}
}

const supportsColors = typeof Bun !== 'undefined' && typeof Bun.color === 'function'
const RESET = supportsColors ? '\x1b[0m' : ''

let colorsCache: LogColors | null = null

const getColor = (hex: string): string => {
  if (!supportsColors) return ''
  return Bun.color(hex, 'ansi-16m') || ''
}

const getColors = (): LogColors => {
  if (colorsCache) return colorsCache

  colorsCache = {
    timestamp: getColor('#6b7280'),
    message: getColor('#e5e7eb'),
    debug: getColor('#9ca3af'),
    info: getColor('#93c5fd'),
    warn: getColor('#f59e0b'),
    value: getColor('#fbbf24'),
    jsonKey: getColor('#a78bfa'),
    error: getColor('#ef4444'),
    fatal: getColor('#dc2626')
  }

  return colorsCache
}

const shouldLog = (level: LogLevel): boolean => {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[loggerConfig.minimumLevel]
}

const levelColor = (level: LogLevel): string => {
  const colors = getColors()

  if (level === 'debug') return colors.debug
  if (level === 'info') return colors.info
  if (level === 'warn') return colors.warn
  if (level === 'error') return colors.error
  return colors.fatal
}

const stringifyRecord = (record: StructuredLogRecord): string => {
  return JSON.stringify(record)
}

const formatJsonObject = (value: Record<string, unknown>): string => {
  const serialized = JSON.stringify(value, null, 2)
  if (!supportsColors) return serialized

  const colors = getColors()
  return serialized.replace(/"([^"]+)":/g, `${colors.jsonKey}"$1"${RESET}:`)
}

const formatPrettyContextSuffix = (context?: LogContext): string => {
  const parts = formatPrettyContextParts(context)
  if (parts.length === 0) return ''

  const colors = getColors()
  return ` ${colors.value}${parts.join(' ')}${RESET}`
}

const formatPrettyLog = (record: StructuredLogRecord): string => {
  const colors = getColors()
  const time = record.timestamp.split('T')[1]?.replace('Z', '') || record.timestamp
  const timestamp = `${colors.timestamp}[${time}]${RESET}`
  const level = `${levelColor(record.level)}${record.level.toUpperCase().padEnd(5)}${RESET}`
  const message = `${colors.message}${record.message}${RESET}`
  const contextSuffix = formatPrettyContextSuffix(record.context)

  let output = `${timestamp} ${level} ${message}${contextSuffix}`

  if (record.data) {
    output += `\n${formatJsonObject(record.data)}`
  }

  if (record.error) {
    if (record.error.message) {
      output += `\n${colors.error}${record.error.message}${RESET}`
    }

    if (record.error.stack) {
      output += `\n${colors.error}${record.error.stack}${RESET}`
    }

    if (record.error.cause !== undefined) {
      output += `\n${formatJsonObject({ cause: record.error.cause })}`
    }
  }

  return output
}

const writeLogLine = (level: LogLevel, line: string): void => {
  if (LEVEL_PRIORITY[level] >= LEVEL_PRIORITY.error) {
    console.error(line)
  } else {
    console.log(line)
  }
}

const buildLogRecord = (
  level: LogLevel,
  message: string,
  errorOrData?: unknown,
  explicitData?: unknown
): StructuredLogRecord => {
  const context = normalizeLogContext(getCurrentContext())
  const logPayload: ResolvedLogPayload = level === 'error' || level === 'fatal'
    ? resolveErrorAndData(errorOrData, explicitData)
    : { data: coerceLogData(errorOrData) }

  return {
    timestamp: new Date().toISOString(),
    level,
    message: redactLogText(message),
    service: loggerConfig.serviceName,
    environment: loggerConfig.environment,
    ...(loggerConfig.version ? { version: loggerConfig.version } : {}),
    ...(loggerConfig.host ? { host: loggerConfig.host } : {}),
    ...(loggerConfig.pid !== undefined ? { pid: loggerConfig.pid } : {}),
    ...(context ? { context } : {}),
    ...(logPayload.data ? { data: logPayload.data } : {}),
    ...(logPayload.error ? { error: logPayload.error } : {})
  }
}

const emitLog = (
  level: LogLevel,
  message: string,
  errorOrData?: unknown,
  explicitData?: unknown
): void => {
  if (!shouldLog(level)) return

  const record = buildLogRecord(level, message, errorOrData, explicitData)
  const output = loggerConfig.format === 'json'
    ? stringifyRecord(record)
    : formatPrettyLog(record)

  writeLogLine(level, output)
}

export const withLogContext = async <T>(context: LogContext, fn: () => T | Promise<T>): Promise<T> => {
  const mergedContext = { ...getCurrentContext(), ...context }
  return await logContextStore.run(mergedContext, fn)
}

export const setLogContext = (context: LogContext): void => {
  logContextStore.enterWith({ ...getCurrentContext(), ...context })
}

export const clearLogContext = (): void => {
  logContextStore.enterWith({})
}

const info = (message: string, data?: Record<string, unknown>): void => {
  emitLog('info', message, data)
}

const error = (message: string, errorOrData?: unknown, data?: Record<string, unknown>): void => {
  emitLog('error', message, errorOrData, data)
}

const fatal = (message: string, errorOrData?: unknown, data?: Record<string, unknown>): void => {
  emitLog('fatal', message, errorOrData, data)
}

export const l = (message: string, data?: Record<string, unknown>): void => {
  info(message, data)
}

export const err = (message: string, errorOrData?: unknown, data?: Record<string, unknown>): void => {
  error(message, errorOrData, data)
}

export const warn = (message: string, errorOrData?: unknown, data?: Record<string, unknown>): void => {
  emitLog('warn', message, errorOrData, data)
}

let uncaughtHandlersRegistered = false

const registerGlobalErrorHandlers = (): void => {
  if (isBrowser || uncaughtHandlersRegistered || process.env.AUTOSHOW_DISABLE_CRASH_HANDLERS === '1') {
    return
  }

  uncaughtHandlersRegistered = true

  process.on('uncaughtException', caughtError => {
    fatal('Uncaught exception', caughtError)
    setTimeout(() => process.exit(1), 25)
  })

  process.on('unhandledRejection', reason => {
    fatal('Unhandled promise rejection', reason)
    setTimeout(() => process.exit(1), 25)
  })
}

if (process.env.NODE_ENV !== 'test') {
  registerGlobalErrorHandlers()
}
