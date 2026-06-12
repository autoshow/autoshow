import type { SourceRoutesApiEmailResendClientResendEmailClient as ResendEmailClient } from '~/types'
export type SourceRoutesApiEmailAdminNotificationAdminEmailAdminEmailEnvironmentTag = 'DEV' | 'STAGING' | 'PROD'

export type SourceRoutesApiEmailAdminNotificationAdminEmailAdminEmailEnvironment = {
  tag: SourceRoutesApiEmailAdminNotificationAdminEmailAdminEmailEnvironmentTag
  color: string
  siteUrl: string
}

export type SourceRoutesApiEmailAdminNotificationAdminEmailAdminEmailClient = ResendEmailClient
