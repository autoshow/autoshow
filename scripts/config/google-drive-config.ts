import { BOLD, RESET } from '../utils/ansi-colors'
import { renderLines } from '../utils/terminal-output'

export const GOOGLE_DRIVE_BROWSER_CLIENT_ID_ENV = 'VITE_GOOGLE_DRIVE_CLIENT_ID'
export const GOOGLE_DRIVE_API_KEY_ENV = 'VITE_GOOGLE_DRIVE_API_KEY'
export const GOOGLE_DRIVE_SERVER_CLIENT_ID_ENV = 'GOOGLE_DRIVE_CLIENT_ID'

export const GOOGLE_DRIVE_PICKER_DISPLAY_NAME = 'AutoShow Google Drive Picker'
export const GOOGLE_DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file'
export const GOOGLE_DRIVE_PICKER_SETUP_URL = 'https://developers.google.com/workspace/drive/picker/guides/overview'
export const GOOGLE_DRIVE_SCOPES_URL = 'https://developers.google.com/drive/api/guides/api-specific-auth'
export const GOOGLE_API_KEY_RESTRICTIONS_URL = 'https://cloud.google.com/docs/authentication/api-keys'
export const GOOGLE_OAUTH_CLIENTS_URL = 'https://console.cloud.google.com/auth/clients'
export const GOOGLE_CLOUD_SDK_INSTALL_URL = 'https://cloud.google.com/sdk/docs/install'

interface RenderOAuthInstructionsOptions {
  projectId: string
  origins: readonly string[]
}

export interface NormalizeGoogleDriveOriginResult {
  origin: string | null
  error: string | null
}

export function validateGoogleDriveClientId(input: string): string | null {
  const value = input.trim()
  if (value.length === 0) {
    return 'Value cannot be empty'
  }
  if (/\s/.test(value)) {
    return 'Client ID must not contain whitespace'
  }
  if (!/^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(value)) {
    return 'Client ID must match *.apps.googleusercontent.com'
  }
  return null
}

export function validateGoogleDriveApiKey(input: string): string | null {
  const value = input.trim()
  if (value.length === 0) {
    return 'Value cannot be empty'
  }
  if (/\s/.test(value)) {
    return 'API key must not contain whitespace'
  }
  return null
}

export function getGoogleDriveApiKeyFormatWarning(input: string): string | null {
  const error = validateGoogleDriveApiKey(input)
  if (error) {
    return error
  }
  return input.trim().startsWith('AIza')
    ? null
    : 'API key does not use the usual AIza... Google API key prefix'
}

export function normalizeGoogleDriveOrigin(input: string): NormalizeGoogleDriveOriginResult {
  const value = input.trim()
  if (value.length === 0) {
    return { origin: null, error: 'Origin cannot be empty' }
  }

  let url: URL
  try {
    url = new URL(value)
  } catch {
    return { origin: null, error: 'Origin must be a valid URL' }
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { origin: null, error: 'Origin must use http or https protocol' }
  }
  if (url.username || url.password) {
    return { origin: null, error: 'Origin must not include credentials' }
  }
  if (url.pathname !== '/' || url.search !== '' || url.hash !== '') {
    return { origin: null, error: 'Origin must not include a path, query string, or fragment' }
  }
  if (url.origin === 'null') {
    return { origin: null, error: 'Origin must include a host' }
  }

  return { origin: url.origin, error: null }
}

export function buildGoogleDriveAllowedReferrers(origins: readonly string[]): string[] {
  const referrers: string[] = []
  const seen = new Set<string>()

  for (const rawOrigin of origins) {
    const { origin, error } = normalizeGoogleDriveOrigin(rawOrigin)
    if (error || !origin) {
      throw new Error(error || 'Invalid Google Drive origin')
    }

    for (const referrer of [origin, `${origin}/*`]) {
      if (!seen.has(referrer)) {
        seen.add(referrer)
        referrers.push(referrer)
      }
    }
  }

  return referrers
}

export function renderGoogleDriveOAuthInstructions(options: RenderOAuthInstructionsOptions): string {
  const consoleUrl = `${GOOGLE_OAUTH_CLIENTS_URL}?project=${encodeURIComponent(options.projectId)}`
  return renderLines([
    '',
    `${BOLD}Manual Google OAuth setup${RESET}`,
    `Open: ${consoleUrl}`,
    '',
    'Create an OAuth client with these exact values:',
    `  Client type: Web application`,
    `  Name: ${GOOGLE_DRIVE_PICKER_DISPLAY_NAME}`,
    '  Authorized JavaScript origins:',
    ...options.origins.map((origin) => `    - ${origin}`),
    '  Authorized redirect URIs: leave empty',
    '',
    'OAuth consent scope:',
    `  ${GOOGLE_DRIVE_FILE_SCOPE}`,
    '',
    'Copy the OAuth Client ID into both .env variables:',
    `  ${GOOGLE_DRIVE_BROWSER_CLIENT_ID_ENV}`,
    `  ${GOOGLE_DRIVE_SERVER_CLIENT_ID_ENV}`,
    '',
    'Official setup links:',
    `  Picker setup: ${GOOGLE_DRIVE_PICKER_SETUP_URL}`,
    `  Drive scopes: ${GOOGLE_DRIVE_SCOPES_URL}`,
    `  API key restrictions: ${GOOGLE_API_KEY_RESTRICTIONS_URL}`,
    `  OAuth clients: ${GOOGLE_OAUTH_CLIENTS_URL}`,
  ])
}

export function renderGoogleDriveApiKeyFallbackInstructions(projectId: string, referrers: readonly string[]): string {
  return renderLines([
    '',
    `${BOLD}Manual Google Picker API key setup${RESET}`,
    `Open Credentials: https://console.cloud.google.com/apis/credentials?project=${encodeURIComponent(projectId)}`,
    '',
    'Create an API key, then restrict it exactly as follows:',
    '  Application restrictions: HTTP referrers',
    '  Website restrictions:',
    ...referrers.map((referrer) => `    - ${referrer}`),
    '  API restrictions: Restrict key',
    '  Selected API: Google Picker API',
    '',
    `Reference: ${GOOGLE_API_KEY_RESTRICTIONS_URL}`,
    `Paste the key into ${GOOGLE_DRIVE_API_KEY_ENV} when prompted.`,
  ])
}
