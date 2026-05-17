import type { LogContext } from '~/types'
export type SourceUtilsLoggerLoggingLogContextStore = {
  getStore(): LogContext | undefined
  run<T>(store: LogContext, fn: () => T | Promise<T>): T | Promise<T>
  enterWith(store: LogContext): void
}

export type SourceUtilsLoggerLoggingAsyncLocalStorageModule = {
  AsyncLocalStorage: new () => SourceUtilsLoggerLoggingLogContextStore
}
