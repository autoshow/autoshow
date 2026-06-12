import { maskSecret, getEnvVar, commitEnvUpdates } from './env-utils'
import {
  confirm,
  promptWithValidation,
  validateResendApiKey,
  validateFromEmail,
  validateEmail
} from './prompt-utils'
import { RESET, BOLD, successColor, errorColor, dimColor, CHECK, CROSS } from '../utils/ansi-colors'
import { joinOutputBlocks, renderLines, writeStdout } from '../utils/terminal-output'

interface DnsResult {
  spfFound: boolean
  dkimFound: boolean
}

interface CheckResult {
  apiKeySet: boolean
  apiKeyValid: boolean
  apiKeyMasked: string
  fromEmailSet: boolean
  fromEmailValid: boolean
  fromEmailValue: string
  adminEmailSet: boolean
  adminEmailValid: boolean
  adminEmailValue: string
  domain: string | null
  dns: DnsResult | null
}

function extractDomain(fromEmail: string): string | null {
  const match = fromEmail.match(/@([\w.-]+\.\w+)>?$/)
  return match ? match[1] || null : null
}

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeoutMs))
  ])

async function checkDns(domain: string): Promise<DnsResult> {
  const result: DnsResult = {
    spfFound: false,
    dkimFound: false
  }

  try {
    const spfProc = Bun.spawn(['dig', '+short', 'TXT', `send.${domain}`], {
      stdout: 'pipe',
      stderr: 'pipe'
    })
    const spfOutput = await withTimeout(new Response(spfProc.stdout).text(), 5000)
    result.spfFound = spfOutput.includes('v=spf1')
  } catch {
    result.spfFound = false
  }

  try {
    const dkimProc = Bun.spawn(['dig', '+short', 'TXT', `resend._domainkey.${domain}`], {
      stdout: 'pipe',
      stderr: 'pipe'
    })
    const dkimOutput = await withTimeout(new Response(dkimProc.stdout).text(), 5000)
    result.dkimFound = dkimOutput.includes('v=DKIM1')
  } catch {
    result.dkimFound = false
  }

  return result
}

async function runChecks(): Promise<CheckResult> {
  const apiKey = getEnvVar('RESEND_API_KEY') || ''
  const fromEmail = getEnvVar('RESEND_FROM_EMAIL') || ''
  const adminEmail = getEnvVar('RESEND_ADMIN_EMAIL') || ''

  const apiKeySet = apiKey.length > 0
  const apiKeyValid = apiKey.startsWith('re_')

  const fromEmailSet = fromEmail.length > 0
  const fromEmailPattern = /^(?:.+\s)?<?[\w.-]+@[\w.-]+\.\w+>?$/
  const fromEmailValid = fromEmailPattern.test(fromEmail)

  const adminEmailSet = adminEmail.length > 0
  const emailPattern = /^[\w.-]+@[\w.-]+\.\w+$/
  const adminEmailValid = emailPattern.test(adminEmail)

  const domain = fromEmailSet && fromEmailValid ? extractDomain(fromEmail) : null
  let dns: DnsResult | null = null

  if (domain) {
    dns = await checkDns(domain)
  }

  return {
    apiKeySet,
    apiKeyValid,
    apiKeyMasked: apiKeySet ? maskSecret(apiKey, 3, 4) : '',
    fromEmailSet,
    fromEmailValid,
    fromEmailValue: fromEmail,
    adminEmailSet,
    adminEmailValid,
    adminEmailValue: adminEmail,
    domain,
    dns
  }
}

function renderResults(result: CheckResult): string {
  const lines = [``, `${BOLD}Resend Configuration${RESET}`]

  if (result.apiKeySet && result.apiKeyValid) {
    lines.push(`├─ API Key: ${CHECK} ${result.apiKeyMasked}`)
  } else if (result.apiKeySet && !result.apiKeyValid) {
    lines.push(`├─ API Key: ${CROSS} Invalid format (must start with re_)`)
  } else {
    lines.push(`├─ API Key: ${CROSS} Not set`)
  }

  if (result.fromEmailSet && result.fromEmailValid) {
    lines.push(`├─ From Email: ${CHECK} ${result.fromEmailValue}`)
  } else if (result.fromEmailSet && !result.fromEmailValid) {
    lines.push(`├─ From Email: ${CROSS} Invalid format`)
  } else {
    lines.push(`├─ From Email: ${CROSS} Not set`)
  }

  if (result.adminEmailSet && result.adminEmailValid) {
    lines.push(`├─ Admin Email: ${CHECK} ${result.adminEmailValue}`)
  } else if (result.adminEmailSet && !result.adminEmailValid) {
    lines.push(`├─ Admin Email: ${CROSS} Invalid format`)
  } else {
    lines.push(`├─ Admin Email: ${CROSS} Not set`)
  }

  if (result.domain && result.dns) {
    lines.push(`├─ Domain: ${result.domain}`)
    if (result.dns.spfFound) {
      lines.push(`│  ├─ SPF Record: ${CHECK} Verified`)
    } else {
      lines.push(`│  ├─ SPF Record: ${CROSS} Not found`)
    }
    if (result.dns.dkimFound) {
      lines.push(`│  └─ DKIM Record: ${CHECK} Verified`)
    } else {
      lines.push(`│  └─ DKIM Record: ${CROSS} Not found`)
    }
  }

  const envComplete = result.apiKeySet && result.apiKeyValid &&
    result.fromEmailSet && result.fromEmailValid &&
    result.adminEmailSet && result.adminEmailValid
  const dnsComplete = result.dns ? result.dns.spfFound && result.dns.dkimFound : false
  const allPassed = envComplete && dnsComplete

  if (allPassed) {
    lines.push(`└─ Status: ${successColor}Ready${RESET}`)
  } else if (envComplete && !dnsComplete) {
    lines.push(`└─ Status: ${errorColor}DNS configuration required${RESET}`)
  } else {
    lines.push(`└─ Status: ${errorColor}Configuration incomplete${RESET}`)
  }

  return renderLines(lines)
}

