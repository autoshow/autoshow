import { createHandler,StartServer } from "@solidjs/start/server"
import { getContext } from "vinxi/http"
import { initializeAppDatabase } from "~/database/db"
import { REQUEST_CSP_NONCE_KEY } from "~/utils/security/security-headers"

await initializeAppDatabase()

export default createHandler(() => (
  <StartServer
    document={({ assets, children, scripts }) => (
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="theme-color" content="#000000" />
          <link rel="icon" href="/brand/autoshow-logo.ico" />
          <title>AutoShow</title>
          {assets}
        </head>
        <body>
          <div id="app">{children}</div>
          {scripts}
        </body>
      </html>
    )}
  />
), context => {
  const nonce = getContext(context.nativeEvent, REQUEST_CSP_NONCE_KEY)
  return typeof nonce === 'string' && nonce.length > 0
    ? { nonce }
    : {}
})
