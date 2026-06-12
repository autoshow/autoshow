export const GOOGLE_DRIVE_IMPORT_ENV_KEYS = [
  "VITE_GOOGLE_DRIVE_CLIENT_ID",
  "VITE_GOOGLE_DRIVE_API_KEY",
  "GOOGLE_DRIVE_CLIENT_ID",
] as const

export type GoogleDriveImportEnvKey = typeof GOOGLE_DRIVE_IMPORT_ENV_KEYS[number]
export type GoogleDriveImportConfigEnv = Partial<Record<GoogleDriveImportEnvKey,string | undefined>>

export const isGoogleDriveImportConfigured = (env?: GoogleDriveImportConfigEnv): boolean => {
  return GOOGLE_DRIVE_IMPORT_ENV_KEYS.every((key) => {
    const value = env ? env[key] : process.env[key]
    return typeof value === "string" && value.trim().length > 0
  })
}