function renderDnsBox(title: string, rows: readonly string[], boxWidth: number): string {
  return renderLines([
    '┌' + '─'.repeat(boxWidth) + '┐',
    '│ ' + title.padEnd(boxWidth + 9) + '│',
    '├' + '─'.repeat(boxWidth) + '┤',
    ...rows.map((row) => '│ ' + row.padEnd(boxWidth - 1) + '│'),
    '└' + '─'.repeat(boxWidth) + '┘'
  ])
}

function renderDnsRecords(domain: string): string {
  const boxWidth = 73

  return joinOutputBlocks([
    renderLines(['', `Add these DNS records to ${BOLD}${domain}${RESET}:`, '']),
    renderDnsBox(`${BOLD}SPF Record${RESET}`, [
      'Type: TXT',
      'Name: send',
      'Value: v=spf1 include:amazonses.com ~all'
    ], boxWidth),
    renderDnsBox(`${BOLD}DKIM Record${RESET}`, [
      'Type: TXT',
      'Name: resend._domainkey',
      `Value: (Get from Resend Dashboard → Domains → ${domain})`
    ], boxWidth),
    renderDnsBox(`${BOLD}MX Record (for bounce handling)${RESET}`, [
      'Type: MX',
      'Name: send',
      'Value: feedback-smtp.us-east-1.amazonses.com',
      'Priority: 10'
    ], boxWidth),
    `${dimColor}View full DNS records at: https://resend.com/domains${RESET}`
  ])
}

export async function checkResend(): Promise<boolean> {
  let result = await runChecks()
  writeStdout(renderResults(result))

  const envNeedsFix = !result.apiKeySet || !result.apiKeyValid ||
    !result.fromEmailSet || !result.fromEmailValid ||
    !result.adminEmailSet || !result.adminEmailValid

  if (envNeedsFix) {
    const shouldFix = await confirm('\nWould you like to configure Resend?')
    if (!shouldFix) {
      return false
    }

    const updates: Record<string, string> = {}

    if (!result.apiKeySet || !result.apiKeyValid) {
      writeStdout('')
      const key = await promptWithValidation(
        'Enter Resend API Key (re_...):',
        validateResendApiKey
      )
      updates['RESEND_API_KEY'] = key
    }

    if (!result.fromEmailSet || !result.fromEmailValid) {
      writeStdout('')
      const email = await promptWithValidation(
        'Enter from email (e.g., "App Name <noreply@domain.com>"):',
        validateFromEmail
      )
      updates['RESEND_FROM_EMAIL'] = email
    }

    if (!result.adminEmailSet || !result.adminEmailValid) {
      writeStdout('')
      const email = await promptWithValidation(
        'Enter admin notification email:',
        validateEmail
      )
      updates['RESEND_ADMIN_EMAIL'] = email
    }

    if (Object.keys(updates).length > 0) {
      if (await commitEnvUpdates(updates)) {
        writeStdout(renderLines(['', `${CHECK} Updated .env`]))
      }

      result = await runChecks()
      writeStdout(renderResults(result))
    }
  }

  const dnsNeedsFix = result.domain && result.dns && (!result.dns.spfFound || !result.dns.dkimFound)

  if (dnsNeedsFix && result.domain) {
    writeStdout(renderDnsRecords(result.domain))

    const shouldRecheck = await confirm('\nRe-check DNS after adding records?')
    if (shouldRecheck) {
      result = await runChecks()
      writeStdout(renderResults(result))
    }
  }

  const envComplete = result.apiKeySet && result.apiKeyValid &&
    result.fromEmailSet && result.fromEmailValid &&
    result.adminEmailSet && result.adminEmailValid
  const dnsComplete = result.dns ? result.dns.spfFound && result.dns.dkimFound : false

  return envComplete && dnsComplete
}
