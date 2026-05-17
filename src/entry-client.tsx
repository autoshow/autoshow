import { mount,StartClient } from "@solidjs/start/client"
import { getSerializedResponseContentTypeOverride } from "~/utils/security/serialized-response-content-type"

const installSerializedResponseFetchGuard = (): void => {
  const originalFetch = window.fetch.bind(window)

  const guardedFetch = (async (...args: Parameters<typeof window.fetch>): Promise<Response> => {
    const response = await originalFetch(...args)
    const contentTypeOverride = getSerializedResponseContentTypeOverride(
      response.headers.get("x-serialized") ?? undefined,
      response.headers.get("content-type") ?? undefined,
    )

    if (!contentTypeOverride) return response

    const headers = new Headers(response.headers)
    headers.set("content-type", contentTypeOverride)

    return new Response(response.body, {
      headers,
      status: response.status,
      statusText: response.statusText,
    })
  }) as typeof window.fetch

  if (window.fetch.preconnect) {
    guardedFetch.preconnect = window.fetch.preconnect.bind(window.fetch)
  }

  window.fetch = guardedFetch
}

installSerializedResponseFetchGuard()

export default mount(() => <StartClient />, document.getElementById("app")!)
