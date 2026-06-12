import type { EmailResult } from '~/types'

const SUPPRESS_OUTBOUND_EMAIL_FLAG = 'AUTOSHOW_SUPPRESS_OUTBOUND_EMAIL'

export const SUPPRESSED_EMAIL_MESSAGE_ID = 'suppressed:test-runtime'

export const shouldSuppressOutboundEmail = (
  env: NodeJS.ProcessEnv = process.env
): boolean => {
  return env.NODE_ENV === 'test' || env[SUPPRESS_OUTBOUND_EMAIL_FLAG] === '1'
}

export const getSuppressedEmailResult = (): EmailResult => {
  return {
    success: true,
    messageId: SUPPRESSED_EMAIL_MESSAGE_ID,
  }
}
