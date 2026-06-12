import type {
LogContext,
SourceUtilsLoggerLoggingInternalsLogFormat as LogFormat,
SourceUtilsLoggerLoggingInternalsLoggerConfig as LoggerConfig,
SourceUtilsLoggerLoggingInternalsLoggerEnv as LoggerEnv,
LogLevel,
SourceUtilsLoggerLoggingInternalsResolvedLogPayload as ResolvedLogPayload,
StructuredLogError
} from '~/types'

const DEFAULT_SERVICE_NAME = 'autoshow-bun'
const DEFAULT_ENVIRONMENT = 'development'
const REDACTED = '[REDACTED]'
const LOG_LEVELS = new Set<LogLevel>(['debug', 'info', 'warn', 'error', 'fatal'])
const CONTEXT_KEYS: Array<keyof LogContext> = [
  'requestId',
  'traceId',
  'jobId',
  'route',
  'method',
  'component'
]
const SENSITIVE_KEY_PATTERN = /(authorization|api[-_]?key|access[-_]?key|secret|token|password|cookie|session(?:id|key)?|signature|credential|bearer)/i
const SENSITIVE_QUERY_PARAM_PATTERN = /^(authorization|api[-_]?key|access[-_]?key|secret|token|password|signature|x-amz-(algorithm|credential|date|expires|security-token|signature|signedheaders)|googleaccessid|expires)$/i
const AUTH_SCHEME_PATTERN = /\b(Bearer|Basic)\s+[^\s"'`,;]+/gi
const ASSIGNMENT_SECRET_PATTERN = /\b(authorization|api[_-]?key|access[_-]?key|secret|token|password|cookie|session(?:id|key)?|signature|credential)\s*[:=]\s*([^\s"'`,;]+)/gi
const PRIVATE_IPV4_PATTERN = /\b(?:127(?:\.\d{1,3}){3}|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}|169\.254(?:\.\d{1,3}){2}|0(?:\.\d{1,3}){3})\b/g
const PRIVATE_IPV4_TEST_PATTERN = /\b(?:127(?:\.\d{1,3}){3}|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}|169\.254(?:\.\d{1,3}){2}|0(?:\.\d{1,3}){3})\b/
const LOOPBACK_IPV6_PATTERN = /\b(?:::1|::)\b/gi
const LOOPBACK_IPV6_TEST_PATTERN = /\b(?:::1|::)\b/i
const ABSOLUTE_PATH_PATTERN = /(?:\/(?:Users|home|var|private|tmp|etc|opt)\/[^\s"'`]+|[A-Za-z]:\\[^\s"'`]+)/g
const URL_PATTERN = /\bhttps?:\/\/[^\s"'`<>]+/gi

export const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  fatal: 50
}

const isPrivateIpv4Address = (value: string): boolean => {
  return PRIVATE_IPV4_TEST_PATTERN.test(value)
}

const isLoopbackIpv6Address = (value: string): boolean => {
  return LOOPBACK_IPV6_TEST_PATTERN.test(value)
}

const isPrivateHostName = (value: string): boolean => {
  const hostname = value.trim().toLowerCase().replace(/^\[(.*)\]$/, '$1')
  if (!hostname) return true
  if (hostname === 'localhost' || hostname === '0.0.0.0' || hostname === '::1') return true
  if (
    hostname.endsWith('.localhost')
    || hostname.endsWith('.local')
    || hostname.endsWith('.localdomain')
    || hostname.endsWith('.internal')
    || hostname.endsWith('.home.arpa')
  ) {
    return true
  }

  return isPrivateIpv4Address(hostname) || isLoopbackIpv6Address(hostname)
}

const shouldRedactKey = (keyPath: string[]): boolean => {
  const currentKey = keyPath.at(-1)
  return currentKey ? SENSITIVE_KEY_PATTERN.test(currentKey) : false
}

const redactUrl = (value: string): string => {
  try {
    const parsed = new URL(value)
    let changed = false

    if (isPrivateHostName(parsed.hostname)) {
      return REDACTED
    }

    if (parsed.username || parsed.password) {
      parsed.username = ''
      parsed.password = ''
      changed = true
    }

    for (const key of Array.from(parsed.searchParams.keys())) {
      if (SENSITIVE_QUERY_PARAM_PATTERN.test(key)) {
        parsed.searchParams.set(key, REDACTED)
        changed = true
      }
    }

    return changed ? parsed.toString() : value
  } catch {
    return value
  }
}

export const redactLogText = (value: string): string => {
  let redacted = value.replace(AUTH_SCHEME_PATTERN, (_, scheme: string) => `${scheme} ${REDACTED}`)
  redacted = redacted.replace(ASSIGNMENT_SECRET_PATTERN, (_, key: string) => `${key}=${REDACTED}`)
  redacted = redacted.replace(URL_PATTERN, (match) => redactUrl(match))
  redacted = redacted.replace(PRIVATE_IPV4_PATTERN, REDACTED)
  redacted = redacted.replace(LOOPBACK_IPV6_PATTERN, REDACTED)
  redacted = redacted.replace(ABSOLUTE_PATH_PATTERN, REDACTED)
  return redacted
}

const redactStructuredLogValue = (value: unknown, keyPath: string[] = []): unknown => {
  if (shouldRedactKey(keyPath)) {
    return REDACTED
  }

  if (typeof value === 'string') {
    return redactLogText(value)
  }

  if (Array.isArray(value)) {
    return value.map(item => redactStructuredLogValue(item, keyPath))
  }

  if (value && typeof value === 'object') {
    const redactedEntries = Object.entries(value as Record<string, unknown>).map(([key, entryValue]) => [
      key,
      redactStructuredLogValue(entryValue, [...keyPath, key])
    ])
    return Object.fromEntries(redactedEntries)
  }

  return value
}

const getDefaultLogLevel = (environment: string): LogLevel => {
  return environment === 'production' ? 'info' : 'debug'
}

const parseLogLevel = (value: string | undefined, environment: string): LogLevel => {
  if (!value) return getDefaultLogLevel(environment)

  const normalized = value.trim().toLowerCase() as LogLevel
  return LOG_LEVELS.has(normalized) ? normalized : getDefaultLogLevel(environment)
}

const parseLogFormat = (value: string | undefined, environment: string): LogFormat => {
  const normalized = value?.trim().toLowerCase()
  if (normalized === 'json' || normalized === 'pretty') {
    return normalized
  }

  return environment === 'production' ? 'json' : 'pretty'
}

export const resolveLoggerConfig = (
  env: LoggerEnv,
  options: { isBrowser?: boolean, pid?: number } = {}
): LoggerConfig => {
  const environment = env.NODE_ENV?.trim() || DEFAULT_ENVIRONMENT
  const version = env.AUTOSHOW_VERSION?.trim() || env.npm_package_version?.trim() || undefined
  const host = env.HOSTNAME?.trim() || undefined
  const serviceName = env.LOG_SERVICE_NAME?.trim() || DEFAULT_SERVICE_NAME

  return {
    minimumLevel: parseLogLevel(env.LOG_LEVEL, environment),
    format: parseLogFormat(env.LOG_FORMAT, environment),
    serviceName,
    environment,
    ...(version ? { version } : {}),
    ...(host ? { host } : {}),
    ...(!options.isBrowser && options.pid !== undefined ? { pid: options.pid } : {})
  }
}

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object') return false

  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

const serializeError = (error: Error, seen: WeakSet<object>): StructuredLogError => {
  if (seen.has(error)) {
    return { message: '[Circular]' }
  }

  seen.add(error)

  return {
    ...(error.name ? { name: error.name } : {}),
    ...(error.message ? { message: error.message } : {}),
    ...(error.stack ? { stack: error.stack } : {}),
    ...(
      'cause' in error && (error as Error & { cause?: unknown }).cause !== undefined
        ? { cause: serializeLogValue((error as Error & { cause?: unknown }).cause, seen) }
        : {}
    )
  }
}

/**
 * Tracks objects already visited during serialization to detect circular references.
 * Objects are added on entry and the WeakSet is passed recursively, so any back-edge
 * is caught without retaining strong references.
 */
class CircularGuard {
  private readonly seen: WeakSet<object>

  constructor(parent?: WeakSet<object>) {
    this.seen = parent ?? new WeakSet<object>()
  }

  /** Returns true if `obj` was NOT previously seen (i.e. safe to descend). */
  enter(obj: object): boolean {
    if (this.seen.has(obj)) return false
    this.seen.add(obj)
    return true
  }

  get weakSet(): WeakSet<object> {
    return this.seen
  }
}

const serializeLogValue = (
  value: unknown,
  seen: WeakSet<object> = new WeakSet<object>()
): unknown => {
  if (value === null || value === undefined) {
    return value
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'bigint') {
    return value.toString()
  }

  if (typeof value === 'symbol' || typeof value === 'function') {
    return String(value)
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (value instanceof Error) {
    return serializeError(value, seen)
  }

  const guard = new CircularGuard(seen)

  if (Array.isArray(value)) {
    if (!guard.enter(value)) return '[Circular]'
    return value.map(item => serializeLogValue(item, guard.weakSet))
  }

  if (value instanceof Map) {
    if (!guard.enter(value)) return '[Circular]'
    return Object.fromEntries(
      Array.from(value.entries(), ([key, entryValue]) => [String(key), serializeLogValue(entryValue, guard.weakSet)])
    )
  }

  if (value instanceof Set) {
    if (!guard.enter(value)) return '[Circular]'
    return Array.from(value.values(), item => serializeLogValue(item, guard.weakSet))
  }

  if (typeof value === 'object') {
    const objectValue = value as Record<string, unknown> & { toJSON?: () => unknown }

    if (!guard.enter(objectValue)) return '[Circular]'

    if (!isPlainObject(value) && typeof objectValue.toJSON === 'function') {
      try {
        return serializeLogValue(objectValue.toJSON(), guard.weakSet)
      } catch {
        return String(value)
      }
    }

    const normalizedObject: Record<string, unknown> = {}
    for (const [objectKey, objectValueInner] of Object.entries(objectValue)) {
      normalizedObject[objectKey] = serializeLogValue(objectValueInner, guard.weakSet)
    }

    if (Object.keys(normalizedObject).length > 0 || isPlainObject(objectValue)) {
      return normalizedObject
    }

    return String(value)
  }

  return String(value)
}

const hasValues = (value: Record<string, unknown>): boolean => {
  return Object.values(value).some(item => item !== undefined)
}

export const coerceLogData = (value: unknown): Record<string, unknown> | undefined => {
  if (value === undefined) return undefined

  const normalized = redactStructuredLogValue(serializeLogValue(value))

  if (normalized === undefined) return undefined

  if (Array.isArray(normalized)) {
    return { value: normalized }
  }

  if (typeof normalized === 'object' && normalized !== null) {
    const normalizedRecord = normalized as Record<string, unknown>
    return hasValues(normalizedRecord) ? normalizedRecord : undefined
  }

  return { value: normalized }
}

export const normalizeLogContext = (context?: LogContext): LogContext | undefined => {
  if (!context) return undefined

  const normalized = serializeLogValue(context)
  if (!normalized || typeof normalized !== 'object' || Array.isArray(normalized)) {
    return undefined
  }

  const normalizedContext: LogContext = {}

  for (const contextKey of CONTEXT_KEYS) {
    const contextValue = (normalized as Record<string, unknown>)[contextKey]
    if (contextValue === undefined || contextValue === null) continue
    normalizedContext[contextKey] = redactLogText(String(contextValue))
  }

  return Object.keys(normalizedContext).length > 0 ? normalizedContext : undefined
}
const createStructuredError = (errorObj: unknown): StructuredLogError | undefined => {
  if (errorObj === undefined) return undefined

  if (errorObj instanceof Error) {
    return redactStructuredLogValue(serializeError(errorObj, new WeakSet<object>())) as StructuredLogError
  }

  if (typeof errorObj === 'string') {
    return { message: redactLogText(errorObj) }
  }

  if (
    typeof errorObj === 'number' ||
    typeof errorObj === 'boolean' ||
    typeof errorObj === 'bigint' ||
    typeof errorObj === 'symbol' ||
    typeof errorObj === 'function'
  ) {
    return { message: redactLogText(String(errorObj)) }
  }

  if (typeof errorObj === 'object' && errorObj !== null) {
    return {
      message: 'Non-Error object thrown',
      cause: redactStructuredLogValue(serializeLogValue(errorObj))
    }
  }

  return { message: redactLogText(String(errorObj)) }
}

const mergeLogData = (
  ...values: Array<Record<string, unknown> | undefined>
): Record<string, unknown> | undefined => {
  const merged: Record<string, unknown> = {}

  for (const value of values) {
    if (!value) continue
    Object.assign(merged, value)
  }

  return hasValues(merged) ? merged : undefined
}

export const resolveErrorAndData = (
  errorOrData?: unknown,
  explicitData?: unknown
): ResolvedLogPayload => {
  const normalizedExplicitData = coerceLogData(explicitData)

  if (errorOrData === undefined) {
    return normalizedExplicitData ? { data: normalizedExplicitData } : {}
  }

  if (isPlainObject(errorOrData) || Array.isArray(errorOrData)) {
    const data = mergeLogData(coerceLogData(errorOrData), normalizedExplicitData)
    return {
      ...(data ? { data } : {})
    }
  }

  const error = createStructuredError(errorOrData)
  return {
    ...(error ? { error } : {}),
    ...(normalizedExplicitData ? { data: normalizedExplicitData } : {})
  }
}
