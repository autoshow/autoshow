export type SourceUtilsSecuritySecurityAlertsSecurityAlertSeverity = 'low' | 'medium' | 'high' | 'critical'

export type SourceUtilsSecuritySecurityAlertsSecurityAlert = {
  eventType: string
  severity: SourceUtilsSecuritySecurityAlertsSecurityAlertSeverity
  dedupeKey?: string
  ip?: string
  userAgent?: string
  details?: Record<string, string | number | boolean | null | undefined>
}
