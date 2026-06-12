export type SourceRoutesApiEmailResendClientResendEmailClient = {
  emails: {
    send: (message: {
      from: string
      to: string
      subject: string
      html: string
    }) => Promise<{
      data?: { id?: string | null } | null
      error?: { message?: string | null } | null
    }>
  }
}
