
const SONIOX_RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504])
const SONIOX_MAX_RETRY_DELAY_MS = 30_000

const toError = (error: unknown): Error => error instanceof Error ? error : new Error(String(error))

export const fetchSonioxWithRetry = async (
  url: string,
  options: RequestInit,
  action: string,
  maxAttempts: number = 3,
  sleepFn: (ms: number) => Promise<unknown> = Bun.sleep
): Promise<Response> => {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url, options)

      if (SONIOX_RETRYABLE_STATUSES.has(response.status) && attempt < maxAttempts) {
        const retryDelayMs = Math.min(1000 * Math.pow(2, attempt - 1), SONIOX_MAX_RETRY_DELAY_MS)

        await sleepFn(retryDelayMs)
        continue
      }

      return response
    } catch (error) {
      lastError = toError(error)

      if (attempt >= maxAttempts) {
        throw lastError
      }

      const retryDelayMs = Math.min(1000 * Math.pow(2, attempt - 1), SONIOX_MAX_RETRY_DELAY_MS)
      await sleepFn(retryDelayMs)
    }
  }

  throw lastError ?? new Error(`${action} failed after ${maxAttempts} attempts`)
}
