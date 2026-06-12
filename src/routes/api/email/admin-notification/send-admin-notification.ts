import type { SourceRoutesApiEmailAdminNotificationAdminEmailAdminEmailClient as AdminEmailClient,EmailResult } from '~/types'
import { sendAdminEmail } from './admin-email'

export async function sendAdminNotification(
  subject: string,
  html: string,
  adminEmailClient?: AdminEmailClient | null
): Promise<EmailResult> {
  return sendAdminEmail(subject, html, adminEmailClient)
}
