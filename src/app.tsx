import clsx from "clsx"
import { MetaProvider,Title } from "@solidjs/meta"
import { Router } from "@solidjs/router"
import { FileRoutes } from "@solidjs/start/router"
import { ErrorBoundary,Suspense } from "solid-js"
import Nav from "~/Nav"
import ui from "~/styles/ui.module.css"
import "./app.css"

// Eagerly load all route CSS so it's available before client-side navigation renders
const routeCSS = import.meta.glob("./routes/**/*.module.css", { eager: true })

export default function App() {
  return (
    <Router
      root={props => (
        <MetaProvider>
          <Title>AutoShow</Title>
          <Nav />
          <ErrorBoundary
            fallback={(error, retry) => (
              <main class={clsx(ui.page, ui.pagePadded, ui.pageCentered)}>
                <h1>Something went wrong</h1>
                <p>{error instanceof Error ? error.message : "Unable to render this page."}</p>
                <button type="button" class={clsx(ui.action, ui.actionPrimary, ui.actionLift)} onClick={retry}>
                  Try again
                </button>
              </main>
            )}
          >
            <Suspense>{props.children}</Suspense>
          </ErrorBoundary>
          <span hidden data-css={Object.keys(routeCSS).length} />
        </MetaProvider>
      )}
    >
      <FileRoutes />
    </Router>
  )
}
