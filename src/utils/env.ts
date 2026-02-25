export const requireEnvKey = (keyName: string): string => {
  const apiKey = process.env[keyName]
  if (!apiKey) {
    throw new Error(`${keyName} environment variable is required`)
  }
  return apiKey
}
