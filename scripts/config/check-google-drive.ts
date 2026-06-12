import { commitEnvUpdates, getEnvVar, maskSecret } from './env-utils'
import { confirm, prompt, promptWithValidation } from './prompt-utils'
import { BOLD, CHECK, CROSS, RESET, dimColor, errorColor, successColor } from '../utils/ansi-colors'
import { renderLines, writeStdout } from '../utils/terminal-output'
import {
  GOOGLE_DRIVE_API_KEY_ENV,
  GOOGLE_DRIVE_BROWSER_CLIENT_ID_ENV,
  GOOGLE_DRIVE_SERVER_CLIENT_ID_ENV,
  buildGoogleDriveAllowedReferrers,
  getGoogleDriveApiKeyFormatWarning,
  normalizeGoogleDriveOrigin,
  renderGoogleDriveApiKeyFallbackInstructions,
  renderGoogleDriveOAuthInstructions,
  validateGoogleDriveApiKey,
  validateGoogleDriveClientId,
} from './google-drive-config'
import {
  detectGoogleCloudContext,
  enableGoogleDriveApis,
} from './google-drive-gcloud'
import { createOrUpdatePickerApiKey } from './google-drive-api-key'

interface CheckResult {
  browserClientIdSet: boolean
  browserClientIdValid: boolean
  browserClientIdValue: string
  serverClientIdSet: boolean
  serverClientIdValid: boolean
  serverClientIdValue: string
  clientIdsMatch: boolean
  apiKeySet: boolean
  apiKeyValid: boolean
  apiKeyPreferred: boolean
  apiKeyMasked: string
}

function runChecks(): CheckResult {
  const browserClientId = getEnvVar(GOOGLE_DRIVE_BROWSER_CLIENT_ID_ENV)?.trim() || ''
  const serverClientId = getEnvVar(GOOGLE_DRIVE_SERVER_CLIENT_ID_ENV)?.trim() || ''
  const apiKey = getEnvVar(GOOGLE_DRIVE_API_KEY_ENV)?.trim() || ''

  const browserClientIdSet = browserClientId.length > 0
  const serverClientIdSet = serverClientId.length > 0
  const apiKeySet = apiKey.length > 0

  return {
    browserClientIdSet,
    browserClientIdValid: validateGoogleDriveClientId(browserClientId) === null,
    browserClientIdValue: browserClientId,
    serverClientIdSet,
    serverClientIdValid: validateGoogleDriveClientId(serverClientId) === null,
    serverClientIdValue: serverClientId,
    clientIdsMatch: browserClientIdSet && serverClientIdSet && browserClientId === serverClientId,
    apiKeySet,
    apiKeyValid: validateGoogleDriveApiKey(apiKey) === null,
    apiKeyPreferred: getGoogleDriveApiKeyFormatWarning(apiKey) === null,
    apiKeyMasked: apiKeySet ? maskSecret(apiKey, 6, 4) : '',
  }
}

function isComplete(result: CheckResult): boolean {
  return result.browserClientIdSet &&
    result.browserClientIdValid &&
    result.serverClientIdSet &&
    result.serverClientIdValid &&
    result.clientIdsMatch &&
    result.apiKeySet &&
    result.apiKeyValid
}

function renderResults(result: CheckResult): string {
  const lines = [``, `${BOLD}Google Drive Import Configuration${RESET}`]
  lines.push(renderClientIdLine(GOOGLE_DRIVE_BROWSER_CLIENT_ID_ENV, result.browserClientIdSet, result.browserClientIdValid, result.browserClientIdValue))
  lines.push(renderClientIdLine(GOOGLE_DRIVE_SERVER_CLIENT_ID_ENV, result.serverClientIdSet, result.serverClientIdValid, result.serverClientIdValue))

  if (result.browserClientIdSet || result.serverClientIdSet) {
    lines.push(`├─ OAuth Client ID Pair: ${result.clientIdsMatch ? `${CHECK} Values match` : `${CROSS} Values must be identical`}`)
  }

  if (result.apiKeySet && result.apiKeyValid) {
    const warning = result.apiKeyPreferred
      ? ''
      : ` ${dimColor}(unusual prefix; Google API keys usually start with AIza)${RESET}`
    lines.push(`├─ ${GOOGLE_DRIVE_API_KEY_ENV}: ${CHECK} ${result.apiKeyMasked}${warning}`)
  } else {
    lines.push(`├─ ${GOOGLE_DRIVE_API_KEY_ENV}: ${CROSS} ${result.apiKeySet ? 'Invalid format' : 'Not set'}`)
  }

  lines.push(isComplete(result)
    ? `└─ Status: ${successColor}Ready${RESET}`
    : `└─ Status: ${errorColor}Configuration incomplete${RESET}`)
  return renderLines(lines)
}

function renderClientIdLine(envName: string, isSet: boolean, isValid: boolean, value: string): string {
  if (isSet && isValid) {
    return `├─ ${envName}: ${CHECK} ${value}`
  }
  return `├─ ${envName}: ${CROSS} ${isSet ? 'Invalid format' : 'Not set'}`
}

function originFromUrl(input: string | undefined): string | null {
  if (!input?.trim()) {
    return null
  }

  try {
    const url = new URL(input.trim())
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null
    }
    return url.origin === 'null' ? null : url.origin
  } catch {
    return null
  }
}

function getDefaultOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  const origins: string[] = []
  const siteOrigin = originFromUrl(env.VITE_SITE_URL)
  if (siteOrigin) {
    origins.push(siteOrigin)
  }

  const configuredPort = env.AUTOSHOW_DOCKER_HOST_PORT?.trim()
  const localPort = configuredPort && /^\d+$/.test(configuredPort) ? configuredPort : '4321'
  origins.push(`http://localhost:${localPort}`)

  return [...new Set(origins)]
}

async function promptForOrigins(defaultOrigins: readonly string[]): Promise<string[]> {
  writeStdout(renderLines([
    '',
    `${BOLD}Google Drive Picker origins${RESET}`,
    'Detected origins:',
    ...defaultOrigins.map((origin) => `  - ${origin}`),
  ]))

  while (true) {
    const rawOrigins = (await prompt('Additional deployed origins (comma-separated, blank for none):'))
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0)
    const normalized = rawOrigins.map((rawOrigin) => ({ rawOrigin, ...normalizeGoogleDriveOrigin(rawOrigin) }))
    const errors = normalized
      .filter((entry) => entry.error || !entry.origin)
      .map((entry) => `${entry.rawOrigin}: ${entry.error || 'Invalid origin'}`)

    if (errors.length === 0) {
      return [...new Set([...defaultOrigins, ...normalized.flatMap((entry) => entry.origin ? [entry.origin] : [])])]
    }

    writeStdout(renderLines([
      '',
      `${errorColor}Invalid origin values:${RESET}`,
      ...errors.map((error) => `  - ${error}`),
      'Use scheme + host + optional port only, for example https://app.example.com.',
    ]))
  }
}

async function promptForApiKey(projectId: string, referrers: readonly string[]): Promise<string | null> {
  writeStdout(renderGoogleDriveApiKeyFallbackInstructions(projectId, referrers))
  if (!await confirm('\nPaste a Google Picker API key now?')) {
    return null
  }

  return promptWithValidation('Paste Google Picker API key:', validateGoogleDriveApiKey)
}

async function configureApiKey(projectId: string, referrers: readonly string[], result: CheckResult): Promise<string | null> {
  const shouldAutomate = await confirm('\nEnable APIs and create/update a restricted Google Picker API key with gcloud?')
  if (shouldAutomate) {
    const apisEnabled = await enableGoogleDriveApis(projectId)
    const keyString = apisEnabled ? await createOrUpdatePickerApiKey(projectId, referrers) : null
    return keyString || promptForApiKey(projectId, referrers)
  }

  return result.apiKeySet && result.apiKeyValid ? null : promptForApiKey(projectId, referrers)
}

function hasValidClientIdPair(result: CheckResult): boolean {
  return result.browserClientIdSet &&
    result.browserClientIdValid &&
    result.serverClientIdSet &&
    result.serverClientIdValid &&
    result.clientIdsMatch
}

async function configureOAuthClientId(projectId: string, origins: readonly string[], result: CheckResult): Promise<string | null> {
  writeStdout(renderGoogleDriveOAuthInstructions({ projectId, origins }))
  if (hasValidClientIdPair(result)) {
    return null
  }

  return promptWithValidation(
    'Paste OAuth Client ID (*.apps.googleusercontent.com):',
    validateGoogleDriveClientId
  )
}

export async function checkGoogleDrive(): Promise<boolean> {
  let result = runChecks()
  writeStdout(renderResults(result))
  if (isComplete(result)) {
    return true
  }

  const cloudContext = await detectGoogleCloudContext()
  if (!cloudContext) {
    return false
  }

  const origins = await promptForOrigins(getDefaultOrigins())
  const referrers = buildGoogleDriveAllowedReferrers(origins)
  writeStdout(renderLines([
    '',
    `${BOLD}Allowed HTTP referrers for the Picker API key${RESET}`,
    ...referrers.map((referrer) => `  - ${referrer}`),
  ]))

  const updates: Record<string, string> = {}
  const apiKey = await configureApiKey(cloudContext.projectId, referrers, result)
  if (apiKey) {
    updates[GOOGLE_DRIVE_API_KEY_ENV] = apiKey
  }

  const clientId = await configureOAuthClientId(cloudContext.projectId, origins, result)
  if (clientId) {
    updates[GOOGLE_DRIVE_BROWSER_CLIENT_ID_ENV] = clientId
    updates[GOOGLE_DRIVE_SERVER_CLIENT_ID_ENV] = clientId
  }

  if (await commitEnvUpdates(updates)) {
    writeStdout(renderLines(['', `${CHECK} Updated .env`]))
  }

  result = runChecks()
  writeStdout(renderResults(result))
  if (!isComplete(result)) {
    writeStdout(renderLines([
      '',
      `${errorColor}Google Drive import is still incomplete.${RESET}`,
      `Required .env values: ${GOOGLE_DRIVE_BROWSER_CLIENT_ID_ENV}, ${GOOGLE_DRIVE_API_KEY_ENV}, ${GOOGLE_DRIVE_SERVER_CLIENT_ID_ENV}`,
    ]))
  }

  return isComplete(result)
}
