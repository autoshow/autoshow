import type {
SourceRoutesApiEmailAdminNotificationAdminEmailAdminEmailClient as AdminEmailClient,
SourceRoutesApiEmailAdminNotificationAdminEmailAdminEmailEnvironment as AdminEmailEnvironment,
SourceRoutesApiEmailAdminNotificationAdminEmailAdminEmailEnvironmentTag as AdminEmailEnvironmentTag,
EmailResult
} from '~/types'
import { getCanonicalSiteUrl } from '~/utils/site-url'
import { getSuppressedEmailResult,shouldSuppressOutboundEmail } from '../delivery-policy'
import { getResendClient } from '../resend-client'

const PROD_HOST = 'auto.show'
const STAGING_HOST = 'staging.auto.show'
const DEV_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1'])

const DEFAULT_FROM_EMAIL = 'AutoShow <contact@auto.show>'
const DEFAULT_ADMIN_EMAIL = 'admin@example.com'

const getEnvironmentColor = (tag: AdminEmailEnvironmentTag): string => {
  switch (tag) {
    case 'PROD':
      return '#ef4444'
    case 'STAGING':
      return '#f59e0b'
    case 'DEV':
    default:
      return '#2563eb'
  }
}

function resolveAdminEmailEnvironment(siteUrl = getCanonicalSiteUrl()): AdminEmailEnvironment {
  try {
    const hostname = new URL(siteUrl).hostname.toLowerCase()

    if (hostname === PROD_HOST) {
      return { tag: 'PROD', color: getEnvironmentColor('PROD'), siteUrl }
    }

    if (hostname === STAGING_HOST) {
      return { tag: 'STAGING', color: getEnvironmentColor('STAGING'), siteUrl }
    }

    if (DEV_HOSTS.has(hostname)) {
      return { tag: 'DEV', color: getEnvironmentColor('DEV'), siteUrl }
    }
  } catch {
  }

  return { tag: 'DEV', color: getEnvironmentColor('DEV'), siteUrl }
}

function prefixAdminEmailSubject(
  subject: string,
  environment = resolveAdminEmailEnvironment()
): string {
  return `[${environment.tag}] ${subject}`
}

function wrapAdminEmailHtml(
  html: string,
  environment = resolveAdminEmailEnvironment()
): string {
  return `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: ${environment.color}; color: #ffffff; padding: 8px 16px; font-size: 13px; font-weight: 700; letter-spacing: 0.5px; border-radius: 6px 6px 0 0;">
    ${environment.tag} &mdash; ${environment.siteUrl}
  </div>
  ${html}
</div>`
}

export async function sendAdminEmail(
  subject: string,
  html: string,
  adminEmailClient?: AdminEmailClient | null
): Promise<EmailResult> {
  const environment = resolveAdminEmailEnvironment()

  try {
    if (shouldSuppressOutboundEmail()) {
      return getSuppressedEmailResult()
    }

    const resolvedAdminEmailClient = adminEmailClient === undefined
      ? getResendClient()
      : adminEmailClient

    if (!resolvedAdminEmailClient) {
      return { success: false, error: 'RESEND_API_KEY not configured' }
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || DEFAULT_FROM_EMAIL
    const adminEmail = process.env.RESEND_ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL

    const { data, error } = await resolvedAdminEmailClient.emails.send({
      from: fromEmail,
      to: adminEmail,
      subject: prefixAdminEmailSubject(subject, environment),
      html: wrapAdminEmailHtml(html, environment)
    })

    if (error) {
      return { success: false, error: error.message || 'Unknown Resend error' }
    }

    if (!data?.id) {
      return { success: false, error: 'No data returned from Resend API' }
    }

    return { success: true, messageId: data.id }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send admin notification'
    }
  }
}
