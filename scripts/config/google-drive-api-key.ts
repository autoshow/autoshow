import { CHECK, RESET, errorColor } from '../utils/ansi-colors'
import { renderLines, writeStdout } from '../utils/terminal-output'
import { GOOGLE_DRIVE_PICKER_DISPLAY_NAME } from './google-drive-config'
import { runGcloud, type CommandResult } from './google-drive-gcloud'

interface GcloudApiKey {
  displayName?: string
  name?: string
}

function parseApiKeys(stdout: string): GcloudApiKey[] {
  try {
    const parsed: unknown = JSON.parse(stdout)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .filter((item): item is Record<string, unknown> => item !== null && typeof item === 'object')
      .map((item) => {
        const apiKey: GcloudApiKey = {}
        if (typeof item.displayName === 'string') {
          apiKey.displayName = item.displayName
        }
        if (typeof item.name === 'string') {
          apiKey.name = item.name
        }
        return apiKey
      })
  } catch {
    return []
  }
}

function parseApiKeyName(stdout: string): string | null {
  try {
    const parsed: unknown = JSON.parse(stdout)
    if (parsed !== null && typeof parsed === 'object' && 'name' in parsed) {
      const name = (parsed as { name?: unknown }).name
      return typeof name === 'string' && name.length > 0 ? name : null
    }
  } catch {
    return null
  }

  return null
}

async function findPickerApiKeyName(projectId: string): Promise<string | null> {
  const result = await runGcloud([
    'services',
    'api-keys',
    'list',
    '--project',
    projectId,
    '--format=json',
  ])

  if (!result.ok) {
    return null
  }

  return parseApiKeys(result.stdout)
    .find((key) => key.displayName === GOOGLE_DRIVE_PICKER_DISPLAY_NAME)
    ?.name || null
}

function buildMutationArgs(existingKeyName: string | null, projectId: string, referrers: readonly string[]): string[] {
  const baseFlags = [
    `--display-name=${GOOGLE_DRIVE_PICKER_DISPLAY_NAME}`,
    `--allowed-referrers=${referrers.join(',')}`,
    '--api-target=service=picker.googleapis.com',
    '--project',
    projectId,
  ]

  return existingKeyName
    ? ['services', 'api-keys', 'update', existingKeyName, ...baseFlags]
    : ['services', 'api-keys', 'create', ...baseFlags, '--format=json']
}

function logApiKeyMutation(existingKeyName: string | null): void {
  writeStdout(renderLines([
    '',
    existingKeyName
      ? `Updating restricted API key: ${GOOGLE_DRIVE_PICKER_DISPLAY_NAME}`
      : `Creating restricted API key: ${GOOGLE_DRIVE_PICKER_DISPLAY_NAME}`,
  ]))
}

function logMutationFailure(result: CommandResult): void {
  writeStdout(renderLines([
    '',
    `${errorColor}API key creation or update failed.${RESET}`,
    result.stderr.trim() || result.stdout.trim() || 'gcloud did not return an error message.',
  ]))
}

async function resolveKeyName(projectId: string, existingKeyName: string | null, mutationStdout: string): Promise<string | null> {
  return existingKeyName || parseApiKeyName(mutationStdout) || await findPickerApiKeyName(projectId)
}

async function fetchApiKeyString(projectId: string, keyName: string): Promise<string | null> {
  const result = await runGcloud([
    'services',
    'api-keys',
    'get-key-string',
    keyName,
    '--project',
    projectId,
    '--format=value(keyString)',
  ])
  const keyString = result.stdout.trim()
  if (result.ok && keyString.length > 0) {
    return keyString
  }

  writeStdout(renderLines([
    '',
    `${errorColor}Could not fetch the API key string from gcloud.${RESET}`,
    result.stderr.trim() || result.stdout.trim() || 'gcloud did not return an error message.',
  ]))
  return null
}

export async function createOrUpdatePickerApiKey(projectId: string, referrers: readonly string[]): Promise<string | null> {
  const existingKeyName = await findPickerApiKeyName(projectId)
  logApiKeyMutation(existingKeyName)

  const mutationResult = await runGcloud(buildMutationArgs(existingKeyName, projectId, referrers))
  if (!mutationResult.ok) {
    logMutationFailure(mutationResult)
    return null
  }

  const keyName = await resolveKeyName(projectId, existingKeyName, mutationResult.stdout)
  if (!keyName) {
    writeStdout(renderLines(['', `${errorColor}Could not find the created API key resource name.${RESET}`]))
    return null
  }

  const keyString = await fetchApiKeyString(projectId, keyName)
  if (keyString) {
    writeStdout(`${CHECK} Restricted API key ready`)
  }
  return keyString
}
