import type { LogLevel,StructuredLogError } from '~/types'
export type SourceUtilsLoggerLoggingInternalsLogFormat = 'pretty' | 'json'

export type SourceUtilsLoggerLoggingInternalsLoggerConfig = {
  minimumLevel: LogLevel
  format: SourceUtilsLoggerLoggingInternalsLogFormat
  serviceName: string
  environment: string
  version?: string
  host?: string
  pid?: number
}

export type SourceUtilsLoggerLoggingInternalsResolvedLogPayload = {
  error?: StructuredLogError | undefined
  data?: Record<string, unknown> | undefined
}

export type SourceUtilsLoggerLoggingInternalsLoggerEnv = Record<string, string | undefined>
