import { sendAdminNotification } from '~/routes/api/email/admin-notification/send-admin-notification'
import type { SourceUtilsSecuritySecurityAlertsSecurityAlert as SecurityAlert } from '~/types'
import { err } from '../logger/logging'

const ALERT_THROTTLE_MS = 5 * 60_000
const lastSentAtByKey = new Map<string, number>()

const escapeHtml = (value: string): string => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;')

const toDisplayValue = (value: string | number | boolean | null | undefined): string => {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  return String(value)
}

const buildAlertSubject = (alert: SecurityAlert): string => {
  return `Security Alert [${alert.severity.toUpperCase()}] ${alert.eventType}`
}

const buildAlertHtml = (alert: SecurityAlert): string => {
  const detailRows = Object.entries(alert.details ?? {})
    .map(([key, value]) => `<li><strong>${escapeHtml(key)}:</strong> ${escapeHtml(toDisplayValue(value))}</li>`)
    .join('')

  return `
    <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto;">
      <h2>Security alert</h2>
      <p><strong>Event:</strong> ${escapeHtml(alert.eventType)}</p>
      <p><strong>Severity:</strong> ${escapeHtml(alert.severity)}</p>
      ${alert.ip ? `<p><strong>IP:</strong> ${escapeHtml(alert.ip)}</p>` : ''}
      ${alert.userAgent ? `<p><strong>User Agent:</strong> ${escapeHtml(alert.userAgent)}</p>` : ''}
      ${detailRows ? `<ul>${detailRows}</ul>` : ''}
    </div>
  `
}

const shouldThrottleAlert = (alert: SecurityAlert): boolean => {
  const dedupeKey = alert.dedupeKey ?? `${alert.eventType}:${alert.ip ?? 'na'}`
  const now = Date.now()
  const lastSentAt = lastSentAtByKey.get(dedupeKey) ?? 0

  if (now - lastSentAt < ALERT_THROTTLE_MS) {
    return true
  }

  lastSentAtByKey.set(dedupeKey, now)
  return false
}

export async function sendSecurityAlert(alert: SecurityAlert): Promise<void> {
  if (alert.severity !== 'high' && alert.severity !== 'critical') {
    return
  }

  if (shouldThrottleAlert(alert)) {
    return
  }

  try {
    await sendAdminNotification(buildAlertSubject(alert), buildAlertHtml(alert))
  } catch (error) {
    err('Failed to send security alert', error, {
      eventType: alert.eventType,
      severity: alert.severity,
    })
  }
}
