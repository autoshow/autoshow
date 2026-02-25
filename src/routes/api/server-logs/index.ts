import type { APIEvent } from "@solidjs/start/server"
import { getLogsSince, getLogsAsText } from "~/utils/logging"

export async function GET({ request }: APIEvent) {
  const url = new URL(request.url)
  const sinceParam = url.searchParams.get('since')
  const format = url.searchParams.get('format') || 'json'

  const since = sinceParam ? parseInt(sinceParam, 10) : undefined

  if (format === 'text') {
    const text = getLogsAsText(since)
    return new Response(text, {
      headers: { 'Content-Type': 'text/plain' }
    })
  }

  const logs = since ? getLogsSince(since) : getLogsSince(0)
  return Response.json({ logs, count: logs.length })
}
