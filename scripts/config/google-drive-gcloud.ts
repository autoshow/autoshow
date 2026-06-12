import { CHECK, BOLD, RESET, errorColor } from '../utils/ansi-colors'
import { renderLines, writeStdout } from '../utils/terminal-output'
import {
  GOOGLE_CLOUD_SDK_INSTALL_URL,
} from './google-drive-config'

export interface CommandResult {
  ok: boolean
  stdout: string
  stderr: string
  exitCode: number | null
}

export interface GoogleCloudContext {
  account: string
  projectId: string
}

export async function runGcloud(args: readonly string[]): Promise<CommandResult> {
  try {
    const proc = Bun.spawn(['gcloud', ...args], {
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ])

    return { ok: exitCode === 0, stdout, stderr, exitCode }
  } catch (error) {
    return {
      ok: false,
      stdout: '',
      stderr: error instanceof Error ? error.message : String(error),
      exitCode: null,
    }
  }
}

function renderMissingGcloudInstructions(): string {
  return renderLines([
    '',
    `${BOLD}Google Cloud CLI required${RESET}`,
    `Install gcloud: ${GOOGLE_CLOUD_SDK_INSTALL_URL}`,
    '',
    'Then run:',
    '  gcloud auth login',
    '  gcloud config set project PROJECT_ID',
  ])
}

function renderMissingProjectInstructions(): string {
  return renderLines([
    '',
    `${BOLD}No Google Cloud project configured${RESET}`,
    'Set one with:',
    '  gcloud config set project PROJECT_ID',
  ])
}

export async function detectGoogleCloudContext(): Promise<GoogleCloudContext | null> {
  const version = await runGcloud(['--version'])
  if (version.exitCode === null) {
    writeStdout(renderMissingGcloudInstructions())
    return null
  }
  if (!version.ok) {
    writeStdout(renderLines([
      '',
      `${errorColor}Could not run gcloud --version.${RESET}`,
      version.stderr.trim(),
      renderMissingGcloudInstructions(),
    ]))
    return null
  }

  const accountResult = await runGcloud(['auth', 'list', '--filter=status:ACTIVE', '--format=value(account)'])
  const account = accountResult.stdout.trim().split('\n').find((line) => line.trim().length > 0)?.trim()
  if (!account) {
    writeStdout(renderLines([
      '',
      `${BOLD}No active gcloud account${RESET}`,
      'Authenticate with:',
      '  gcloud auth login',
    ]))
    return null
  }

  const projectResult = await runGcloud(['config', 'get-value', 'project', '--quiet'])
  const projectId = projectResult.stdout.trim()
  if (!projectResult.ok || projectId.length === 0 || projectId === '(unset)') {
    writeStdout(renderMissingProjectInstructions())
    return null
  }

  writeStdout(renderLines([
    '',
    `${BOLD}Google Cloud context${RESET}`,
    `Account: ${account}`,
    `Project: ${projectId}`,
  ]))

  return { account, projectId }
}

function renderApiLibraryLinks(projectId: string): string {
  return renderLines([
    '',
    `${BOLD}Enable these APIs manually${RESET}`,
    `Drive API: https://console.cloud.google.com/apis/library/drive.googleapis.com?project=${encodeURIComponent(projectId)}`,
    `Google Picker API: https://console.cloud.google.com/apis/library/picker.googleapis.com?project=${encodeURIComponent(projectId)}`,
  ])
}

export async function enableGoogleDriveApis(projectId: string): Promise<boolean> {
  writeStdout(renderLines(['', 'Enabling Google Drive API and Google Picker API...']))
  const result = await runGcloud([
    'services',
    'enable',
    'drive.googleapis.com',
    'picker.googleapis.com',
    '--project',
    projectId,
  ])

  if (result.ok) {
    writeStdout(`${CHECK} Enabled drive.googleapis.com and picker.googleapis.com`)
    return true
  }

  writeStdout(renderLines([
    '',
    `${errorColor}API enablement failed.${RESET}`,
    result.stderr.trim() || result.stdout.trim() || 'gcloud did not return an error message.',
    renderApiLibraryLinks(projectId),
  ]))
  return false
}
