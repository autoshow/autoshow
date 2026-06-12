import type { SourceRoutesApiEmailResendClientResendEmailClient as ResendEmailClient } from '~/types'

const RESEND_EMAILS_URL = 'https://api.resend.com/emails'
const RESEND_USER_AGENT = 'autoshow-bun/1.0'

type ResendSendMessage = Parameters<ResendEmailClient['emails']['send']>[0]
type ResendSendResult = Awaited<ReturnType<ResendEmailClient['emails']['send']>>

let resendClient: ResendEmailClient | null = null
let resendClientApiKey: string | null = null

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const getStringField = (
  value: Record<string, unknown>,
  field: string
): string | null => {
  const fieldValue = value[field]
  return typeof fieldValue === 'string' && fieldValue.length > 0
    ? fieldValue
    : null
}

const parseJsonResponseBody = async (response: Response): Promise<unknown> => {
  try {
    return await response.json()
  } catch {
    return null
  }
}

const getResendErrorMessage = (body: unknown, status: number): string => {
  if (isRecord(body)) {
    const message = getStringField(body, 'message') ?? getStringField(body, 'error')
    if (message) return message
  }

  return `Resend API request failed with status ${status}`
}

const parseResendSendResponse = async (response: Response): Promise<ResendSendResult> => {
  const body = await parseJsonResponseBody(response)

  if (!response.ok) {
    return {
      error: {
        message: getResendErrorMessage(body, response.status),
      },
    }
  }

  if (!isRecord(body)) {
    return { data: null }
  }

  const id = body.id
  return {
    data: {
      id: typeof id === 'string' || id === null ? id : null,
    },
  }
}

const createResendClient = (apiKey: string): ResendEmailClient => {
  return {
    emails: {
      send: async (message: ResendSendMessage): Promise<ResendSendResult> => {
        try {
          const response = await fetch(RESEND_EMAILS_URL, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              Accept: 'application/json',
              'User-Agent': RESEND_USER_AGENT,
            },
            body: JSON.stringify(message),
          })

          return await parseResendSendResponse(response)
        } catch (error) {
          return {
            error: {
              message: error instanceof Error ? error.message : 'Failed to call Resend API',
            },
          }
        }
      },
    },
  }
}

export function getResendClient(): ResendEmailClient | null {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return null
  }
  if (!resendClient || resendClientApiKey !== apiKey) {
    resendClient = createResendClient(apiKey)
    resendClientApiKey = apiKey
  }
  return resendClient
}
